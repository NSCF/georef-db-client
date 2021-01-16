<script>
import { Firestore, FieldValue } from '../../firebase.js'
import {onMount, onDestroy, createEventDispatcher} from 'svelte'
import shortid from 'shortid'

import { dataStore } from './dataStore.js'

import RecordGroup from './georefRecordGroup.svelte'
/*
import MatchList from './georefMatchList.svelte'
import MatchMap from './georefMatchMap.svelte'
import GeorefForm from './georefForm.svelte'
*/

let dispatch = createEventDispatcher()

export let dataset

let skip = 0 //so we can skip a record group later if we don't want to georeference it

let selectedGeoref
let datasetComplete = false

onMount(async _ => { 
  try {
    fetchNextRecordGroup(skip)
  }
  catch(err){//only if offline
  //TODO handle error
  }
  
})

onDestroy(async _ => {
  console.log('updating locked recordGroup')
  await $dataStore.recordGroupRef.update({groupLocked: false})
  $dataStore.recordGroup = null
  $dataStore.recordGroupRef = null
  return
})

const fetchNextRecordGroup = async skip => {
  console.log('fetching record group from Firestore')
  
  let query = Firestore.collection('recordGroups')
  .where('datasetID', '==', dataset.datasetID)
  .where('completed', '==', false)
  .where("groupLocked", "==", false)
  
  if(skip && skip > 0) {
    query = query.offset(skip)
  }

  query = query.limit(1)

  let snap = await query.get() //nb this is a querysnapshot and hence snap.docs an array
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
        fetchNextRecordGroup() //recursive, I'm really hoping this is right- it would theoretically stop on snap.empty
      }
      else {
        $dataStore.recordGroupRef = docRef
        $dataStore.recordGroup = snap.docs[0].data()
      }
    }
    catch(err) {
      //Apparently this only happens if we are offline
      throw err
    }
    
  }
  else {
    //TODO this signals no more records to georeference
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

//NB TODO all this new georef stuff must be delegated to georefRecordGroup
const handleSetGeoref = async ev => {
  let geoRef = ev.detail.geoRef
  console.log('got the georef!')
  /*
  let selectedLocRecordIDs = selectedLocs.reduce((a,b) => [...a, ...b.recordIDs], [])
  if(geoRef.georefID) { //it's an existing georef
    // update the georef on firebase to indicate used in this dataset
    //TODO sort this out with a many to many
    if(geoRef.assocDatasets[datasetID]){
      geoRef.assocDatasets[datasetID] = [...geoRef.assocDatasets[datasetID], ...selectedLocRecordIDs]
      geoRef.totalAssRecords += selectedLocRecordIDs.length
    }
    else {
      geoRef.assocDatasets[datasetID] = selectedLocRecordIDs
      geoRef.totalAssRecords = selectedLocRecordIDs.length
    }

    geoRef.lastUsed = Date.now()
    //update it here
  }
  else {
    //create the new georef 
    geoRef.georefID = shortid.generate()
    geoRef.assocDatasets[datasetID] = selectedLocRecordIDs
    geoRef.totalAssRecords = selectedLocRecordIDs.length
    geoRef.dateCreated = Date.now()
    geoRef.lastUsed = Date.now()
    //TODO createdBy = logged in user name
    //save it here
  }

  //push to each of the record group locs
  for (let selectedLoc of selectedLocs) {
    for (let recordGroupLoc of recordGroup.locRecords){
      if (selectedLoc.loc == recordGroupLoc.loc){
        recordGroupLoc.georef = geoRef
        recordGroupLoc.completed = true
        break;
      }
    }
  }  

  //TODO update the Meili records with these georeferences -- this is async on the db so we send and assume it works

  //TODO if this is the last batch of locs being updated
  //save it
  if(!incompleteGroupLocs.length) {
    await recordGroupRef.update(recordGroup)
    recordGroup = null
  }
  

  */
}

const handleBackToDatasets =  _ => {
  dispatch('back-to-datasets')
}

</script>

<!-- ############################################## -->
{#if !datasetComplete}
  
  <div class="grid-container">
    <div class="recordgroup-container">
      <RecordGroup datasetID={dataset.datasetID}></RecordGroup>
      <button on:click={handleBackToDatasets}>Back to datasets...</button>
    </div>
    <!-- <div class="matchlist-container">
      <MatchList />
    </div>
    <div class="matchmap-container">
      <MatchMap />
    </div>
    <div class="georef-form-container">
      <GeorefForm geoRef={selectedGeoref} on:set-georef={handleSetGeoref}/>
    </div> -->
  </div>
{:else}
  <div style="text-align:center;margin-top:300px">
    <h3>There are no more records in this dataset</h3>
    <button on:click={handleBackToDatasets}>Back to datasets...</button>
  </div>
{/if}

<!-- ############################################## -->
<style>
.grid-container {
  display: grid;
  grid-template-columns: 20% auto 20%;
  grid-column-gap:10px;
}

.recordgroup-container {
  grid-row: 1 / 3
}

/* .matchlist-container {
  grid-row: 1 / 2
}

.matchmap-container {
  grid-row: 2 / 3
}

.georef-form-container {
  grid-row: 1 / 3
} */
</style>