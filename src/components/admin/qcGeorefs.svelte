<script>
  import html2canvas from 'html2canvas'
  import {onMount, onDestroy, createEventDispatcher, getContext} from 'svelte'
  import Select from 'svelte-select'
  import {Firestore, Realtime as Firebase, ServerValue, Auth, Storage} from '../../firebase'
  import GeorefForm from '../georef/georefForm.svelte'
  import MatchList from '../georef/georefMatchList.svelte'
  import Loader from '../loader.svelte'
  import VerifyMap from './qcGeorefMap.svelte'
  import Georef from '../georef/Georef'
  import { flagGeoref } from '../georef/georefFuncs.js'
  import { dataStore } from '../georef/dataStore.js'
  import Toast from '../toast.svelte'
  import Dialog from '../Dialog.svelte'

  import { fetchCandidateGeorefs } from '../georef/georefFuncs.js'

  let dispatch = createEventDispatcher()
  const { open } = getContext('simple-modal');

  const FirestoreGeorefRecords = Firestore.collection('georefRecords')
  const FirestoreGeorefs = Firestore.collection('georefBackup')

  export let profile
  export let dataset

  let elasticindex

  let georefQueue = []
  let desiredQueueLength = 3 //just setting a param here
  let noMoreGeorefs = false
  let showNoMoreGeorefs = false

  let georefMap
  let mapReady = false

  let currentGeoref
  let currentGeorefVals //for recording the key properties of a georef for feedback
  let currentMapData //for storing change history
  let history = [] //just so we hand handle accidental pin moves

  let georefIndexQueue = []
  let fetchingGeorefIndex = false
  let selectedGeoref //the similar georef that is selected
  let similarGeorefIndex

  let changesMade = false

  let georeferencersDictionary = {}
  let georeferencersOptions = []
  let selectedGeoreferencer
  let disableFeedbackButton = false
  let georeferencerFeedbackCounts = null

  $: if(dataset) {
    elasticindex = (dataset.region + dataset.domain).toLowerCase().replace(/\s+/g, '')
  }

  //when current georef changes...
  $: if(currentGeoref && mapReady) {
    georefMap.setMapWithNewGeoref(currentGeoref)
    changesMade = false
    history = []
  }

  $: if(selectedGeoreferencer) {

    console.log('fetching georefs on selectedGeoreferencer change...')

    unlockGeorefs()
    currentGeoref = null
    currentGeorefVals = null
    georefQueue = []
    getGeorefsToVerify()

    updateFeedbackButtonDisabledOnCountsOrSelectionChanged()
  }

  $: if (georeferencerFeedbackCounts) {
    updateFeedbackButtonDisabledOnCountsOrSelectionChanged()
  }

  $: georefQueue, georefQueue.length? console.log('georef queue has', georefQueue.length, 'georefs') : console.log('no georefs in georef queue')

  onMount(async _ => {
    
    const FirestoreUserProfiles = Firestore.collection('userProfiles')
    let proms = []
    for (let uid of dataset.georeferencers) {
      if(uid != profile.uid) { //we can't verify our own georeferences
        proms.push(FirestoreUserProfiles.doc(uid).get())
      }
    }

    if(dataset.pastGeoreferencers && dataset.pastGeoreferencers.length) {
      for (let uid of dataset.pastGeoreferencers) {
        proms.push(FirestoreUserProfiles.doc(uid).get())
      }
    }

    let userProfileSnaps = await Promise.all(proms)

    for (let snap of userProfileSnaps) {
      if(snap.exists) { //it should
        const profile = snap.data()
        let option = {value: profile.uid, label: profile.formattedName}
        georeferencersOptions.push(option)
        georeferencersDictionary[profile.uid] = profile
      }
    }

    georeferencersOptions.unshift({value: null, label: 'all'})
    console.log('setting initial selectedGeoreferencer')
    selectedGeoreferencer = georeferencersOptions[0]

    //set the listener on the feedback record counts

    Firebase.ref(`georefVerificationFeedback/${dataset.datasetID}/${profile.uid}`)
    .on('value', snap => {
      if(snap.exists()) {
        georeferencerFeedbackCounts = snap.value()
      }
      else {
        georeferencerFeedbackCounts = {}
        disableFeedbackButton = true
      }
    })
  })

  const updateFeedbackButtonDisabledOnCountsOrSelectionChanged = _ => {
    if(selectedGeoreferencer.value) {
      if(georeferencerFeedbackCounts[selectedGeoreferencer.value]) { 
        disableFeedbackButton = false
      }
      else {
        disableFeedbackButton = true
      }
    }
    else {
      if(georeferencerFeedbackCounts && georeferencerFeedbackCounts.all) {
        disableFeedbackButton = false
      }
    }
  }
  
  //This populates georefQueue and gives a currentGeoref if we don't have one
  const getGeorefsToVerify = async _ => {
    console.log('running getGeorefsToVerify')
    while (!noMoreGeorefs && georefQueue.length < desiredQueueLength) {
            
      let query = FirestoreGeorefRecords
        .where('datasetIDs', 'array-contains', dataset.datasetID)
        .where('verified', '==', false)
        .where('locked', '==', false)

      if(selectedGeoreferencer.value) {
        console.log('filtering georefs for user', selectedGeoreferencer.value)
        query = query.where('createdByID', '==', selectedGeoreferencer.value)
      }
      else {
        console.log('not filtering georefs for any user')
      }

      query = query.limit(1)

      let querySnap
      try {
        querySnap = await query.get()
      }
      catch(err) {
        console.error('Error reading georefRecords:')
        console.error(err)
        return
      }

      if(querySnap.empty) {
        console.log('no more georefs')
        noMoreGeorefs = true
        continue;
      }
      else {
        const docSnap = querySnap.docs.pop() //only one remember!
        try {
          await Firestore.runTransaction(async transaction => {
            let snap = await transaction.get(docSnap.ref)
            if(snap.data().locked) { //it might have been locked between query time and now
              throw new Error()
            }
            else {
              await transaction.update(docSnap.ref, {locked: true})
              return
            }
          })
        }
        catch(err) { //the transaction failed or it got locked!
          continue;
        }

        let georefSnap
        try {
          georefSnap = await FirestoreGeorefs.doc(docSnap.id).get()
        }
        catch(err) {
          console.error('Error reading georefBackup')
          console.error(err)
          return
        }
 
        if(georefSnap.exists) { //it should
          const data = georefSnap.data()
          const georef = Object.assign(new Georef(), data)

          if(currentGeoref){
            georefQueue = [...georefQueue, georef]
            georefIndexQueue = [...georefIndexQueue, getSimilarGeoreferences(georef.locality)]
          }
          else {
            currentGeoref = georef
            currentGeorefVals = getCurrentGeorefVals(georef)
            fetchingGeorefIndex = true
            similarGeorefIndex = await getSimilarGeoreferences(georef.locality)
            fetchingGeorefIndex = false
            $dataStore.georefIndex = similarGeorefIndex
          }
        }
      }
    }
  }

  const getSimilarGeoreferences = async locality => {
    try {
      let { georefIndex } = await fetchCandidateGeorefs([currentGeoref.locality], elasticindex, 20)
      return georefIndex
    }
    catch(err) {
      console.error(err)
      alert('error fetching similar georeferences, see console')
    }
  }

  const getCurrentGeorefVals = currentGeoref => {
    const vals = {
      locality: currentGeoref.locality,
      decimalCoordinates: currentGeoref.decimalCoordinates,
      by: currentGeoref.by,
      date:currentGeoref.date,
      sources: currentGeoref.sources,
      protocol: currentGeoref.protocol
    }

    if(currentGeoref.uncertaintyUnit && currentGeoref.uncertainty) {
      vals.uncertainty = `${currentGeoref.uncertainty}${currentGeoref.uncertaintyUnit}`
    }
    else {
      vals.uncertainty = null
    }

    return vals
  }

  //for undoing coordinate changes on the georef being verified
  const handleKeyUp = ev => {
    if (ev.code == 'KeyZ' && (ev.ctrlKey || ev.metaKey)) {
      if(history.length) {
        georefMap.updateGeorefDetails(history.pop())
      }
    }
  }

  const handleNewCoordsFromMap = ev => {
    const temp = {
      decimalCoordinates: ev.detail, 
    }
    history.push(currentMapData)
    currentMapData = temp
    currentGeoref.decimalCoordinates = ev.detail
    changesMade = true
  }

  const handleNewCoordsFromGeoref = ev => {
    const temp = {
      decimalCoordinates: ev.detail, 
    }
    history.push(currentMapData)
    currentMapData = temp
    georefMap.updateGeorefDetails(currentMapData)
    changesMade = true
  }

  const handleUncertaintyChanged = ev => {
    let temp = ev.detail
    history.push(currentMapData)
    currentMapData = temp
    georefMap.updateGeorefDetails(currentMapData)
    changesMade = true
  }

  //promisify canvas.toBlob
  const canvasToBlob = (canvas, fileType, fileQuality) => {
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        resolve(blob)
      }, fileType, fileQuality)
    })
  }

  const saveFeedback = async (georef, mapCanvas) => {

    let imageURL = null
    if(!georef.ambiguous) {
      const blob = await canvasToBlob(mapCanvas, 'image/jpeg', 0.95)

      let snap
      try {
        snap = await Storage.ref().child(`verificationImages/${georef.georefID}.jpg`).put(blob)
      }
      catch(err) {
        console.error(err)
        alert('Error saving map image file, see console')
        return
      }

      imageURL = await snap.ref.getDownloadURL()
    }

    const verificationRecord = {
      datasetID: dataset.datasetID,
      georefID: georef.georefID,
      georefAmbiguous: georef.ambiguous,
      georeferencerID: georef.createdByID,
      imageURL,
      reviewerID: profile.uid,
      georefVals: currentGeorefVals,
      feedbackMessage: georef.verificationRemarks
    }

    try {
      await Firestore.collection('verificationFeedback').doc(georef.georefID).set(verificationRecord)
    }
    catch(err) {
      console.error(err)
      alert('Error saving feedback record for previous georef, see console')
      return
    }

    const countUpdates = {}
    countUpdates[`georefVerificationFeedback/${dataset.datasetID}/${profile.uid}/all`] = ServerValue.increment(1)
    countUpdates[`georefVerificationFeedback/${dataset.datasetID}/${profile.uid}/${georef.createdByID}`] = ServerValue.increment(1)
    try {
      await Firebase.ref().update(countUpdates)
    }
    catch(err) {
      console.error(err)
      alert('error updating feedback counts, see console')
      return
    }
    
    if(window.pushToast) {
      window.pushToast('feedback saved')
    }
    else {
      console.log('feedback saved')
    }
  }

  const updateGeoref = async georef => {
    //this has to update on elastic and two collections in firestore

    const url = 'https://us-central1-georef-745b9.cloudfunctions.net/updategeoref'
    
    //send it off async and hope for the best, we don't want to slow down!!
    let res
    try {
      let token = await Auth.currentUser.getIdToken(true);
      
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({georef, index: elasticindex}) 
      })
    }
    catch(err) {
      console.error(err)
      alert('Oops, something went wrong while trying to save georef with ID ' + georef.georefID + ', see the console')
      return
    }

    if(res.ok) {
      try {
        const georefRecordUpdate = FirestoreGeorefRecords.doc(georef.georefID).update({verified: true, locked: false})
        const georefBackupsUpdate = FirestoreGeorefs.doc(georef.georefID).set(goeoref)

        await Promise.all([georefRecordUpdate, georefBackupsUpdate])
        console.log('georef', georef.georefID, 'successfully verified')
      }
      catch(err) {
        alert('Oops, something went wrong with the georef verification update to Firestore for georef with ID ' + georef.georefID + ': ' + err.message)
      }
    }
    else {
      alert('Oops, something went wrong while trying to save georef with ID' + georef.georefID + ': ' + res.statusText)
    }
  }

  //save the verified georef
  //update firebase
  //if remarks save the map and feedback for the georeferencer
  const handleSetGeoref = async ev => {

    let georef = ev.detail.georef

    if(!georef.verifiedBy || !georef.verifiedDate || !georef.verifierRole) {
      alert('verifiedBy, verifiedDate, and verifierRole must be added in order to verify this georeference')
      return
    }

    let savingFeedback
    if(changesMade && georef.sendVerificationFeedback && georef.verificationRemarks) {
      //grab the map image
      const mapCanvas = await html2canvas(georefMap)
      savingFeedback = saveFeedback(georef, mapCanvas) //this is now a promise...
    }

    let savingGeorefVerification = updateGeoref(georef)
    
    //get the next one
    if(georefQueue.length) {
      currentGeoref = georefQueue.shift()
      currentGeorefVals = getCurrentGeorefVals(currentGeoref)
      getGeorefsToVerify() //get another one...

      let similarGeorefIndexProm = georefIndexQueue.shift()
      fetchingGeorefIndex = true
      setTimeout(async _ => {
        similarGeorefIndex = await similarGeorefIndexProm
        $dataStore.georefIndex = similarGeorefIndex
        fetchingGeorefIndex = false
      }, 100)
    }

    let proms = []
    if(savingFeedback) {
      proms.push(savingFeedback)
    }
    proms.push(savingGeorefVerification)

    try {
      await Promise.all(proms)
    }
    catch(err) {
      console.error(err)
      alert('There was an error saving feedback or verification, see the console')
      return
    }

    if(window.pushToast) {
      window.pushToast('last georef updated')
    }
    else {
      console.log('last georef verification updated successfully')
    }
    
  }

  const handleFlagGeoref = async ev => {
    const georefID = ev.detail
    await flagGeoref(georefID, elasticindex)
  }

  const onDialogOkay = async message => {

    if(!message || !message.trim()) {
      alert('A feedback message is required')
      return
    }

    //we need this so the user can't enable it again with a quick switch back in the Select
    if(selectedGeoreferencer.value) {
      georeferencerFeedbackCounts[selectedGeoreferencer.value] = 0
    }
    else {
      georeferencerFeedbackCounts.all = 0
    }
    disableFeedbackButton = true

    //from there the server does the work...
    let url = 'https://us-central1-georef-745b9.cloudfunctions.net/sendfeedback'

    let data = {message}

    if(selectedGeoreferencer.value) {
      data.georeferencerID = selectedGeoreferencer.value
    }

    data.reviewerID = profile.uid
    data.datasetID = dataset.datasetID
    
    let res
    try {
      let token = await Auth.currentUser.getIdToken(true);
      
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
    }
    catch(err) {
      console.error(err)
      alert('Oops, something went wrong with calling the sendfeedback API, see the console')
      return
    }

    if(!res.ok) {
      alert('There was an issue calling the sendfeedback API with statusText', res.statusText)
    }

  }

  const sendFeedback = _ => {
    
    let dialogMessage = ""
    if(selectedGeoreferencer.value) {
      dialogMessage = "Send a general feedback message to " + georeferencersDictionary[selectedGeoreferencer.value].firstName
    }
    else {
      dialogMessage = "Send a general feedback message to all"
    }

    //note that onOkay does the rest...
    open(
			Dialog,
			{
				message: dialogMessage,
				hasForm: true,
				onCancel,
				onOkay: onDialogOkay
			},
			{
				closeButton: false,
    		closeOnEsc: false,
    		closeOnOuterClick: false,
			}
	  );

  }

  const unlockGeorefs = _ => {
    if(georefQueue.length || currentGeoref) {
      let ids = georefQueue.map(x => x.georefID)
      if(currentGeoref){
        ids.push(currentGeoref.georefID)
      }

      navigator.sendBeacon(`https://us-central1-georef-745b9.cloudfunctions.net/updateVerifyGeorefLock?georefids=${ids.join(',')}`, '')

    }
  }

  const confirmUnload = ev =>{
    if(changesMade) {
      ev.preventDefault()
      ev.returnValue = 'the string is not used but is required';
      return 'the string is not used by is required'
    }
  }

  const handleUnload = ev => {
    unlockGeorefs()
  }

  //COPIED EXACTLY FROM georef.svelte :-/

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

  const resetTableAndMap = georefID => {
    let selectedMarker = $dataStore.markers[georefID]
    if(selectedMarker) {
      selectedMarker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5, 
        fillColor: 'lightgrey', 
        fillOpacity: 1,
        strokeColor: 'lightgrey'
      })
      selectedMarker.setZIndex(0)
    }
    
    if($dataStore.georefIndex[georefID]) {
      $dataStore.georefIndex[georefID].selected = false
    }
    $dataStore.selectedGeorefID = null
  }

  onDestroy(unlockGeorefs)

