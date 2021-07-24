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
let countryProvs = {} //to store the countries and provinces for the dataset

let uploadErrors = false
let uploadErrorMessage = ''
let messageString = ''
let allDone = false

$: localityRecordIDMap, getLocGroups()
$: localityGroups, loadToDatabase() //I couldn't help myself...
$: if(allDone) dispatch('upload-complete')

const getLocGroups = async () => { 
  if(localityRecordIDMap){

    messageString = 'grouping localities, this may take a few minutes...'
    let proms = [] //this is a temp variable so that we can assign localityGroups at the end and trigger lockAndLoad

    for (let [country, obj] of Object.entries(localityRecordIDMap)) {
      
      //skip any invalid countries for the region
      if(invalidCountries.includes(country.toLowerCase())) {
        continue
      }

      if(dataset.hasStateProvince) {
        countryProvs[country] = Object.keys(obj)
        if(countryProvs[country].includes('none')) {
          const ind = countryProvs[country].indexOf('none')
          countryProvs[country].splice(ind, 1)
          countryProvs[country].unshift('none')
        }

        for (let [stateProvince, val] of Object.entries(obj)) {
          proms.push(groupLocalities(val, dataset.datasetID, country, stateProvince))
        }
      }
      else {
        countryProvs[country] = true
        proms.push(groupLocalities(obj, dataset.datasetID, country, null))
      }
    }

    try {
      let groupArrays = await Promise.all(proms)
      let unionedGroups = arrayUnion(...groupArrays) //this flattens the array of arrays
      localityGroups = unionedGroups
    }
    catch(err) {
      console.error(err.message)
      dispatch('error-with-textpack', err)
    }
  }
}

//helper for below
const addUserDataset = async (id, list) => {
  let userDataset = Firestore.collection('userDatasets').doc(id) //this can a uid or normalized email
  let snap = await userDataset.get()
  if(snap.exists) {
    await userDataset.update({
      [list]: FieldValue.arrayUnion(dataset.datasetID)
    })
  }
  else {
    await userDataset.set({
      [list]: [dataset.datasetID]
    })
  }
}

const loadToDatabase = async () => {
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
    dataset.countryProvs = countryProvs

    //this will take some time
    messageString = 'saving dataset file'
    try {
      let result = await Storage.ref().child(`${dataset.datasetID}.csv`).put(fileForGeoref)
      dataset.url = await result.ref.getDownloadURL()
    }
    catch(err) {
      alert('error saving dataset file:', err.message)
      return
    }

    //now the groups
    messageString = 'saving locality groups'
    let dataLoaders = []
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

    try {
      await Promise.all(dataLoaders)
    }
    catch(err) {
      console.error(err)
      alert('error saving locality groups:', err.message)
      return
    }

    //add the dataset for the current user
    messageString = "updating user datasets"

    //add the dataset for the creator
    try {
      await addUserDataset(userID, 'current')
    }
    catch(err) {
      alert('error adding userDataset for creator:', err.message)
      return
    }
  
    //then for invitees
    let searchEmails = dataset.newInvitees.map(x => x.replace(/[@\.\s]+/g, '').toLowerCase())
    let allIDs = [...dataset.invitees, ...searchEmails]
    console.log('allIDs:', allIDs)
    let proms = []
    for (let id of allIDs) {
      proms.push(addUserDataset(id, 'invited'))
    }

    try {
      await Promise.all(proms)
    }
    catch(err) {
      console.error(err)
      alert('error adding userDatasets', err.message)
      return
    }

    messageString = 'saving dataset record'
    try {
      await Firestore.collection('datasets').doc(dataset.datasetID).set(dataset)
    }
    catch(err) {
      console.error(err)
      alert('error creating database:', err.message)
      return
    }

    dispatch('upload-complete') //what job!
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