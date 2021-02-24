<script>
import { Firestore, FieldValue, Realtime as Firebase } from '../../firebase.js'
import {onMount, onDestroy, createEventDispatcher} from 'svelte'
import { nanoid } from "nanoid/nanoid.js" //see https://github.com/ai/nanoid/issues/237

import {
    updateGeorefStats,
    updateDatasetStats, 
    fetchCandidateGeorefs,
    updateGeorefRecords
  } from './georefFuncs.js'

import { dataStore } from './dataStore.js'

import GeorefStats from '../georefStats.svelte'
import RecordGroup from './georefRecordGroup.svelte'
import MatchList from './georefMatchList.svelte'
import MatchMap from './georefMatchMap.svelte'
import GeorefForm from './georefForm.svelte'
import CustomSearch from './customSearch.svelte'
import Toast from '../toast.svelte'

export let dataset

export let profile

let datasetRef 

$: if(Firestore) {
  datasetRef = Firestore.collection('datasets').doc('9jp8aFSneKuDjjfOuJhR')
}

let dispatch = createEventDispatcher()

//the main prop!!
let selectedGeorefCopy = null

let connected = true //we assume this, but it could cause an issue
let savingGeoref = false
let savingRecordGroup = false

let elasticindex
let ambiguous //for the ambiguous georef
let newGeorefsUsed = [] //for storing georefIDs of georefs not used before, this allows undo of setting them to used when resetting a record group
let datasetGeorefsUsed = []

//vars for custom georef searches
let customSearchString = null
let georefIndexOnHold = null
let searchingGeorefs = false

let selectedLocGeorefRemarks

let pastedDecimalCoords = null //for communication between the georef form and the movable map marker

let georefsAdded = 0 //this is the number of locality strings georeferenced
let recordsGeoreferenced = 0 //this is the number of associated records georeferenced
let datasetComplete = false //a flag to take us back to the datasets when this one is complete

let locStringsTitle = "Select the items below that represent the same locality and then choose and apply or create an appropriate georeference"

let selectedCount 
$: if($dataStore.recordGroup){
  selectedCount = $dataStore.recordGroup.groupLocalities.filter(x=>x.selected).length
}

let recordCount
let locStringsCount
$: if($dataStore.recordGroup && $dataStore.recordGroup.groupLocalities) {
  recordCount = $dataStore.recordGroup.groupLocalities.filter(x => !x.georefID).map(x=> x.recordIDs.length).reduce((a, b) => a + b, 0)
  locStringsCount = $dataStore.recordGroup.groupLocalities.filter(x => !x.georefID).length
}

//and finally the stats
//these are stats while georeferencing
let statsRefStrings = [
	`stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/georefsAdded`,
	`stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/recordsGeoreferenced`,
	`stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/daily/today/georefsAdded`,
  `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/daily/today/recordsGeoreferenced`,
  `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/weekly/yearweek/georefsAdded`,
  `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/weekly/yearweek/recordsGeoreferenced`,
  `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/monthly/yearmonth/georefsAdded`,
  `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/monthly/yearmonth/recordsGeoreferenced`,
  `stats/perDataset/${dataset.datasetID}/georefsAdded`,
  `stats/perDataset/${dataset.datasetID}/recordsGeoreferenced`
]

let statsLabels = [
	'My total georefs', 
	'My total records',
	'My georefs today',
	'My records today',
	'My georefs this week', 
  'My records this week', 
  'My georefs this month', 
  'My records this month', 
  'Total georefs',
  'Total records'
]

onMount(async _ => { 

  elasticindex = dataset.region.toLowerCase().replace(/\s+/g, '') + dataset.domain.toLowerCase()

  let userLastSnap = null

  try {
    let lastRecordGroupIDSnap = await Firebase.ref(`userDatasetLastRecordGroup/${dataset.datasetID}`).get()
    if (lastRecordGroupIDSnap.exists()){
      let recordGroupID = lastRecordGroupIDSnap.val()
      let fsSnap = Firestore.collection('recordGroups').doc(recordGroupID).get()
      if(fsSnap.exists){
        userLastSnap = fsSnap
      }
    }
  }
  catch(err){
    alert('there was an error getting last recordgroup for this user: ' + err.message)
    return
  }

  try {
    fetchNextRecordGroup(userLastSnap)
  }
  catch(err){//only if offline
  //TODO handle error
  }

  //manage connection status
  let connectedRef = Firebase.ref(".info/connected");
  connectedRef.on("value", function(snap) {
    if (snap.val() === true) {
      connected = true
    } else {
      connected = false
    }
  });

  //get the ambiguous record async
  fetch(`https://us-central1-georef-745b9.cloudfunctions.net/getambiguous?index=${elasticindex}`)
  .then(res => res.json())
  .then(data => {
    ambiguous = data //just an object with an ID, not a Georef instance...
  })
  .catch(err => {
    console.log('err getting ambiguous georef:')
    console.log(err)
  })

})

