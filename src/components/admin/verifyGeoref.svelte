<script>
  import {onMount, createEventDispatcher} from 'svelte'
  import GeorefForm from '../georef/georefForm.svelte'
  import Loader from '../loader.svelte'
  import VerifyMap from './verifyGeorefMap.svelte'

  let dispatch = createEventDispatcher()

  export let Firestore
  export let dataset

  let elasticindex

  let georefQueue = [] //a queue of {snapshot, georef} objects, with snapshot from firestore, georef from elastic
  let desiredQueueLength = 3 //just setting a param here
  let noMoreGeorefs = false

  let datasetGeorefsIDs = []
  let searchIndStart = 0

  let currentGeoref
  let previousCoords = [] //just so we hand handle accidental pin moves


  onMount(async _ => {
    let datasetGeorefsSnap = await Firestore.collection('datasetGeorefs').doc(dataset.datasetID).get()
    if(georefsSnap.exists) {
      datasetGeorefsIDs = georefsSnap.data().georefIDs
    }
    else {
      alert('no georefs available for this dataset')
      dispatch('to-datasets')
    }
  })

  $: if(dataset) {
    elasticindex = (dataset.region + dataset.domain).toLowerCase()
  }

  $: if(georefQueue && datasetGeorefsIDs.length) {
    getGeorefsToVerify()
  }

  //this looks for one to lock in Firestore
  //uses two while loops to loop through all the georef IDs
  const getGeorefsToVerify = async _ => {
    while (searchIndStart < datasetGeorefsIDs.length && georefQueue.length < desiredQueueLength) {
      //get unlocked, unverified georefs used in this dataset
      let lockInd = 0
      let searchIDs = datasetGeorefsIDs.slice(searchIndStart, searchIndStart + 10)
      let querySnap = await Firestore.collection('georefRecords')
      .where('georefID', 'in', searchIDs)
      .where('verified', '==', false)
      .where('locked', '==', false) //this assumes that once locked it will be verified

      //try to lock and queue some
      if(!querySnap.empty) {
        let ref
        while (lockInd < querySnap.docs.length && georefQueue.length < desiredQueueLength) {
          ref = querySnap.docs[lockInd].ref
          try {
            await Firestore.runTransaction(transaction => {
              return transaction.get(ref).then(snap => {
                if(snap.data().locked) { //it might have been locked between query time and now
                  return
                }
                else {
                  return transaction.update(ref, {locked: true})
                }
              })
            })

            //if it doesn't lock it throws before we get here
            try {
              let georef = await fetchGeoref(querySnap.docs[lockInd].id)
              if(currentGeoref) {
                georefQueue = [...georefQueue, {snap: querySnap.docs[lockInd], georef}]
              }
              else {
                currentGeoref = {snap: querySnap.docs[lockInd], georef}
              }
              lockInd++
            }
            catch(err) {
              console.log('error fetching georef from elastic:', err.message)
              lockInd++
            }
          }
          catch(err) { //this is a failed transaction, so we try next
            lockInd++
          }
        }
        
        //we may not have three so let's try again
        if(georefQueue.length < desiredQueueLength) {
          searchIndStart += 10
        }
      }
      else {
        searchIndStart += 10
      }
    }

    //if we get here and there is nothing in the queue then we've looked at them all
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

    let res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body) 
    });

    if(res.ok) {
      let georefs = await res.json()
      currentGeoref = georefs[0] //there can only be one
    }
    else {
      alert('there was a problem fetching the georef record')
    }
  }

  //for undoing coordinate changes on the georef being verified
  const handleKeyUp = ev => {
    if (ev.code == 'KeyZ' && (ev.ctrlKey || ev.metaKey)) {
      if(previousCoords.length) {
        currentGeoref.decimalCoordinates = previousCoords.pop()
      }
    }
  }

  const handleNewCoords = ev => {
    let newCoords = ev.detail
    if(newCoords) {
      previousCoords.push(currentGeoref.decimalCoordinates)
      currentGeoref.decimalCoordinates = ev.detail
    }
  }

  //this is actually just an instruction to save, and it should always do so because we now have verification
  const handleSetGeoref = async ev => {
    let georef = ev.detail.georef
    let url = 'https://us-central1-georef-745b9.cloudfunctions.net/updategeoref'
    
    //send it off async and hope for the best, we don't want to slow down!!
    try {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({georef, index: elasticindex}) 
      })
    }
    catch(err) {
      alert('Oops, something went wrong while trying to save georef with ID ' + georef.georefID + ': ' + err.message)
    }
    
    //same for the firebase update
    try {
      currentGeoref.snap.ref.update({verified: true, locked: false})
    }
    catch(err) {
      alert('Oops, something went wrong with the georef verification update to Firestore for georef with ID ' + georef.georefID + ': ' + err.message)
    }

    if(georefQueue.length){
      currentGeoref = georefQueue.shift() //this triggers fetching the next
    }
    else {
      currentGeoref = null
    }
  }

  const handleUnload = ev => {
    navigator.sendBeacon(`https://us-central1-georef-745b9.cloudfunctions.net/updateVerifyGeorefLock?georefid=${currentGeoref.georefID}`, '')
  }

</script>

<!-- ############################################## -->
<!-- HTML -->
<svelte:window on:beforeunload={handleUnload} /> <!--in case the user just closes-->
<div on:keyup={handleKeyUp} class="container">
  {#if !noMoreGeorefs}
    {#if currentGeoref}
      <div class="map">
        <VerifyMap georef={currentGeoref.georef} on:new-coords={handleNewCoords}/>
      </div>
      <div class="form">
        <GeorefForm georef={currentGeoref.georef} on:set-georef={handleSetGeoref} />
      </div>
    {:else}
      <div class="loader">
        <Loader />
      </div>
    {/if}
  {:else}
    No more georefs
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

  .loader {
    text-align: center;
    width: 100%;
    height: 100%;
  }

</style>