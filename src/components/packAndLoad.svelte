<script>
import { createEventDispatcher } from 'svelte';
import Loader from './loader.svelte'
import {Firestore, FieldValue, Storage } from '../firebase.js'
import groupLocalities from '../CSVUtilities/groupLocalities.js'

const dispatch = createEventDispatcher();

export let fileForGeoref
export let localityRecordIDMap
export let datasetDetails
export let userID

let localityGroups = undefined

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
    dataLoaders.push(Firestore.collection('datasets').doc(datasetDetails.datasetID).set(datasetDetails))

    let fileUploadRef = Storage.ref().child(`${datasetDetails.datasetID}.csv`)
    dataLoaders.push(fileUploadRef.put(fileForGeoref))

    //add the dataset for the current user
    let ref = Firestore.collection('userDatasets').doc(userID)
    let trans = Firestore.runTransaction(transaction => {
      return transaction.get(ref).then(snap => {
        if(!snap.exists){
          ref.set({
            datasets: [datasetDetails.datasetID]
          })
        }
        else {
          transaction.update(ref, {datasets: FieldValue.arrayUnion(datasetDetails.datasetID)})
        }
      })
    })
    dataLoaders.push(trans)
    
    //add the dataset for each userID
    for (let profile of datasetDetails.invitees){
      let ref = Firestore.collection('userPendingDatasets').doc(profile.uid)
      let trans = Firestore.runTransaction(transaction => {
        return transaction.get(ref).then(snap => {
          if(!snap.exists){
            ref.set({
              datasets: [datasetDetails.datasetID]
            })
          }
          else {
            transaction.update(ref, {datasets: FieldValue.arrayUnion(datasetDetails.datasetID)})
          }
        })
      })
      dataLoaders.push(trans)
    }

    for (let email of datasetDetails.newInvitees) {
      let collRef = Firestore.collection('invitedUserPendingDatasets')
      let op = collRef.where('email', '==', email) //it's already lowercase
      .get()
      .then(querySnap => {
        if(querySnap.empty){
          return collRef.add(
            {
              email,
              datasets: [datasetDetails.datasetID]
            }
          )
        }
        else {
          //there can only be one!
          let docRef = querySnap.docs[0].ref
          return Firestore.runTransaction(transaction => {
            return transaction.get(docRef).then(docSnap => {
              //it has to exist
              transaction.update(docRef, {
                datasets: FieldValue.arrayUnion(datasetDetails.datasetID)
              })
            })
          })
        }
      })

      dataLoaders.push(op)
    }

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
<div>
  {#if uploadErrors}
    <h2>There was a problem with the upload:</h2>
    <p>{uploadErrorMessage}</p>
  {:else}
    <h2>Processing localities, this may take a few minutes...</h2>
    <Loader />
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