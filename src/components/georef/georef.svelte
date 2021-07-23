<script>
  import {onMount, onDestroy, createEventDispatcher} from 'svelte'
  import { nanoid } from "nanoid/nanoid.js" //see https://github.com/ai/nanoid/issues/237

  import { Firestore, Realtime as Firebase, FieldValue } from '../../firebase.js'

  import {
      updateGeorefStats,
      updateDatasetStats, 
      updateDatasetGeorefs,
      fetchCandidateGeorefs,
      updateGeorefRecords
    } from './georefFuncs.js'

  import { dataStore } from './dataStore.js'

  import RecordGroup from './georefRecordGroup.svelte'
  import MatchList from './georefMatchList.svelte'
  import MatchMap from './georefMatchMap.svelte'
  import GeorefForm from './georefForm.svelte'
  import CustomSearch from './customSearch.svelte'
  import Toast from '../toast.svelte'

  import Georef from './Georef'

  export let dataset

  export let profile

  let formContainer

  let datasetRef 
  let bookMarksRef

  $: if(Firestore) {
    datasetRef = Firestore.collection('datasets').doc(dataset.datasetID)
  }

  let dispatch = createEventDispatcher()

  //the georef prop to send to the form
  //can be a georef object or null. Null and blank object can be used to reset the georef form
  let selectedGeoref

  let connected = true //we assume this, but it could cause an issue
  let savingGeoref = false
  let savingRecordGroup = false

  let elasticindex
  let newGeorefsUsed = [] //for storing georefIDs of georefs not used before, this allows undo of setting them to used when resetting a record group
  let datasetGeorefsUsed = []

  let snapStart = 'startAt'

  //vars for custom georef searches
  let customSearchString = null
  let georefIndexOnHold = null
  let markersOnHold = null
  let searchingGeorefs = false

  let selectedLocGeorefRemarks

  let pastedDecimalCoords = null //for communication between the georef form and the movable map marker

  let georefsAdded = 0 //this is the number of locality strings georeferenced
  let recordsGeoreferenced = 0 //this is the number of associated records georeferenced
  let datasetComplete = false //a flag to take us back to the datasets when this one is complete

  let locStringsTitle = "Select the items below that represent the same locality and then choose and apply or create an appropriate georeference"

  let recordCount
  let locStringsCount
  $: if($dataStore.recordGroup && $dataStore.recordGroup.groupLocalities) {
    recordCount = $dataStore.recordGroup.groupLocalities.filter(x => !x.georefID).map(x=> x.recordIDs.length).reduce((a, b) => a + b, 0)
    locStringsCount = $dataStore.recordGroup.groupLocalities.filter(x => !x.georefID).length
  }

  onMount(async _ => { 

    elasticindex = dataset.region.toLowerCase().replace(/\s+/g, '') + dataset.domain.toLowerCase()

    let userLastSnap = null

    let lastRecordGroupIDSnap
    try {
      lastRecordGroupIDSnap = await Firebase.ref(`userDatasetLastRecordGroup/${profile.uid}/${dataset.datasetID}`).once('value')
    }
    catch(err){
      alert('there was an error getting last recordgroup SNAP for this user: ' + err.message)
      console.error(err)
      return
    }

    if (lastRecordGroupIDSnap.exists()){
      let recordGroupID = lastRecordGroupIDSnap.val()
      
      //we need the Firestore snapshot to use for the query
      let fsSnap
      try{
        fsSnap = await Firestore.collection('recordGroups').doc(recordGroupID).get()
      }
      catch(err){
        alert('there was an error getting last recordgroup for this user: ' + err.message)
        console.error(err)
        return
      }

      if(fsSnap.exists){
        userLastSnap = fsSnap
      }
    }

    try {
      fetchNextRecordGroup(userLastSnap)
    }
    catch(err){//only if offline
      alert('there was an error getting a record group to georeference: ' + err.message)
    }

    //manage connection status
    let connectedRef = Firebase.ref(".info/connected");
    connectedRef.on("value", function(snap) {
      if (snap.val() === true) {
        connected = true
      } else {
        connected = false
      }
    });
  })

  onDestroy(async _ => {
    await releaseRecordGroup()
  })

  const fetchNextRecordGroup = async lastSnap => {
    if(connected){

      //let try clearning the datastore here because everthing gets reset
      $dataStore.recordGroup = null
      $dataStore.recordGroupSnap = null
      $dataStore.georefIndex = null
      $dataStore.locGeorefIndex = null

      if(selectedGeoref) {
        let hold = selectedGeoref
        selectedGeoref = null
        hold.selected = false
      }
      
      newGeorefsUsed = [] //start over
      datasetGeorefsUsed = [] //start over
      
      let query = Firestore.collection('recordGroups')
      .where('datasetID', '==', dataset.datasetID)
      .where('completed', '==', false)
      .where("groupLocked", "==", false)
      .orderBy('groupID')
      
      if(lastSnap) {
        query = query[snapStart](lastSnap)
      }

      query = query.limit(1)

      let snap = await query.get() //nb this is a querysnapshot and hence snap.docs an array
      if(!snap.empty) {
        //try to lock it
        let docRef = snap.docs[0].ref
        try {
          let success = await Firestore.runTransaction(async transaction => {
            let docSnap = await transaction.get(docRef)
            let doc = await docSnap.data()
            if(doc.groupLocked){ //it was locked since last read
              return false
            }
            else {
              await transaction.update(docRef, {groupLocked: true})
              return true
            }
          })

          if (!success){
            console.log('trying for recordgroup again')
            fetchNextRecordGroup() //recursive, I'm really hoping this is right- it would theoretically stop on snap.empty
          }
          else {
            $dataStore.recordGroupSnap = snap.docs[0] 
            $dataStore.recordGroup = snap.docs[0].data()

            //add keys to the record group locs
            for (let loc of $dataStore.recordGroup.groupLocalities){
              if(!loc.id){
                loc.id = nanoid()
              }
            }

            georefsAdded = 0
            recordsGeoreferenced = 0
            
            customSearchString = null //just to clear
            try {
              
              let georefsPerLocString = Math.round(100/$dataStore.recordGroup.groupLocalities.length)
              if (georefsPerLocString > 20) {
                georefsPerLocString = 20
              }
              if (georefsPerLocString < 5) {
                georefsPerLocString = 5
              }

              let candidateGeorefs = await fetchCandidateGeorefs($dataStore.recordGroup.groupLocalities, elasticindex, georefsPerLocString)

              georefIndexOnHold = null //just in case custom search is still active
              if(Object.keys(candidateGeorefs.georefIndex).length) {
                $dataStore.georefIndex = candidateGeorefs.georefIndex
                $dataStore.locGeorefIndex =  candidateGeorefs.locGeorefIndex
              }              

              //set the last snap on Firebase async
              Firebase.ref(`userDatasetLastRecordGroup/${profile.uid}/${dataset.datasetID}`).set($dataStore.recordGroupSnap.id)
              
            }
            catch(err) {
              console.error('error fetching georefs:', err.message)
              alert('fetching georeferences failed')
            }
          }
        }
        catch(err) {
          //Apparently this only happens if we are offline
          throw err
        }
      }
      else {
        $dataStore.recordGroupSnap = null
        $dataStore.recordGroup = null
        $dataStore.candidateGeorefs = null

        if(selectedGeoref) {
          let hold = selectedGeoref
          selectedGeoref = null
          hold.selected = false
        }

        datasetComplete = true

      }
    }
  }

  const releaseRecordGroup = async _ => {
    if($dataStore.recordGroupSnap){
      try{
        await $dataStore.recordGroupSnap.ref.update({groupLocked: false})
      }
      catch(err) {
        alert('error releasing the locality group:' + err.message)
      }
    }
  }

  const saveRecordGroup = async _ => {
    if($dataStore.recordGroupSnap){
      let withGeorefs = $dataStore.recordGroup.groupLocalities.filter(x => x.georefID).length
      let total = $dataStore.recordGroup.groupLocalities.length
      let groupComplete = false
      if(withGeorefs == total){
        groupComplete = true
        $dataStore.recordGroup.completed = true
      }

      //update some fields
      $dataStore.recordGroup.groupLocked = false
      if($dataStore.recordGroup.georeferencers && Array.isArray($dataStore.recordGroup.georeferencers)) {
        if(!$dataStore.recordGroup.georeferencers.includes(profile.uid)) {
          $dataStore.recordGroup.georeferencers.push(profile.uid) //so we can get a georeferencers record groups later...
        }
      }
      else {
        $dataStore.recordGroup.georeferencers = [profile.uid]
      }

      //clean out the ids to avoid confusion later
      for (let loc of $dataStore.recordGroup.groupLocalities){
        delete loc.id
      }

      savingRecordGroup = true
      try {
        await $dataStore.recordGroupSnap.ref.set($dataStore.recordGroup) //its an overwrite
      }
      catch(err){
        alert('error saving record group:' + err.message)
        console.error(err)
        console.log($dataStore.recordGroup)
        savingRecordGroup = false
      }
      
      //update georefRecords
      //we can't use withGeorefs because there may have been some already done when we got the group
      if(georefsAdded || recordsGeoreferenced) {
        let proms = []

        let recordsPerGeoref = {}
        for(let groupLoc of $dataStore.recordGroup.groupLocalities){
          if(groupLoc.georefID){ //it was georeferenced
            if(recordsPerGeoref[groupLoc.georefID]){
              recordsPerGeoref[groupLoc.georefID] = [...recordsPerGeoref[groupLoc.georefID], ...groupLoc.recordIDs]
            }
            else {
              recordsPerGeoref[groupLoc.georefID] = groupLoc.recordIDs
            }
          }
        }

        for(let [georefID, recordIDs] of Object.entries(recordsPerGeoref)){
          let georef = $dataStore.georefIndex[georefID]
          if(!georef){
            console.error('georef with', georefID, 'is missing')
          }
          else {
            proms.push(updateGeorefRecords(Firestore, FieldValue, georef, dataset.datasetID, recordIDs))
          }
        }

        proms.push(updateGeorefStats(Firebase, georefsAdded, recordsGeoreferenced, profile.uid, profile.formattedName, dataset.datasetID, groupComplete))
        proms.push(updateDatasetStats(Firestore, datasetRef, recordsGeoreferenced, profile.formattedName, groupComplete))
        proms.push(updateDatasetGeorefs(Firestore, FieldValue, dataset.datasetID, datasetGeorefsUsed))
        
        try {
          await Promise.all(proms)
        }
        catch(err) {
          savingRecordGroup = false
          console.error(err)
          alert('there was an error updating stats: ' + err.message)
        }
        
      }
      savingRecordGroup = false
    }
    return
  }

  const handleSkipRecordGroup = async _ => {
    //TODO must lock the UI for this
    if(georefsAdded){
      await saveRecordGroup()
    }
    else {
      await releaseRecordGroup();
    }

    snapStart = 'startAfter'

    fetchNextRecordGroup($dataStore.recordGroupSnap)
  }

  const handleCustomSearchSearching = _ => {
    if($dataStore.selectedGeorefID) {
      resetTableAndMap($dataStore.selectedGeorefID)
    }
    if(!georefIndexOnHold){
      georefIndexOnHold = $dataStore.georefIndex
    }
    $dataStore.georefIndex = null
  }

  const handleCustomGeorefs = ev => {
    let customGeorefs = ev.detail
    $dataStore.georefIndex = customGeorefs
  }

  const handleCustomSearchCleared = _ => {
    if($dataStore.selectedGeorefID) {
      resetTableAndMap($dataStore.selectedGeorefID)
    }

    if(georefIndexOnHold) {
      $dataStore.georefIndex = georefIndexOnHold
      georefIndexOnHold = null
    }
  }

  const handleClearGeoref = _ => {
    if($dataStore.selectedGeorefID) {
      resetTableAndMap($dataStore.selectedGeorefID)
    }
  }

  const handleFlagGeoref = async ev => {
    let georefID = ev.detail
    delete $dataStore.georefIndex[georefID]
    $dataStore.georefIndex = $dataStore.georefIndex //svelte

    let url = `https://us-central1-georef-745b9.cloudfunctions.net/flaggeoref?georefID=${georefID}&index=${elasticindex}`
    let res
    try {
      res = await fetch(url)
    }
    catch(err) {
      alert('Failed to flag georef:' + err.message)
    }
    if(res.status != 200){
      let body = await res.json()
      console.error(body)
      alert('Failed to flag georef:' + JSON.stringify(body, null, 2))
    }
  }

  const handleCoordsFromPaste = ev => {
    pastedDecimalCoords = ev.detail
  }

  const handleGeorefSelected = ev => {

    if($dataStore.selectedGeorefID){
      resetTableAndMap($dataStore.selectedGeorefID)
    }
    
    if(ev && ev.detail){
      let georefID = ev.detail
      
      $dataStore.georefIndex[georefID].selected = true
      selectedGeoref = $dataStore.georefIndex[georefID]
      if(selectedGeoref.ambiguous) {
        formContainer.scrollTop = 0 //to make sure the user sees the message!
      }

      let selectedMarker = $dataStore.markers[georefID]
      if(selectedMarker) {
        selectedMarker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5, 
          fillColor: 'blue', 
          fillOpacity: 1,
          strokeColor: 'blue'
        })

        selectedMarker.setZIndex(1)
        selectedMarker.panToMe()
      }
      
      $dataStore.selectedGeorefID = georefID
      $dataStore.georefIndex = $dataStore.georefIndex //svelte
    }
  }

  //helper for above and below
  const resetTableAndMap = georefID => {
    let selectedMarker = $dataStore.markers[georefID]
    if(selectedMarker) {
      selectedMarker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5, 
        fillColor: 'green', 
        fillOpacity: 1,
        strokeColor: 'green'
      })
      selectedMarker.setZIndex(0)
    }
    
    if($dataStore.georefIndex[georefID]) {
      $dataStore.georefIndex[georefID].selected = false
    }
    $dataStore.selectedGeorefID = null

    if(selectedGeoref) {
      let hold = selectedGeoref
      selectedGeoref = null
      hold.selected = false
    }
  }

  //this is the heavy lifting
  const handleSetGeoref = async ev => {
    //confirm required fields...
    let georef = ev.detail

    //validate, but only for real georefs
    if(!georef.ambiguous) {
      let requiredFields = ['decimalCoordinates', 'uncertainty', 'uncertaintyUnit', 'datum', 'by', 'date', 'protocol', 'sources']
      let missing = []
      for (let field of requiredFields) {
        if(!georef[field] || (typeof georef[field] == 'string' && !georef[field].trim())) {
          missing.push(field)
        }
      }

      //only for non-ambiguous georefs
      if(missing.length ) {
        alert("Required fields are missing: " + missing.join(', ') + '\r\nPlease make sure these fields are completed before proceeding')
        return
      }
    }
    
    //carry on if we're happy...
    let selectedLocs = $dataStore.recordGroup.groupLocalities.filter(x => x.selected)
    if(selectedLocs.length){ //it has to be
      let saveGeoref = true
      if(selectedGeoref && selectedGeoref.georefID == georef.georefID) {
        saveGeoref = false 
      } 

      if(saveGeoref){ //we treat it as a new georef
        
        georef.used = true
        let saveCall = georef.persist(profile, dataset, elasticindex, false) //its a promise, we don't want to slow down here
        $dataStore.georefIndex = {...$dataStore.georefIndex, [georef.georefID]: georef} //svelte

      }

      //this is if we haven't used this georef before
      if(!georef.used) {
        // fire off the update request to the API
        georef.used = true
        let url = `https://us-central1-georef-745b9.cloudfunctions.net/georefused?georefID=${georef.georefID}&index=${elasticindex}`
        fetch(url) //no response needed here
        newGeorefsUsed.push(georef.georefID)
      }

      datasetGeorefsUsed.push(georef.georefID)
      
      //update each locality with the georef details
      for (let loc of selectedLocs){
        loc.georefID = georef.georefID
        loc.georefBy = profile.formattedName
        loc.georefByUID = profile.uid
        loc.georefByID = profile.orcid || null
        loc.georefDate = Date.now()
        if(selectedLocGeorefRemarks) {
          loc.georefRemarks = selectedLocGeorefRemarks
        }
        else {
          loc.georefRemarks = null
        }

        //add the verification fields
        loc.georefVerified = false
        loc.georefVerifiedBy = null
        loc.georefVerifiedDate = null
        loc.georefVerifiedByRole = null
        loc.georefVerifiedRemarks = null

        if(loc.recordIDs && loc.recordIDs.length) { //this really should never be necessary
          recordsGeoreferenced += loc.recordIDs.length
        }
        loc.selected = false
        selectedLocGeorefRemarks = null
      }
      
      $dataStore.recordGroup.groupLocalities = $dataStore.recordGroup.groupLocalities //the svelte update trigger

      if($dataStore.selectedGeorefID) {
        resetTableAndMap($dataStore.selectedGeorefID)
      } 
      
      //we need to clear the georef
      if(selectedGeoref) {
        let hold = selectedGeoref
        selectedGeoref = null
        hold.selected = false
      }

      georefsAdded += selectedLocs.length
    
      //if these were the last ones
      let withGeorefs = $dataStore.recordGroup.groupLocalities.filter(x => x.georefID).length
      let total = $dataStore.recordGroup.groupLocalities.length
      if(withGeorefs == total){
        await saveRecordGroup()
        fetchNextRecordGroup($dataStore.recordGroupSnap)
      }
    }
    else {
      alert('localities must be selected to apply the georeference')
      return
    }
  }

  const handleBackToDatasets =  async _ => {
    //TODO must lock the UI for this
    if(georefsAdded){
      await saveRecordGroup()
    }
    else {
      await releaseRecordGroup();
    }
    
    $dataStore.recordGroupSnap = null
    $dataStore.recordGroup = null
    if(selectedGeoref){
      let temp = selectedGeoref
      selectedGeoref = null
      temp.selected = false
    }
    
    $dataStore.georefIndex = null

    dispatch('back-to-datasets')
  }

  const handleStartOver = _ => { //just clear out any georefIDs
    if($dataStore.recordGroup){
      
      for (let loc of $dataStore.recordGroup.groupLocalities){
        loc.georefID = null
      }

      $dataStore.recordGroup.groupLocalities = $dataStore.recordGroup.groupLocalities

      if(newGeorefsUsed.length){
        for (let georefID of newGeorefsUsed){
          $dataStore.georefIndex[georefID].used = false
          let url = `https://us-central1-georef-745b9.cloudfunctions.net/georefused?georefID=${georefID}&index=${elasticindex}&setfalse`
          fetch(url) //no response needed here
        }
        newGeorefsUsed = []
      }

      georefsAdded = 0 
      recordsGeoreferenced = 0
    }
  }

  const handleBookmarkRecordGroup = async ev => {
    let recordGroupID = $dataStore.recordGroupSnap.id
    ev.currentTarget.disabled = true;

    if(bookMarksRef) {

      try {
        await bookMarksRef.update({
          recordGroupIDs: FieldValue.arrayUnion(recordGroupID)
        })

        await $dataStore.recordGroupSnap.ref.update({
          bookmarked: true,
          bookmarkedBy: profile.formattedName,
          bookmarkedDate: Date.now()
        })
      }
      catch(err) {
        console.error(err)
        alert('error bookmarking record group: ' + err.message )
        return
      }
    }
    else {
      try {
        let queryResults = await Firestore.collection('userDatasetBookmarks')
        .where('uid', '==', profile.uid)
        .where('datasetID', '==', dataset.datasetID)
        .get()

        if(queryResults.empty) {
          let doc = {
            uid: profile.uid, 
            datasetID: dataset.datasetID,
            recordGroupIDs: [recordGroupID]
          }
          //don't await
          let docRef =  await Firestore.collection('userDatasetBookmarks').add(doc)
          bookMarksRef = docRef
          
          await $dataStore.recordGroupSnap.ref.update({
            bookmarked: true,
            bookmarkedBy: profile.formattedName,
            bookmarkedDate: Date.now()
          })
        }
        else {
          bookMarksRef = queryResults.docs[0].ref //there should only be one!

          let bookmarkupdate = bookMarksRef.update({
            recordGroupIDs: FieldValue.arrayUnion(recordGroupID)
          })

          let datasetupdate = $dataStore.recordGroupSnap.ref.update({
            bookmarked: true,
            bookmarkedBy: profile.formattedName,
            bookmarkedDate: Date.now()
          })

          await Promise.all([bookmarkupdate, datasetupdate])
        }
      }
      catch(err) {
        console.error(err)
        alert('error bookmarking record group: ' + err.message )
        return
      }
    }

    //we're all good
    $dataStore.recordGroup.bookmarked = true
    if(window.pushToast){
      window.pushToast('locality group bookmarked')
    }
  }

  //this is just the opposite of above
  const handleUnbookmarkRecordGroup = async ev => {
    let recordGroupID = $dataStore.recordGroupSnap.id
    ev.currentTarget.disabled = true;

    if(bookMarksRef) { //it might not be if we just loaded this

      try{
        await bookMarksRef.update({
          recordGroupIDs: FieldValue.arrayRemove(recordGroupID)
        })

        await $dataStore.recordGroupSnap.ref.update({
          bookmarked: false,
          bookmarkedBy: null,
          bookmarkedDate: null
        })
      }
      catch(err) {
        console.error(err)
        alert('error bookmarking record group: ' + err.message )
        return
      }
    }
    else {
      try {
        let queryResults = await Firestore.collection('userDatasetBookmarks')
        .where('uid', '==', profile.uid)
        .where('datasetID', '==', dataset.datasetID)
        .get()

        bookMarksRef = queryResults.docs[0].ref //there should one and only one!

        await bookMarksRef.update({
          recordGroupIDs: FieldValue.arrayRemove(recordGroupID)
        })

        await $dataStore.recordGroupSnap.ref.update({
          bookmarked: false,
          bookmarkedBy: null,
          bookmarkedDate: null
        })
      }
      catch(err) {
        console.error(err)
        alert('error unbookmarking record group: ' + err.message )
        return
      }
    }

    //we're all good
    $dataStore.recordGroup.bookmarked = false
    if(window.pushToast){
      window.pushToast('locality group unbookmarked')
    }
  }

  //we want to push these to the database so that we can use them again in future
  const handleNoGeoref = _ => {
    let selectedLocs = $dataStore.recordGroup.groupLocalities.filter(x => x.selected)
    if(selectedLocs.length){
      //piggy backing on setGeoref
      if(selectedLocGeorefRemarks && selectedLocGeorefRemarks.trim()){

        let georef = new Georef()
        georef.locality = selectedLocs[0].loc //we use the first
        georef.ambiguous = true
        georef.by = profile.formattedName
        georef.byORCID = profile.orcid || null

        let now = new Date()
        georef.date = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
        georef.originalGeorefSource = 'NSCF georeference database'
        
        //TODO get user input for the protocol
        georef.protocol = null
        georef.remarks = selectedLocGeorefRemarks

        let fakeEv = {
          detail : georef
        }
        handleSetGeoref(fakeEv)
      }
      else {
        alert('Please add remarks (e.g. ambiguous or imprecise) under Locality Strings in order to assert no georef')
      }
    }
    else {
      alert('No locality strings selected')
    }
  }

  const handleLocalityCopied = async => {
    if(window.pushToast) {
      window.pushToast('locality copied')
    }
  }

  //just to unlock a locked record group if the user closes or refreshes
  const confirmUnload = ev => {
    if(georefsAdded) {
      ev.preventDefault()
      ev.returnValue = 'georefs have not been saved, go back to datsets before closing';
      return 'georefs have not been saved, go back to datsets before closing'
    }
  }

  const handleUnload = _ => {
    navigator.sendBeacon(`https://us-central1-georef-745b9.cloudfunctions.net/updaterecordgrouplock?groupid=${$dataStore.recordGroupSnap.id}`, '')
  }

