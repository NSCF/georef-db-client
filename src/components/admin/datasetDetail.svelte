<script>
  //this is a component that kept getting bigger and bigger....

  import { Firestore, Realtime, FieldValue, Storage } from '../../firebase.js'
  import Papa from 'papaparse'
  import {onMount, createEventDispatcher} from 'svelte'
  import ProfileSelect from '../profileSelect.svelte'
  import Loader from '../loader.svelte'
  import StatsChart from './datasetStatsChart.svelte'
  import UsersChart from './datasetUserStatsChart.svelte'
  import ProgressChart from './datasetProgressChart.svelte'

  const dispatch = createEventDispatcher()

  export let dataset
  export let profile //this is the profile, we dont' need the rest

  let profilesIndex = null

  let downloading = false
  let showDownloadComplete = false
  let downloadProblems = []

  let downloadProgessMessage = ""

  onMount(async _ => {

    //only the person who created the dataset can see the georeferencers
    if(dataset.createdByID == profile.uid || (dataset.admins && dataset.admins.includes(profile.uid))){
      //we have georeferencers, invited and newInvitees
      let uids = [...dataset.georeferencers, ...dataset.invitees].filter(x => x && x.trim()).map(x => x.trim()) //filter just in case
      let res = await fetch('https://us-central1-georef-745b9.cloudfunctions.net/getprofilesforidlist', {
        method: 'POST', 
        mode: 'cors', 
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uids }) // body data type must match "Content-Type" header
      })

      if(res.ok) {
        let profiles = await res.json()
      
        profilesIndex = {}
        for (let profile of profiles) {
          profilesIndex[profile.uid] = profile
        }
      }
      else {
        alert('there was a problem fetching the user profiles for georeferencers and invitees')
      }
    }
  })

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
    let dtParts = dtAdjusted.toISOString().split(/[T\.]/g)
    dtParts.pop() //chuck it!
    return dtParts.join(' ')
  }

  const handleProfileSelected = async ev => {

    let item = ev.detail
    if (typeof item == 'string' && item.trim() && item.includes('invite')){
      let s = item.replace('invite', '').trim().toLowerCase()
      let iupdUpdate
      let querySnap = await Firestore.collection('invitedUserPendingDatasets').where('email', '==', s).get()
      if(querySnap.exists){
        iupdUpdate = querySnap.docs[0].ref.update({datasets: FieldValue.arrayUnion(dataset.datasetID)})
      }
      else {
        iupdUpdate = Firestore.collection('invitedUserPendingDatasets').add({email: s, datasets: [dataset.datasetID]})
      }

      let datasetUpdate = Firestore.collection('datasets').doc(dataset.datasetID).update({newInvitees: FieldValue.arrayUnion(s)})

      Promise.all([iupdUpdate, datasetUpdate]).then(_ => {
        dataset.newInvitees.push(s)
        dataset.newInvitees = dataset.newInvitees //svelte
        return
      }).catch(Err => {
        alert('there was an error adding', s, 'to the invitee list')
      })
    }
    else { //it must be a profile
      
      let updRef = Firestore.collection('userPendingDatasets').doc(profile.uid)
      let updSnap = await updRef.get()
      let updUpdate
      if(updSnap.exists){
        updUpdate = updRef.update({datasets: FieldValue.arrayUnion(dataset.datasetID)})
      }

      let datasetUpdate = Firestore.collection('datasets')
        .doc(dataset.datasetID)
        .update({
          invitees: FieldValue.arrayUnion(item.uid),
          pastGeoreferencers: FieldValue.arrayUnion(item.uid) //this is in case we are reinviting someone who left
        })

      Promise.all([updUpdate, datasetUpdate]).then(_ => {
        profilesIndex[item.uid] = item
        dataset.invitees.push(item.uid)
        dataset.invitees = dataset.invitees //svelte
      })
      .catch(err => {
        alert('there was an error adding', item.firstName, 'to the invitee list')
      })
    }
  }

  const removeGeoreferencer = async uid => {
    let conf = confirm('Are you sure you want to remove this active georeferencer?')
    if(conf){
      let ref = Firestore.collection('datasets').doc(dataset.datasetID)
      try {
        await ref.update({georeferencers: FieldValue.arrayRemove(uid)})
      }
      catch(err) {
        alert('there was an error removing this georeferencer from this dataset, see console')
        console.error('error removing georeferencer')
        console.log(err)
        return
      }
      
      let index = dataset.georeferencers.indexOf(uid)
      dataset.georeferencers.splice(index, 1)
      dataset.georeferencers = dataset.georeferencers //svelte
    }
  }

  const makeAdmin = uid => {
    let conf = confirm(`Are you sure you want to make ${profilesIndex[uid].firstName} an admin? This cannot be undone...`)
    if(conf) {
      if(dataset.admins) {
        dataset.admins.push(uid)
        dataset.admins = dataset.admins //svelte
        //lets just do this in the backround
        Firestore.collection('datasets').doc(dataset.datasetID).update({admins: FieldValue.arrayUnion(uid)})
      }
      else {
        dataset.admins = [uid]
        Firestore.collection('datasets').doc(dataset.datasetID).update({admins: [uid]})
      }
    }
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

  //helper for the next two functions, this is the meat of combining georefs back to their records
  //remember that georefDetails is from the application of a georef to a record, while georef is the original georef object
  const addGeorefToRecord = (record, georef, georefDetails) => {

    record.nscfGeorefID = georef.georefID
    record.georeferenceCountry = georef.country
    record.georeferenceStateProvince = georef.stateProvince
    record.georeferenceLocality = georef.locality
    record.decimalCoordinates = georef.decimalCoordinates
    record['dwc:decimalLatitude'] = georef.decimalLatitude
    record['dwc:decimalLongitude'] = georef.decimalLongitude
    record.georeferenceUncertainty = georef.uncertainty 
    record.georeferenceUncertaintyUnit = georef.uncertaintyUnit 

    if(georef.uncertainty) {
      let uncertM = georef.uncertainty 
      if(georef.uncertaintyUnit == 'km'){
        uncertM = georef.uncertainty * 1000
      }
      record['dwc:coordinateUncertaintyInMeters'] = uncertM
    }
    else {
      record['dwc:coordinateUncertaintyInMeters'] = null
    }
    
    record['dwc:geodeticDatum'] = georef.datum 
    record['dwc:georeferencedBy'] = georefDetails.georefBy 
    record.georeferencedByID = georefDetails.georefByID

    let d = new Date(georefDetails.georefDate) //its a timestamp
    let local = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
    record['dwc:georeferencedDate'] = local

    record.originalGeoreferencedBy = georef.by
    record.originalGeoreferenceByID = georef.byORCID
    record.originalGeoreferenceDate = georef.date //this is not a timestamp
    record['dwc:georeferenceSources'] = georef.sources
    record.originalGeorefSource = georef.originalGeorefSource 
    record['dwc:georeferenceProtocol'] = georef.protocol 
    record['dwc:georeferenceRemarks'] = georefDetails.georefRemarks
    record.originalGeoreferenceRemarks = georef.remarks

    if(georefDetails.georefVerified){
      if(georefDetails.georefVerifiedByRole) {
        record['dwc:georeferenceVerificationStatus'] = 'verified by ' + georefDetails.georefVerifiedByRole
      }
      else {
        record['dwc:georeferenceVerificationStatus'] = 'verified (no role indicated)'
      }
    }
    else {
      record['dwc:georeferenceVerificationStatus'] = 'requires verification'
    }

    record.georeferenceVerifiedBy = georefDetails.georefVerifiedBy
    record.georeferenceVerifiedDate = georefDetails.georefVerifiedDate

    if(georef.verified){
      if(georef.verifiedByRole) {
        record.originalGeoreferenceVerificationStatus = 'verified by ' + georef.verifiedByRole
      }
      else {
        record.originalGeoreferenceVerificationStatus = 'verified (no role indicated)'
      }
    }
    else {
      record.originalGeoreferenceVerificationStatus = 'requires verification'
    }

    record.originalGeoreferenceVerifiedBy = georef.verifiedBy 
    record.originalGeoreferenceVerifiedDate = georef.verifiedDate

  }

  const handleDownloadDataset = async _ => {
    downloading = true
    let originals
    try {
      downloadProgessMessage = "fetching original dataset..."
      if(!dataset.datasetURL){
        dataset.datasetURL = await Storage.ref(`${dataset.datasetID}.csv`).getDownloadURL()
      }
      originals = await getOriginalDataset(dataset.datasetURL)
    }
    catch(err) {
      if(err.length) {
        console.log('errors fetching original dataset:')
        for (let e of err){
          console.log(e)
        }
        alert('error fetching original dataset, see console')
        downloadProgessMessage = null
        downloading = false
        return
      }
      else {
        alert('error fetching original dataset: ', err.message)
        downloadProgessMessage = null
        downloading = false
        return
      }
    }

    downloadProgessMessage = "fetching recordGroups..."
    let recordGroupDetails = await getRecordGroups()
    
    downloadProgessMessage = "fetching georefs..."
    let georefs
    try {
      
      let georefIDs = Object.keys(recordGroupDetails.georefIDs)
      if(!georefIDs.length) {//there are no georefs for this dataset yet
        alert('there are no georeferences for this dataset yet, nothing will be downloaded')
        downloadProgessMessage = null
        return
      }
      //else
      let index = `${dataset.region.replace(/\s+/g,'')}${dataset.domain.replace(/\s+/g,'')}`.toLowerCase()

      georefs = await getGeorefs(georefIDs, index)
      console.log(georefs[0])

    }
    catch(err) {
      alert('Error with download: ' + err.message)
      downloadProgessMessage = null
      return
    }

    downloadProgessMessage = "and finally assembling everthing..."
    
    let georefIndex = {}
    for (let georef of georefs){
      georefIndex[georef.georefID] = georef
    }

    //we need to record the fields to return at the end
    let fields = Object.keys(originals[0])

    for (let original of originals){
      let recordID = original[dataset.recordIDField]

      //we only have details for records that have been georeferenced
      if(recordGroupDetails.recordGeorefData[recordID]) {
        let georefDetails = recordGroupDetails.recordGeorefData[recordID] //this is the stuff from applying a georeference to a locality string
        let georef = georefIndex[georefDetails.georefID] //this is the original georef applied
        if(!georef){
          downloadProblems.push(recordID)
          continue
        }

        addGeorefToRecord(original, georef, georefDetails)
      }
    }

    //and download to the local machine
    downloadProgessMessage = 'saving file...'
    fields = [...fields, ...[
      'nscfGeorefID',
      'georeferenceCountry',
      'georeferenceStateProvince',
      'georeferenceLocality',
      'decimalCoordinates',
      'dwc:decimalLatitude',
      'dwc:decimalLongitude',
      'georeferenceUncertainty',
      'georeferenceUncertaintyUnit',
      'dwc:coordinateUncertaintyInMeters',
      'dwc:geodeticDatum',
      'dwc:georeferencedBy',
      'georeferencedByID',
      'dwc:georeferencedDate',
      'originalGeoreferencedBy',
      'originalGeoreferenceByID',
      'originalGeoreferenceDate',
      'dwc:georeferenceSources',
      'originalGeorefSource',
      'dwc:georeferenceProtocol',
      'dwc:georeferenceRemarks',
      'originalGeoreferenceRemarks',
      'dwc:georeferenceVerificationStatus',
      'georeferenceVerifiedBy',
      'georeferenceVerifiedDate',
      'originalGeoreferenceVerificationStatus',
      'originalGeoreferenceVerifiedBy',
      'originalGeoreferenceVerifiedDate'
    ]]
    let csv = Papa.unparse({fields, data: originals})

    let now = new Date()
    let date = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString() //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
    date = date.replace(/-:/g, '')
    let newDatasetName = dataset.datasetName + '_georeferenced' + date + '.csv'

    //taken from https://code-maven.com/create-and-download-csv-with-javascript
    let hiddenDownload = document.createElement('a');
    hiddenDownload.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenDownload.target = '_blank';
    hiddenDownload.download = newDatasetName
    hiddenDownload.click();
    
    updateLastDownload('dataset')
    showDownloadComplete = true
    downloading = false
  }

  const handleDownloadGeorefs = async _ => {

    downloading = true
    downloadProgessMessage = "fetching record groups"
    let recordGroupDetails = await getRecordGroups()
    
    //this is identical to above
    downloadProgessMessage = "fetching georefs..."
    let georefs
    try {
      
      let georefIDs = Object.keys(recordGroupDetails.georefIDs)
      if(!georefIDs.length) {//there are no georefs for this dataset yet
        alert('there are no georeferences for this dataset yet, nothing will be downloaded')
        downloadProgessMessage = null
        return
      }
      //else
      let index = `${dataset.region.replace(/\s+/g,'')}${dataset.domain.replace(/\s+/g,'')}`.toLowerCase()

      georefs = await getGeorefs(georefIDs, index)
      console.log(georefs[0])

    }
    catch(err) {
      alert('Error with download: ' + err.message)
      downloadProgessMessage = null
      return
    }

    downloadProgessMessage = "and finally assembling everthing..."
    
    let georefIndex = {}
    for (let georef of georefs){
      georefIndex[georef.georefID] = georef
    }

    let records = []
    for (let [recordID, georefDetails] of Object.entries(recordGroupDetails.recordGeorefData)){
      let obj = {}
      obj[dataset.recordIDField] = recordID
      let georef = georefIndex[georefDetails.georefID]
      if (!georef){
        downloadProblems.push(recordID)
        continue
      }

      addGeorefToRecord(obj, georef, georefDetails)

      records.push(obj)

    }

    let csv = Papa.unparse(records)

    //note this is not identical to above
    let now = new Date()
    let date = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString() //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
    date = date.replace(/-:/g, '')
    let newDatasetName = dataset.datasetName + '_georeferences' + date + '.csv' //very slight difference here to above

    //taken from https://code-maven.com/create-and-download-csv-with-javascript
    let hiddenDownload = document.createElement('a');
    hiddenDownload.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenDownload.target = '_blank';
    hiddenDownload.download = newDatasetName
    hiddenDownload.click();
    
    updateLastDownload('georefs only')
    showDownloadComplete = true
    downloading = false

  }

  const updateLastDownload = downloadType => {
    //this is not async because we don't want to slow things down
    if(!downloadType){
      throw new Error('a downloadType is required to update the dataset')
    }
    let update = {
      lastDownload: {
        downloadDate: Date.now(),
        downloadBy: profile.formattedName,
        downloadType
      }
    }
    Firestore.collection('datasets').doc(dataset.datasetID).update(update)
  }

  const getRecordGroups = async _ => {
    let recordGroupsQuerySnap = await Firestore.collection('recordGroups')
    .where('datasetID', '==', dataset.datasetID).get()

    if(recordGroupsQuerySnap.empty) { 
      //this should never happen!!
      throw new Error('no record groups returned for this dataset!!')
    }
    else {
      let recordGroups = recordGroupsQuerySnap.docs.map(x=>x.data())
      let georefIDs = {} //an index
      let recordGeorefData = {} //this is the beginning of the data to be returned........
      for (let recordGroup of recordGroups){
        if(recordGroup.groupLocalities && recordGroup.groupLocalities.length){
          for (let groupLoc of recordGroup.groupLocalities) { //this now has the georef fields
            if(groupLoc.georefID) {
              if (!georefIDs[groupLoc.georefID]) {
                georefIDs[groupLoc.georefID] = true
              }
              for (let recordID of groupLoc.recordIDs) {
                recordGeorefData[recordID] = {
                  georefID: groupLoc.georefID,
                  georefBy: groupLoc.georefBy,
                  georefByID: groupLoc.georefByID,
                  georefDate: groupLoc.georefDate,
                  georefVerified: groupLoc.georefVerified,
                  georefVerifiedBy: groupLoc.georefVerifiedBy,
                  georefVerifiedDate: groupLoc.georefVerifiedDate,
                  georefVerifiedByRole: groupLoc.georefVerifiedByRole,
                  georefRemarks: groupLoc.georefRemarks
                }
              }
            }
          }
        }
      }

      return {
        georefIDs,
        recordGeorefData
      }
    }
  }

  const getGeorefs = async (georefKeys, elasticIndex) => {
    if(Array.isArray(georefKeys) && georefKeys.length) {
      let search = {
        index: elasticIndex,
        georefIDs: georefKeys
      }
      let url = 'https://us-central1-georef-745b9.cloudfunctions.net/getgeorefsbyid'
      try {
        let res = await fetch(url, {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json'
          },
          body: (JSON.stringify(search))
        })
        let georefs = await res.json()
        georefs =  georefs.map(x=>x._source)
        return georefs;
      }
      catch(err) {
        throw new Error('georefs could not be fetch with message ' + err.message)
      }
    }
    else {
      throw new Error('georefIDs provided is invalid')
    }
  }

  const getOriginalDataset = url => {
    return new Promise((resolve, reject) => {
      fetch(url).then(res => res.blob()).then(blob => blob.text()).then(file => {
        Papa.parse(file, {
          header: true,
          complete: function(results) {
            if(results.errors.length){
              reject(results.errors)
            }
            else {
              resolve(results.data);
            }
          }, 
          error: function(err) {
            reject(err)
          }
        });
      })
      .catch(err => {
        reject(err)
      })
    })
  }

  const removeInvitee = uid => {
    let datasetRef = Firestore.collection('datasets').doc(dataset.datasetID)
    let userPendingDatasetsRef = Firestore.collection('userPendingDatasets').doc(uid) //upd
    
    Firestore.runTransaction(async transaction => {
      let update1 = transaction.update(datasetRef, {
        invitees: FieldValue.arrayRemove(uid)
      })

      let update2 = transaction.update(userPendingDatasetsRef, {
        datasets: FieldValue.arrayRemove(dataset.datasetID)
      })

      await Promise.all([update1, update2]).then(_ => {
        let index = dataset.invitees.indexOf(uid)
        if(index >= 0) {
          dataset.invitees.splice(index, 1)
          dataset.invitees = dataset.invitees //svelte
        }
        return
      }).catch(err => {
        console.log('error updating invitees list:', err.message)
      })
    })
  }

  const removeNewInvitee = email => {
    if(email && email.trim()) {
      Firestore.collection('invitedUserPendingDatasets').where('email', '==', email.toLowerCase())
      .get().then(UPDSnap => {
        
        if(UPDSnap.exists) { //it really should!
          let datasetRef = Firestore.collection('datasets').doc(dataset.datasetID)

          let proms = []
          return Firestore.runTransaction(async transaction => {
            let update1 = transaction.update(datasetRef, {
              newInvitees: FieldValue.arrayRemove(email)
            })

            proms.push(update1)

            let update2 = transaction.update(UPDSnap.ref, {
              datasets: FieldValue.arrayRemove(dataset.datasetID)
            })
            proms.push(update2)

            await Promise.all(proms)
            
            let index = dataset.newInvitees.indexOf(email)
            if(index >= 0) {
              dataset.newInvitees.splice(index, 1)
              dataset.newInvitees = dataset.newInvitees //svelte
            }
          })
        }
      })
    }
    else {
      alert('oops, that didn\'t work!')
    }
  }

  const showUTFFilehint = _ => {
    let message = `Special characters in UTF-8 files get scrambled if the file is opened directly in Excel. 
    You need to import the file from the data tab in Excel and set the encoding to UTF-8 during the import process. 
    Alternatively the file can be opened in a text editor like Notepad, or imported directly into Google Sheets, R, or OpenRefine, without problems.`
    
    alert(message)
  }
