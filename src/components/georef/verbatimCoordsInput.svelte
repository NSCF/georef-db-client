<script>
import convert from 'geo-coordinates-parser'
import {createEventDispatcher} from 'svelte'
export let value
export let hasError

let dispatch = createEventDispatcher()

const pasteVerbatimCoords = _ => {
  navigator.clipboard.readText().then(coordsString => {
    try {
      let decimalCoords = calcDecimalCoords(coordsString)
      value = coordsString.trim()
      dispatch('coords-from-verbatim', decimalCoords)
    }
    catch(err){
      alert(err.message)
    }
  })
}

const handleInputPasteCoords = ev => {
  ev.preventDefault()
  let pasteData = ev.clipboardData.getData("text")
  try {
    let decimalCoords = calcDecimalCoords(pasteData)
    value = pasteData.trim()
    dispatch('coords-from-verbatim', decimalCoords)
  }
  catch(err){
    alert(err.message)
  }
}

//this throws if any problem at all
const calcDecimalCoords = coordsString => {
  if(coordsString && coordsString.trim()){
    coordsString = coordsString.trim()
    try {
      let converted = convert(coordsString)
      return `${converted.decimalLatitude},${converted.decimalLongitude}`   
    }
    catch(err) {
      throw new Error('invalid verbatim coords string: ' + coordsString)
    }
  }
  else {
    throw new Error('empty coordinates string')
  }
}
</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="icon-input-container">
    <input type="text" class="icon-input" class:hasError readonly on:paste={handleInputPasteCoords} bind:value>
    <span class="material-icons inline-icon icon-input-icon" style="right:5px" title="paste coords" on:click={pasteVerbatimCoords}>content_paste</span>
</div>

<!-- ############################################## -->
<style>

.icon-input-container {
  display: inline-block;
  position:relative;
  width: 100%;
}

.icon-input {
  padding-right: 40px;
  width: 100%;
  max-width: 350px;
  min-width:260px;
}

.icon-input-icon {
  position:absolute;
  bottom:13px; /* becuase the default bottom margin for an input is 8*/
  /* no right property, that must go into the inline style for the element */
  width:24px;
  height:24px;
  color: grey;
}

.icon-input-icon:hover {
  cursor: pointer;
  color: darkslategray;
}

.hasError {
  border: 1px solid rgb(133, 49, 34);
  background-color: rgb(255, 155, 155)
}
</style>