</script>

<!-- ############################################## -->
<!-- HTML -->
<svelte:window on:beforeunload={confirmUnload} on:unload={handleUnload} /> <!--in case the user just closes-->
<div on:keyup={handleKeyUp} class="qcgeoref-container">
  <div class="header-items">
    <div class="svelte-select">
      <Select  items={georeferencersOptions} bind:value={selectedGeoreferencer} />
    </div>
    <button class="feedback-button" disabled={disableFeedbackButton} on:click={sendFeedback}>Send feedback</button>
  </div>
  {#if showNoMoreGeorefs}
    <div class="center">
      <h4>No more georeferences to verify for this dataset</h4>
    </div>
  {:else}
    <div class="grid-container">
      <div class="georef-form-container current-georef-container">
        {#if currentGeoref}
          <h4>Verification</h4>
          <GeorefForm georef={currentGeoref} 
            showResetButton={false}
            submitButtonText="Confirm this georeference" 
            showVerification={true}
            defaultGeorefBy={profile.formattedName}
            defaultGeorefByORCID={profile.orcid}
            requiredFields={['verifiedBy', 'verifiedDate', 'verifierRole']}
            on:coords-from-paste={handleNewCoordsFromGeoref}
            on:uncertainty-changed={handleUncertaintyChanged}
            on:georef-flagged={handleFlagGeoref}
            on:set-georef={handleSetGeoref} />
        {:else}
          <div class="center">
            <Loader />
          </div>
        {/if}
      </div>
      <div class="matchlist-container">
        <h4>Similar georeferences</h4>
        <div class="matchlist-flex">
          <MatchList on:georef-selected={handleGeorefSelected}/>
        </div>
        <div class="matchlist-flex-plug" />
      </div>
      <div class="matchmap-container">
        <VerifyMap 
          on:new-coords={handleNewCoordsFromMap} 
          on:map-ready={_ => mapReady = true}
          on:georef-selected={handleGeorefSelected}
          bind:this={georefMap} 
        />
      </div>
      <div class="georef-form-container similar-georef-container">
        <h4>Georeference</h4>
        <GeorefForm 
          editable={false} 
          showVerification={true} 
          georef={selectedGeoref} 
          showResetButton={false}
          showSubmitButton={false} 
          on:georef-flagged={handleFlagGeoref}
        />
      </div>
    </div>
  {/if}
  <Toast />
</div>

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

  .qcgeoref-container {
    position:relative;
    display:flex;
    flex-direction: column;
    width:100%;
    height:100%;
  }

  .header-items {
    display: flex;
    justify-content: flex-end;
    width: 100%;
    position: absolute;
    top: -50px;
    z-index: 5;
  }

  .svelte-select {
    flex: 0 0 20%;
    min-width:300px;
  }

  .feedback-button {
    font-weight:bolder;
		color:darkslategrey;
    background-color:lightskyblue;
    border-radius: 2px;
    padding:10px;
    width: 200px;
    margin-left:20px;
  }

  .feedback-button:disabled {
    color: grey;
    background-color:lightgrey;
  }

  .grid-container {
    display: grid;
    flex: 1 1 auto;
    width: 100%;
    padding: 10px;
    margin-top:10px;
    overflow:hidden;
    box-sizing: border-box;
    grid-template-columns: minmax(0, 1fr) minmax(0, 3fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    grid-column-gap:1%;
    border-radius:4px;
    border: 2px solid #bcd0ec;
  }

  .current-georef-container {
    grid-column: 1/2;
    grid-row: 1 / 3;
  }

  .georef-form-container {
    height:100%;
    max-height:100%;
    width: 100%;
    position:relative;
    display: flex;
    flex-flow: column;
    padding-right: 15px;
    overflow-y: auto;
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

  .similar-georef-container {
    grid-column: 3/3;
    grid-row: 1 / 3;
  }

  .center {
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

</style>