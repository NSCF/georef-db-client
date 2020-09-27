<script>
import { createEventDispatcher } from 'svelte';
import { Realtime, Firestore, Storage } from '../firebase.js'
import groupLocalities from '../CSVUtilities/groupLocalities.js'

const dispatch = createEventDispatcher();

export let fileForGeoref
export let localityRecordIDMap
export let datasetDetails

let localityGroups = undefined
let errorsInGettingGroups = false

let uploadErrors = false
let uploadErrorMessage = ''
let allDone = false

$: localityRecordIDMap, getLocGroups()
$: localityGroups, lockAndLoad() //I couldn't help myself...
$: if(allDone) dispatch('upload-complete')

const getLocGroups = async () => { 
  if(localityRecordIDMap){
    //first test database permissions, get one group
    try {
      console.log('testing Firestore permissions')
      let res = await Firestore.collection('recordGroups').doc('00aBJzjYjGvXJnZhb67H').get()
    }
    catch(err) {
      console.log(err.message)
      uploadErrors = true
      uploadErrorMessage = err.message
      return
    }

    try {
      localityGroups = await groupLocalities(localityRecordIDMap, datasetDetails.datasetID)
      console.log('localitygroups updated')
    }
    catch(err) {
      console.log(err.message)
      dispatch('error-with-textpack', err)
    }
  }
}

const lockAndLoad = async () => {
  console.log('firing lock and load')
  if(localityGroups) {
    let totalRecordCount = localityGroups.reduce((total, localityGroup) => total + localityGroup.groupRecordCount, 0)
    console.log('prepping for data upload')
    datasetDetails.datasetURL = '' //to be updated shortly
    datasetDetails.recordCount = totalRecordCount 
    datasetDetails.recordsCompleted = 0
    datasetDetails.groupCount = localityGroups.length
    datasetDetails.groupsComplete = 0
    datasetDetails.dateCreated = Date.now()
    datasetDetails.lastGeoreference = ''
    datasetDetails.completed = false
    datasetDetails.dateCompleted = null

    let dataLoaders = []
    dataLoaders.push(Firestore.collection('datasets').add(datasetDetails))

    let fileUploadRef = Storage.ref().child(`${datasetDetails.datasetID}.csv`)
    dataLoaders.push(fileUploadRef.put(fileForGeoref))
    
    //now the groups
    let batch = Firestore.batch()
    let nextCommit = 499 //as long as we have no operations like timestamps inside each group, this should be fine, 500 at a time
    let i = 0
    while (i < localityGroups.length) {
      
      let ref = Firestore.collection('recordGroups').doc()
      batch.set(ref, localityGroups[i])
      
      if(i == nextCommit || i == localityGroups.length - 1) {
        dataLoaders.push(batch.commit())
        batch = Firestore.batch() // a new one
        nextCommit += 500
      }

      i++
      
    }

    //first is the ref for the dataset doc, second is the snapshot of the file upload
    try {
      console.log('saving data')
      let loadResults = await Promise.all(dataLoaders)
      let fileStorageURL = await loadResults[1].ref.getDownloadURL()
      console.log('updating dataset record with file URL')
      await loadResults[0].update({ datasetURL: fileStorageURL })
      allDone = true
    }
    catch(ex){
      console.log("error loading data:", ex.message)
      uploadErrors = true;
      uploadErrorMessage = ex.message
    }
  }
  //no else here
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<h2>One moment please while we process the localities</h2>
<div>
  {#if uploadErrors}
    <p>There was a problem with the upload:</p>
    <p>{uploadErrorMessage}</p>
  {:else}
    We need a spinner here
  {/if}
</div>

<!-- ############################################## -->
<style>
h2 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
	}
</style>