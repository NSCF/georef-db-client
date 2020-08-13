<script>
import { Firestore } from '../firebase.js'
import {onMount} from 'svelte'

let datasets 
let state = 'fetching' //just for UI control, fetching, data, nodata

onMount(async => {
  let query = Firestore.collection('datasets').where('completed', '==', false)
  let snap = query.get()
  let records = []
  for (let doc of snap.docs){
    records.push(doc.data())
  }
  if(records.length){
    state = 'data'
    datasets = records
  }
  else {
    state = 'nodata'
  }
})
</script>

<!-- ############################################## -->
<!-- HTML -->

<!-- ############################################## -->
<style>
</style>