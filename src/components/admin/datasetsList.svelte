<script>
import {onMount, createEventDispatcher} from 'svelte'
import { Firestore, FieldValue } from '../../firebase.js'
import Loader from '../loader.svelte'

export let userID

let dispatch = createEventDispatcher()

let firstTab = true

let datasets
let lastVisible
let tableHeader = ['dataset', 'collection', 'domain', 'total records', 'locality groups', 'countries', 'created', 'last georef', '% complete', 'completed']
let tableRowKeys = ['datasetName', 'collectionCode', 'domain', 'recordCount', 'groupCount', '', '', '', '', '']

$: firstTab, reset()

onMount(_ => {
  getDatasets()
})

const reset = _ => {
  lastVisible = null
  datasets = null
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
  console.log(dtAdjusted)
  let dtParts = dtAdjusted.toISOString().split(/[T\.]/g)
  dtParts.pop() //chuck it!
  return dtParts.join(' ')
}

const getDatasets = async _ => {
  datasets = null
  let collection
  if(firstTab){
    collection = 'userDatasets'
  }
  else {
    collection = 'userPendingDatasets'
  }

  let userDatasetsSnap = await Firestore.collection(collection).doc(userID).get()

  if(userDatasetsSnap.exists){
    let datasets = userDatasetsSnap.data().datasets
    let query = Firestore.collection('datasets').where('datasetID', 'in', datasets)
    .orderBy('dateCreated', 'desc')

    if(lastVisible){
      query = query.startAfter(lastVisible)
    }

    query = query.limit(20)

    let snap = await query.get()

    if(!snap.empty){
      let temp = []
      console.log(snap.size.toString(), 'datasets returned')
      snap.forEach(doc =>{
        temp.push(doc.data())
      })
      lastVisible = snap.docs[snap.docs.length-1]
      datasets = temp
    }
    else {
      datasets = []
    }
  }
}

const refresh = _ => {
  lastVisible = null
  datasets = getDatasets()
}

const acceptInvitedDataset = async datasetID => {
  let removeRef = Firestore.collection('userPendingDatasets').doc(userID)
  let removeForUser = Firestore.runTransaction(transaction => {
    return transaction.get(removeRef).then(snap => {
      if(snap.exists){
        transaction.update(removeRef, {datasets: FieldValue.arrayRemove(datasetID)})
      }
      else {
        return
      }
    })
  })

  let addRef = Firestore.collection('userDatasets').doc(userID)
  let addForUser = Firestore.runTransaction(transaction => {
    return transaction.get(addRef).then(snap => {
      if(snap.exists) {
        ransaction.update(addRef, {datasets: FieldValue.arrayUnion(datasetID)})
      }
      else {
        return
      }
    })
  })

  let updateDatasetRef = Firestore.collection('datasets').doc(datasetID)
  let updateForDataset = Firestore.runTransaction(transaction => {
    return transaction.get(updateDatasetRef).then(snap => {
      if(snap.exists){ //it should
        transaction.update(updateDatasetRef, {
          invitees: FieldValue.arrayRemove(userID),
          georeferencers: FieldValue.arrayUnion(userID)
        })
      }
      else {
        return
      }
    })
  })

  try {
    await Promise.all([removeForUser, addForUser, updateForDataset])
  }
  catch(err) {
    alert('there was an error updating invited datasets:' + err.message)
    return
  }
  //else
  let index = datasets.findIndex(x => x.datasetID == datasetID)
  if(index >= 0) { //it should be
    datasets.splice(index, 1)
    datasets = datasets //svelte
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

  let proms = []

  let ref = Firestore.collection(collection).doc(userID)
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
  
  //record invite declines
  if (collection == 'userPendingDatasets') {
    let datasetRef = Firestore.collection('datasets').doc(datasetID)
    let decline = Firestore.transaction(transaction => {
      return transaction.get(datasetRef).then(snap => {
        if(snap.exists){ //it should
          transaction.update(datasetRef, {
            invitees: FieldValue.arrayRemove(userID),
            declinedInvitees: FieldValue.arrayUnion(userID)
          })
        }
      })
    })
    proms.push(decline)
  }

  try {
    await Promise.all(proms)
  }
  catch(err) {
    alert('error updating datasets on remove: ' + err.message)
    return
  }
  //else
  
  let index = datasets.findIndex(x => x.datasetID == datasetID)
  if(index >= 0) { //it should be
    datasets.splice(index, 1)
    datasets = datasets //svelte
  }
}

const emitDataset = dataset => {
  console.log('emitting dataset', dataset.datasetID)
  dispatch('dataset-selected', dataset)
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
{#if datasets && datasets.length}
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
          <td><button on:click='{_ => acceptInvitedDataset(dataset.datasetID)}'>Accept</button></td>
        {/if}
        <td><button on:click={_ => removeDataset(dataset.datasetID)}>Remove</button></td>
      </tr>
    {/each}
  </table>
  {:else}
    No datasets to show
  {/if}
  <button on:click={refresh} >Start over</button>
  <button on:click={getDatasets} >Show next</button>
{:else}
  <Loader />
{/if}


<!-- ############################################## -->
<style>

.tabs {
  display: grid;
  grid-template-columns: auto auto;
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
  background-color:#e6f2ff;
  font-weight:500;
}

th {
  background-color: lightgray;
}

.tr-hover:hover {
	background-color: lightgray;
	cursor: pointer;
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
</style>