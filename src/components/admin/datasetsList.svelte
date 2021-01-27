<script>
import {onMount, createEventDispatcher} from 'svelte'
import { Firestore } from '../../firebase.js'

let dispatch = createEventDispatcher()

let datasets = new Promise(resolve => {console.log('initiated datasets')})
let lastVisible
let tableHeader = ['dataset', 'collection', 'domain', 'total records', 'locality groups', 'countries', 'created', 'last georef', '% complete', 'completed']
let tableRowKeys = ['datasetName', 'collectionCode', 'domain', 'recordCount', 'groupCount', '', '', '', '', '']

onMount(_ => {
  showNext()
})

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

  console.log('fetching datasets')
  let query = Firestore.collection('datasets')
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
    return Promise.resolve(temp)
  }
  return Promise.reject(new Error('No more datasets'))
}

const refresh = _ => {
  lastVisible = null
  datasets = getDatasets()
}

const showNext = _ => {
  datasets = getDatasets()
}

const emitDataset = dataset => {
  console.log('emitting dataset', dataset.datasetID)
  dispatch('dataset-selected', dataset)
}
</script>

<!-- ############################################## -->
<!-- HTML -->
<div></div> <!-- This is needed otherwise the table doesnt show  -->
{#await datasets}
  One moment please...
{:then records}
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
    </tr>
    {#each records as dataset, index}
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
      </tr>
    {/each}
  </table>
  
{:catch err}
<p style="color:tomato">{err.message}</p>
{/await}
<button on:click={refresh} >Start over</button>
<button on:click={showNext} >Show next</button>

<!-- ############################################## -->
<style>

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