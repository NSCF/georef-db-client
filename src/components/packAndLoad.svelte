<script>
import { createEventDispatcher } from 'svelte';
import { Realtime, Firestore, Storage } from '../firebase.js'
import groupLocalities from '../CSVUtilities/groupLocalities.js'

const dispatch = createEventDispatcher();

export let fileForGeoref
export let localityRecordIDMap
export let countryCodes
export let datasetDetails

let localityGroups = undefined
let errorsInGettingGroups = false

let uploadErrors = false
let allDone = false

$: localityRecordIDMap, getLocGroups()
$: localityGroups, lockAndLoad() //I couldn't help myself...
$: allDone, dispatch('upload-complete')

const getLocGroups = async () => { 
  if(localityRecordIDMap){
    localityGroups = await groupLocalities(localityRecordIDMap, datasetDetails.datasetID, countryCodes)
    console.log('localitygroups updated')
  }
}

const lockAndLoad = async () => {
  console.log('firing lock and load')
  console.log('localityGroups is', typeof localityGroups)
  if(localityGroups) {
    if (localityGroups.failedCalls){
      console.log('there were failed calls to the group function -- we go no further')
      errorsInGettingGroups = true //TODO do something with this
    }
    else {
      console.log('uploading file and database records')
      datasetDetails.datasetURL = '' //to be updated shortly
      datasetDetails.recordCount = localityGroups.totalRecordCount
      datasetDetails.recordsCompleted = 0
      datasetDetails.groupCount = localityGroups.locGroups.length
      datasetDetails.groupsComplete = 0
      datasetDetails.dateCreated = Date.now()
      datasetDetails.lastGeoreference = ''
      datasetDetails.completed = false
      datasetDetails.dateCompleted = null
      datasetDetails.countriesIncluded = localityGroups.includedCountryCodes

      console.log('prepping for data upload')
      let dataLoaders = []
      dataLoaders.push(Firestore.collection('datasets').add(datasetDetails))

      let fileUploadRef = Storage.ref().child(`${datasetDetails.datasetID}.csv`)
      dataLoaders.push(fileUploadRef.put(fileForGeoref))
      
      //now the groups
      let batch = Firestore.batch()
      let nextCommit = 499 //as long as we have no operations like timestamps inside each group
      let i = 0
      while ( i < localityGroups.locGroups.length) {
        
        let ref = Firestore.collection('recordGroups').doc()
        batch.set(ref, localityGroups.locGroups[i])
        
        if(i == nextCommit || i == localityGroups.locGroups.length - 1) {
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
        console.log('uploading file')
        let fileStorageURL = await loadResults[1].ref().getDownloadURL()
        console.log('updating dataset record')
        await loadResults[0].update({ datasetURL: url })
        allDone = true
      }
      catch(ex){
        console.log("error loading data:", ex.message)
        uploadErrors = true;
      }
    }
  }
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div>
  {#if uploadErrors}
    <div>There was a problem with the upload</div>
  {:else}
    We need a spinner here
  {/if}
</div>

<!-- ############################################## -->
<style>
</style>