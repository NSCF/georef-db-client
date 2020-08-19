<script>
import Select from 'svelte-select'
import convert from 'geo-coordinates-parser'

import {createEventDispatcher} from 'svelte'
let dispatch = createEventDispatcher();

export let geoRef

let accuracyUnits = [ 'm', 'km', 'mi']

let georefProtocols = [
  'NSCF protocol',
  'SANBI georeferencing guide', 
  'Chapman & Weiczorek 2020',
  'Chapman & Weiczorek 2006',
  'Weiczorek et al. 2004'
]

let georefSources = [
  'Google Maps', 
  'Google Earth',
  'Google Satellite',
  'Google Terrain',
  '1:250k topomap',
  '1:50k topomap',
  'SANBI gazetteer',
  'Fuzzy gazetteer',
  'verbatim coordinates'
]

let formGeoref
let editable = false
let newGeoref = false


let coordinatesString
let coordinatesError = false
let selectedProtocol
let selectedSources

$:geoRef, updateFromNewGeoref()

$: georefDateOkay = !formGeoref.georefDate || /^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(geoRef.georefDate)
$: verifiedDateOkay = !formGeoref.verifiedDate || /^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(geoRef.verifiedDate)

$: if(coordinatesString) {
  let converted 
  try {
    converted = convert(coordinatesString)
    coordinatesError = false
    formGeoref.decimalLatitude = converted.decimalLatitude
    formGeoref.decimalLongitude = converted.decimalLongitude
  }
  catch(err){
    coordinatesError = true
  }
}

$: if(selectedProtocol) {formGeoref.protocol = selectedProtocol.value}
$: if(selectedSources) {formGeoref.sources = selectedSources.map(x=>x.value).join(' | ')}

const updateFromNewGeoref = _ => {
  if(geoRef){
    
    formGeoref = geoRef
    editable = false
    newGeoref = false

    coordinatesString = geoRef.decimalLatitude + ',' + geoRef.decimalLongitude

    if(geoRef.protocol) {
      selectedProtocol = {value: geoRef.protocol, label: geoRef.protocol}
    }
    
    if (geoRef.sources){
      let sourceItems = geoRef.sources.split('|').filter(x=>x).map(x=>x.trim()).filter(x=>x)
      let newSelectItems
      if(sourceItems) {
        selectedSources = []
        for (let item of sourceItems){
          selectedSources.push({value: item, label:item})
        }
      }
    }
  }
}

const handleEditClick = _ => {
  editable = true
}

const handleNewClick = _ => {
  formGeoref = {}
  coordinatesString = ''
  coordinatesError = false
  selectedProtocol = null
  selectedSources = null
  editable = true
  newGeoref = true;
}

const handleGeorefDateCalendarClick = _ => {
  let now = new Date()
  formGeoref.georefDate = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences
}

const handleGeorefVerifiedDateCalendarClick = _ => {
  let now = new Date()
  formGeoref.verifiedDate = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences
}

