<script>
  import { getContext } from 'svelte';
  import Papa from 'papaparse'
  import readHeadersAndValidate from './validateCSVHeaders.js'
  import FieldsConfirmationModal from './fieldsModalContent.svelte'

  const { open } = getContext('simple-modal');

  //props
  export let Realtime
  export let Firestore
  export let Storage

  //vars
  let validation = undefined
  let requiredFields //they're not all required, but most
  let targetFile = {}

  //UI related variables
  let hovering = false

  //Watchers
  $: requiredFields, onRequiredFieldsUpdated()
  

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
      
      open(FieldsConfirmationModal, {validation}) //the modal okay then handles the next steps
      
    }
    else {
      alert('Please upload a Darwin Core CSV file') //TODO show a modal here
      return
    }

  }

  const onFieldsModalOkay = async fieldsObj => {
    requiredFields = fieldsObj
  }

  const checkFileContents = async () => {
    
    let totalRows = 0
    let recordIDs = []
    let recordIDsMissing = false
    let recordsMissingCountryAlsoMissingID = false
    let duplicatedRecordIDs = []
    let rowsWithoutCountry = []
    let recordsMissingLocalityAlsoMissingID = false
    let rowsWithoutLocality = []
    let localityRecordIDMap = {} //a dictionary to map georeferences back to records - to send to textpack

    //read the file and validate - recordID is unique and locality contains data
    let recordID
    return new Promise((resolve, reject) => {
      Papa.parse(targetFile, {
        step: function(row, parser) {
          recordID = null
          totalRows++
          let country = row.data[requiredFields.countryField].trim()
          let locality = row.data[requiredFields.localityField].trim()
          if(!row.data[requiredFields.rowIDField] || !row.data[requiredFields.rowIDField].trim()) {
            recordIDsMissing = true
            
            if(!country){
              recordsMissingCountryAlsoMissingID = true
            }

            if(!locality) {
              recordsMissingLocalityAlsoMissingID = true
            }

          }
          else {
            recordID = row.data[requiredFields.rowIDField].trim().toLowerCase()
            
            if(recordsIDs.includes(recordID)) {
              duplicatedRecordIDs.push(recordIDs)
            }
            else {
              recordIDs.push(recordID)
            }

            if(!country) {
              rowsWithoutCountry.push(recordID)
            }
            //TODO we need to validate countries also against a master list

            if(!locality) {
              rowsWithoutLocality.push(recordID)
            }

            if(country && locality){
              let cleanedLocality = locality.replace(/\w+/g, ' ')
              if (cleanedLocality.endsWith('.')){
                cleanedLocality = cleanedLocality.substring(0, cleanedLocality.length-1)
              }

              if(!row.data[requiredFields.collectorField] || !row.data[requiredFields.collectorField].trim()) {
                cleanedLocality += ' -- ' + row.data[requiredFields.collectorField].trim()
              }

              //add to the dictionary
              if(localityRecordIDMap[country]){
                if(localityRecordIDMap[country][cleanedLocality]){
                  localityRecordIDMap[country][cleanedLocality].push(recordID)
                }
                else {
                  localityRecordIDMap[country][cleanedLocality] = [recordID]
                }
              }
              else {
                localityRecordIDMap[country] = {}
                localityRecordIDMap[country][cleanedLocality] = [recordID]
              }
            }
          }  
        },
        complete: function() {
          console.log("All done parsing file!");
          let result = {
            totalRows,
            recordIDsMissing,
            recordsMissingCountryAlsoMissingID,
            duplicatedRecordIDs,
            rowsWithoutCountry,
            recordsMissingLocalityAlsoMissingID,
            rowsWithoutLocality,
            localityRecordIDMap
          }
          resolve(result)
        },
        error(err){
          reject(new Error(`error reading file: ${err.message}`))
        }
      });
    })
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
      let fileSummary = await checkFileContents()
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

