<script>
import shortid from 'shortid'

import RecordGroup from './georefRecordGroup.svelte'
import MatchList from './georefMatchList.svelte'
import MatchMap from './georefMatchMap.svelte'
import GeorefForm from './georefForm.svelte'

import { geoRefs } from './georefStore.js'

import {Firestore} from '../../firebase.js'
import {onMount} from 'svelte'

let pendingRecordGroup
let nextFetched = false

let recordGroup = {locRecords: []} //empty to start, to get from Firebase
let recordGroupRef
let datsetID = '' //to get from firebase
let selectedLocs

let selectedGeoref
let datasetComplete = false

$: if(nextFetched) {
  if (recordGroup == null){
    setCurrentRecordGroup() //we need this because we might have to wait for the next group
  }
}

$: incompleteGroupLocs = recordGroup.locRecords.filter(x=>x.completed == false)

$: $geoRefs.currentGeoref, selectedGeoref = $geoRefs.currentGeoref //send it to the form

onMount(async _ => { //TODO update this to maintain a list of available (not locked) groups
  await fetchNextRecordGroup()


})

onDestroy(async _ => {
  //release the pending record if there is one
})

const fetchNextRecordGroup = async _ => {
  console.log('fetching record group from Firestore')
  
  nextFetched = false
  let query = Firestore.collection('recordGroups')
  .where('completed', '==', false)
  .where("groupLocked", "==", false)
  .orderBy("locStringCount", "desc").limit(1)

  let snap = await query.get()
  if(!snap.empty) {
    //try to lock it
    let recordRef = snap.docs[0].ref
    Firestore.runTransaction(transaction => {
      return transaction.get(recordRef).then(doc => {
        let record = doc.data()
        if(record.groupLocked){ //it was locked since last read
          return Promise.reject()
        }
        else {
          transaction.update(recordRef, {groupLocked: true})
          return record
        }
      })
    }).then(record => {
      //the lock was successful
      pendingRecordGroup = record
      nextFetched = true
    }).catch( async _ => {
      //the lock was unsuccessful
      await fetchNextRecordGroup() 
    })
  }
  else {
    nextFetched = true //even though there isn't one
    pendingRecordGroup = null
  }
}

const setCurrentRecordGroup = _ => {
  if(nextFetched){
    if(pendingRecordGroup){
      recordGroup = pendingRecordGroup
      pendingRecordGroup = null
      recordGroup.locRecords.forEach(x => {
        if (!x.completed){
          x.complete = false
        } 
      })
      fetchNextRecordGroup() // no await as we assume it will happen in the background while georeferencing this group
    } 
    else {
      datasetComplete = true
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

const handleSetGeoref = async ev => {
  let geoRef = ev.detail.geoRef
  let selectedLocRecordIDs = selectedLocs.reduce((a,b) => [...a, ...b.recordIDs], [])
  if(geoRef.georefID) { //it's an existing georef
    // update the georef on firebase to indicate used in this dataset
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
  


}

const markComplete = _ => {
  selectedLocs.forEach(loc =>loc.completed = true)
  incompleteGroupLocs = recordGroup.locRecords.filter(x => !x.completed)
}

const handleBackToDatasets = _ => {
  //TODO
}
</script>

<!-- ############################################## -->
{#if !datasetComplete}
  
  <div class="row">
    <div class="column">
      {#if nextFetched}
        <RecordGroup groupLocs={incompleteGroupLocs} on:selected-locs={handleSelectedLocs}></RecordGroup>
      {:else }
        One moment please...
      {/if}
    </div>
    <div class="column" style="background-color:#bbb;">
      <MatchList />
      <MatchMap />
    </div>
    <div class="column">
      <GeorefForm geoRef={selectedGeoref} on:set-georef={handleSetGeoref}/>
    </div>
  </div>
{:else}
  <div style="text-align:center;margin-top:300px">
    <h3>All the records for this dataset have been georeferenced</h3>
    <button on:click={handleBackToDatasets}>Back to datasets...</button>
  </div>
{/if}

<!-- ############################################## -->
<style>
* {
  box-sizing: border-box;
}

.row {
  display: flex;
}

/* Create two equal columns that sits next to each other */
.column {
  flex: 30%;
  padding: 10px;
}
</style>