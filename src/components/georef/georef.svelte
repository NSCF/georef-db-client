<script>
import { Firestore, FieldValue, Realtime as Firebase } from '../../firebase.js'
import {onMount, onDestroy, createEventDispatcher} from 'svelte'
import { nanoid } from "nanoid/nanoid.js" //see https://github.com/ai/nanoid/issues/237

import {
    fetchAdmins, 
    updateGeorefStats,
    updateDatasetStats, 
    fetchCandidateGeorefs
  } from './georefFuncs.js'

import { dataStore } from './dataStore.js'

import RecordGroup from './georefRecordGroup.svelte'
import MatchList from './georefMatchList.svelte'
import MatchMap from './georefMatchMap.svelte'
import GeorefForm from './georefForm.svelte'
import Toast from '../toast.svelte'

//some mock values for now
let userID = 'iansuserid'
let userName ='Engelbrecht, I.'
let datasetRef = Firestore.collection('datasets').doc('9jp8aFSneKuDjjfOuJhR')

let dispatch = createEventDispatcher()

export let dataset

let savingGeoref = false
let savingRecordGroup = false

let elasticindex

let selectedLocGeorefRemarks

let georefsAdded = 0 //this is the number of locality strings georeferenced
let recordsGeoreferenced = 0 //this is the number of associated records georeferenced
let datasetComplete = false //a flag to take us back to the datasets when this one is complete

let selectedCount 
$: if($dataStore.recordGroup){
  selectedCount = $dataStore.recordGroup.groupLocalities.filter(x=>x.selected).length
}

onMount(async _ => { 
  elasticindex = dataset.region.toLowerCase().replace(/\s+/g, '') + dataset.domain.toLowerCase()
  try {
    fetchNextRecordGroup(0)
  }
  catch(err){//only if offline
  //TODO handle error
  }
})

onDestroy(async _ => {
  await releaseRecordGroup()
})

const fetchNextRecordGroup = async lastSnap => {
  console.log('fetching record group from Firestore')

  //let try clearning the datastore here because everthing gets reset
  $dataStore.recordGroup = null
  $dataStore.recordGroupSnap = null
  $dataStore.georefIndex = null
  $dataStore.locGeorefIndex = null
  $dataStore.selectedGeoref = null
  
  let query = Firestore.collection('recordGroups')
  .where('datasetID', '==', dataset.datasetID)
  .where('completed', '==', false)
  .where("groupLocked", "==", false)
  .orderBy('groupID')
  
  if(lastSnap) {
    query = query.startAfter(lastSnap)
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
        console.log('trying for recordgroup again')
        fetchNextRecordGroup() //recursive, I'm really hoping this is right- it would theoretically stop on snap.empty
      }
      else {
        console.log('adding data to datastore')
        $dataStore.recordGroupSnap = snap.docs[0] 
        $dataStore.recordGroup = snap.docs[0].data()

        //add keys to the record group locs
        for (let loc of $dataStore.recordGroup.groupLocalities){
          if(!loc.id){
            loc.id = nanoid()
          }
        }

        georefsAdded = 0
        recordsGeoreferenced = 0
        
        console.log('fetching georefs')
        try {
          let candidateGeorefs = await fetchCandidateGeorefs($dataStore.recordGroup.groupLocalities, elasticindex)
          if(Object.keys(candidateGeorefs.georefIndex).length) {
            $dataStore.georefIndex = candidateGeorefs.georefIndex
            $dataStore.locGeorefIndex =  candidateGeorefs.locGeorefIndex
          }
          else {
            console.log('no georefs!!!')
          }
          
        }
        catch(err) {
          console.log('error fetching georefs:', err.message)
          alert('fetching georeferences failed')
        }
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
    datasetComplete = true
  }
}

const releaseRecordGroup = async _ => {
  if($dataStore.recordGroupSnap){
    await $dataStore.recordGroupSnap.ref.update({groupLocked: false})
  }
}

const saveRecordGroup = async _ => {
  if($dataStore.recordGroupSnap){
    let withGeorefs = $dataStore.recordGroup.groupLocalities.filter(x => x.georefID).length
    let total = $dataStore.recordGroup.groupLocalities.length
    let groupComplete = false
    if(withGeorefs == total){
      groupComplete = true
      $dataStore.recordGroup.completed = true
    }

    $dataStore.recordGroup.groupLocked = false

    //clean out the ids to avoid confusion later
    for (let loc of $dataStore.recordGroup.groupLocalities){
      delete loc.id
    }

    savingRecordGroup = true
    try {
      await $dataStore.recordGroupSnap.ref.set($dataStore.recordGroup) //its an overwrite
    }
    catch(err){
      alert('error saving record group:', err)
      console.log('error saving record group; see console')
      console.log(err)
      console.log($dataStore.recordGroup)
      savingRecordGroup = false
    }
    
    if(georefsAdded || recordsGeoreferenced) {
      try {
        await updateGeorefStats(Firebase, georefsAdded, recordsGeoreferenced, userID, userName)
        await updateDatasetStats(Firestore, datasetRef, recordsGeoreferenced, userID, groupComplete)
      }
      catch(err) {
        savingRecordGroup = false
        alert('there was an error updating stats:', err.message)
      }
    }

    savingRecordGroup = false
  }
}