</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="outer">
  <div class="container">
    {#if downloading}
    <div class="vertical">
      {downloadProgessMessage}
      <div class="loaderflex">
        <Loader/>
      </div>
    </div>
    {:else if showDownloadComplete}
    <div class="vertical">
      <p style="margin-bottom:20px">The download has completed. Please remember to <span on:click={showUTFFilehint}>open the file in a UTF-8 friendly way...</span></p>
      {#if downloadProblems.length}
        <p style="font-weight:bold;">There were problems with associating georeferences for the following {downloadProblems.length} record/s: </p>
        <p>{downloadProblems.join('; ')}</p>
      {/if}
      <button on:click="{_ => showDownloadComplete = false}">Okay</button>
    </div>
    {:else}
      <h2>{dataset.collectionCode}: {dataset.datasetName}</h2>
      <div class="content">
        <div>
          <label>Dataset</label>
          <span>{dataset.datasetName}</span>
        </div>
        <div>
          <label>Collection</label>
          <span>{dataset.collectionCode}</span>
        </div>
        <div>
          <label>Region</label>
          <span>{dataset.region}</span>
        </div>
        <div>
          <label>Domain</label>
          <span>{dataset.domain}</span>
        </div>
        <div>
          <label>Date created</label>
          <span>{dataset.dateCreated? getLocalDate(dataset.dateCreated) : null}</span>
        </div>
        <div>
          <label>Contact</label>
          <span>{dataset.contactName}</span>
        </div>
        <div>
          <label>Contact email</label>
          <span>{dataset.email}</span>
        </div>
        <div>
          <label>Date completed</label>
          <span>{dataset.completed? getLocalDate(dataset.dateCompleted) : 'NA'}</span>
        </div>
        <div>
          <label>Total Records</label>
          <span>{dataset.recordCount}</span>
        </div>
        <div>
          <label>Records Completed</label>
          <span>{dataset.recordsCompleted}</span>
        </div>
        <div>
          <label>Total groups</label>
          <span>{dataset.groupCount}</span>
        </div>
        <div>
          <label>Groups complete</label>
          <span>{dataset.groupsComplete}</span>
        </div>
        <div>
          <label>Last georeference</label>
          <span>{dataset.lastGeoreference? getLocalDateTime(dataset.lastGeoreference): 'NA'}</span>
        </div>
        <div>
          <label>Last georeference by</label>
          <span>{dataset.lastGeoreferenceBy? dataset.lastGeoreferenceBy : 'NA'}</span>
        </div>
      </div>
      <div class='charts'>
        <ProgressChart {dataset} />
        {#if dataset.createdByID == profile.uid || (dataset.admins && dataset.admins.includes(profile.uid))}
          {#if profilesIndex}
            <div class="chart-spacer"></div>
            <div class="chart-title">Stats per georeferencer</div>
            <UsersChart datasetID={dataset.datasetID} {profilesIndex} />
          {:else}
            <div class="chart-loader">
              <Loader />
            </div>
          {/if}
        {/if}
        <div class="chart-spacer"></div>
        <StatsChart {dataset} {profilesIndex} userID={profile.uid} />
      </div>
      {#if profilesIndex && (dataset.createdByID == profile.uid || (dataset.admins && dataset.admins.includes(profile.uid)))  }
        <div>
          <div>
            <label>Georeferencers</label>
            <div class="inviteelist">
              {#each dataset.georeferencers as uid}
                <div class="inviteecontainer">
                  {#if profilesIndex[uid]} <!--this is just in users and their details have been deleted elsewhere-->
                    <div>{profilesIndex[uid].formattedName + " (" + profilesIndex[uid].email + ")"}</div>
                    {#if dataset.admins && dataset.admins.includes(uid)}
                      <div class="material-icons" title="is admin">person</div>
                    {:else if dataset.createdByID != uid}
                      <div class="material-icons icon-input-icon" title="make admin" on:click='{_ => makeAdmin(uid)}'>person_add_alt</div>
                      <div class="material-icons icon-input-icon" title="remove" on:click='{_ => removeGeoreferencer(uid)}'>clear</div>
                    {/if}
                  {/if}
                </div>
              {/each}
            </div>
          </div>
          <div>
            <label>Invited</label>
            <div class="inviteelist">
              {#each dataset.invitees as uid}
                <div class="inviteecontainer">
                  <div>{profilesIndex[uid].formattedName + " (" + profilesIndex[uid].email + ")"}</div>
                  <div class="material-icons icon-input-icon" title="remove" on:click='{_ => removeInvitee(uid)}'>clear</div>
                </div>
              {/each}
              {#each dataset.newInvitees as email}
                <div class="inviteecontainer">
                  <div>{email}</div>
                  <div class="material-icons icon-input-icon" title="remove" on:click='{_ => removeNewInvitee(email)}'>clear</div>
                </div>
              {/each}
            </div>
            <div>
              <ProfileSelect on:profile-selected={handleProfileSelected} />
            </div>
          </div>
        </div>
      {/if}  
      <div class="button-container">
        <button on:click={handleStartGeoreferencing}>Start georeferencing</button>
        <button on:click={handleBackToDatasets}>Back to datasets</button>
        {#if dataset.createdByID == profile.uid || (dataset.admins && dataset.admins.includes(profile.uid))}
          <button on:click = {clearLockedRecordGroups}>Clear locked record groups</button> <!--TODO add only for admins-->
          <button on:click={handleDownloadDataset}>Download dataset with georeferences</button>
          <button on:click={handleDownloadGeorefs}>Download georeferences only</button>
        {/if}
      </div>
    {/if}
    
  </div>
</div>



<!-- ############################################## -->
<style>
h2 {
  color:  rgb(73, 93, 158);
  font-size: 2em;
  font-weight: 400;
}

.outer {
  height:calc(100% - 3em); /* we need this because the stats take up some of the parent height */
  width:100%;
  overflow-y:auto
}

.container {
  height:100%;
  width:50%;
  min-width: 500px;
  margin: auto;
}
  
.content {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.vertical {
  display:flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height:100%;
}

.loaderflex {
  height: 300px;
  display:flex;
  align-items:center;
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
  display:flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 300px;
}

.button-container > button {
  display:block;
  background-color: lightgray;
  width:100%;
  max-width:400px;
  margin:10px;
  padding:10px;
}

button:hover {
  background-color:grey;
  color:white;
}

.inviteelist {
  display:flex;
  flex-wrap: wrap;
  width: 100%;
  background-color: white;
  border-radius: 2px;
  border: 1px solid gainsboro;
  margin-bottom:5px;
}

.icon-input-icon {
  width:24px;
  height:24px;
  color: white;
}

.icon-input-icon:hover {
  cursor: pointer;
}

.inviteecontainer {
  display:flex;
  align-items: center;
  color:white;
  background-color: grey;
  border-radius: 4px;
  border: 1px solid rgb(70, 69, 69);
  padding: 4px;
  margin: 2px;
}

.charts {
  margin-top:20px;
  margin-bottom:20px;
}

.chart-title {
  font-weight:bolder;
  text-align: center;
  text-decoration:underline;
}

.chart-loader {
  height:200px;
}

.chart-spacer {
  margin-top: 20px;
}
</style>