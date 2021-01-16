<script>
  import { Firestore } from '../../firebase.js'
  import {createEventDispatcher} from 'svelte'

  const dispatch = createEventDispatcher()

  export let dataset
  let editable = false
  let downloadErrors = false
  let downloadErrorMessage

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

  const handleStartGeoreferencing = _ => {
    dispatch('start-georeferencing')
  }

  const handleDownloadDataset = async _ => {
    //TODO needs comfirmation modal
    
    //test permissions first
    try {
      console.log('testing Firestore permissions')
      let res = await Firestore.collection('recordGroups').doc('00aBJzjYjGvXJnZhb67H').get()
    }
    catch(err) {
      console.log(err.message)
      downloadErrorMessage = err.message
      downloadErrors = true
      return
    }

    //fetch the file
    //fetch the georeferences from Elastic
    //fetch the recordGroups
    //join everything up and save to the users computer
    //mark on Firestore with last download timestamp (who, when and what)

  }

  const handleDownloadGeorefs = async _ => {
    //TODO needs comfirmation modal
    try {
      console.log('testing Firestore permissions')
      let res = await Firestore.collection('recordGroups').doc('00aBJzjYjGvXJnZhb67H').get()
    }
    catch(err) {
      console.log(err.message)
      downloadErrorMessage = err.message
      downloadErrors = true
      return
    }

    //fetch the georeferences from Elastic
    //fetch the recordGroups
    //join everything up and save to the users computer
    //mark on Firestore with last download timestamp (who, when and what)
  }
</script>

<!-- ############################################## -->
<!-- HTML -->
<h2>{dataset.collectionCode}: {dataset.datasetName}</h2>
<form class="content">
  <label>Dataset ID</label>
  <span >{dataset.datasetID}</span>
  <label>Dataset</label>
  <span>{dataset.datasetName}</span>
  <label>Collection</label>
  <span>{dataset.collectionCode}</span>
  <label>Region</label>
  <span>{dataset.region}</span>
  <label>Domain</label>
  <span>{dataset.domain}</span>
  <label>Date created</label>
  <span>{dataset.dateCreated? getLocalDate(dataset.dateCreated) : null}</span>
  <label>Contact</label>
  <span>{dataset.contactName}</span>
  <label>Contact email</label>
  <span>{dataset.email}</span>
  <label>Date completed</label>
  <span>{dataset.completed? getLocalDate(dataset.dateCompleted) : null}</span>
  <label>Total Records</label>
  <span>{dataset.recordCount}</span>
  <label>Records Completed</label>
  <span>{dataset.recordsCompleted}</span>
  <label>Total groups</label>
  <span>{dataset.groupsCount}</span>
  <label>Groups complete</label>
  <span>{dataset.groupsComplete}</span>
  <label>Last georeference</label>
  <span>{dataset.lastGeoreference? getLocalDateTime(dataset.lastGeoreference): null}</span>
  <label>Dataset URL</label>
  <span>{dataset.datasetURL}</span>
</form>
<button on:click={handleStartGeoreferencing}>Start georeferencing</button>
<button>Back to datasets</button>
<button on:click={handleDownloadDataset}>Download dataset with georeferences</button>
<button on:click={handleDownloadGeorefs}>Download georeferences only</button>

<!-- ############################################## -->
<style>
h2 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
	}
span {
    padding:0.5em;
    background-color: powderblue;
    border-radius: 2px;
    margin-bottom:0.5em;
    text-align: left;
  }
.content {
    display: grid;
    grid-template-columns: 20% 40%;
    grid-column-gap: 10px;
  }

label {
  text-align: right
}

button {
  width:100%;
  display: block;
}
</style>