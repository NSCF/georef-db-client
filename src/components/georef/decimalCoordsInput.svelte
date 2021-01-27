<script>
export let value
export let hasError

const copyDecimalCoords = ev => {
  if(value && value.trim()) {
    navigator.clipboard.writeText(value).then(_ => {
      if(window.pushToast) {
        window.pushToast('coordinates copied')
      }
    })
  }
  else {
    if(window.pushToast) {
      window.pushToast('coordinates empty')
    }
    else {
      alert('coordinates empty')
    }
  }
}

const pasteDecimalCoords = _ => {
  navigator.clipboard.readText().then(coordsString => {
    try {
      value = validateCoordsString(coordsString)
    }
    catch(err){
      if(!coordsString || !coordsString.trim()){
        alert('clipboard empty')
      }
      else {
        alert('invalid coordinates: ' + coordsString.trim())
      }
    }
  })
}

const handleInputPasteCoords = ev => {
  ev.preventDefault()
  let pasteData = ev.clipboardData.getData("text")
  if(pasteData && pasteData.trim()){
    try {
      value = validateCoordsString(pasteData)
    }
    catch(err){
      alert('invalid coordinates: ' + coordsString.trim())
    }
  }
  else {
    alert('clipboard empty')
  }
}

//this throws if any problem at all
const validateCoordsString = coordsString => {
  if(coordsString && coordsString.trim()){
    //the same validation as we have on the Georef object just in case
    coordsString = coordsString.trim()
    let re = /^-?\d{1,2}\.\d{4,},\s*-?\d{1,3}\.\d{4,}$/
    if(re.test(coordsString)){
      
      let parts = coordsString.split(',')
      let decimalLatitudeString = parts[0]
      let decimalLongitudeString = parts[1]

      let decimalLatitude, decimalLongitude

      let dlsParts = decimalLatitudeString.split('.')
      if(dlsParts[1].length > 8) {
        decimalLatitude = Number(Number(decimalLatitudeString).toFixed(8))
      }
      else {
        decimalLatitude = Number(decimalLatitudeString)
      }

      dlsParts = decimalLongitudeString.split('.')
      if(dlsParts[1].length > 8) {
        decimalLongitude = Number(Number(decimalLongitudeString).toFixed(8))
      }
      else {
        decimalLongitude = Number(decimalLongitudeString)
      }
      
      if(decimalLatitude > 90 || decimalLatitude < -90){
        throw new Error()
      }

      if(decimalLongitude > 180 || decimalLongitude < -180){
        throw new Error()
      }

      //everything is okay
      return `${decimalLatitude},${decimalLongitude}`

    }
    else {
      throw new Error()
    }
  }
  else{
    throw new Error()
  }
}
</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="icon-input-container">
    <input type="text" class="icon-input" class:hasError readonly on:paste={handleInputPasteCoords} bind:value>
    <span class="material-icons inline-icon icon-input-icon" style="right:30px" title="copy coords" on:click={copyDecimalCoords}>content_copy</span>
    <span class="material-icons inline-icon icon-input-icon" style="right:5px" title="paste coords" on:click={pasteDecimalCoords}>content_paste</span>
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