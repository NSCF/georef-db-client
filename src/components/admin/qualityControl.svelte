<script>

  import {onMount, createEventDispatcher} from 'svelte'
  import {Firestore, Realtime as Firebase} from '../../firebase'
  import Select from 'svelte-select'
  import QCGeorefs from './qcGeorefs.svelte'
  import Dialog from '../Dialog.svelte'

  const dispatch = createEventDispatcher()
  
  export let profile
  export let dataset

  let selectedTab = 'georefs'

  let georeferencersDictionary = {}
  let georeferencersOptions = []
  let selectedGeoreferencer
  let disableFeedbackButton = false
  let georeferencerFeedbackCounts = null

  let qcGeorefs //for binding

  //for changes to feedback counts from Firebase or georeferencer changed
  $: if (georeferencerFeedbackCounts || selectedGeoreferencer)  updateFeedbackButtonDisabledOnCountsOrSelectionChanged()

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

  const handleSkipValidation = _ => {
    if(qcGeorefs) {
      qcGeorefs.skipCurrentGeoref()
    }
  }

  const handleBackToDatasets = _ => {
    dispatch('to-datasets')
  }

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="qc-container"> <!--just in case-->
  <div class="tools-container">
    <button class="dataset-tool" title="back to datasets" on:click={handleBackToDatasets}>
      <span class="material-icons">list</span>
    </button>
    <button class="dataset-tool" title="skip this validation" on:click={handleSkipValidation}>
      <span class="material-icons">skip_next</span>
    </button>
  </div>
  <div>
    <h4>Quality control for {dataset.datasetName}</h4>
    <div class="controls">
      <div class="tabs">
        <div class="tab" class:tab-selected={selectedTab == 'georefs'} on:click='{_ => selectedTab = 'georefs'}'>
          Georeferences
        </div>
        <div class="tab" class:tab-selected={selectedTab == 'species'} on:click='{_ => selectedTab = 'species'}'>
          Species
        </div>
      </div>
      <div class="georeferencer-controls">
        <div class="svelte-select">
          <Select  items={georeferencersOptions} bind:value={selectedGeoreferencer} />
        </div>
        <button class="feedback-button" disabled={disableFeedbackButton} on:click={sendFeedback}>Send feedback</button>
      </div>
    </div>
    
  </div>
  <div class="working-area">
    {#if selectedTab == 'georefs'}
      <QCGeorefs {profile} {dataset} {selectedGeoreferencer} bind:this={qcGeorefs} />
    {:else}
      <div>under construction...</div>
    {/if}
  </div>
</div>

<!-- ############################################## -->
<style>
  .qc-container {
    position:relative;
    display:flex;
    flex-direction:column;
    height: 100%;
    width:100%;
  }

  .controls {
    display: flex;
    justify-content: space-between;
  }

  .tabs {
    display: grid;
    grid-template-columns: auto auto auto;
    width: 600px;
    height: 40px;
  }

  .tab {
    text-align:center;
    border-bottom: 5px solid #99ccff;
  }
  .tab:hover {
    cursor:pointer
  }

  .tab-selected {
    background-color:#b6d8fc;
    font-weight:500;
  }

  .georeferencer-controls {
    display: flex;
    justify-content: flex-end;
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

  .working-area {
    flex: 1;
    overflow-y:auto; /* absolutely no idea why this works but it does */
    width:100%;
  }

  .tools-container {
    position:absolute;
    top:10px;
    right:10px;
  }

  .tools-container::after {
    content: "";
    display: block; 
    clear: both;
  }

  .dataset-tool {
    float:right;
    margin-left:5px;
    padding-bottom:0;
    background-color: lightgray;
  }

  .dataset-tool:hover {
    cursor:pointer;
    background-color:grey;
    color:white;
  }
</style>