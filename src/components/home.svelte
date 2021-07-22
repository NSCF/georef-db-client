<script>
import {createEventDispatcher } from 'svelte';
import ManualGeoref from './georef/manualGeoref.svelte'
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
let searching = false

//COMPUTED

//WATCHERS

//METHODS
function darkBox() {
  box.style.borderColor = '#bcd0ec'
  box.querySelector('.ico-up').style.color = '#bcd0ec'
  box.querySelector('.dwc-p').style.color = '#495d9e'
  box.querySelector('.box-arrow').style.color = '#495d9e'
}

function lightBox() {
  box.style.borderColor ='lightgray'
  box.querySelector('.ico-up').style.color = 'lightgray'
  box.querySelector('.dwc-p').style.color = 'lightgray'
  box.querySelector('.box-arrow').style.color = 'lightgray'
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
  {#if !searching}
    <h1>Welcome to the NSCF Georeferencer</h1>
  {:else}
    <div style="margin-top:20px" />
  {/if}
  <h3 style="color: darkslategray;">Single georeference lookup</h3>
  <ManualGeoref  on:custom-search-searching={_ => searching = true} on:custom-search-cleared={_ => searching = false} />
  {#if !searching}  
    {#if profile}
      <h2 style="color:gray">OR</h2>
      <button class="datasets-button" on:click={handleGoToDatasets}><strong>GO TO DATASETS</strong></button>
      {#if profile.isAdmin} <!--Note this is not a dataset admin, this is an admin on the tool!-->
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
            <div>
              <span class="material-icons-outlined ico-up">cloud_upload</span>
              <p class="dwc-p">Darwin Core</p>
              <p class="box-p">Drag&Drop a CSV file to start georeferencing</p>
              <span class="material-icons-outlined box-arrow">reply</span>
            </div>
          </div>
        </div>
        <div class='warning'><strong>Please remember that georeferencing must be done separately for terrestrial, freshwater, and coastal/marine datasets</strong></div>
        <input type="file" bind:this={hiddenInput} style="visibility:hidden" on:change={onFileSelected}>
      {:else}
        <div class='warning warning-lower'><strong>To use this tool for collaborative georeferencing please contact the NSCF on data[at]nscf.org.za</strong></div>
      {/if}
    {:else}
      <div class='warning warning-lower'><strong>To use this tool for collaborative georeferencing please contact the NSCF on data[at]nscf.org.za</strong></div>
    {/if}
    <div class="madewith">
      <span>made with</span>
      <a href="https://svelte.dev" target="_blank">
        <img src="images/svelte-android-chrome-512.png" title="Svelte" alt="Svelte" class="madewithimg"/>
      </a>
      <span>+</span>
      <a href="https://firebase.google.com" target="_blank">
        <img src="images/firebase.png" title="Firebase" alt="Firebase" class="madewithimg"/>
      </a>
      <span>+</span>
      <a href="https://www.elastic.co/" target="_blank">
        <img src="images/elasticsearch.png" title="ElasticSearch" alt="ElasticSearch" class="madewithimg"/>
      </a>
    </div> 
  {/if}
    
</div>
<!--##############################################-->
<style>

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  height:100%;
  width: 100%;
  overflow-y: auto;
}
	h1 {
		color: rgb(72, 72, 148);
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

 .wrapper {
    position:relative;
    width:500px;
    margin:0 auto;
    margin-top:20px;
    color:lightgray
  }

  .fileDropBox {
    margin:auto;
    margin-bottom:20px;
    width: 20em;
    text-align: center;
    border-radius: 7px;
    border: 10px dashed lightgray;
  }

  .fileDropBox * {
    pointer-events: none;
  }

  .fileDropBox:hover {
    border: 10px dashed #bcd0ec;
    color: #bcd0ec;
  }

  .ico-up {
    font-size: 6em;
  }

  .box-p {
    width:80%;
    color: grey;
    padding-top: 5px;
    margin-bottom: 3em;
    margin-left: 2em;
    margin-right: 2em;
  }

  .dwc-p {
    position:absolute;
    font-family: 'Mr Dafoe', cursive;
    font-size: 2em;
    top: 0.6em;
    right: 3em;
    transform: rotate(-35deg)
  }

  .box-arrow {
    position:absolute;
    font-size: 2em;
    top: 3.3em;
    left: 7.5em;
    transform: rotate(-100deg)
  }

  .fileDropBox:hover .dwc-p, .fileDropBox:hover  .box-arrow {
    color: #495d9e;
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
    width: 600px;
    text-align: center;
    background-color: #ffd47d;
    color: rgb(73, 93, 158);
    border-radius: 2px;
    border-width: 20px;
    border: 4px solid #c98f18;
  }

  .warning-lower {
    margin-top:100px;
  }

  .madewith {
    display:flex;
    align-items: center;
    position: fixed;
    bottom: 10px;
    right:30px;
  }
  .madewithimg {
    max-height:20px;
    max-width:20px;
  }

</style>