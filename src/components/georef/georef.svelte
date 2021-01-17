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
  await releaseRecordGroup()
})

const fetchNextRecordGroup = async skip => {
  console.log('fetching record group from Firestore')
  
  let query = Firestore.collection('recordGroups')
  .where('datasetID', '==', dataset.datasetID)
  .where('completed', '==', false)
  .where("groupLocked", "==", false)
  .orderBy('groupID')
  
  if(skip && skip > 0) {
    query = query.startAfter($dataStore.recordGroupSnap)
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
        console.log('adding data to datastore')
        $dataStore.recordGroupSnap = snap.docs[0]
        $dataStore.recordGroup = snap.docs[0].data()
      }
    }
    catch(err) {
      //Apparently this only happens if we are offline
      throw err
    }
    
  }
  else {
    //this signals no more records to georeference
    alert('no more records to georeference in this dataset')
    $dataStore.recordGroupSnap = null
    $dataStore.recordGroup = null
    $dataStore.candidateGeorefs = null
    $dataStore.selectedGeoref = null
    dispatch('back-to-datasets')
  }
}

const fetchCandidateGeorefs = async _ => {
  if($dataStore.recordGroup.locRecords && $dataStore.recordGroup.locRecords.length){
    let georefFetches = []//promise array

    for (let locRecord of $dataStore.recordGroup.locRecords){
      georefFetches.push(fetchGeorefsForLoc(locRecord.loc))
    }

    try {
      await Promise.all(georefFetches)
    }
    catch(err){
      alert('err getting georefs:', err.message)
      return
    }
    
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

//just a helper for above
const fetchGeorefsForLoc = async locString => {
  search = encodeURI(locString)
  let url = `https://us-central1-georef-745b9.cloudfunctions.net/getlocalities?search=${search}&index=southernafricater`
  let response = await fetch(url)
  let data = await response.json()
  return data
}

const releaseRecordGroup = async _ => {
  if($dataStore.recordGroupSnap.ref){
    console.log('updating locked recordGroup')
    await $dataStore.recordGroupSnap.ref.update({groupLocked: false})
    $dataStore.recordGroup = null
    $dataStore.candidateGeorefs = null
    $dataStore.selectedGeoref = null
  }

  return
}

const handleSkipRecordGroup = async _ => {
  await releaseRecordGroup();
  skip++
  fetchNextRecordGroup(skip)
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

const handleBackToDatasets =  async _ => {
  await releaseRecordGroup()
  $dataStore.recordGroupSnap = null
  dispatch('back-to-datasets')
}

</script>

<!-- ############################################## -->
{#if !datasetComplete}
  
  <div class="grid-container">
    <div class="recordgroup-container">
      <RecordGroup datasetID={dataset.datasetID} on:skip-recordgroup={handleSkipRecordGroup}></RecordGroup>
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