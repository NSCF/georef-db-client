<script>
  import {onMount, onDestroy, createEventDispatcher} from 'svelte'
  import {Firestore, Auth} from '../../firebase'
  import GeorefForm from '../georef/georefForm.svelte'
  import Loader from '../loader.svelte'
  import VerifyMap from './qcGeorefMap.svelte'
  import Georef from '../georef/Georef'
  import Toast from '../toast.svelte'

  let dispatch = createEventDispatcher()

  export let profile
  export let dataset

  let elasticindex

  let georefQueue = []
  let desiredQueueLength = 3 //just setting a param here
  let noMoreGeorefs = false
  let showNoMoreGeorefs = false

  let datasetGeorefsIDs = []

  let currentGeoref
  let currentGeorefMapVals //for storing change history
  let prevGeoref = null //for checking if the georef object has changed or now
  let history = [] //just so we hand handle accidental pin moves

  let changesMade = false

  $: if(dataset) {
    elasticindex = (dataset.region + dataset.domain).toLowerCase().replace(/\s+/g, '')
  }

  
  //when current georef changes...
  $: if(currentGeoref) {
    if(currentGeoref != prevGeoref) {
      history = []
      prevGeoref = currentGeoref
    }
    currentGeorefMapVals = {
      decimalCoordinates: currentGeoref.decimalCoordinates,
      uncertainty: currentGeoref.uncertainty,
      uncertaintyUnit: currentGeoref.uncertaintyUnit
    }
  }

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
    console.log('fetching georefs to verify')
    noMoreGeorefs = false
    let searchIndStart = 0
    let batchSize = 10 //This is the limit for 'in' searches in Firestore
    while (searchIndStart < datasetGeorefsIDs.length && georefQueue.length < desiredQueueLength) {
      //get unlocked, unverified georefs used in this dataset
      
      let searchIDs = datasetGeorefsIDs.slice(searchIndStart, searchIndStart + batchSize)
      let querySnap = await Firestore.collection('georefRecords')
      .where('georefID', 'in', searchIDs)
      .where('verified', '==', false)
      .where('locked', '==', false) 
      .get()

      //try to lock and queue some
      if(!querySnap.empty) {
        for (let docSnap of querySnap.docs) {
          try {
            await Firestore.runTransaction(async transaction => {
              let snap = await transaction.get(docSnap.ref)
              if(snap.data().locked) { //it might have been locked between query time and now
                return
              }
              else {
                await transaction.update(docSnap.ref, {locked: true})
                return
              }
            })
            
            //if it doesn't lock it throws before we get here
            try {
              let georef = await fetchGeoref(docSnap.id)
              
              if(currentGeoref) {
                georefQueue = [...georefQueue, georef]
              }
              else {
                currentGeoref = georef
              }
            }
            catch(err) {
              console.error('error fetching georef from elastic:', err.message)
              await docSnap.ref.update({locked: true})//unlock it again
            }
          }
          catch(err) { //this is a failed transaction, so we try next
            console.error('transaction failed:', err.message)
            continue //not needed but just for clarity
          }
          
          //break the loop if we have enough
          if(georefQueue.length >= desiredQueueLength){ //we have two plus a currentGeoref
            break
          }
        }
        
        //we may not have three so let's try again
        if(georefQueue.length < desiredQueueLength) {
          searchIndStart += batchSize
        }
      }
      else { //This will happen if all locked and/or verified
        searchIndStart += batchSize
      }
    }

    //if we get here and there is nothing in the queue then we've looked at them all
    //but it may be possible that some will be unlocked later...
    if(georefQueue.length == 0) {
      noMoreGeorefs = true
    }
  }

  const fetchGeoref = async georefID => {
    let url = 'https://us-central1-georef-745b9.cloudfunctions.net/getgeorefsbyid'
    let body = {
      index: elasticindex, 
      georefIDs: [georefID]
    }

    let token = await Auth.currentUser.getIdToken(true);
    let res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body) 
    });

    if(res.ok) {
      let georefs = await res.json()
      let georef = new Georef()
      //there can only be one, and yes, it seems we're returning the elastic object here still... :-/
      georef = Object.assign(georef, georefs[0]._source)
      return georef 
    }
    else {
      let resbody = await res.text()
      throw new Error(resbody)
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

  const handleNewCoordsFromMap = _ => {
    history.push(currentGeorefMapVals)
    currentGeoref = currentGeoref
  }

  const handleNewCoordsFromGeoref = _ => {
    history.push(currentGeorefMapVals)
    currentGeoref = currentGeoref //svelte, to update the map
  }

  const handleUncertaintyChanged = ev => {
    history.push(currentGeorefMapVals)
    currentGeoref = currentGeoref //svelte, to update the map
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
        <VerifyMap {currentGeoref} on:new-coords={handleNewCoordsFromMap}/>
      </div>
      <div class="form">
        <GeorefForm georef={currentGeoref} 
          showButtons={false}
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
    overflow-y: auto;
  }

  .center {
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

</style>