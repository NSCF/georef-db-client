<script>
  import {onMount, createEventDispatcher} from 'svelte'
  import GeorefForm from '../georef/georefForm.svelte'
  import VerifyMap from './verifyGeorefMap.svelte'

  let dispatch = createEventDispatcher()

  export let Firestore
  export let dataset

  let elasticindex

  let datasetGeorefsIDs
  let searchIndStart = 0
  let currentGeorefID //used to trigger the georef fetch from elastic
  let currentGeoref
  let previousCoords = [] //just so we hand handle accidental pin moves

  let noMoreGeorefsToVerify = false

  onMount(async _ => {
    let georefsSnap = await Firestore.collection('datasetGeorefs').doc(dataset.datasetID).get()
    if(georefsSnap.exists) {
      datasetGeorefsIDs = georefsSnap.data().georefIDs
      getNextGeorefToVerify()
    }
    else {
      alert('no georefs available for this dataset')
      dispatch('to-datasets')
    }
  })

  $: if(dataset) {
    elasticindex = (dataset.region + dataset.domain).toLowerCase()
  }

  $: if(currentGeorefID) {
    fetchGeoref(currentGeorefID)
  }

  //this looks for one to lock in Firestore
  const getNextGeorefToVerify = async _ => {
    let lockInd = 0
    let lockSuccess = false
    let searchIDs = datasetGeorefsIDs.slice(searchIndStart, searchIndStart + 10)
    let querySnap = Firestore.collection('georefRecords')
    .where('georefID', 'in', searchIDs)
    .where('verified', '==', false)
    .where('locked', '==', false) //this assumes that once locked it will be verified

    if(!querySnap.empty) {
      let ref
      while (lockInd < searchIDs.length && !lockSuccess) {
        ref = querySnap.docs[0].ref
        try {
          await Firestore.runTransaction(transaction => {
            transaction.update(ref, {locked: true})
          })
          lockSuccess = true
        }
        catch(err) { //this is a failed transaction, so we try next
          lockInd++
        }
      }
      
      if(lockSuccess) {
        currentGeorefID = ref.id
      }
      else {
        searchIndStart += 10
        if(searchIndStart >= datasetGeorefsIDs.length) {
          noMoreGeorefsToVerify = true
        }
        else {
          getNextGeorefToVerify() //try again
        }
      }
    }
    else {
      searchIndStart += 10
      if(searchIndStart >= datasetGeorefsIDs.length) {
        noMoreGeorefsToVerify = true
      }
      else {
        getNextGeorefToVerify() //try again
      }
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
    
    let res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({georef, index: elasticindex}) 
    })

    if(res.ok) {
      currentGeoref = null
      getNextGeorefToVerify()
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
  <div class="map">
    <VerifyMap georef={currentGeoref} on:new-coords={handleNewCoords}/>
  </div>
  <div class="form">
    <GeorefForm georef={currentGeoref} on:set-georef={handleSetGeoref} />
  </div>
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

</style>