<script>
  import { getContext } from 'svelte';
  import Papa from 'papaparse'
  import readHeadersAndValidate from './validateCSVHeaders.js'
  import validateCSVContent from './validateCSVContent.js'
  import FieldsConfirmationModal from './fieldsModalContent.svelte'
  import DataConfirmationModal from './dataModalContent.svelte'

  const { open } = getContext('simple-modal');

  //props
  export let Realtime
  export let Firestore
  export let Storage

  //vars
  let validation = undefined
  let requiredFields //they're not all required, but most
  let targetFile = {}
  let fileSummary
  let goAheadAndUpload = false

  //UI related variables
  let hovering = false

  //Watchers
  $: requiredFields, async () => {
    console.log('confirming file content')
    fileSummary = await validateCSVContent(targetFile, requiredFields)
    open(DataConfirmationModal, {fileSummary, onOkay: contentModalOkay})
  }
  $: goAheadAndUpload, async () => {
    console.log('uploading metadat')
    await uploadFileAndMetadata(fileSummary)
    console.log('uploaded, well done!!')
  }
  
  //EVENT HANDLERS

  //TODO onclick method - file open

  function handleMouseOver(evt){
    evt.stopPropagation(); // Do not allow the dragover event to bubble.
    evt.preventDefault(); // Prevent default dragover event behavior.
    hovering = true
  }

  function handleMouseout(evt){
    evt.stopPropagation(); // Do not allow the dragover event to bubble.
    evt.preventDefault(); // Prevent default dragover event behavior.
    hovering = false
  }

  function handleDragEnter(evt){
    evt.stopPropagation(); // Do not allow the dragover event to bubble.
    evt.preventDefault(); // Prevent default dragover event behavior.
    hovering = true
  }

  function handleDragLeave(evt){
    evt.stopPropagation(); // Do not allow the dragover event to bubble.
    evt.preventDefault(); // Prevent default dragover event behavior.
    hovering = false
  }

  async function handleDragDrop(evt){
    evt.stopPropagation(); // Do not allow the drop event to bubble.
    evt.preventDefault(); // Prevent default drop event behavior.
    hovering = false

    targetFile = evt.dataTransfer.files[0];
    if(targetFile && (targetFile.type == 'text/csv' || targetFile.type == 'application/vnd.ms-excel')){
      validation = await readHeadersAndValidate(targetFile, Realtime)
      
      console.log('confirming fields')
      open(FieldsConfirmationModal, {validation, onOkay: fieldsModalOkay}, {closeOnOuterClick: false}) //the modal okay then handles the next steps

    }
    else {
      alert('Please upload a Darwin Core CSV file') //TODO show a modal here
      return
    }

  }

  const fieldsModalOkay = async fieldsObj => {
    requiredFields = fieldsObj
  }

  const contentModalOkay = async () =>{
    goAheadAndUpload = true
  }

  const uploadFileAndMetadata = async (fileSummary) => {

    let datasetID = Math.round((new Date()).getTime() / 1000); //use a timestamp
    let originalFilename = targetFile.name
    //TODO we need the 'description', like 'Bews Fabaceae' and it needs to be unique
    Storage().ref().child(`datasets/${ts}.csv`);
    let snap
    try{
      snap = await ref.put(targetFile)
    } 
    catch(err){
      //TODO
    }

    let fileURL = await snap.ref.getDownloadURL()

    let dateCreated = new Date().toString()

    //TODO complete the relevant fields here like user, etc
    let metadata = {
      datasetID,
      originalFilename,
      fileURL,
      dateCreated,
      localityRecordIDMap: fileSummary.localityRecordIDMap,
      recordCount: fileSummary.totalRows, 
      recordsGeoreferenced: 0, 
      fields: requiredFields
    }

    try {
      await Firestore.collection('datasets').add(metadata)
    }
    catch(err){
      console.log('error adding metadata:', err)
    }

  }

  const onRequiredFieldsUpdated = async () => {
    try {
      //TODO give message to go ahead or not based on file contents
      //if go ahead then
      await uploadFileAndMetadata(fileSummary)

    //send the array to textpack
    //textpack loads the groups to firebase
    //report the stats to the user
    //allocate georeferencers and QC team
    //start georeferencing


    }
    catch(err){
      //TODO
    }
    
  }

</script>

<!--
  based on https://codepen.io/MSEdgeDev/pen/KzzNaZ
-->
<div id="wrapper" class="wrapper">
  <div 
    id="fileDropBox"
    class="fileDropBox"
    class:active={hovering}
    class:inactive={!hovering}
    on:mouseenter={handleMouseOver}
    on:mouseleave={handleMouseout}
    on:dragenter={handleDragEnter} 
    on:dragleave={handleDragLeave}  
    on:drop={handleDragDrop} 
    ondragover="return false"
  >Drop files here or click to upload</div>
</div>

<style>

  * {
    font-family: segoe, sans-serif;
  }

 .wrapper {
    width:500px;
    margin:0 auto;
    margin-top:40px;
  }
  .fileDropBox {
    margin-left:100px;
    width: 20em;
    line-height: 10em;
    text-align: center;
    color: gray;
    border-radius: 7px;
  }

  .inactive {
    border: 10px dashed lightgray;
  }

  .active {
    border: 10px dashed grey;
  }

</style>

