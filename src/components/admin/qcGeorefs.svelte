<script>
  import {onMount, onDestroy, createEventDispatcher} from 'svelte'
  import {Firestore, Auth} from '../../firebase'
  import GeorefForm from '../georef/georefForm.svelte'
  import Loader from '../loader.svelte'
  import VerifyMap from './qcGeorefMap.svelte'
  import Georef from '../georef/Georef'
  import Toast from '../toast.svelte'

  let dispatch = createEventDispatcher()

  const FirestoreGeorefRecords = Firestore.collection('georefRecords')
  const FirestoreGeorefs = Firestore.collection('georefBackup')

  export let profile
  export let dataset

  let elasticindex

  let georefQueue = []
  let desiredQueueLength = 3 //just setting a param here
  let noMoreGeorefs = false
  let showNoMoreGeorefs = false

  let datasetGeorefsIDs = []

  let georefMap
  let mapReady = false

  let currentGeoref
  let currentMapData //for storing change history
  let prevGeoref = null //for checking if the georef object has changed or now
  let history = [] //just so we hand handle accidental pin moves

  let changesMade = false

  $: if(dataset) {
    elasticindex = (dataset.region + dataset.domain).toLowerCase().replace(/\s+/g, '')
  }

  //when current georef changes...
  $: if(currentGeoref && mapReady) {
    georefMap.setMapWithNewGeoref(currentGeoref)
  }

  $: georefQueue, georefQueue.length? console.log('georef queue has', georefQueue.length, 'georefs') : console.log('no georefs in georef queue')

  onMount(async _ => {
    let datasetGeorefsSnap = await Firestore.collection('datasetGeorefs').doc(dataset.datasetID).get()
    if(datasetGeorefsSnap.exists) { //it should unless no georefs done
      datasetGeorefsIDs = datasetGeorefsSnap.data().georefIDs
      getGeorefsToVerify()
    }
    else { //this should only happen if nothing has been georeferenced in the dataset
      //TODO handle this better
      alert('no georefs available for this dataset')
      dispatch('to-datasets')
    }
  })
  
  //This populates georefQueue and gives a currentGeoref if we don't have one
  const getGeorefsToVerify = async _ => {
    while (!noMoreGeorefs && georefQueue.length < desiredQueueLength) {
            
      let querySnap
      try {
        querySnap = await FirestoreGeorefRecords
        .where('datasetIDs', 'array-contains', dataset.datasetID)
        .where('verified', '==', false)
        .where('locked', '==', false)
        .limit(1)
        .get()
      }
      catch(err) {
        console.error('Error reading georefRecords:')
        console.error(err)
        return
      }

      if(querySnap.empty) {
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
          }
          else {
            currentGeoref = georef
          }
        }
      }
    }
  }

  //for undoing coordinate changes on the georef being verified
  const handleKeyUp = ev => {
    if (ev.code == 'KeyZ' && (ev.ctrlKey || ev.metaKey)) {
      if(history.length) {
        currentGeoref.decimalCoordinates = history.pop()
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
  }

  const handleNewCoordsFromGeoref = ev => {
    const temp = {
      decimalCoordinates: ev.detail, 
    }
    history.push(currentMapData)
    currentMapData = temp
    georefMap.updateGeorefDetails(currentMapData)
  }

  const handleUncertaintyChanged = ev => {
    let temp = ev.detail
    history.push(currentMapData)
    currentMapData = temp
    georefMap.updateGeorefDetails(currentMapData)
  }

  //save the verified georef
  //update firebase
  //if remarks save the map and feedback for the georeferencer
  const handleSetGeoref = async ev => {

    //lets get the next one to work on (because of some async stuff below)...
    currentGeoref = null
    setTimeout(async _ => {
      if(georefQueue.length){
        currentGeoref = georefQueue.shift() 
      }
      
      await getGeorefsToVerify()

      //handle the case where we have nothing left
      if(noMoreGeorefs) {
        showNoMoreGeorefs = true
      }
    }, 500)

    //handle the updated georef
    let georef = ev.detail.georef

    //TODO this must be queued for feedback to the georeferencer -- still need to work that out 
    if(georef.verificationRemarks) {

    }

    let url = 'https://us-central1-georef-745b9.cloudfunctions.net/updategeoref'
    
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
      alert('Oops, something went wrong while trying to save georef with ID ' + georef.georefID + ': ' + err.message)
      return
    }
    
    //if successful above
    if(res.ok) {
      try {
        Firestore.collection('georefRecords').doc(georef.georefID).update({verified: true, locked: false})
      }
      catch(err) {
        alert('Oops, something went wrong with the georef verification update to Firestore for georef with ID ' + georef.georefID + ': ' + err.message)
      }
    }
    
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

  onDestroy(unlockGeorefs)

</script>

<!-- ############################################## -->
<!-- HTML -->
<svelte:window on:beforeunload={confirmUnload} on:unload={handleUnload} /> <!--in case the user just closes-->
<div on:keyup={handleKeyUp} class="container">
  {#if showNoMoreGeorefs}
    <div class="center">
      <h4>No more georeferences to verify for this dataset</h4>
    </div>
  {:else}
    {#if currentGeoref}
      <div class="map">
        <VerifyMap 
          on:new-coords={handleNewCoordsFromMap} 
          on:map-ready={_ => mapReady = true}
          bind:this={georefMap} 
        />
      </div>
      <div class="form">
        <GeorefForm georef={currentGeoref} 
          showResetButton={false}
          submitButtonText="Confirm this georeference" 
          showVerification={true}
          defaultGeorefBy={profile.formattedName}
          defaultGeorefByORCID={profile.orcid}
          requiredFields={['verifiedBy', 'verifiedDate', 'verifierRole']}
          on:coords-from-paste={handleNewCoordsFromGeoref}
          on:uncertainty-changed={handleUncertaintyChanged}
          on:set-georef={handleSetGeoref} />
      </div>
    {:else}
      <div class="center">
        <Loader />
      </div>
    {/if}
  {/if}
  <Toast />
</div>

<!-- ############################################## -->
<style>
  .container {
    display:flex;
    width:100%;
    height:100%;
  }

  .map {
    width:70%;
    height:100%;
  }

  .form {
    width: 30%;
    height: 100%;
    padding-right: 15px;
    overflow-y: auto;
  }

  .center {
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

</style>