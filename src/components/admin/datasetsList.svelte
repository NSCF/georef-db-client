<script>

import {onMount, createEventDispatcher} from 'svelte'
import { Firestore, Realtime as Firebase, FieldValue } from '../../firebase.js'
import Loader from '../loader.svelte'

export let profile

let dispatch = createEventDispatcher()

let firstTab = true

let datasetsFetched = false
let userDatasetIDs = null //this is the Object of current and invited dataset IDs
let focalDatasetIDs = [] //the current or the invited datasets, we start with null
let datasets = [] //this is the list of dataset objects to show in the ui
let lastDatasetSnap = null

//for keeping track of searches
let lastDatasetIDIndex = 0
let fetchSize = 10 //the page size


$: firstTab, reset()

onMount(async _ => {
  //first time we actually use a listener on Firestore
  Firestore.collection('userDatasets').doc(profile.uid).onSnapshot(userDatasetsSnap => {
    if(userDatasetsSnap.exists) { //it must

      let mustReset = false //so that we can do reset() on the first load
      if(!userDatasetIDs) {
        mustReset = true
      }

      userDatasetIDs = userDatasetsSnap.data()

      if(mustReset) {
        reset()
      }
    }
  })  
})

const reset = _ => {
  datasets = []
  lastDatasetSnap = null
  fetchDatasets()
}

const getLocalDate = timestamp => {
  if(!timestamp) return ''

  if (typeof timestamp == 'object') {
    timestamp = timestamp.seconds * 1000 //to adjust for using servertimestamp
  }
  
  let dt = new Date(timestamp)
  let dtParts = new Date(dt.getTime() - dt.getTimezoneOffset() * 60 * 1000).toISOString().split('T')
  return dtParts[0]
}

const getLocalDateTime = timestamp => {
  
  if(!timestamp) return ''

  if (typeof timestamp == 'object') {
    timestamp = timestamp.seconds * 1000 //to adjust for using servertimestamp
  }

  let dt = new Date(timestamp)
  let dtAdjusted = new Date(dt.getTime() - dt.getTimezoneOffset() * 60 * 1000)
  let dtParts = dtAdjusted.toISOString().split(/[T\.]/g)
  dtParts.pop() //chuck it!
  return dtParts.join(' ')
}

//this fetches a datasets from the db based on a set of datasetIDs
const fetchDatasets = async _ => {

  datasetsFetched = false

  let searchField
  if(firstTab){
    searchField = 'georeferencers'
  }
  else {
    searchField = 'invitees'
  }
  
  let qry = Firestore.collection('datasets')
    .where(searchField, 'array-contains', profile.uid) //the security rule
    .where('completed', '==', false)
    .orderBy('dateCreated', 'desc')
    .limit(10)

  if (lastDatasetSnap) {
    qry = qry.startAfter(lastDatasetSnap)
  }
  
  console.log('fetching datasets')
  try {
    let datasetSnaps = await qry.get()
    if(datasetSnaps.empty) {
      datasets = []
      lastDatasetSnap = null
      console.log('no datasets fetched')
    }
    else {
      datasets = datasetSnaps.docs.map(x => x.data())
      lastDatasetSnap = datasetSnaps.docs[datasetSnaps.docs.length -1]
      console.log(datasets.length, 'datasets fetched')
    }
    datasetsFetched = true
  }
  catch(err) {
    console.log(err.message)
    throw new Error('error fetching datasets: ' + err.message)
  }
}

const acceptInvitedDataset = async datasetID => {
  let fbDataset = Firestore.collection('datasets').doc(datasetID)
  let fbUserDatasets = Firestore.collection('userDatasets').doc(profile.uid)
  try {
    let datasetUpdate = fbDataset.update({
      invitees: FieldValue.arrayRemove(profile.uid),
      georeferencers: FieldValue.arrayUnion(profile.uid)
    })

    let userDatasetsUpdate = fbUserDatasets.update({
      invited: FieldValue.arrayRemove(datasetID), 
      current: FieldValue.arrayUnion(datasetID)
    })

    await Promise.all([datasetUpdate, userDatasetsUpdate])

    reset()
    
  }
  catch(err) {
    alert(err.message)
    return
  }
}

const removeCurrent = async datasetID => {
  
  let conf = confirm('Are you certain you want to remove this dataset from your list permanently?')
  if(conf) {
    let fbDataset = Firestore.collection('datasets').doc(datasetID)
    let fbUserDatasets = Firestore.collection('userDatasets').doc(profile.uid)
    
    //we update based on whether they have georeferenced or not
    let datasetUpdate = {
      georeferencers: FieldValue.arrayRemove(profile.uid)
    }

    //check stats
    let ref = Firebase.ref(`stats/perDataset/${datasetID}/perUser/${profile.uid}/recordsGeoreferenced`)
    let snap = await ref.once('value')
    if(snap.exists()){
      datasetUpdate.pastGeoreferencers = FieldValue.arrayUnion(profile.uid)
    }
    else {
      datasetUpdate.declinedInvitees = FieldValue.arrayUnion(profile.uid)
    }

    let fbDatasetUpdate = fbDataset.update(datasetUpdate)

    //thankfully the user dataset us much simpler...
    let userDatasetsUpdate = fbUserDatasets.update({
      current: FieldValue.arraryRemove(datasetID)
    })

    try {
      await Promise.all([fbDatasetUpdate, userDatasetsUpdate])
    }
    catch(err) {
      console.error(err)
      alert('error updating database:', err.message)
    }
  }
}

