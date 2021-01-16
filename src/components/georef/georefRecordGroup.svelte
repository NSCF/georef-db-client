<script>
import { onMount, onDestroy, createEventDispatcher } from 'svelte';
import { Firestore, FieldValue } from '../../firebase.js'

import { dataStore } from './dataStore.js'

import shortid from 'shortid'

const dispatch = createEventDispatcher();

export let datasetID

let notGeoreferenced
let changesMade = false //a flag for whether to update on the database when skipping or not

$: $dataStore.recordGroup, filterGroupLocalities()

//filter only those not yet georeferened
const filterGroupLocalities = _ => {
  if($dataStore.recordGroup && $dataStore.recordGroup.groupLocalities.length){
    console.log('filtering records')
    notGeoreferenced = $dataStore.recordGroup.groupLocalities.filter(x => !x.georefID)
  }
  else {
    notGeoreferenced = null
  }
}

let selectedLocs = []

let recordsGroupsSaving = [] //for Promise.all before leaving
let georefsSaving = []

//$: recordGroupSnap, updateRecordGroup()
/*
$: incompleteGroupLocs = recordGroup.locRecords.filter(x=>!x.completed)
$: incompleteGroupLocs, toNextOrNotToNext()
*/

//$: selectedGeoref, updateLocGeorefs() //this is the heavy lifting

const fetchNextRecordGroup = async skip => {
  console.log('fetching record group from Firestore')
  
  let query = Firestore.collection('recordGroups')
  .where('datasetID', '==', datasetID)
  .where('completed', '==', false)
  .where("groupLocked", "==", false)
  
  if(skip && skip > 0) {
    query = query.offset(skip)
  }

  let snap = await query.get()
  if(!snap.empty) {
    //try to lock it
    let docRef = snap.docs[0].ref
    try {
      let success = await Firestore.runTransaction(async transaction => {
        let docSnap = await transaction.get(docRef)
        let doc = await docSnap.data()
        if(doc.groupLocked){ //it was locked since last read
          return false
        }
        else {
          await transaction.update(docRef, {groupLocked: true})
          return true
        }
      })

      if (!success){
        return fetchNextRecordGroup() //recursive, I'm really hoping this is right- it would theoretically stop on snap.empty
      }
      else {
        return snap.docs[0].data() //resolve to the data we want
      }
    }
    catch(err) {
      //Apparently this only happens if we are offline
      throw err
    }
    
  }
  else {
    return null //this signals no more records to georeference
  }
}

const fetchCandidateGeorefs = async _ => {
  if(recordGroup.locRecords && recordGroup.locRecords.length){
    let georefFetches = []//promise array

    //see https://stackoverflow.com/questions/30003353/can-es6-template-literals-be-substituted-at-runtime-or-reused
    let search
    let urltemplate = `\`https://us-central1-georef-745b9.cloudfunctions.net/getlocalities?search=\${search}&index=southernafricater\``
    const url = t => eval(t)
    for (let locRecord of recordGroup.locRecords){
      search = encodeURI(locRecord.loc)
      georefFetches.push(fetch(url(urltemplate)).then(r => r.json()).catch(err => err))
    }

    await Promise.all(georefFetches)

    //get the uniques and record who they belong to
    let georefIndex = {}
    let uniqueGeorefIDs = new Set()
    let candidateGeorefs = []
    for (let [georefs, index] of georefFetches.entries()){
      georefIndex[index] = georefs.map(x => x['_id']) // this is the georef IDs for each locString
      for (let georef of georefs){
        if(!uniqueGeorefIDs.has(georef['_id'])){
          uniqueGeorefIDs.add(georef['_id'])
          candidateGeorefs.push(georef)
        }
      }
    }

    candidateGeorefs.sort((a, b) => a['_score'] - b['_score'])

    return {
      georefIndex,
      candidateGeorefs
    }
    
  }
}

const createGeoref = async (georef, datasetID, recordIDs) => {
  let docRef = await Firestore.collection('georefs').add(georef)
  let georefLoc = {
    georefID: georef.georefID,
  }
  georefLoc[datasetID] = recordIDs

  try{
    await Firestore.collection('georefDatasetRecords').add(georefLoc)
    return Promise.resolve()
  }
  catch(err){
    console.log('error creating new georef:', err.message)
    return Promise.reject(err.message)
  }
  
}

const updateGeorefRecordIDs = async (georefID, datasetID, recordIDs) => {
  let query = Firestore.collection('georefDatasetRecords').where('georefID', '==', georefID)
  let snap = await query.get()
  if(snap.empty){//please no!
    console.log('error updating record IDs for georef ', georefID, '--no matching georefDatasetRecord entry')
    return Promise.reject('no matching georefDatasetRecord for georefID' + georefID)
  }
  else {
    let ref = snap.docs[0].ref
    let arrayUpdate = {}
    arrayUpdate[datasetID] = FieldValue.arrayUnion(...recordIDs)
    await ref.update(arrayUpdate)
    return Promise.resolve()
  }
}

