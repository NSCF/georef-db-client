<script>

import {onMount, createEventDispatcher} from 'svelte'
import { Firestore, FieldValue } from '../../firebase.js'
import Loader from '../loader.svelte'

export let profile

let dispatch = createEventDispatcher()

let firstTab = true

let datasetsFetched = false
let userDatasetIDs = null //this is the Object of current and invited dataset IDs
let focalDatasetIDs = [] //the current or the invited datasets
let datasets = [] //this is the dataset objects to show on the ui

//for keeping track of searches
let lastDatasetIDIndex = 0
let fetchSize = 10 //the page size

$: firstTab, reset()

onMount(async _ => {
  let userDatasetsSnap = await Firestore.collection('userDatasets').doc(profile.uid).get()
  if(userDatasetsSnap.exists) {
    userDatasetIDs = userDatasetsSnap.data()
    reset()
  }
})

const reset = _ => {

  datasets = []
  lastDatasetIDIndex = 0
  if(userDatasetIDs) {
    if(firstTab) {
      focalDatasetIDs = userDatasetIDs.current
    }
    else {
      focalDatasetIDs = userDatasetIDs.invited
    }

    getDatasets()

  }
}

const getLocalDate = timestamp => {
  if(!timestamp) return ''
  
  let dt = new Date(timestamp)
  let dtParts = new Date(dt.getTime() - dt.getTimezoneOffset() * 60 * 1000).toISOString().split('T')
  return dtParts[0]
}

const getLocalDateTime = timestamp => {
  
  if(!timestamp) return ''

  let dt = new Date(timestamp)
  let dtAdjusted = new Date(dt.getTime() - dt.getTimezoneOffset() * 60 * 1000)
  let dtParts = dtAdjusted.toISOString().split(/[T\.]/g)
  dtParts.pop() //chuck it!
  return dtParts.join(' ')
}

//this fetches a datasets from the db based on a set of datasetIDs
const fetchDatasets = async (datasetIDs) => {

  let searchField
  if(firstTab){
    searchField = 'georeferencers'
  }
  else {
    searchField = 'invitees'
  }
  
  let qry = Firestore.collection('datasets')
    .where(searchField, 'array-contains', profile.uid) //the security rule
    .where('datasetID', 'in', datasetIDs)

  let datasetSnaps
  try {
    datasetSnaps = await qry.get()
  }
  catch(err) {
    throw new Error('error fetching datasets: ' + err.message)
  }

  if(datasetSnaps.empty) {
    return []
  }
  else {
    let datasets = datasetSnaps.docs.map(x => x.data())
    return datasets
  }
}

//this controls what datasets are fetched based on what is selected in the ui, current or invited
const getDatasets = async _ => {
  datasetsFetched = false //this is a reset

  if(focalDatasetIDs && focalDatasetIDs.length) { //we have dataset IDs
    let searchDatasetIDs = focalDatasetIDs.slice(lastDatasetIDIndex, fetchSize)
    if(searchDatasetIDs.length) {
      try {
        datasets = await fetchDatasets(searchDatasetIDs)
        lastDatasetIDIndex += fetchSize
      }
      catch(err) {
        alert(err.message)
        return
      }
    }
    else {
      datasets = []
    }
  }
  else {
    datasets = []
  }

  datasetsFetched = true

}


const moveUserInvitedDataset = async (datasetID, profile) => {
  let userInvitedDatasetsRef = Firestore.collection('userPendingDatasets').doc(profile.uid)
  let userDatasetsRef = Firestore.collection('userDatasets').doc(profile.uid)
  try {
    await Firestore.runTransaction(async transaction => {
      let invitedDatasetsSnap = await transaction.get(userInvitedDatasetsRef)
      if(invitedDatasetsSnap.exists) { //it should!

        let userDatasetsSnap = await transaction.get(userDatasetsRef)
        if(userDatasetsSnap.exists) {
          transaction.update(userDatasetsRef, {datasets: FieldValue.arrayUnion(datasetID)})
        }
        else {
          transaction.set(userDatasetsRef, {datasets: [datasetID]})
        }
        
        transaction.update(userInvitedDatasetsRef, {datasets: FieldValue.arrayRemove(datasetID)})
      }
    })
  }
  catch(err) {
    throw new Error('error moving invitation -- ' + err.message)
  }
}

