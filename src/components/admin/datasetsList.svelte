<script>
import {onMount} from 'svelte'
import { Firestore } from '../../firebase.js'

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
  return Promise.reject()
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
      {#each tableHeader as key}
        <th>{key}</th>
      {/each}
    </tr>
    {#each records as dataset}
      <tr class="tr-hover" on:click={emitDataset(dataset)}>
        {#each tableRowKeys as rowKey, index}
          {#if index < 5}
            <td>{dataset[rowKey]}</td>
          {:else if index == 5}
            <td>{dataset.countriesIncluded.join(',')}</td>
          {:else if index == 6}
            <td>{getLocalDate(dataset.dateCreated)}</td>
          {:else if index == 7}
            <td>{getLocalDateTime(dataset.lastGeoreference)}</td>
          {:else if index == 8}
            <td>{Math.round(dataset.recordsCompleted / dataset.recordCount * 100)}%</td>
          {:else}
            <td>{dataset.dateCompleted ? getLocalDate(dataset.dateCompleted) : ''}</td>
          {/if}
        {/each}
      </tr>
    {/each}
  </table>
  <button on:click={refresh} >Start over</button>
  <button on:click={showNext} >Show next</button>
{:catch err}
<p style="color:tomato">{err}</p>
{/await}

<!-- ############################################## -->
<style>
</style>