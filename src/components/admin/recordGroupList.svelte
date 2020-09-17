<script>
import {onMount} from 'svelte'
import { Firestore } from '../../firebase.js'

export let datasetID = 'WjPG1sfl6' //TODO remove when finalized
export let filterCountryCode = 'ZAF'

let recordGroups = new Promise(resolve => {console.log('initiated record groups')})
let lastVisible
let tableHeader = ['country', 'group', 'localities', 'records', 'completed']
let tableRowKeys = ['countryCode', 'groupKey', 'locStringCount', 'groupRecordCount', 'completed']


onMount(_ => {
 refreshList()
})

const getRecordGroups = async _ => {

  console.log('fetching record groups')
  let query = Firestore.collection('recordGroups')

  if(filterCountryCode){
    query = query.where("countryCode", "==", filterCountryCode)
  }

  query = query.where('datasetID', '==', datasetID)
  .where('completed', '==', false)
  .where("groupLocked", "==", false)

  if(!filterCountryCode) {
    query = query.orderBy("countryCode", "desc")
  }
  
  query = query.orderBy("groupRecordCount")

  if(lastVisible){
    query = query.startAfter(lastVisible)
  }
  
  query = query.limit(20)

  let snap = await query.get()

  if(!snap.empty){
    let temp = []
    console.log(snap.size.toString(), 'record groups returned')
    snap.forEach(doc =>{
      temp.push(doc.data())
    })
    lastVisible = snap.docs[snap.docs.length-1]
    return Promise.resolve(temp)
  }
  return Promise.reject()
}

const refreshList = _ => {
  recordGroups = getRecordGroups()
}

const emitRecordGroup = recordGroup => {
  console.log('emitting recordGroup', recordGroup.groupKey)
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div></div> <!-- This is needed otherwise the table doesnt show  -->
{#await recordGroups}
  One moment please...
{:then records}
  <div></div><!-- This is needed otherwise the table doesnt show  -->
  <table>
    <tr>
      {#each tableHeader as key}
        <th>{key}</th>
      {/each}
    </tr>
    {#each records as recordGroup}
      <tr class="tr-hover" on:click={emitRecordGroup(recordGroup)}>
        {#each tableRowKeys as rowKey}
          <td>{recordGroup[rowKey]}</td>
        {/each}
      </tr>
    {/each}
  </table>
  <button on:click={refreshList}>Show next</button>
{:catch err}
<p style="color:tomato">{err}</p>
{/await}


<!-- ############################################## -->
<style>
table {
  width:100%
}
</style>