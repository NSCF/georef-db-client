<script>
import {onMount, createEventDispatcher} from 'svelte'
import { Firestore, FieldValue } from '../../firebase.js'
import Loader from '../loader.svelte'

export let profile

let dispatch = createEventDispatcher()

let firstTab = true

let datasets = null
let datasetIDs
let firstInd = 0

$: firstTab, reset()

const reset = _ => {
  datasets = null
  datasetIDs = null
  firstInd = 0
  getDatasets()
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

const getDatasets = async _ => {
  
  let collection
  if(firstTab){
    collection = 'userDatasets'
  }
  else {
    collection = 'userPendingDatasets'
  }

  //get the IDs
  if(!datasetIDs) {
    let userDatasetsSnap = await Firestore.collection(collection).doc(profile.uid).get()
      if(userDatasetsSnap.exists){
        let searchDatasets = userDatasetsSnap.data().datasets
        if (!searchDatasets || !searchDatasets.length){
          console.log('no datasetIDs returned')
          datasetIDs = []
          datasets = []
          return
        } 
        else {
          datasetIDs = searchDatasets.map(x=>x.trim())
        }
      }
      else {
        console.log('no datasets document exists for this user') //will happen on first registration if they have no datasets
        datasetIDs = []
        datasets = []
        return
      }
  }

  //we have datasetIDs
  let lastInd = firstInd + 10 //we can only call ten at a time remember end not included in slice
  let queryDatasetIDs = datasetIDs.slice(firstInd, lastInd)
  firstInd += 10 //for the next time

  //we can't sort because the IDs are random
  let snap = await Firestore.collection('datasets').where('datasetID', 'in', queryDatasetIDs).get()

  if(!snap.empty){
    let temp = []
    snap.forEach(doc =>{
      temp.push(doc.data())
    })
    datasets = temp
  }
  else { //no datasets returned, this should not happen
    console.log('got no datasets')
    datasets = []
  }
}

const refresh = _ => {
  firstInd = 0
  getDatasets()
}

const acceptInvitedDataset = async datasetID => {
  //update the database
  let removeRef = Firestore.collection('userPendingDatasets').doc(profile.uid)
  let removeForUser = removeRef.update({datasets: FieldValue.arrayRemove(datasetID)})

  let addRef = Firestore.collection('userDatasets').doc(profile.uid)
  let addForUser = Firestore.runTransaction(transaction => {
    return transaction.get(addRef).then(snap => {
      if(snap.exists) {
        return transaction.update(addRef, {datasets: FieldValue.arrayUnion(datasetID)})
      }
      else {
        return transaction.set(addRef, {datasets: [datasetID]})
      }
    })
  })

  let updateDatasetRef = Firestore.collection('datasets').doc(datasetID)
  let updateForDataset = await Firestore.runTransaction(transaction => {
    return transaction.get(updateDatasetRef).then(snap => {
      if(snap.exists){ //it should
        return transaction.update(updateDatasetRef, {
          invitees: FieldValue.arrayRemove(profile.uid),
          georeferencers: FieldValue.arrayUnion(profile.uid)
        })
      }
      else {
        return
      }
    })
  })

  datasets = null
  try{
    await Promise.all(addForUser, removeForUser, updateForDataset)
  }
  catch(err) {
    alert('there was an error updating dataset invitations') //hopefully we won't have this
  }
  
  //to update the UI this should work
  firstTab = true;
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

  let proms = []

  let ref = Firestore.collection(collection).doc(profile.uid)
  let removeForUser = Firestore.runTransaction(transaction => {
    return transaction.get(ref).then(snap => {
      if(snap.exists){ //it should
        transaction.update(ref, {datasets: FieldValue.arrayRemove(datasetID)})
      }
      else {
        return
      }
    })
  })

  proms.push(removeForUser)
  
  
  let datasetRef = Firestore.collection('datasets').doc(datasetID)

  if (collection == 'userPendingDatasets') { //record invite declines
    let decline = Firestore.runTransaction(transaction => {
      return transaction.get(datasetRef).then(snap => {
        if(snap.exists){ //it should
          transaction.update(datasetRef, {
            invitees: FieldValue.arrayRemove(profile.uid),
            declinedInvitees: FieldValue.arrayUnion(profile.uid)
          })
        }
      })
    })
    proms.push(decline)
  }
  else { //this is a georeferencer that has now removed the dataset
    let leave = Firestore.runTransaction(transaction => {
      return transaction.get(datasetRef).then(snap => {
        if(snap.exists){ //it should
          transaction.update(datasetRef, {
            georeferencers: FieldValue.arrayRemove(profile.uid)})
        }
      })
    })
    proms.push(leave)
  }

  try {
    datasets = null
    await Promise.all(proms)
    reset()
  }
  catch(err) {
    alert('error updating datasets on remove: ' + err.message)
    return
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
<div></div> <!-- This is needed otherwise the table doesnt show  -->
<div class="tabs">
	<div class="tab" class:tab-selected={firstTab} on:click='{_ => firstTab = true}'>
		Current datasets
	</div>
	<div class="tab" class:tab-selected={!firstTab} on:click='{_ => firstTab = false}'>
		Invited datasets
	</div>
</div>
{#if datasets}
  {#if datasets.length}
  <div></div><!-- This is needed otherwise the table doesnt show  -->
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
    <button on:click={refresh} >Start over</button>
    <button disabled={!datasets.length} on:click={getDatasets} >Show next</button>
  </div>
{:else}
  <Loader />
{/if}  

<!-- ############################################## -->
<style>

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