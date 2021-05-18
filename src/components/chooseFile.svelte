<script>
import {getContext, createEventDispatcher } from 'svelte';
import Alert from './Alert.svelte'

const dispatch = createEventDispatcher();
//const { open } = getContext('simple-modal');

//PROPS
export let profile
export let fileMIMETypes

//LOCALS
let hiddenInput
let hovering = false
let box

//COMPUTED

//WATCHERS

//METHODS
function darkBox() {
  box.style.borderColor = 'gray'
}

function lightBox() {
  box.style.borderColor ='lightgray'
}

function handleBoxClick(evt){
  hiddenInput.click()
}

function onFileSelected() {
  let targetFile = hiddenInput.files[0];
  hovering = false
  toEmitOrNotToEmit(targetFile)
  hiddenInput.value = null
}

function handleDragDrop(evt){
  evt.stopPropagation(); // Do not allow the drop event to bubble.
  evt.preventDefault(); // Prevent default drop event behavior.
  hovering = false
  let targetFile = evt.dataTransfer.files[0];
  toEmitOrNotToEmit(targetFile)
}

function handleGoToDatasets(ev){
  if(profile){
    dispatch('to-datasets')
  }
  else {
    alert('Please register or sign in to begin')
  }
}

//HELPERS
function toEmitOrNotToEmit(file){
  if(file && (fileMIMETypes.includes(file.type))){
    dispatch('file-selected', {
      file
    });
  }
  else {
    open(Alert, 
    { message: "Please select a valid CSV file" }, 
    {
      closeButton:false,
      styleWindow: { 
        backgroundColor:'#f2dede', 
        'border-color': 'blue'
      }
    });
  }
}

</script>

<!--##############################################-->
<!--
  based on https://codepen.io/MSEdgeDev/pen/KzzNaZ
-->
<div class="container">
  <h1>Welcome to the NSCF Georeferencer</h1>
  <button class="datasets-button" on:click={handleGoToDatasets}><strong>GO TO DATASETS</strong></button>
  <h2 style="color:gray">OR</h2>
  <div id="wrapper" class="wrapper">
    <div 
      id="fileDropBox"
      class="fileDropBox"
      bind:this={box}
      on:dragenter={darkBox}
      on:dragleave={lightBox}
      on:drop={handleDragDrop} 
      on:click={handleBoxClick}
      ondragover="return false"
    >
      <p class="boxtext">Drag and drop a Darwin Core CSV file here or click to select</p>
    </div>
    <div class='warning'><strong>Please note that georeferencing must be done separately for terrestrial, freshwater, and coastal/marine datasets</strong></div>
    
  </div>
  
  <input type="file" bind:this={hiddenInput} style="visibility:hidden" on:change={onFileSelected}>
  
</div>
<!--##############################################-->
<style>

.container {
  text-align:center;
  height:100%;
  overflow-y: auto;
}
	h1 {
		color: rgb(72, 72, 148);
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
 .wrapper {
    width:500px;
    margin:0 auto;
    margin-top:20px;

  }
  .fileDropBox {
    margin:auto;
    margin-bottom:20px;
    width: 20em;
    text-align: center;
    color: gray;
    border-radius: 7px;
    border: 10px dashed lightgray;
  }

  .fileDropBox:hover {
    border: 10px dashed grey;
  }

  p {
    margin-top: 5em;
    margin-bottom: 5em;
    margin-left: 2em;
    margin-right: 2em;
    pointer-events: none;
  }

  .datasets-button {
    width: 300px;
    height: 50px;
    background-color: #bcd0ec;
    font-size: 1.5em;
    color: rgb(73, 93, 158);
    border-radius: 2px;
  }

  .datasets-button:hover:enabled {
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);

  }

  .warning {
    background-color: #ffd47d;
    color: rgb(73, 93, 158);
    border-radius: 2px;
    border-width: 20px;
    border: 4px solid #c98f18;
  }

</style>