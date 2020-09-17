<script>
import { onMount, onDestroy, createEventDispatcher } from 'svelte';
import { Firestore, FieldValue } from '../../firebase.js'
import { geoRefs } from './georefStore.js'
import shortid from 'shortid'

const dispatch = createEventDispatcher();

export let datasetID = 'WjPG1sfl6' //TODO remove when finalized
export let selectedGeoref

let selectMessage = "Select the items below that represent the same locality and then choose and apply the appropriate georeference to the right"

let pendingRecordGroupSnap
let fetchRecordOffset = 0
let changesMade = false

let recordGroupSnap
let recordGroup = {locRecords: []} //empty to start, to get from Firebase

let incompleteGroupLocs

let selectedLocs = []

let recordsGroupsSaving = [] //for Promise.all before leaving
let georefsSaving = []

$: recordGroupSnap, updateRecordGroup()
/*
$: incompleteGroupLocs = recordGroup.locRecords.filter(x=>!x.completed)
$: incompleteGroupLocs, toNextOrNotToNext()
*/

$: selectedGeoref, updateLocGeorefs() //this is the heavy lifting

onMount(async _ => { //TODO update this to maintain a list of available (not locked) groups
  recordGroupSnap = await fetchNextRecordGroup(fetchRecordOffset)
  console.log('records fetched from firebase')
  console.log(recordGroup)
  pendingRecordGroupSnap = fetchNextRecordGroup(fetchRecordOffset)
})

onDestroy(async _ => {
  //release the pending record if there is one
})

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

const fetchNextRecordGroup = async offSet => {
  console.log('fetching record group from Firestore')
  
  let query = Firestore.collection('recordGroups')
  .where('datasetID', '==', datasetID)
  .where('completed', '==', false)
  .where("groupLocked", "==", false)
  .orderBy("locStringCount", "desc").limit(1)

  if(offSet && offSet > 0){
    query = query.offset(offSet)
  }

  let snap = await query.get()
  if(!snap.empty) {
    //try to lock it
    let recordRef = snap.docs[0].ref
    return Firestore.runTransaction(async transaction => {
      let nextSnap = await transaction.get(recordRef)
      let thisRecordGroup = nextSnap.data()
      if(thisRecordGroup.groupLocked){ //it was locked since last read
        return Promise.reject()
      }
      else {
        await transaction.update(recordRef, {groupLocked: true})
        return Promise.resolve(nextSnap) 
      }
    })
  }
  else {
    return Promise.resolve()
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
      pendingRecordGroupSnap = fetchNextRecordGroup(fetchRecordOffset)
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

  fetchRecordOffset++
  recordGroupSnap = pendingRecordGroupSnap
  pendingRecordGroupSnap = fetchNextRecordGroup(fetchRecordOffset)
  
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="select-container">
<h4>Locality strings</h4>
  {#await recordGroupSnap}
    One moment please...
  {:then}
    {#if recordGroup}
      {#if incompleteGroupLocs && incompleteGroupLocs.length}
      
        <p><i>{selectMessage}</i></p>
        <select multiple bind:value={selectedLocs}>
          {#each incompleteGroupLocs as locRecord}
            <option value={locRecord}>
              {locRecord.loc}
            </option>
          {/each}
        </select>
        <button disabled={selectedLocs.length} on:click={handleSkip}>Skip these for later...</button>
      {/if}
    {:else}
      <p>One moment please...</p>
    {/if}
  {/await}
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
}


</style>