/**
 * 
 * @param {string} datasetID - The dataset ID to update
 * @param {string} uid - a Firebase uid of the user
 * @param {Boolean} accepted - whether the invitation was accepted or not
 */
const updateDatasetInvitees = async (datasetID, uid, accepted) => {
  let ref = Firestore.collection('datasets').doc(datasetID)
  try {
      await Firestore.runTransaction(async transaction => {
      let datasetSnap = await ref.get()
      if(datasetSnap.exists) { //it should!
        if(accepted){
          transaction.update(ref, {
            georeferencers: FieldValue.arrayUnion(uid),
            invitees:FieldValue.arrayRemove(uid)
          })
        }
        else {
          transaction.update(ref, {
            declinedInvitees: FieldValue.arrayUnion(uid),
            invitees:FieldValue.arrayRemove(uid)
          })
        }
      }
    })
  }
  catch(err) {
    throw new Error('error updating dataset invitees -- ' + err.message)
  }
  return
}

const acceptInvitedDataset = async datasetID => {
  
  try{
    await moveUserInvitedDataset(datasetID, profile, true)
    await updateDatasetInvitees(datasetID, profile.uid, true)
    reset()
  }
  catch(err) {
    alert(err.message)
    return
  }
}

const removeDataset = async datasetID => {
  //this is different depending on whether it's invited or current
  let collection
  if (firstTab) {
    collection = 'userDatasets'
  }
  else {
    collection = 'userPendingDatasets'
  }

  let ref = Firestore.collection(collection).doc(profile.uid)
  let userDatasetsUpdate =  ref.update({datasets: FieldValue.arrayRemove(datasetID)}).catch(err => {
    throw new Error('error removing dataset for user --' + err.message)
  }) 
  
  let datasetUpdate
  let datasetRef = Firestore.collection('datasets').doc(datasetID)
  if (collection == 'userPendingDatasets') { //record invite declines
    datasetUpdate = Firestore.runTransaction(async transaction => {
      let snap = await transaction.get(datasetRef)
      if(snap.exists){ //it should
        await transaction.update(datasetRef, {
          invitees: FieldValue.arrayRemove(profile.uid),
          declinedInvitees: FieldValue.arrayUnion(profile.uid)
        })
      }
    }).catch(err => {
      throw new Error('error updating dataset declined invitations -- ' + err.message)
    })
  }
  else { //this is a georeferencer that has now removed the dataset
    datasetUpdate = Firestore.runTransaction(async transaction => {
      let snap = await transaction.get(datasetRef)
      if(snap.exists){ //it should
        transaction.update(datasetRef, {
          georeferencers: FieldValue.arrayRemove(profile.uid), 
          pastGeoreferencers: FieldValue.arrayUnion(profile.uid)
        })
      }
    }).catch(err => {
      throw new Error('error updating dataset georeferencers -- ' + err.message)
    })
  }

  try {
    datasets = null
    await Promise.all([userDatasetsUpdate, datasetUpdate])
    reset()
  }
  catch(err) {
    alert(err.message)
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
            <th>Records Complete</th>
            <th>Groups Complete</th>
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
              <td>{dataset.completed}</td>
              <td>{dataset.recordCount}</td>
              <td>{dataset.groupCount}</td>
              <td>{dataset.recordsCompleted} ({Math.round(dataset.recordsCompleted / dataset.recordCount * 100)}%)</td>
              <td>{dataset.groupsComplete} ({Math.round(dataset.groupsComplete / dataset.groupCount * 100)}%)</td>
              <td>{dataset.lastGeoreference? getLocalDateTime(dataset.lastGeoreference) : null}</td>
              {#if !firstTab}
                <td class="table-button"><button on:click|stopPropagation='{_ => acceptInvitedDataset(dataset.datasetID)}'>Accept</button></td>
              {/if}
              <td class="table-button"><button on:click|stopPropagation={_ => removeDataset(dataset.datasetID)}>Remove</button></td>
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
        <button disabled={!datasets || !datasets.length} on:click={getDatasets} >Show next</button>
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