</script>

<!-- ############################################## -->
<svelte:window on:beforeunload={confirmUnload}  on:unload={handleUnload}/> <!--in case the user just closes-->
{#if !datasetComplete}
  <div class="col-flex-container">
    <div class="grid-container">
      <div class="recordgroup-container">
        <h4 title={locStringsTitle}>Locality group</h4>
        <div>
          <button class="recordgroup-tool" title="back to datasets" on:click={handleBackToDatasets}>
            <span class="material-icons">list</span>
          </button>
          <button class="recordgroup-tool" title="clear georefs added to this group" on:click={handleStartOver}>
            <span class="material-icons">replay</span>
          </button>
          <button class="recordgroup-tool" title="skip this group" disabled={!$dataStore.georefIndex} on:click={handleSkipRecordGroup}>
            <span class="material-icons">skip_next</span>
          </button>
          {#if !$dataStore.recordGroup || !$dataStore.recordGroup.bookmarked}
            <button class="recordgroup-tool" title="bookmark this group" disabled={!$dataStore.georefIndex} on:click={handleBookmarkRecordGroup}>
              <span class="material-icons">bookmark_border</span>
            </button>
          {:else}
            <button class="recordgroup-tool" title="group is bookmarked" disabled={!$dataStore.georefIndex} on:click={handleUnbookmarkRecordGroup}>
              <span class="material-icons">bookmark_added</span>
            </button>
          {/if}
          <button class="recordgroup-tool" title="state selected localities cannot be georeferenced" on:click={handleNoGeoref}>
            <span class="material-icons">location_off</span>
          </button>
        </div>
        {#if $dataStore.recordGroup}
          <div style="text-align:right;">
            <span>Localities: {locStringsCount}</span>
            <span>Records: {recordCount}</span>
          </div>
        {/if}
        <div class="recordgroup">
          <RecordGroup busy={savingGeoref || savingRecordGroup} on:locality-copied={handleLocalityCopied}></RecordGroup>
        </div>
        <div class="recordgroup-remarks">
          <label for="slgr">Locality georef remarks</label>
          <textarea id="slgr" style="width:100%" bind:value={selectedLocGeorefRemarks} placeholder="Add remarks about applying this georeference to this/these selected localities" rows="2" />
        </div>
      </div>
      <div class="matchlist-container">
        <h4>Candidate georeferences</h4>
        <CustomSearch bind:customSearchString {elasticindex} on:custom-search-searching={handleCustomSearchSearching} on:custom-search-cleared={handleCustomSearchCleared} on:custom-georefs={handleCustomGeorefs} />
        <div class="matchlist-flex">
          <MatchList on:georef-selected={handleGeorefSelected}/>
        </div>
        <div class="matchlist-flex-plug" />
      </div>
      <div class="matchmap-container">
        <MatchMap bind:pastedDecimalCoords on:georef-selected={handleGeorefSelected}/>
      </div>
      <div class="georef-form-container">
        <h4 class="georef-flex-header">Georeference</h4>
        <div class="georef-form-flex" bind:this={formContainer}>
          <GeorefForm 
          georef={selectedGeoref} 
          defaultGeorefBy={profile.formattedName}
          defaultGeorefByORCID={profile.orcid}
          submitButtonText={"Use this georeference"} 
          on:clear-georef={handleClearGeoref} 
          on:georef-flagged={handleFlagGeoref}
          on:coords-from-paste={handleCoordsFromPaste}
          on:set-georef={handleSetGeoref}/>
        </div>
        <div class="georef-form-plug" />
      </div>
    </div>
  </div>
  <div class="stopper"/>
  <Toast />
{:else}
  <div style="text-align:center;margin-top:300px">
    <h3>There are no more records in this dataset</h3>
    <button on:click={handleBackToDatasets}>Back to datasets...</button>
  </div>
{/if}

<!-- ############################################## -->
<style>

h4 {
  color:  #86afe8;
  text-transform: uppercase;
  font-size: 1.5em;
	font-weight: 600;
  text-align: center;
  margin:0;
}

.col-flex-container {
  display: flex;
  height: 100%;
  flex-direction: column;
  box-sizing: border-box;
}

.stopper {
  position: absolute;
  height:0;
  bottom:0;
}

.grid-container {
  display: grid;
  flex: 1 1 auto;
  width: 100%;
  padding: 10px;
  margin-top:10px;
 /* min-height: 0;   NEW */
  /* min-width: 0;   NEW; needed for Firefox */
  overflow:hidden;
  box-sizing: border-box;
  grid-template-columns: minmax(0, 1fr) minmax(0, 3fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  grid-column-gap:1%;
  border-radius:4px;
  border: 2px solid #bcd0ec;
}

.recordgroup-container {
  grid-column: 1/2;
  grid-row: 1 / 3;
  display: flex;
  flex-flow: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;  /* NEW */
  min-width: 0;   /* NEW; needed for Firefox */
  overflow:hidden;
}

.recordgroup {
  flex-grow:0;
  flex-basis:100%;
  overflow:auto;
  border:1px solid #bcd0ec;
  padding:2px;
}

.recordgroup-tool {
  float:right;
  margin-left:5px;
  padding-bottom:0;
}

.recordgroup-remarks {
  text-align: center;
  flex-basis:auto;
}

.matchlist-container {
  grid-column: 2/2; 
  grid-row: 1 / 2;
  max-height: 100%;
  position:relative;
  display: flex;
  flex-flow: column;
}

.matchlist-flex {
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: initial;
  overflow-y: auto;
}

.matchlist-flex-plug {
  flex: 0 0 auto;
}

.matchmap-container {
  grid-column: 2/2;
  grid-row: 2 / 2;
}

.georef-form-container {
  grid-column: 3/3;
  grid-row: 1 / 3;
  height:100%;
  max-height:100%;
  position:relative;
  display: flex;
  flex-flow: column;
  overflow-x:hidden;
} 

.georef-flex-header {
  flex: 0 1 auto;
}

.georef-form-flex {
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  overflow-y: auto;
}

.georef-form-plug {
  flex: 0 0 auto;
}

label {
  display: inline-block;
  text-align: right;
  color:grey;
  font-weight: bolder;
}

button {
  background-color: lightgray;
}

button:hover:enabled {
  background-color:grey;
  color:white;
}

</style>