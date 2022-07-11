<script>
  import html2canvas from 'html2canvas'
  import {onMount, onDestroy} from 'svelte'
  import {Firestore, Realtime as Firebase, ServerValue, FieldPath, Auth, Storage} from '../../firebase'
  import GeorefForm from '../georef/georefForm.svelte'
  import MatchList from '../georef/georefMatchList.svelte'
  import Loader from '../loader.svelte'
  import VerifyMap from './qcGeorefMap.svelte'
  import Georef from '../georef/Georef'
  import Toast from '../toast.svelte'

  import {getNextGeorefToVerify} from './qcGeorefFunctions'
  import { flagGeoref } from '../georef/georefFuncs.js'
  import { dataStore } from '../georef/dataStore.js'

  import { fetchGeorefsForLoc } from '../georef/georefFuncs.js'

  const FirestoreGeorefRecords = Firestore.collection('georefRecords')
  const FirestoreGeorefs = Firestore.collection('georefBackup')

  export let profile
  export let dataset
  export let selectedGeoreferencer

  let elasticindex

  let georefQueue = []
  let desiredQueueLength = 3 //just setting a param here
  let noMoreGeorefs = false
  let showNoMoreGeorefs = false

  let georefMap
  let mapReady = false

  let verifyGeorefContainer
  let similarGeorefContainer

  let currentGeoref
  let currentGeorefVals //for recording the key properties of a georef for feedback
  let currentMapData //for storing change history
  let history = [] //just so we hand handle accidental pin moves

  let georefIndexQueue = []
  let fetchingGeorefIndex = false
  let selectedGeoref //the similar georef that is selected
  let similarGeorefIndex
  let changesMade = false

  //and for keeping our place in the georef queue
  let queuePositions
  let queuePath

  onMount(async _ => {
    queuePath = `verifierDatasetQueuePositions/${profile.uid}/${dataset.datasetID}`
    const snap = await Firebase.ref(queuePath).once('value')
    if(snap.exists()) {
      queuePositions = snap.val()
    }
    else {
      queuePositions = null
    }
  })


  $: if(dataset) {
    elasticindex = (dataset.region + dataset.domain).toLowerCase().replace(/\s+/g, '')
  }


  $: if(selectedGeoreferencer) {

    console.log('fetching georefs on selectedGeoreferencer change...')

    resetQCGeoref()

  }


  $: georefQueue, georefQueue.length? console.log('georef queue has', georefQueue.length, 'georefs') : console.log('no georefs in georef queue')

  
  //This populates georefQueue and gives a currentGeoref if we don't have one
  const getGeorefsToVerify = async _ => {

    while (!noMoreGeorefs && georefQueue.length < desiredQueueLength) {

      let atOrAfter = 'startAt'
      if(currentGeoref) {
        atOrAfter = 'startAfter'
      }

      let searchDocSnap = null
      if(queuePositions) {
        if(selectedGeoreferencer != null) {
          searchDocSnap = queuePositions[selectedGeoreferencer.uid]
        }
        else {
          searchDocSnap = queuePositions.all
        }
      }
      
      let georefDocSnap
      try {

        let selectedGeoreferencerID = null
        if(selectedGeoreferencer) {
          selectedGeoreferencerID = selectedGeoreferencer.uid
        }

        georefDocSnap = getNextGeorefToVerify(dataset.datasetID, selectedGeoreferencerID, atOrAfter, searchDocSnap)

      }
      catch(err) {
        console.error(err.message)
        continue
      }

      if(georefDocSnap) {

      }
      else {
        noMoreGeorefs = true
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
            georefMap.setMapWithNewGeoref(currentGeoref)
            changesMade = false
            history = []
            currentGeorefVals = getCurrentGeorefVals(georef)
            fetchingGeorefIndex = true
            similarGeorefIndex = await getSimilarGeoreferences(georef.locality)
            delete similarGeorefIndex[georef.georefID] 
            fetchingGeorefIndex = false
            $dataStore.georefIndex = similarGeorefIndex
          }
        }
      }
    }
  }

  const getSimilarGeoreferences = async locality => {
    //remove elevation, etc
    locality = locality.replace(/(alt|elev)[:;\.]{0,1}\s+\d+(m|ft|f)/i, "").trim()
    let elasticgeorefs
    try {
      elasticgeorefs = await fetchGeorefsForLoc(locality, elasticindex, 20, false)
    }
    catch(err) {
      console.error(err)
      alert('error fetching similar georeferences, see console')
      return
    }



    if(elasticgeorefs.length) {
      let georefIndex = {}
      for (let georefdata of elasticgeorefs) {
        let georef = Object.assign(new Georef, georefdata._source)
        georefIndex[georef.georefID] = georef
      }
      return georefIndex
    }
    else {
      return {}
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

  const resetQCGeoref = async _ => {
    await unlockGeorefs()
    currentGeoref = null
    changesMade = false
    history = []
    currentGeorefVals = null
    georefQueue = []
    getGeorefsToVerify()
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

  const handleGeorefChanged = ev => {
    let temp = ev.detail
    history.push(currentMapData)
    currentMapData = temp
    georefMap.updateGeorefDetails(currentMapData)
    Object.assign(currentGeoref, currentMapData) //a sneaky here so svelte doesnt see the update!
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
        const georefBackupsUpdate = FirestoreGeorefs.doc(georef.georefID).set(georef)

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
  //if sendVerificationFeedback save the map and feedback for the georeferencer
  const handleSetGeoref = async ev => {

    let georef = ev.detail
    console.log(georef)

    if(!georef.ambiguous && !georef.verified) {
      alert('verifiedBy, verifiedDate, and verifierRole must be added in order to verify this georeference')
      return
    }
    
    let savingFeedback
    if(georef.sendVerificationFeedback && georef.verificationRemarks) {
      //grab the map image
      let mapCanvas = null
      if(changesMade) {
        mapCanvas = await html2canvas(georefMap)
      } 
      savingFeedback = saveFeedback(georef, mapCanvas) //this is now a promise...
    }

    let savingGeorefVerification = null
    if(georef.verified) {
      savingGeorefVerification = updateGeoref(georef)
    }
     
    //get the next one
    getNextForValidation() //sync because this can run already while the stuff below completes

    let proms = []
    if(savingFeedback) {
      proms.push(savingFeedback)
    }

    if(savingGeorefVerification) {
      proms.push(savingGeorefVerification)
    }

    if(proms.length) {
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
    
    //no else here because there is nothing to be done and the user has the next georef already
    
  }

  const handleFlagGeoref = async ev => {
    const georefID = ev.detail
    try {
      await flagGeoref(georefID, elasticindex)
    }
    catch(err) {
      console.error(err)
      alert('there was an error flagging the georef, see console')
      return
    }
    
  }

  const unlockGeorefs = async _ => {
    if(georefQueue.length || currentGeoref) {
      /* let ids = georefQueue.map(x => x.georefID)
      if(currentGeoref){
        ids.push(currentGeoref.georefID)
      }

      navigator.sendBeacon(`https://us-central1-georef-745b9.cloudfunctions.net/updateVerifyGeorefLock?georefids=${ids.join(',')}`, '')
      */
    
      let proms = []
      if(currentGeoref) {
        const update = FirestoreGeorefRecords.doc(currentGeoref.georefID).update({locked:false})
        proms.push(update)
      }
      for(let georef of georefQueue) {
        const update = FirestoreGeorefRecords.doc(georef.georefID).update({locked:false})
        proms.push(update)
      }

      await Promise.all(proms)

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
        similarGeorefContainer.scrollTop = 0 //to make sure the user sees the message!
      }

      let selectedMarker = $dataStore.markers[georefID]
      if(selectedMarker) {
        selectedMarker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5, 
          fillColor: 'grey', 
          fillOpacity: 1,
          strokeColor: 'grey'
        })

        if (selectedMarker.circle) {
          selectedMarker.circle.setOptions ({strokeColor: 'grey'})
        }
        
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

      if (selectedMarker.circle) {
        selectedMarker.circle.setOptions ({strokeColor: 'lightgrey'})
      }

      selectedMarker.setZIndex(0)
    }
    
    if($dataStore.georefIndex[georefID]) {
      $dataStore.georefIndex[georefID].selected = false
    }
    $dataStore.selectedGeorefID = null
  }

  
  //exported so that it can be called from parent
  const getNextForValidation = async _ => {

    if(georefQueue.length) {
      currentGeoref = georefQueue.shift()
      verifyGeorefContainer.scrollTop = 0
      georefMap.setMapWithNewGeoref(currentGeoref)
      changesMade = false
      history = []
      currentGeorefVals = getCurrentGeorefVals(currentGeoref)

      //update the queue positions
      if(queuePositions) {
        if(selectedGeoreferencer.value) {
          queuePositions[selectedGeoreferencer.value] = currentGeoref.georefID
          Firebase.ref(queuePath).child(selectedGeoreferencer.value).set(currentGeoref.georefID)
        }
        else {
          queuePositions.all = currentGeoref.georefID
          Firebase.ref(queuePath).child('all').set(currentGeoref.georefID)
        }
      }
      else {
        if(selectedGeoreferencer.value) {
          queuePositions = {
            [selectedGeoreferencer.value]: currentGeoref.georefID
          }
          Firebase.ref(queuePath).child(selectedGeoreferencer.value).set(currentGeoref.georefID)
        }
        else {
          queuePositions = {
            all: currentGeoref.georefID
          }
          Firebase.ref(queuePath).child('all').set(currentGeoref.georefID)
        }
      }

      //georefIndexQueue is a queue of promises
      //we want to 'fake' a database fetch so the user sees the new georefIndex
      let similarGeorefIndexProm = georefIndexQueue.shift()
      fetchingGeorefIndex = true
      setTimeout(async _ => {
        similarGeorefIndex = await similarGeorefIndexProm
        $dataStore.georefIndex = similarGeorefIndex
        fetchingGeorefIndex = false
      }, 100)
    }

    getGeorefsToVerify() //get another one...

  }

  export const skipCurrentGeoref = _ => {
    if(currentGeoref) {
      //if it's been flagged we don't want to unlock it other verifiers, otherwise...
      if(!currentGeoref.flagged) {
        FirestoreGeorefRecords.doc(currentGeoref.georefID).update({locked: false})
      }

      getNextForValidation()
    }

  }

  export const resetQueuePosition = _ => {
    console.log('running reset queue position')
    if(queuePositions) {
      if(selectedGeoreferencer.value) {
        delete queuePositions[selectedGeoreferencer.value]
        Firebase.ref(queuePath).child(selectedGeoreferencer.value).remove()
      }
      else {
        delete queuePositions.all
        Firebase.ref(queuePath).child('all').remove()
      }
    }

    resetQCGeoref()
    
  }

  onDestroy(unlockGeorefs)

</script>

<!-- ############################################## -->
<!-- HTML -->
<svelte:window on:beforeunload={confirmUnload} on:unload={handleUnload} /> <!--in case the user just closes-->
<div on:keyup={handleKeyUp} class="qcgeoref-container">
  
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
            bind:this={verifyGeorefContainer}
            on:coords-from-paste={handleNewCoordsFromGeoref}
            on:uncertainty-changed={handleGeorefChanged}
            on:locality-changed={handleGeorefChanged}
            on:georef-flagged={handleFlagGeoref}
            on:set-georef={handleSetGeoref} />
        {:else}
          <div class="center">
            <Loader />
          </div>
        {/if}
      </div>
      <div class="matchlist-container">
        {#if fetchingGeorefIndex}
          <div class="center">
            <Loader />
          </div>
        {:else}
          <h4>Similar georeferences</h4>
          <div class="matchlist-flex">
            <MatchList on:georef-selected={handleGeorefSelected}/>
          </div>
          <div class="matchlist-flex-plug" />
        {/if}
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
          bind:this={similarGeorefContainer}
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

  .georef-form-container {
    height:100%;
    max-height:100%;
    width: 100%;
    position:relative;
    display: flex;
    flex-flow: column;
    padding-right: 5px;
    overflow-y: auto;
  }

  .current-georef-container {
    grid-column: 1/2;
    grid-row: 1 / 3;
    padding-right:15px;
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