const handleSkipRecordGroup = async _ => {
  //TODO must lock the UI for this
  if(georefsAdded){
    await saveRecordGroup()
  }
  else {
    await releaseRecordGroup();
  }

  fetchNextRecordGroup($dataStore.recordGroupSnap)
}

//this is the heavy lifting
const handleSetGeoref = async ev => {
  //TODO NB we need to lock everything while the georef saves
  let selectedLocs = $dataStore.recordGroup.groupLocalities.filter(x => x.selected)
  if(selectedLocs.length){ //it has to be
    let georef = ev.detail

    //check whether anything has changed
    let hasEdits = false
    let isNew = false
    if($dataStore.selectedGeoref) {//it may be completely new before a georef is selected
      console.log('checking georef fields')
      for (let [key, val] of Object.entries(georef)){
        if(typeof val == 'string'){
          if(!$dataStore.selectedGeoref[key] || $dataStore.selectedGeoref[key].trim() != val.trim()){
            hasEdits = true
            break;
          }
        }
        else if (typeof val == 'number'){
          if(/^-?\d+\.\d+$/.test(val)) { //its decimal
            if(/^-?\d+\.\d+$/.test($dataStore.selectedGeoref[key])) { //they're both decimal
              let diff = val - $dataStore.selectedGeoref[key]
              if(Math.abs(diff) > 0.000001){
                hasEdits = true
                break
              }
            }
          }
        }
        else {
          if(val != $dataStore.selectedGeoref[key]){
            hasEdits = true
          }
        }
      }
    }
    else {
      console.log('no georef selected, this is new')
      isNew = true
    }
  
    if(hasEdits || isNew){ //we treat it as a new georef
      console.log('updating georef ID and admin boundaries')
      georef.georefID = nanoid()

      savingGeoref = true

      //we need the admin divisions
      console.log('fetching admin names')
      try {
        let admin = await fetchAdmins(georef.decimalLatitude, georef.decimalLongitude)
        georef.country = admin.country
        georef.stateProvince = admin.stateProvince
        console.log('admin is', georef.country, georef.stateProvince)
      }
      catch(err){
        alert('error updating country and stateProvince:',err.message)
        return
      }

      if (isNew){
        georef.originalGeorefSource = 'NSCF georeference database'
        georef.verified = false
        georef.dateCreated = Date.now()
        georef.createdBy = userName
      }
      
      //save it to elastic via our API
      console.log('saving to georef database')
      let url = 'https://us-central1-georef-745b9.cloudfunctions.net/addgeoref'
      let res = await fetch(url, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: (JSON.stringify({georef, index: elasticindex}))
      })

      if(res.status != 200) {
        await navigator.clipboard.writeText(JSON.stringify(georef))
        console.log('error saving georef, see clipboard')
        let body = await res.json()
        console.log(body)
        alert('there was an error saving this new georeference:', body)
        return
      }

      savingGeoref =  false
      console.log('successfully saved')
    }

    console.log('updating record group with georef')
  
    for (let loc of selectedLocs){
      loc.georefID = georef.georefID
      loc.georefBy = userID
      loc.georefDate = Date.now()
      loc.georefVerified = false
      loc.georefVerifiedBy = null
      loc.georefVerifiedDate = null
      loc.georefVerifiedByRole = null
      loc.georefRemarks = null
      if(selectedLocGeorefRemarks) {
        loc.georefRemarks = selectedLocGeorefRemarks
      }
      if(loc.recordIDs && loc.recordIDs.length) { //this really should never be necessary
        recordsGeoreferenced += loc.recordIDs.length
      }
      loc.selected = false
      selectedLocGeorefRemarks = null
    }
    
    $dataStore.recordGroup.groupLocalities = $dataStore.recordGroup.groupLocalities //the svelte update trigger

    for (let [key, val] of Object.entries($dataStore.georefIndex)){
      val.selected = false
    }

    $dataStore.selectedGeoref = null

    //$dataStore.georefIndex = $dataStore.georefIndex //svelte update

    georefsAdded += selectedLocs.length
    console.log(`${georefsAdded} georefs added`)
  
    //if these were the last ones
    let withGeorefs = $dataStore.recordGroup.groupLocalities.filter(x => x.georefID).length
    let total = $dataStore.recordGroup.groupLocalities.length
    if(withGeorefs == total){
      console.log('saving and moving to next record group')
      await saveRecordGroup()
      console.log('record group saved')
      console.log('fetching next record group')
      fetchNextRecordGroup($dataStore.recordGroupSnap)
    }
  }
  else {
    alert('localities must be selected to apply the georeference')
    return
  }
}

