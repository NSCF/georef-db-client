<!--
  based on https://codepen.io/MSEdgeDev/pen/KzzNaZ
-->

<script>

import Papa from 'papaparse'

let hovering = false
let csvFile

//EVENT HANDLERS

//onclick method - file open

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

function handleDragDrop(evt){
  evt.stopPropagation(); // Do not allow the drop event to bubble.
  evt.preventDefault(); // Prevent default drop event behavior.
  hovering = false

  let targetFile = evt.dataTransfer.files[0]; // Gr
  if(targetFile && (targetFile.type == 'text/csv' || targetFile.type == 'application/vnd.ms-excel')){
    csvFile = targetFile
    confirmReadCSV(csvFile)
  }
  else {
    alert('Please upload a Darwin Core CSV file')
    return
  }

}

function confirmReadCSV(targetFile){
  
  let data = []
    
  Papa.parse(targetFile, {
    header: true,
    preview: 1,
    complete: results =>  {
      console.log('records read', results.data.length)
      let fields = Object.keys(results.data[0])
      console.log('fields: ', fields)

      //TODO confirm the fields the user is uploading
      //required is locality or verbatimLocality
      //remember dwc: prefixed fields
      //if go ahead then....
      //load the records and recordset metadata to firebase
      //create the unique localities array
      //send the array to textpack
      //textpack loads the groups to firebase
      //report the stats to the user
      //allocate georeferencers and QC team
      //start georeferencing
    }, 
    error: err => console.log('error reading file:', err.message)
  })
}

</script>


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
  >Drop files here.</div>
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