const removeInvited = async datasetID => {
  let conf = confirm('Are you certain you want to decline this invitation to georeference this dataset?')

  if(conf) {
    let fbDataset = Firestore.collection('datasets').doc(datasetID)
    let fbUserDatasets = Firestore.collection('userDatasets').doc(profile.uid)
    let fbDatasetUpdate = fbDataset.update({
      invitees: FieldValue.arrayRemove(profile.uid),
      declinedInvitees: FieldValue.arrayUnion(profile.uid)
    })

    let fbUserDatasetsUpdate = fbUserDatasets.update({
      invited: FieldValue.arrayRemove(datasetID)
    })

    try {
      await Promise.all([fbDatasetUpdate, fbUserDatasetsUpdate])
    }
    catch(err) {
      console.error(err)
      alert('error updating database:', err.message)
    }
  }
}

const emitDataset = dataset => {
  if(firstTab) {
    dispatch('dataset-selected', dataset)
  }
  else {
    alert('please accept invitation to this dataset to start georeferencing')
  }
}
</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="datasetlist-container">
  <div class="tabs">
    <div class="tab" class:tab-selected={firstTab} on:click='{_ => firstTab = true}'>
      Current datasets
    </div>
    <div class="tab" class:tab-selected={!firstTab} on:click='{_ => firstTab = false}'>
      Invited datasets
    </div>
  </div>
  <div class="datasetslist-content">
    {#if datasetsFetched}
      {#if datasets.length}
        <table>
          <tr>
            <th>Dataset</th> <!-- dataset name-->
            <th>Collection</th>
            <th>Region</th>
            <th>Domain</th>
            <th>Created</th>
            <th>Completed</th>
            <th>Total Records</th>
            <th>Locality Groups</th>
            <!-- <th>Records Complete</th>
            <th>Groups Complete</th> -->
            <th>Last Georef</th>
            {#if !firstTab}
              <th>Accept</th>
            {/if}
            <th>Remove</th>
          </tr>
          {#each datasets as dataset, index}
            <tr class="tr-hover" class:oddrow={index%2} on:click={emitDataset(dataset)}>
              <td>{dataset.datasetName || null}</td>
              <td>{dataset.collectionCode || null}</td>
              <td>{dataset.region || null}</td>
              <td>{dataset.domain || null}</td>
              <td>{dataset.dateCreated ? getLocalDate(dataset.dateCreated) : ''}</td>
              <td>{ dataset.completed? getLocalDate(dataset.dateCompleted) : 'NA' }</td>
              <td>{dataset.recordCount} ({Math.round(dataset.recordsCompleted / dataset.recordCount * 100)}% complete)</td>
              <td>{dataset.groupCount} ({Math.round(dataset.groupsComplete / dataset.groupCount * 100)}% complete)</td>
              <!-- <td>{dataset.recordsCompleted} ({Math.round(dataset.recordsCompleted / dataset.recordCount * 100)}%)</td>
              <td>{dataset.groupsComplete} ({Math.round(dataset.groupsComplete / dataset.groupCount * 100)}%)</td> -->
              <td>{dataset.lastGeoreference? getLocalDateTime(dataset.lastGeoreference) : null}</td>
              {#if !firstTab}
                <td class="table-button"><button on:click|stopPropagation='{_ => acceptInvitedDataset(dataset.datasetID)}'>Accept</button></td>
                <td class="table-button"><button on:click|stopPropagation={_ => removeInvited(dataset.datasetID)}>Decline</button></td>
              {:else}
                <td class="table-button"><button on:click|stopPropagation={_ => removeCurrent(dataset.datasetID)}>Remove</button></td>
              {/if}
            </tr>
          {/each}
        </table>      
      {:else}
        <div class="nodatasets">
          No datasets to show
        </div>  
      {/if}
      <div>
        <button on:click={reset} >Start over</button>
        <button disabled={!datasets || !datasets.length} on:click={fetchDatasets} >Show next</button>
      </div>
    {:else}
      <Loader />
    {/if} 
  </div> 
</div>

<!-- ############################################## -->
<style>

 .datasetlist-container {
   display:flex;
   flex-direction: column;
   width:100%;
   height:100%;
   padding-top:50px;
 }

.tabs {
  display: grid;
  grid-template-columns: auto auto;
  width: 400px;
  height: 40px;
}

.tab {
  text-align:center;
  border-bottom: 5px solid #99ccff;
}
.tab:hover {
  cursor:pointer
}

.tab-selected {
  background-color:#b6d8fc;
  font-weight:500;
}

.datasetslist-content {
  flex: 1;
  overflow-y:auto;
}

th {
  background-color: lightgray;
}

.tr-hover:hover {
	background-color: lightgray;
	cursor: pointer;
}

.tr-hover:hover .table-button {
  background-color: transparent;
}

.oddrow {
  background-color: #E0E0E0;
}

button {
  background-color: lightgray;
}

button:hover {
  background-color:grey;

}

.nodatasets {
  margin:20px;
  font-weight:bolder;
}


</style>