const updateRecordGroup = async _ => {
  if (recordGroupSnap){
    recordGroup = null
    await recordGroupSnap
    if(recordGroupSnap.empty){
      //wait till all saving complete
      await Promise.all(georefsSaving)
      await Promise.all(recordsGroupsSaving)
      dispatch('no-more-record-groups')
    }
    else {
      console.log('setting new recordGroup')
      recordGroup = recordGroupSnap.data()
      incompleteGroupLocs = recordGroup.locRecords.filter(x=>!x.completed)
      changesMade = false
    }
  }
}

const handleSelectedLocs = ev => {
  selectedLocs = ev.detail.selectedLocs
  //get the geoRefs from Meili for each loc and group into unique, but for now
  let candidateGeorefs = [
    {
      id: 12345,
      locality: 'Kimberley',
      decimalLatitude: -28.742523, 
      decimalLongitude: 24.759596,
      sources: 'one source | another source',
      accuracy: 20,
      accuracyUnit: 'km',
      clicked: false
    }, 
    {
      locality: 'near Kimberley',
      decimalLatitude: -28.742523, 
      decimalLongitude: 24.759596,
      accuracy: 20,
      accuracyUnit: 'km',
      clicked: false
    }, 
    {
      locality: 'Riverton, near Kimberley',
      decimalLatitude: -28.517959, 
      decimalLongitude: 24.699433,
      radiusM: 1000, 
      accuracy: 1000,
      accuracyUnit: 'm',
      clicked: false
    }, 
    {
      locality: '5km N Kimberley',
      decimalLatitude: -28.696470,  
      decimalLongitude: 24.755523,
      radiusM: 2000, 
      accuracy: 2,
      accuracyUnit: 'km',
      clicked: false
    }
  ]

  geoRefs.georefArray = candidateGeorefs

}

const updateLocGeorefs = _ => { //this is the heavy lifting
  if(selectedGeoref && selectedLocs){
    let newGeoref = false
    let georefRecordIDs = []
    if (!selectedGeoref.georefID) { //its new
      newGeoref = true
      selectedGeoref.georefID = shortid.generate()
    }

    selectedLocs.forEach(loc => {
      loc.georefID = selectedGeoref.georefID
      loc.georefAppliedDate = 'date' //TODO add the current date
      loc.georefAppliedBy = 'user' //TODO get from log in
      loc.completed = true
      georefRecordIDs = [...georefRecordIDs, ...loc.recordIDs]
    })
    changesMade = true

    if(newGeoref){
      georefsSaving.push(createGeoref(selectedGeoref, datasetID, georefRecordIDs))
    }
    else {
      georefsSaving.push(updateGeorefRecordIDs(selectedGeoref.georefID, datasetID, georefRecordIDs))
    }

    incompleteGroupLocs = recordGroup.locRecords.filter(x => !x.complete)
    if (!incompleteGroupLocs.length){
      recordGroup.completed = true
      let save = recordGroupSnap.ref.update(recordGroup)
      recordsGroupsSaving.push(save)
      recordGroupSnap = pendingRecordGroupSnap
      pendingRecordGroupSnap = fetchNextRecordGroup(skip)
    }

    //This is really important because it executes each in sequence so that we don't try adding 
    //see https://css-tricks.com/why-using-reduce-to-sequentially-resolve-promises-works/
    georefsSaving.reduce(async (previous, next) => {
      await previous
      return next
    }, Promise.resolve())

  }
  //TODO else show a message
}

const handleSkip = _ => {
  
  if (changesMade) {
    let save = Firestore.collection('recordGroups').ref(recordGroupSnap.ref).update(recordGroup)
    recordsGroupsSaving.push(save)
  }

  skip++
  recordGroupSnap = pendingRecordGroupSnap
  pendingRecordGroupSnap = fetchNextRecordGroup(skip)
  
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="select-container">
<h4>Locality strings</h4>
  {#if notGeoreferenced && notGeoreferenced.length}
    <p><i>Select the items below that represent the same locality and then choose and apply or create an appropriate georeference</i></p>
    <select multiple bind:value={selectedLocs}>
      {#each notGeoreferenced as groupLoc}
        <option value={groupLoc}>
          {groupLoc.loc}
        </option>
      {/each}
    </select>
    <button disabled={selectedLocs.length} on:click={handleSkip}>Skip these for later...</button>
  {:else}
    waiting for record group
  {/if}
</div>

<!-- ############################################## -->
<style>

.select-container {
  width:100%;
  height:100%;
}

select {
  width:100%;
  height: 500px;
  white-space:pre-wrap;
}

</style>