onDestroy(async _ => {
  await releaseRecordGroup()
})

const fetchNextRecordGroup = async lastSnap => {
  if(connected){

    //let try clearning the datastore here because everthing gets reset
    $dataStore.recordGroup = null
    $dataStore.recordGroupSnap = null
    $dataStore.georefIndex = null
    $dataStore.locGeorefIndex = null
    $dataStore.selectedGeoref = null

    newGeorefsUsed = [] //start over
    datasetGeorefsUsed = [] //start over

    if(selectedGeorefCopy) {
      selectedGeorefCopy = null
    }
    
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
          
          customSearchString = null //just to clear
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
      alert('no more records to georeference in this dataset')
      $dataStore.recordGroupSnap = null
      $dataStore.recordGroup = null
      $dataStore.candidateGeorefs = null
      $dataStore.selectedGeoref = null
      datasetComplete = true
    }
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
      let proms = []

      let recordsPerGeoref = {}
      for(let gl of $dataStore.recordGroup.groupLocalities){
        if(gl.georefID){ //it was georeferenced
          if(recordsPerGeoref[gl.georefID]){
            recordsPerGeoref[gl.georefID] = [...recordsPerGeoref[gl.georefID], ...gl.recordIDs]
          }
          else {
            recordsPerGeoref[gl.georefID] = gl.recordIDs
          }
        }
      }

      for(let [georefID, recordIDs] of Object.entries(recordsPerGeoref)){
        let ref = Firestore.collection('georefRecords').doc(georefID)
        let georef = $dataStore.georefIndex[georefID]
        if(!georef){
          console.log('error getting georef with id', georefID)
        }
        else {
          proms.push(updateGeorefRecords(Firestore, FieldValue, ref, georef, dataset.datasetID, recordIDs))
        }
        
      }

      proms.push(updateGeorefStats(Firebase, georefsAdded, recordsGeoreferenced, profile.uid, profile.formattedName, dataset.datasetID))
      proms.push(updateDatasetStats(Firestore, FieldValue, datasetRef, recordsGeoreferenced, profile.uid, groupComplete, datasetGeorefsUsed))
      try {
        await Promise.all(proms)
      }
      catch(err) {
        savingRecordGroup = false
        console.log(err)
        alert('there was an error updating stats: ' + err.message)
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

const handleCustomSearchSearching = _ => {
  georefIndexOnHold = $dataStore.georefIndex
  $dataStore.georefIndex = null
}

const handleCustomGeorefs = ev => {
  let customGeorefs = ev.detail
  $dataStore.georefIndex = customGeorefs
}

const handleCustomSearchCleared = _ => {
  if(georefIndexOnHold) {
    $dataStore.georefIndex = georefIndexOnHold
    georefIndexOnHold = null
  }
}

const handleGeorefSelected = _ => {
  selectedGeorefCopy = $dataStore.selectedGeoref.copy() //a deep copy
}

const handleClearGeoref = _ => {
  if($dataStore.selectedGeoref) {
    let selectedMarker = $dataStore.markers[$dataStore.selectedGeoref.georefID]
    selectedMarker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 5, 
      fillColor: 'green', 
      fillOpacity: 1,
      strokeColor: 'green'
    })

    selectedMarker.setZIndex(0)

    $dataStore.selectedGeoref.selected = false
    $dataStore.selectedGeoref = null
    selectedGeorefCopy = null

  }
}

const handleFlagGeoref = ev => {
  let georefID = ev.detail
  $dataStore.georefIndex[georefID].flagged = true
  let url = `https://us-central1-georef-745b9.cloudfunctions.net/flaggeoref?georefID=${georef.georefID}&index=${elasticindex}`
  fetch(url)
}

const handleCoordsFromPaste = ev => {
  pastedDecimalCoords = ev.detail
}

