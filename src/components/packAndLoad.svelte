<script>
import { createEventDispatcher } from 'svelte';
import Loader from './loader.svelte'
import {Firestore, FieldValue, Storage } from '../firebase.js'
import arrayUnion from 'array-union'
import groupLocalities from '../CSVUtilities/groupLocalities.js'

const dispatch = createEventDispatcher();

export let fileForGeoref
export let localityRecordIDMap
export let invalidCountries
export let dataset
export let userID

let localityGroups = undefined

let uploadErrors = false
let uploadErrorMessage = ''
let messageString = ''
let allDone = false

$: localityRecordIDMap, getLocGroups()
$: localityGroups, lockAndLoad() //I couldn't help myself...
$: if(allDone) dispatch('upload-complete')

const getLocGroups = async () => { 
  if(localityRecordIDMap){
    //first test database permissions, get one group
    try {
      messageString = 'testing Firestore permissions'
      let res = await Firestore.collection('recordGroups').doc('00aBJzjYjGvXJnZhb67H').get() //this throws if there is a problem
    }
    catch(err) {
      console.log(err.message)
      uploadErrors = true
      uploadErrorMessage = err.message
      return
    }

    messageString = 'grouping localities, this may take a few minutes...'
    let proms = [] //this is a temp variable so that we can assign localityGroups at the end and trigger lockAndLoad

    for (let [country, obj] of Object.entries(localityRecordIDMap)) {
      
      //skip any invalid countries for the region
      if(invalidCountries.includes(country.toLowerCase())) {
        continue
      }

      if(dataset.hasStateProvince) {
        for (let [stateProvince, val] of Object.entries(obj)) {
          proms.push(groupLocalities(val, dataset.datasetID, country, stateProvince))
        }
      }
      else {
        proms.push(groupLocalities(obj, dataset.datasetID, country, null))
      }
    }

    try {
      let groupArrays = await Promise.all(proms)
      localityGroups = arrayUnion(...groupArrays)
    }
    catch(err) {
      console.log(err.message)
      dispatch('error-with-textpack', err)
    }
  }
}

const lockAndLoad = async () => {
  messageString = 'grouping completed, firing lock and load'
  if(localityGroups) {
    let totalRecordCount = localityGroups.reduce((total, localityGroup) => total + localityGroup.groupRecordCount, 0)
    messageString = 'prepping for data upload'
    dataset.datasetURL = '' //to be updated shortly
    dataset.recordCount = totalRecordCount 
    dataset.recordsCompleted = 0
    dataset.groupCount = localityGroups.length
    dataset.groupsComplete = 0
    dataset.dateCreated = Date.now()
    dataset.lastGeoreference = ''
    dataset.completed = false
    dataset.dateCompleted = null

    let dataLoaders = []
    let datasetRef = Firestore.collection('datasets').doc(dataset.datasetID)
    dataLoaders.push(datasetRef.set(dataset))

    let fileUploadRef = Storage.ref().child(`${dataset.datasetID}.csv`)
    dataLoaders.push(fileUploadRef.put(fileForGeoref))

    //add the dataset for the current user
    let ref = Firestore.collection('userDatasets').doc(userID)
    let trans = Firestore.runTransaction(transaction => {
      return transaction.get(ref).then(snap => {
        if(!snap.exists){
          ref.set({
            datasets: [dataset.datasetID]
          })
        }
        else {
          transaction.update(ref, {datasets: FieldValue.arrayUnion(dataset.datasetID)})
        }
      })
    })
    dataLoaders.push(trans)
    
    //add the dataset for each userID
    for (let uid of dataset.invitees){
      let ref = Firestore.collection('userPendingDatasets').doc(uid)
      let trans = Firestore.runTransaction(transaction => {
        return transaction.get(ref).then(snap => {
          if(!snap.exists){
            ref.set({
              datasets: [dataset.datasetID]
            })
          }
          else {
            transaction.update(ref, {datasets: FieldValue.arrayUnion(dataset.datasetID)})
          }
        })
      })
      dataLoaders.push(trans)
    }

    for (let email of dataset.newInvitees) {
      let collRef = Firestore.collection('invitedUserPendingDatasets')
      let op = collRef.where('email', '==', email) //it's already lowercase
      .get()
      .then(querySnap => {
        if(querySnap.empty){
          return collRef.add(
            {
              email,
              datasets: [dataset.datasetID]
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
                datasets: FieldValue.arrayUnion(dataset.datasetID)
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
      messageString = 'saving data'
      let loadResults = await Promise.all(dataLoaders)
      let fileStorageURL = await loadResults[1].ref.getDownloadURL()
      messageString = 'updating dataset record with file URL'
      await datasetRef.update({ datasetURL: fileStorageURL })
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
    <div style="height:300px">
      <Loader />
    </div>
    <div style="text-align:center">{messageString}</div>
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