const handleFormSubmit = _ => {
  console.log(formGeoref)
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<form on:submit|preventDefault={handleFormSubmit}>
  <div style="text-align:right">
    <span class="material-icons iconbutton"  class:icongrey={!editable}  class:icongreen={editable}  on:click={handleEditClick}>create</span>
    <span class="material-icons iconbutton"  style="font-weight:bold" class:icongrey={!newGeoref}  class:icongreen={newGeoref} on:click={handleNewClick}>add</span>
  </div>
  <div>
    <label for="loc" style="width:100%;text-align:right">locality</label><br/>
    <input type="text" id="loc" style="width:100%" readonly={!editable} bind:value={formGeoref.locality}/>
  </div>
  <div class="oneliner">
    <label  for="coords">decimal coords</label>
    <input type="text" id="coords" style="width:50%" class:hasError={coordinatesError} bind:value={coordinatesString}/>
  </div>
  <div class="oneliner">
    <label for="acc">accuracy</label>
    <div style="display:inline-block;width:50%">
      <input type="number" id="acc" style="width:57%"  bind:value={formGeoref.accuracy}/>
      <select id='accunit' style="width:40%" bind:value={geoRef.accuracyUnit}>
        <option disabled selected value/>
        {#each accuracyUnits as unit}
          <option value={unit}>{unit}</option>
        {/each}
      </select>
    </div>
  </div>
  <div class="oneliner">
    <label for="georefBy">georef by</label>
    <input type="text" id="georefBy" style="width:50%" bind:value={formGeoref.georefBy}/>
  </div>
  <div class="oneliner">
    <label for="georefDate">georef date</label>
    <div class="fields">
      <div class="flex">
        <input  class:hasError={!georefDateOkay} type="text" id="georefDate" autocomplete="off" bind:value={formGeoref.georefDate}/>
        <span class="material-icons calendaricon" on:click={handleGeorefDateCalendarClick}>date_range</span>
      </div>
    </div>
  </div>
  <div>
    <label style="width:100%;text-align:right" for="protocol">protocol</label>
    <div class="inline-select">
      <Select id="protocol" items={georefProtocols.map(x=> ({value:x, label:x}))} isCreatable={true} placeholder={'Select a protocol...'} bind:selectedValue={selectedProtocol} />
    </div>
  <div>
    <label style="width:100%;text-align:right" for="sources">sources</label>
    <div class="inline-select">
      <Select id="sources" items={georefSources.map(x=> ({value:x, label:x}))} isCreatable={true} isMulti={true} placeholder={'Select source/s...'} bind:selectedValue={selectedSources}/>
    </div>
  </div>
  <div class="oneliner">
    <label for="verifiedBy">verified by</label>
    <input type="text" id="verifiedBy" bind:value={formGeoref.verifiedBy}/>
  </div>
  <div class="oneliner">
    <label for="verifiedDate">verified date</label>
    <div class="fields">
      <div class="flex">
        <input class:hasError={!verifiedDateOkay} type="text" id="verifiedDate" autocomplete="off" bind:value={formGeoref.verifiedDate}/>
        <span class="material-icons calendaricon" on:click={handleGeorefVerifiedDateCalendarClick}>date_range</span>
      </div>
    </div>
  </div>
  <div>
    <label for="remarks" style="width:100%;text-align:right">remarks</label>
    <textarea id="remarks" rows="3" bind:value={formGeoref.remarks}/>
  </div>
  <div style="text-align:center">
    <button class="georefbutton">Use this georeference</button>
  </div>
</form>

<!-- ############################################## -->
<style>
form {
  width:30vw
}

label {
  display: inline-block;
  width: 140px;
  text-align: right;
  color:grey;
  font-weight: bolder;
}

textarea {
  resize: none;
  width: 100%;
}

.oneliner{
  width:100%;
  text-align: right;
}

.oneliner > .fields {
  display:inline-block;
  width:50%
}
.oneliner > .fields > .flex {
  display: flex;
  align-items: center;
}

.inline-select {

  margin-bottom:8px;
  --height:35px;
  --borderRadius:2px;
  --border: 1px solid lightgray;
  --multiItemHeight: 25px;
  --multiClearTop:3px;
  --multiClearPadding: 2px;
  --multiClearBG:none;
  --multiClearFill:grey;
  --multiClearHoverBG:none;
  --multiClearHoverFill:white;
}

.hasError {
  border: 1px solid rgb(133, 49, 34);
  background-color: rgb(255, 155, 155)
}

.georefbutton {
  border-radius: 10px;
  padding:10px;
  width:70%;
}

.flex > input {
  flex-grow: 1;
  width:80%
}

.calendaricon {
  width: 20px;
  color:grey;
  padding-bottom:8px;
}

.calendaricon:hover {   
  cursor: pointer
}

.iconbutton{
  font-size:2em;
  border-radius: 2px;
}

.icongrey {
  color:grey;
  border: 1px solid grey;
}

.icongreen {
  color:green;
  border: 1px solid green;
}

.iconbutton:hover{
  cursor: pointer
}

button:hover{
  cursor:pointer;
  border-color:rgb(31, 107, 31);
  background-color:rgb(185, 245, 185);
}
</style>