//this is the heavy lifting
const handleSetGeoref = async ev => {
  //TODO NB we need to lock everything while the georef saves
  let selectedLocs = $dataStore.recordGroup.groupLocalities.filter(x => x.selected)
  if(selectedLocs.length){ //it has to be
    let georef = ev.detail.georef
    let saveGeoref = ev.detail.saveGeoref

    if(saveGeoref){ //we treat it as a new georef
      georef.dateCreated = Date.now()
      georef.createdBy = profile.formattedName

      georef.used = true
      newGeorefsUsed.push(georef.georefID)

      if(!georef.originalGeorefSource || !georef.originalGeorefSource.trim()) {
        georef.originalGeorefSource = 'NSCF georeference database'
      }

      savingGeoref = true
      
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
        if(body.validation){
          alert('there were validation errors with these fields:' + body.validation)
        }
        console.log(body)
        alert('there was an error saving this new georeference:' + body)
        return
      }

      savingGeoref = false
      $dataStore.georefIndex[georef.georefID] = georef // so we can use it again
      selectedGeorefCopy = georef.copy() //so we don't save it again if we use it again

      if(window.pushToast) {
        window.pushToast('new georef saved')
      }
    }

    if(!georef.used) {
      // fire off the update request to the API
      georef.used = true
      let url = `https://us-central1-georef-745b9.cloudfunctions.net/georefused?georefID=${georef.georefID}&index=${elasticindex}`
      fetch(url) //no response needed here
      newGeorefsUsed.push(georef.georefID)
    }

    datasetGeorefsUsed.push(georef.georefID)
    
  
    for (let loc of selectedLocs){
      loc.georefID = georef.georefID
      loc.georefBy = profile.formattedName
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

    $dataStore.georefIndex = $dataStore.georefIndex //svelte update

    georefsAdded += selectedLocs.length
    console.log(`${georefsAdded} georefs added`)
  
    //if these were the last ones
    let withGeorefs = $dataStore.recordGroup.groupLocalities.filter(x => x.georefID).length
    let total = $dataStore.recordGroup.groupLocalities.length
    if(withGeorefs == total){
      await saveRecordGroup()
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

  if ($dataStore.recordGroupSnap) {
    await Firebase.ref(`userDatasetLastRecordGroup/${dataset.datasetID}`).set($dataStore.recordGroupSnap.id)
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

    if(newGeorefsUsed.length){
      for (let georefID of newGeorefsUsed){
        $dataStore.georefIndex[georefID].used = false
        let url = `https://us-central1-georef-745b9.cloudfunctions.net/georefused?georefID=${georefID}&index=${elasticindex}&setfalse`
        fetch(url) //no response needed here
      }
      newGeorefsUsed = []
    }

    georefsAdded = 0 
    recordsGeoreferenced = 0
  }
}

const handleAmbiguous = _ => {
  //piggy backing on setGeoref
  let fakeEv = {
    detail : {
        georef: ambiguous,
        saveGeoref: false
      }
    }
  handleSetGeoref(fakeEv)
}

const handleLocalityCopied = async => {
  if(window.pushToast) {
    window.pushToast('locality copied')
  }
}

//just to unlock a locked record group if the user closes or refreshes
const handleUnload = ev => {
  navigator.sendBeacon(`https://us-central1-georef-745b9.cloudfunctions.net/updaterecordgrouplock?groupid=${$dataStore.recordGroupSnap.id}`, '')
}

</script>

<!-- ############################################## -->
<svelte:window on:beforeunload={handleUnload} /> <!--in case the user just closes-->
{#if !datasetComplete}
  <div class="col-flex-container">
    <div class="flex-item">
      <GeorefStats {Firebase} {statsRefStrings} {statsLabels} descriptor={dataset.datasetName}/>
    </div>
    <div class="grid-container">
      <div class="recordgroup-container">
        <h4 title={locStringsTitle}>Locality strings</h4>
        <div class="recordgroup-remarks">
          <label for="slgr">Locality georef remarks</label>
          <textarea id="slgr" style="width:100%" bind:value={selectedLocGeorefRemarks} placeholder={`Add remarks about applying this georeference to ${!selectedCount || selectedCount > 1 ? 'these selected localities': 'this selected locality'} `} rows="2" />
        </div>
        <div>
          <button style="float:right;margin-left:5px;" on:click={handleBackToDatasets}>Done</button>
          <button style="float:right;margin-left:5px;" on:click={handleStartOver}>Reset</button>
          <button style="float:right;margin-left:5px;" disabled={!$dataStore.georefIndex} on:click={handleSkipRecordGroup}>Skip</button>
          <button style="float:right;margin-left:5px;" on:click={handleAmbiguous}>Ambiguous</button>
        </div>
        <div style="text-align:right;">
          <span>Localities: {locStringsCount}</span>
          <span>Records: {recordCount}</span>
        </div>
        <div class="recordgroup">
          <RecordGroup busy={savingGeoref || savingRecordGroup} on:locality-copied={handleLocalityCopied}></RecordGroup>
        </div>
      </div>
      <div class="matchlist-container">
        <h4>Candidate georeferences</h4>
        <CustomSearch bind:customSearchString {elasticindex} on:custom-search-searching={handleCustomSearchSearching} on:custom-search-cleared={handleCustomSearchCleared} on:custom-georefs={handleCustomGeorefs} />
        <div class="matchlist-flex">
          <MatchList on:georef-selected={handleGeorefSelected}/>
        </div>
        <div class="matchlist-flex-plug" />
      </div>
      <div class="matchmap-container">
        <MatchMap bind:pastedDecimalCoords on:georef-selected={handleGeorefSelected}/>
      </div>
      <div class="georef-form-container">
        <h4 class="georef-flex-header">Georeference</h4>
        <div class="georef-form-flex">
          <GeorefForm 
          georef={selectedGeorefCopy} 
          submitButtonText={"Use this georeference"} 
          on:clear-georef={handleClearGeoref} 
          on:georef-flagged={handleFlagGeoref}
          on:coords-from-paste={handleCoordsFromPaste}
          on:set-georef={handleSetGeoref}/>
        </div>
        <div class="georef-form-plug" />
      </div>
    </div>
  </div>
  <div class="stopper"/>
  <Toast />
{:else}
  <div style="text-align:center;margin-top:300px">
    <h3>There are no more records in this dataset</h3>
    <button on:click={handleBackToDatasets}>Back to datasets...</button>
  </div>
{/if}

<!-- ############################################## -->
<style>

h4 {
  color:  #bcd0ec;
  text-transform: uppercase;
  font-size: 1.5em;
	font-weight: 100;
  text-align: center;
  margin:0;
}

.col-flex-container {
  display: flex;
  height: 100%;
  flex-direction: column;
  box-sizing: border-box;
}
.flex-item {
  flex: 1 1 auto;
}

.stopper {
  position: absolute;
  height:0;
  bottom:0;
}

.grid-container {
  display: grid;
  flex: 1 1 auto;
  width: 100%;
  padding: 10px;
  margin-top:10px;
 /* min-height: 0;   NEW */
  /* min-width: 0;   NEW; needed for Firefox */
  overflow:hidden;
  box-sizing: border-box;
  grid-template-columns: minmax(0, 1fr) minmax(0, 3fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  grid-column-gap:1%;
  border-radius:4px;
  border: 2px solid #bcd0ec;
}

.recordgroup-container {
  grid-column: 1/2;
  grid-row: 1 / 3;
  display: flex;
  flex-flow: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;  /* NEW */
  min-width: 0;   /* NEW; needed for Firefox */
  overflow:hidden;
}

.recordgroup {
  flex-grow:0;
  flex-basis:100%;
  overflow:auto;
  border:1px solid #bcd0ec;
  padding:2px;
}

.recordgroup-remarks {
  text-align: center;
  flex-basis:auto;
}

.matchlist-container {
  grid-column: 2/2; 
  grid-row: 1 / 2;
  max-height: 100%;
  position:relative;
  display: flex;
  flex-flow: column;
}

.matchlist-flex {
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: initial;
  overflow-y: auto;
}

.matchlist-flex-plug {
  flex: 0 0 auto;
}

.matchmap-container {
  grid-column: 2/2;
  grid-row: 2 / 2;
}

.georef-form-container {
  grid-column: 3/3;
  grid-row: 1 / 3;
  height:100%;
  max-height:100%;
  position:relative;
  display: flex;
  flex-flow: column;
  overflow-x:hidden;
} 

.georef-flex-header {
  flex: 0 1 auto;
}

.georef-form-flex {
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  overflow-y: auto;
}

.georef-form-plug {
  flex: 0 0 auto;
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

button:hover:enabled {
  background-color:grey;
  color:white;
}

</style>