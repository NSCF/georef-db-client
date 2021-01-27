<script>
  import { Firestore } from '../../firebase.js'
  import Papa from 'papaparse'
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

const clearLockedRecordGroups = async _ => {
  //unlock any locked records, needs pagination
  let first = Firestore.collection('recordGroups')
  .where('datasetID', '==', dataset.datasetID)
  .where("groupLocked", "==", true)
  .limit(100)

  let firstquerysnap = await first.get() //nb this is a querysnapshot and hence snap.docs an array
  if(!firstquerysnap.empty) {
    let updateCount = 0
    const batch = Firestore.batch()
    for (let docSnap of firstquerysnap.docs){
      batch.update(docSnap.ref, {groupLocked: false})
    }

    await batch.commit()

    updateCount += firstquerysnap.docs.length

    let lastSnap = firstquerysnap.docs[firstquerysnap.docs.length - 1]
    let cont = true
    
    while(cont){
      let next = Firestore.collection('recordGroups')
      .where('datasetID', '==', dataset.datasetID)
      .where("groupLocked", "==", true)
      .startAt(lastSnap)
      .limit(100)

      let nextquerysnap = await next.get()
      if(nextquerysnap.empty){
        cont = false // stop the loop
      }
      else {
        const batch = Firestore.batch()
        for (let docSnap of nextquerysnap.docs){
          batch.update(docSnap.ref, {groupLocked: false})
        }

        await batch.commit()

        updateCount += nextquerysnap.docs.length

        lastSnap = nextquerysnap.docs[nextquerysnap.docs.length - 1]
      }
    }
    alert(`${updateCount} record group${updateCount > 1? 's': ''} unlocked`)
  }
  else {
    alert(`No record groups to unlock`)
  }
}

const handleBackToDatasets = _ => {
  dispatch('to-datasets')
}

const handleDownloadDataset = async _ => {
  
  //test permissions first
  try {
    console.log('fetching dataset')
    
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

//download helpers
const getRecordGroups = async _ => {
  let recordGroupsQuerySnap = await Firestore.collection('recordGroups')
  .where('datasetID', '==', dataset.datasetID).get()

  if(recordGroupsQuerySnap.empty) { 
    //this should never happen!!
    alert('something went wrong with the download!!')
    return
  }
  else {
    let recordGroups = recordGroupsQuerySnap.map(x=>x.data())
    let georefKeys = {} //an index
    let recordGeorefData = {} //this is the beginning of the data to be returned........
    for (let recordGroup of recordGroups){
      if(recordGroup.groupLocalities && recordGroup.groupLocalities.length){
        for (let groupLoc of recordGroup.groupLocalities) { //this now has the georef fields
          
          if(!georefKeys[groupLoc.georefID]) {
            georefKeys[groupLoc.georefID] = true
          }

          let georefData = {
            georefID: groupLoc.georefID,
            georefBy: groupLoc.georefBy,
            georefDate: groupLoc.georefDate, 
            georefRemarks: groupLoc.selectedLocGeorefRemarks || null,
          }

          for (let recordID of groupLoc.recordIDs) {
            recordGroup[recordID] = georefData
          }

        }
      }
    }

    return {
      georefKeys,
      recordGeorefData
    }
  }
}

const getGeorefs = async georefKeys => {
  if(Array.isArray(georefKeys) && georefKeys.length) {
    //TODO we need an api call to handle this...
  }

}
</script>

<!-- ############################################## -->
<!-- HTML -->
<h2>{dataset.collectionCode}: {dataset.datasetName}</h2>
<div class="content">
  <div class="inline">
    <label for="datasetID">Dataset ID</label>
    <span id="datasetID">{dataset.datasetID}</span>
  </div>
  <div class="inline">
    <label>Dataset</label>
    <span>{dataset.datasetName}</span>
  </div>
  <div class="inline">
    <label>Collection</label>
    <span>{dataset.collectionCode}</span>
  </div>
  <div class="inline">
    <label>Region</label>
    <span>{dataset.region}</span>
  </div>
  <div class="inline">
    <label>Domain</label>
    <span>{dataset.domain}</span>
  </div>
  <div class="inline">
    <label>Date created</label>
    <span>{dataset.dateCreated? getLocalDate(dataset.dateCreated) : null}</span>
  </div>
  <div class="inline">
    <label>Contact</label>
    <span>{dataset.contactName}</span>
  </div>
  <div class="inline">
    <label>Contact email</label>
    <span>{dataset.email}</span>
  </div>
  <div class="inline">
    <label>Date completed</label>
    <span>{dataset.completed? getLocalDate(dataset.dateCompleted) : 'NA'}</span>
  </div>
  <div class="inline">
    <label>Total Records</label>
    <span>{dataset.recordCount}</span>
  </div>
  <div class="inline">
    <label>Records Completed</label>
    <span>{dataset.recordsCompleted}</span>
  </div>
  <div class="inline">
    <label>Total groups</label>
    <span>{dataset.groupCount}</span>
  </div>
  <div class="inline">
    <label>Groups complete</label>
    <span>{dataset.groupsComplete}</span>
  </div>
  <div class="inline">
    <label>Last georeference</label>
    <span>{dataset.lastGeoreference? getLocalDateTime(dataset.lastGeoreference): 'NA'}</span>
  </div>
  <div class="inline">
    <label for="url">Dataset URL</label>
    <span id="url">{dataset.datasetURL}</span>
  </div>
</div>
<div class="button-container">
  <button on:click={handleStartGeoreferencing}>Start georeferencing</button>
  <button on:click = {clearLockedRecordGroups}>Clear locked record groups</button> <!--TODO add only for admins-->
  <button on:click={handleBackToDatasets}>Back to datasets</button>
  <button on:click={handleDownloadDataset}>Download dataset with georeferences</button>
  <button on:click={handleDownloadGeorefs}>Download georeferences only</button>
</div>

<!-- ############################################## -->
<style>
h2 {
		color:  rgb(73, 93, 158);
		font-size: 2em;
		font-weight: 100;
  }
  
.content {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }

.content > div {
  display:inline-block;
  margin: 10px;
  border-radius:2px;
  border: 1px solid lightgray;
  padding: 5px;
}

label {
  background-color: #bcd0ec;
  padding:2px;
}

span {
    
    border-radius: 2px;
    margin-bottom:0.5em;
    height:2em;
  }

.button-container {
  display: flex;
  flex-direction:column;
  align-content: center;
}

button {
  display:inline-block;
  background-color: lightgray;
  width:100%;
  max-width:400px;
  margin:10px auto;
  padding:10px;
}

button:hover {
  background-color:grey;
  color:white;
}
</style>