const handleBackToDatasets =  async _ => {
  //TODO must lock the UI for this
  if(georefsAdded){
    await saveRecordGroup()
  }
  else {
    await releaseRecordGroup();
  }
  
  $dataStore.recordGroupSnap = null
  $dataStore.recordGroup = []
  $dataStore.selectedGeoref = null
  $dataStore.georefIndex = null

  dispatch('back-to-datasets')
}

const handleStartOver = _ => { //just clear out any georefIDs
  if($dataStore.recordGroup){
    for (let loc of $dataStore.recordGroup.groupLocalities){
      loc.georefID = null
    }
     $dataStore.recordGroup.groupLocalities = $dataStore.recordGroup.groupLocalities
  }
}

const copyLocality = async _ => {
  let selected = $dataStore.recordGroup.groupLocalities.filter(x=>x.selected)
  if(selected.length == 1){
    await navigator.clipboard.writeText(selected[0].loc).then(_ => {
      console.log('locality copied')
      if(window.pushToast) {
        window.pushToast('locality copied')
      }
    })
  }
}

</script>

<!-- ############################################## -->
{#if !datasetComplete}
  <div class="grid-container">
    <div class="recordgroup-container">
      <h4>Locality strings</h4>
      <p><i>Select the items below that represent the same locality and then choose and apply or create an appropriate georeference</i></p>
      <div>
        <button style="float:right" title="copy locality" disabled={!$dataStore.recordGroup || $dataStore.recordGroup.groupLocalities.filter(x=>x.selected).length != 1} on:click={copyLocality}><i class="material-icons md-dark">content_copy</i></button>
      </div>
      <div class="recordgroup">
        <RecordGroup busy={savingGeoref || savingRecordGroup} on:skip-recordgroup={handleSkipRecordGroup}></RecordGroup>
      </div>
      <div class="recordgroup-buttons">
        <br/>
        <label for="slgr">Locality georef remarks</label>
        <textarea id="slgr" style="width:100%" bind:value={selectedLocGeorefRemarks} placeholder={`Add remarks about applying this georeference to ${!selectedCount || selectedCount > 1 ? 'these localities': 'this locality'} `} rows="2" />
        <br/>
        <button on:click={handleStartOver}>Reset georefs...</button>
        <br/>
        <button on:click={handleSkipRecordGroup}>Skip these for later...</button>
        <br/>
        <button on:click={handleBackToDatasets}>Back to datasets...</button>
      </div>
    </div>
    <div class="matchlist-container">
      <MatchList />
    </div>
    <div class="matchmap-container">
      <MatchMap />
    </div>
    <div class="georef-form-container">
      <h4>Georeference</h4>
      <GeorefForm georef={$dataStore.selectedGeoref} submitButtonText={"Use this georeference"} on:set-georef={handleSetGeoref}/>
    </div>
  </div>
  <Toast />
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
  height: 100%;
  max-height:100%;
  overflow:none;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  grid-template-columns: 1fr 3fr 1fr;
  grid-template-rows: 1fr 1fr;
  grid-column-gap:1%;
}

.recordgroup-container {
  grid-column: 1/2;
  grid-row: 1 / 3;
  display: flex;
  flex-flow: column;
  height: 100%;
  min-height: 100%;
  max-height: 100%;
}

.recordgroup {
  flex-grow:0;
  flex-basis:100%;
  overflow:scroll;
}

.recordgroup-buttons {
  text-align: center;
  flex-basis:auto;
}

.matchlist-container {
 
  grid-column: 2/2; 
  grid-row: 1 / 2;
  max-height: 100%;
  overflow: auto;
}

.matchmap-container {

  grid-column: 2/2;
  grid-row: 2 / 2
}

.georef-form-container {
  grid-column: 3/3;
  grid-row: 1 / 3;
  
  max-height: 100%;
} 

label {
  display: inline-block;
  text-align: right;
  color:grey;
  font-weight: bolder;
}

button {
  background-color: lightgray;
}

button:hover {
  background-color:grey;
  color:white;
}

</style>