<!-- This a construction yard for building and testing components -->

<script>

import RecordGroup from './georefRecordGroup.svelte'
import {Firestore} from '../../firebase.js'
import {onMount} from 'svelte'

let recordGroupData = {locRecords: []} //empty to start, to get from Firebase
let datsetID = '' //to get from firebase
let selectedLocs
let incompleteGroupLocs

onMount(async _ => {
  console.log('fetching record group from Firestore')
  let query = Firestore.collection('recordGroups')
  .where('completed', '==', false)
  .orderBy("locStringCount", "desc").limit(1)
  let snap = await query.get()
  if(snap.docs.length) {
     recordGroupData = snap.docs[0].data()
  }
  else {
    console.log('no valid recordGroups available')
  }

  recordGroupData.locRecords.forEach(x => x['completed'] = false)
  incompleteGroupLocs = recordGroupData.locRecords

})

const handleSelectedLocs = ev => {
  selectedLocs = ev.detail.selectedLocs
  console.log(`${selectedLocs.length} localit${selectedLocs.length == 1? 'y' : 'ies'} strings selected`)
}

const markComplete = _ => {
  selectedLocs.forEach(loc =>loc.completed = true)
  incompleteGroupLocs = recordGroupData.locRecords.filter(x => !x.completed)
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<RecordGroup groupLocs={incompleteGroupLocs} on:selected-locs={handleSelectedLocs}></RecordGroup>
<button on:click={markComplete}>Mark these complete</button>
<!-- ############################################## -->
<style>
</style>