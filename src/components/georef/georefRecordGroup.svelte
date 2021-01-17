<script>
import { onMount, onDestroy, createEventDispatcher } from 'svelte';
import { Firestore, FieldValue } from '../../firebase.js'

import { dataStore } from './dataStore.js'

import shortid from 'shortid'

const dispatch = createEventDispatcher();

export let datasetID

let notGeoreferenced
let selectedLocs = []
let changesMade = false //a flag for whether to update on the database when skipping or not

//filter only those not yet georeferened
//canning this for now
/*
const filterGroupLocalities = _ => {
  if($dataStore.recordGroup && $dataStore.recordGroup.groupLocalities.length){
    console.log('filtering records')
    notGeoreferenced = $dataStore.recordGroup.groupLocalities.filter(x => !x.georefID)
  }
  else {
    notGeoreferenced = null
  }
}
*/

const handleGroupLocClick = (ev, index) => {
  ev.preventDefault()
  if(ev.ctrlKey){
    $dataStore.recordGroup.groupLocalities[index].selected = !$dataStore.recordGroup.groupLocalities[index].selected
  }
  else if (ev.shiftKey){
    let maxSelectedIndex
    for (let i = 0; i < $dataStore.recordGroup.groupLocalities.length; i++){
      if ($dataStore.recordGroup.groupLocalities[i].selected){
        maxSelectedIndex = i
      }
    }

    for (let g of $dataStore.recordGroup.groupLocalities){
      g.selected = false
    }

    if(maxSelectedIndex< index){
      [index, maxSelectedIndex] = [maxSelectedIndex, index]
    }

    if(index < maxSelectedIndex){
      for (let i = index; i <= maxSelectedIndex; i++){
        $dataStore.recordGroup.groupLocalities[i].selected = true
      }
    }
    else {
      $dataStore.recordGroup.groupLocalities[index].selected = true
    }
  }
  else {
    for (let g of $dataStore.recordGroup.groupLocalities){
      g.selected = false
    }
    $dataStore.recordGroup.groupLocalities[index].selected = true
  }
}

let recordsGroupsSaving = [] //for Promise.all before leaving
let georefsSaving = []

//$: recordGroupSnap, updateRecordGroup()
/*
$: incompleteGroupLocs = recordGroup.locRecords.filter(x=>!x.completed)
$: incompleteGroupLocs, toNextOrNotToNext()
*/

//$: selectedGeoref, updateLocGeorefs() //this is the heavy lifting


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
  dispatch('skip-recordgroup')
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="select-container">
<h4>Locality strings</h4>
  {#if $dataStore.recordGroup}
    <p><i>Select the items below that represent the same locality and then choose and apply or create an appropriate georeference</i></p>
    <div class="div-select" >
      {#each $dataStore.recordGroup.groupLocalities as groupLoc, i}
        <div hidden={groupLoc.georefID}>
          <div class:div-selected="{groupLoc.selected}" on:click="{ev => handleGroupLocClick(ev,i)}">
            <p>{groupLoc.loc}</p>
          </div>
          {#if i < $dataStore.recordGroup.groupLocalities.length - 1}
            <!-- <hr/> -->
          {/if}
        </div>
      {/each}
    </div>
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

.div-select {
  width:100%;
  height: 500px;
  overflow:auto;
}

.div-selected {
  background-color:aliceblue 
}

</style>