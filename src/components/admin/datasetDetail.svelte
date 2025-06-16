<script>
  //this is a component that kept getting bigger and bigger....

  import { Firestore, Realtime, Auth, FieldValue, Storage } from '../../firebase.js'
  import Papa from 'papaparse'
  import stringSimilarity from 'string-similarity'
  import {onMount, createEventDispatcher} from 'svelte'
  import ProfileSelect from '../profileSelect.svelte'
  import Loader from '../loader.svelte'
  import StatsChart from './datasetStatsChart.svelte'
  import UsersChart from './datasetUserStatsChart.svelte'
  import ProgressChart from './datasetProgressChart.svelte'
  import Team from './datasetTeam.svelte'
  import Toast from '../toast.svelte'

  const dispatch = createEventDispatcher()

  export let dataset
  export let profile //this is the profile, we dont' need the rest

  let profilesIndex = null

  let downloading = false
  let showDownloadComplete = false
  let downloadProblems = []

  let georefButton

  let downloadProgessMessage = ""

  let qualityControl = false

  onMount(async _ => {

    //only the person who created the dataset can see the georeferencers
    if(dataset.createdByID == profile.uid || (dataset.admins && dataset.admins.includes(profile.uid))){
      //we have admins, georeferencers, pastGeoreferencers, invited and newInvitees, and declinedInvitees

      let arrays = [dataset.admins, dataset.georeferencers, dataset.pastGeoreferencers, dataset.invitees, dataset.declinedInvitees]
      arrays = arrays.filter(x => x && x.length)
      let uids = arrays.flat()

      let proms = []
      let userProfiles = Firestore.collection('userProfiles')

      for (let uid of uids) {
        proms.push(userProfiles.doc(uid).get())
      }

      let result = {}
      let snaps = await Promise.all(proms)
      for (let snap of snaps) {
        if(snap.exists){
          let profile = snap.data()
          result[profile.uid] = profile
        }
      }

      profilesIndex = result

      //how to subset an object...
      const lists = (({ admins = [], georeferencers = [], pastGeoreferencers = [], invitees = [], newInvitees = [], declinedInvitees = []}) => 
        ({ admins , georeferencers, pastGeoreferencers, invitees, newInvitees, declinedInvitees }))(dataset);
      

    }
  })

  const getLocalDate = timestamp => {
    if(!timestamp) return ''

    if (typeof timestamp == 'object') {
      timestamp = timestamp.seconds * 1000 //to adjust for using servertimestamp
    }
    
    let dt = new Date(timestamp)
    let dtParts = new Date(dt.getTime() - dt.getTimezoneOffset() * 60 * 1000).toISOString().split('T')
    return dtParts[0]
  }

  const getLocalDateTime = timestamp => {
    
    if(!timestamp) return ''

    if (typeof timestamp == 'object') {
      timestamp = timestamp.seconds * 1000 //to adjust for using servertimestamp
    }

    let dt = new Date(timestamp)
    let dtAdjusted = new Date(dt.getTime() - dt.getTimezoneOffset() * 60 * 1000)
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

  //helper for the next two functions, this is the meat of combining georefs back to their records
  //remember that georefDetails is from the application of a georef to a record, while georef is the original georef object
  const addGeorefToRecord = (record, georef, georefDetails) => {

    record.nscfGeorefID = georef.georefID
    record.flagged = georef.flagged //needed for data processing afterwards
    record.ambiguous = georef.ambiguous //ditto above
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
    record['dwc:georeferenceSources'] = georef.sources
    record['dwc:georeferenceProtocol'] = georef.protocol 

    //this is important because we have to add the original georef details if different from the above
    let remarks = []
    if(georefDetails.georefRemarks && georefDetails.georefRemarks.trim()){
      remarks.push(georefDetails.georefRemarks.trim())
    }

    //compare localities, but we need to make this backwards compatible
    let localitySimilarity
    if (georef.locality && georef.locality.trim()) { //apparently sometimes it's not!
      if(dataset.localityField && record[dataset.localityField]) {
        localitySimilarity = stringSimilarity.compareTwoStrings(record[dataset.localityField], georef.locality)
      }
      else {
        let candidates = [record.locality, record['dwc:locality'], record.verbatimLocality, record['dwc:verbatimLocality']].filter(x=>x).map(x => x.trim()).filter(x=>x)
        if(candidates.length){
          let loc = candidates.pop()//prefer verbatim over non-verbatim if it's there
          localitySimilarity = stringSimilarity.compareTwoStrings(loc, georef.locality)
        }
      }
    }

    let origGeorefVals = []
    if(!localitySimilarity || localitySimilarity < 0.9) {
      let str = georef.locality
      origGeorefVals.push(str)
      origGeorefVals.push(localitySimilarity)
    }

    if(georefDetails.georefBy != georef.by){
      let str = 'by: ' + georef.by
      if(georef.byORCID && georef.byORCID.trim()){
        str += ` (${georef.byORCID})`
      }
      origGeorefVals.push(str)
    }

    if(local != georef.date) {
      let str = 'date: ' + georef.date
      origGeorefVals.push(str)
    }

    if(origGeorefVals.length) { //this is an existing georef applied to locality string later
      
      //we need the verification here for the original georef
      if(georef.verified){
        origGeorefVals.push('verified')
      }
      else {
        origGeorefVals.push('unverified')
      }
      
      if(georef.remarks && georef.remarks.trim()){
        let str = 'remarks: ' + georef.remarks.trim()
        origGeorefVals.push(str)
      }

      let origGeoref = '::ORIG GEOREF: ' + origGeorefVals.join(', ') //note that :: is the separator for join later
      remarks.push(origGeoref)
    }
    else { //its the original georef but it may still have remarks
      if(georef.remarks && georef.remarks.trim()){
        remarks.push(georef.remarks.trim()) //note here again we have as separator
      }
    }

    let allRemarks = remarks.join('; ').trim() //trim just in case
    allRemarks = allRemarks.replace(/^\:\:/, '').replace(/;\s+\:\:/, ' ::') //just cleaning up the separators in case not needed

    record['dwc:georeferenceRemarks'] = allRemarks

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
    record.georeferenceVerifiedDate = georefDetails.georefVerifiedDate //TODO check this is a date and not timestamp

    record.originalGeorefJSON = JSON.stringify(georef)

    record.originalGeoreferencedBy = georef.by
    record.originalGeoreferenceByID = georef.byORCID
    record.originalGeoreferenceDate = georef.date //this is not a timestamp
    record.originalGeoreferenceRemarks = georef.remarks

    let originalVerified
    if(georef.verified){
      if(georef.verifiedByRole) {
        originalVerified = 'verified by ' + georef.verifiedByRole
      }
      else {
        originalVerified = 'verified (no role indicated)'
      }
    }
    else {
      originalVerified = 'requires verification'
    }

    record.originalGeoreferenceVerificationStatus = originalVerified
  
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
        console.error('errors fetching original dataset:')
        for (let e of err){
          console.error(e)
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

  const handleCloseDataset = async _ => {
    await Firestore.collection('datasets').doc(dataset.datasetID).update({ completed: true, dateCompleted: new Date().getTime()})
    dataset.dateCompleted = new Date().getTime()
    dataset.completed = true
  }

  const handleOpenDataset = async _ => {
    await Firestore.collection('datasets').doc(dataset.datasetID).update({ completed: false, dateCompleted: null })
    dataset.dateCompleted = null
    dataset.completed = false
  }

  const updateLastDownload = downloadType => {
    //this is not async because we don't want to slow things down
    if(!downloadType){
      throw new Error('a downloadType is required to update the dataset')
    }
    let update = {
      lastDownload: {
        downloadDate: FieldValue.serverTimestamp(),
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

      let url = 'https://us-central1-georef-745b9.cloudfunctions.net/getgeorefsbyidV2'
      let token = await Auth.currentUser.getIdToken(true);

      let res
      try {
        res = await fetch(url, {
          method: 'POST', 
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(search)
        })
      }
      catch(err) {
        throw new Error('georefs could not be fetched: ' + err.message)
      }

      if(res.ok) {
        let georefs = await res.json()
        georefs =  georefs.map(x=>x._source)
        return georefs;
      }
      else {
        let body = await res.text()
        throw new Error('error fetching georefs: ' + body)
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
          skipEmptyLines: true,
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

  const makeAdmin = ev => {
    let {uid, firstName} = ev.detail
    let conf = confirm(`Are you sure you want to make ${firstName} an admin?`)
    if(conf) {
      if(dataset.admins) {
        dataset.admins = [...dataset.admins, uid] //svelte
        //lets just do this in the backround
        Firestore.collection('datasets').doc(dataset.datasetID).update({admins: FieldValue.arrayUnion(uid)})
      }
      else {
        dataset.admins = [uid]
        Firestore.collection('datasets').doc(dataset.datasetID).update({admins: [uid]})
      }
    }
  }

  const removeUser = ev => {
    let {uid, firstName, list} = ev.detail
    let conf = confirm(`Are you sure you want to remove ${firstName} from ${list}?`)
    if(conf){
      let datasetRef = Firestore.collection('datasets').doc(dataset.datasetID)
      let userDatasetsRef = Firestore.collection('userDatasets').doc(uid)
      if(list == 'georeferencers') {
        let ind = dataset.georeferencers.indexOf(uid)
        dataset.georeferencers.splice(ind, 1)
        dataset.georeferencers = dataset.georeferencers
        datasetRef.update({georeferencers: FieldValue.arrayRemove(uid)}) //async
        userDatasetsRef.update({current: FieldValue.arrayRemove(dataset.datasetID)})
        //have they georeferenced?
        Realtime.ref(`stats/perDataset/${dataset.datasetID}/perUser/${uid}/georefsAdded`)
        .once('value').then(snap => {
          if(snap.exists() && snap.val()) {
            datasetRef.update({pastGeoreferencers: FieldValue.arrayUnion(uid)}) //async
          }
        }).catch(err => {
          console.error('error checking dataset stats for georeferencer with uid', uid, ':', err.message)
        })
      }
      else {
        let ind = dataset.invitees.indexOf(uid)
        dataset.invitees.splice(ind, 1)
        dataset.invitees = dataset.invitees
        datasetRef.update({invitees: FieldValue.arrayRemove(uid)}) //async
        userDatasetsRef.update({invited: FieldValue.arrayRemove(dataset.datasetID)})
      }
    }
  }

  const removeNewInvitee = ev => {
    let email = ev.detail
    
    if(email && email.trim()) {
      let datasetRef = Firestore.collection('datasets').doc(dataset.datasetID)
      let searchEmail = email.replace(/[@\.\s]+/g, '').toLowerCase()
      let userDatasetsRef = Firestore.collection('userDatasets').doc(searchEmail)

      let ind = dataset.newInvitees.indexOf(email)
      if(ind >= 0) {
        dataset.newInvitees.splice(ind, 1)
        dataset.newInvitees = dataset.newInvitees
        datasetRef.update({newInvitees: FieldValue.arrayRemove(email)}) //async
        userDatasetsRef.update({invited: FieldValue.arrayRemove(dataset.datasetID)})
      }
      else {
        //edge case
        //this is a profile that no longer exists...
        //look in the other lists
        let lists = ['georeferencers', 'invitees', 'pastGeoreferencers', 'declinedInvitees']
        for (let list of lists) {
          let ind = dataset[list].indexOf(email) //yes, it's not an email now, it should be a uid...
          if(ind >= 0) {
            dataset[list].splice(ind, 1)
            dataset[list] = dataset[list]
            datasetRef.update({[list]: FieldValue.arrayRemove(email)}) //async
            userDatasetsRef = Firestore.collection('userDatasets').doc(email)
            userDatasetsRef.delete() //they're no longer on the system so this is fine
            break
          }
        }
      }
    }
  }

  const reInvite = ev => {
    let uid = ev.detail
    let datasetRef = Firestore.collection('datasets').doc(dataset.datasetID)
    let userDatasetsRef = Firestore.collection('userDatasets').doc(uid)
    if(dataset.pastGeoreferencers && dataset.pastGeoreferencers.length) {
      let ind = dataset.pastGeoreferencers.indexOf(uid)
      if(ind >= 0) {
        dataset.pastGeoreferencers.splice(ind, 1)
        dataset.pastGeoreferencers = dataset.pastGeoreferencers
        datasetRef.update({
          pastGeoreferencers: FieldValue.arrayRemove(uid),
          invitees: FieldValue.arrayUnion(uid)
        })
        userDatasetsRef.update({current: FieldValue.arrayUnion(dataset.datasetID)})
        return
      }
    }

    //else
    if(dataset.declinedInvitees && dataset.declinedInvitees.length) {
      let ind = dataset.declinedInvitees.indexOf(uid)
      if(ind >= 0) {
        dataset.declinedInvitees.splice(ind, 1)
        dataset.declinedInvitees = dataset.declinedInvitees
        datasetRef.update({
          declinedInvitees: FieldValue.arrayRemove(uid),
          invitees: FieldValue.arrayUnion(uid)
        })
        userDatasetsRef.update({current: FieldValue.arrayUnion(dataset.datasetID)})
        return
      }
    }
  }

  const handleProfileSelected = ev => {

    let item = ev.detail
    let datasetRef = Firestore.collection('datasets').doc(dataset.datasetID)
    if (typeof item == 'string' && item.trim() && item.includes('invite')){
      let email = item.replace('invite', '').trim()
      
      //check if added already
      let exists = dataset.newInvitees.find(x => x.replace(/[@\.\s]+/g, '').toLowerCase() == email.replace(/[@\.\s]+/g, '').toLowerCase())
      if(!exists) {
        let searchEmail = email.replace(/[@\.\s]+/g, '').toLowerCase()
        let userDatasetsRef = Firestore.collection('userDatasets').doc(searchEmail)
        dataset.newInvitees = [...dataset.newInvitees, email]
        datasetRef.update({newInvitees: FieldValue.arrayUnion(email)})
        userDatasetsRef.get().then(snap => {
          if(snap.exists) {
            userDatasetsRef.update({invited: FieldValue.arrayUnion(dataset.datasetID)})
          }
          else {
            userDatasetsRef.set({invited: [dataset.datasetID]})
          }
        }).catch(err => {console.error('error updating userDatesets for', email, ':', error.message)})
      }
    }
    else { //it must be a profile
      let invitedProfile = item

      if(invitedProfile.uid == profile.uid) {
        alert('You\'re already listed as a georeferencer') //they can't be here otherwise, and they are the creator
        return
      }
      
      let invited = dataset.invitees.find(x => x == invitedProfile.uid)
      let georeferencer = dataset.georeferencers.find(x => x == invitedProfile.uid)
      if(!invited && !georeferencer) {
        profilesIndex[invitedProfile.uid] = invitedProfile
        dataset.invitees = [...dataset.invitees, invitedProfile.uid]
        console.log(dataset.invitees)

        let userDatasetsRef = Firestore.collection('userDatasets').doc(invitedProfile.uid)
        datasetRef.update({invitees: FieldValue.arrayUnion(invitedProfile.uid)})
        userDatasetsRef.get().then(snap => {
          if(snap.exists) {
            userDatasetsRef.update({invited: FieldValue.arrayUnion(dataset.datasetID)})
          }
          else {
            userDatasetsRef.set({invited: [dataset.datasetID]})
          }
        }).catch(err => {
          let msg = `error updating datasets for ${invitedProfile.formattedName} with uid ${invitedProfile.uid}: ${err.message}`
          console.error(msg)
        })
      }
      else {
        alert('user already added to dataset')
      }
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
      <div class="tools-container">
        <button class="dataset-tool" title="back to datasets" on:click={handleBackToDatasets}>
          <span class="material-icons">list</span>
        </button>
        {#if dataset.createdByID == profile.uid || (dataset.admins && dataset.admins.includes(profile.uid))}
          {#if dataset.completed}
            <button class="dataset-tool" title="reopen dataset" on:click={handleOpenDataset}>
              <span class="material-icons-outlined">remove_done</span>
            </button>
          {:else}
            <button class="dataset-tool" title="mark completed" on:click={handleCloseDataset}>
              <span class="material-icons-outlined">done_all</span>
            </button>
          {/if}
          <button class="dataset-tool" title="download dataset with georefs" on:click={handleDownloadDataset}>
            <span class="material-icons">file_download</span>
          </button>
          <button class="dataset-tool" title="download georefs only" on:click={handleDownloadGeorefs}>
            <span class="material-icons">download_for_offline</span>
          </button>
          <button class="dataset-tool" title="quality control" on:click={_=> dispatch('quality-control')} hidden>
            <span class="material-icons-outlined">inventory</span>
          </button>
          <button class="dataset-tool" title="clear locked record groups" on:click={clearLockedRecordGroups}>
            <span class="material-icons">lock_open</span>
          </button>
        {/if}
        <button class="dataset-tool" title="start georeferencing" disabled={dataset.dateCompleted} on:click={handleStartGeoreferencing} bind:this={georefButton}>
          <span class="material-icons">place</span>
        </button>
      </div>
      <h2>{dataset.datasetName}</h2>
      <div class="content">
        <div>
          <span class="label">Collection</span>
          <span class="data-item">{dataset.collectionCode}</span>
        </div>
        <div>
          <span class="label">Region</span>
          <span class="data-item">{dataset.region}</span>
        </div>
        <div>
          <span class="label">Domain</span>
          <span class="data-item">{dataset.domain}</span>
        </div>
        <div>
          <span class="label">Date created</span>
          <span class="data-item">{dataset.dateCreated? getLocalDate(dataset.dateCreated) : null}</span>
        </div>
        <div>
          <span class="label">Contact</span>
          <span class="data-item">{dataset.contactName}</span>
        </div>
        <div>
          <span class="label">Contact email</span>
          <span class="data-item">{dataset.email}</span>
        </div>
        <div>
          <span class="label">Date completed</span>
          <span class="data-item">{dataset.completed? getLocalDate(dataset.dateCompleted) : 'NA'}</span>
        </div>
        <div>
          <span class="label">Total Records</span>
          <span class="data-item">{dataset.recordCount}</span>
        </div>
        <div>
          <span class="label">Records Completed</span>
          <span class="data-item">{dataset.recordsCompleted}</span>
        </div>
        <div>
          <span class="label">Total groups</span>
          <span class="data-item">{dataset.groupCount}</span>
        </div>
        <div>
          <span class="label">Groups complete</span>
          <span class="data-item">{dataset.groupsComplete}</span>
        </div>
        <div>
          <span class="label">Last georeference</span>
          <span class="data-item">{dataset.lastGeoreference? getLocalDateTime(dataset.lastGeoreference): 'NA'}</span>
        </div>
        <div>
          <span class="label">Last georeference by</span>
          <span class="data-item">{dataset.lastGeoreferenceBy? dataset.lastGeoreferenceBy : 'NA'}</span>
        </div>
        {#if dataset.remarks}
        <div class="note">
          {dataset.remarks}
        </div>
        {/if}
      </div>
      <div class='charts'>
        <ProgressChart {dataset} />
        {#if dataset.createdByID == profile.uid || (dataset.admins && dataset.admins.includes(profile.uid))}
          {#if profilesIndex}
            <div class="chart-spacer"></div>
            <div class="chart-title">Stats per georeferencer</div>
            <UsersChart {dataset} {profilesIndex} />
          {:else}
            <div class="chart-loader">
              <Loader />
            </div>
          {/if}
        {/if}
        <div class="chart-spacer"></div>
        <StatsChart {dataset} {profilesIndex} userID={profile.uid} />
      </div>
      {#if dataset.createdByID == profile.uid || (dataset.admins && dataset.admins.includes(profile.uid))  }
        {#if dataset.georeferencers && dataset.georeferencers.length}  
          <div>
            <h4 style="margin-bottom:0">Current Georeferencers</h4>
            <Team datasetCreatedByID={dataset.createdByID} ids={dataset.georeferencers} 
            {profilesIndex}
            georef={true}
            admins={dataset.admins} 
            on:make-admin={makeAdmin}
            on:remove-user={removeUser}/>
          </div>
        {/if}
        {#if dataset.pastGeoreferencers && dataset.pastGeoreferencers.length}  
          <div>
            <h4 style="margin-bottom:0">Past Georeferencers</h4>
            <Team ids={dataset.pastGeoreferencers}  {profilesIndex} 
            on:reinvite={reInvite} />
          </div>
        {/if}
        {#if (dataset.invitees && dataset.invitees.length) || (dataset.newInvitees && dataset.newInvitees.length)}
          <div>
            <h4 style="margin-bottom:0">Invitees</h4>
            <Team ids={[...dataset.invitees, ...dataset.newInvitees]} invitees={true}  {profilesIndex}
            on:remove-user={removeUser}
            on:remove-new={removeNewInvitee} />
          </div>
        {/if}
        {#if dataset.declinedInvitees && dataset.declinedInvitees.length}
          <div>
            <h4 style="margin-bottom:0">Declined</h4>
            <Team ids={dataset.declinedInvitees} {profilesIndex} on:reinvite={reInvite} />
          </div>
        {/if}
        <div>
          <h4 style="margin-bottom:0">Invite new georeferencers</h4>
          <ProfileSelect on:profile-selected={handleProfileSelected} />
        </div>
      {/if}  
    {/if}
  </div>
  <Toast />
</div>



<!-- ############################################## -->
<style>
  h2 {
    color:  rgb(73, 93, 158);
    font-size: 2em;
    font-weight: 400;
  }

  .outer {
    height: calc(100% - 3em); /* we need this because the stats take up some of the parent height */
    width: 100%;
    overflow-y: auto;
  }

  .container {
    height: 100%;
    width: 50%;
    min-width: 1000px;
    margin: auto;
  }
    
  .content {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }

  .vertical {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    overflow-y: auto;
  }

  .loaderflex {
    height: 300px;
    display:flex;
    align-items:center;
  }

  .content > div {
    display: inline-block;
    margin: 10px;
    border-radius: 2px;
    border: 1px solid lightgray;
    padding: 5px;
    background-color: white;
  }

  .label {
    background-color: #bcd0ec;
    padding: 2px;
  }

  .note {
    padding: 5px;
    border-radius: 4px;
    background-color: white;
    width: 100%;
    height: 50px;
  }

  .data-item {
    border-radius: 2px;
    margin-bottom: 0.5em;
    height: 2em;
  }

  .charts {
    margin-top: 20px;
    margin-bottom: 20px;
  }

  .chart-title {
    font-weight: bolder;
    text-align: center;
    text-decoration: underline;
  }

  .chart-loader {
    height: 200px;
  }

  .chart-spacer {
    margin-top: 20px;
  }

  .tools-container {
    display: flex;
    flex-direction: row-reverse;
    align-items: flex-end;
    margin-top: 20px;
  }

  /* .tools-container::after {
    content: "";
    display: block; 
    clear: both;
  } */

  .dataset-tool {
    margin-left: 5px;
    padding-bottom: 0;
    background-color: lightgray;
  }

  .dataset-tool:hover:enabled {
    cursor: pointer;
    background-color:grey;
    color:white;
  }
  
</style>