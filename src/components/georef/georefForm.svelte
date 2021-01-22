<script>
import Select from 'svelte-select'
import convert from 'geo-coordinates-parser'

import {createEventDispatcher} from 'svelte'
let dispatch = createEventDispatcher();

export let georef 

let template = {
  locality: null, 
  decimalLatitude: null, 
  decimalLongitude: null, 
  uncertainty: null, 
  uncertaintyUnit: null, 
  datum: null, 
  by: null, 
  date: null, 
  protocol: null, 
  sources: null, 
  remarks: null, 
  verified: null, 
  verifiedDate: null, 
  verifiedBy: null, 
  verifiedRemarks: null
}

export let showButtons = true
export let showWKT = false
export let showVerification = false
export let buttonText

export let requiredFields = [] //for on form validation

let uncertaintyUnitsEnum = ['m', 'km']

//TODO make prop and must come from a database
export let georefProtocols = [
  'NSCF protocol',
  'SANBI georeferencing guide', 
  'Chapman & Weiczorek 2020',
  'Chapman & Weiczorek 2006',
  'Weiczorek et al. 2004'
]

//TODO make prop and must come from a database
export let georefSources = [
  'Google Maps', 
  'Google Earth',
  'Google Satellite',
  'Google Terrain',
  '1:250k topomap',
  '1:50k topomap',
  'SANBI gazetteer',
  'Fuzzy gazetteer',
  'verbatim coordinates',
  'NSCF georeference database'
]

let coordinatesString
let coordinatesError = false
let selectedProtocol
let selectedSources

let accuracyUnitSelect = {}

let georefDateOkay, verifiedDateOkay

$: georef, updateFromNewGeoref()

$: if (georef && georef.date) {
  georefDateOkay = /^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(georef.date) && new Date(georef.date) < Date.now()
}
$: if (georef && georef.date) {
  verifiedDateOkay = /^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(georef.verifiedDate) && new Date(georef.verifiedDate) < Date.now()
}

$: coordinatesString, updateCoords()

$: if(georef && !georef.uncertainty) {georef.uncertaintyUnit = null; accuracyUnitSelect.selectedIndex = "-1"} //resetting if accuracy emptied
$: if(selectedProtocol && georef && georef.hasOwnProperty('protocol')) {georef.protocol = selectedProtocol.value}
$: if(selectedSources && georef &&georef.hasOwnProperty('sources') && selectedSources.length) {georef.sources = selectedSources.map(x=>x.value).join(' | ')}

const updateFromNewGeoref = _ => {
  if(georef && Object.keys(georef).length){
    
    coordinatesString = georef.decimalLatitude + ',' + georef.decimalLongitude

    if(georef.protocol) {
      selectedProtocol = {value: georef.protocol, label: georef.protocol}
    }
    
    if (georef.sources){
      let sourceItems = georef.sources.split('|').filter(x=>x).map(x=>x.trim()).filter(x=>x)
      let newSelectItems
      if(sourceItems) {
        selectedSources = []
        for (let item of sourceItems){
          selectedSources.push({value: item, label:item})
        }
      }
    }
  }
  else {
    //we need this because otherwies there are problems with the HTML
    georef = template
    coordinatesString = null
    selectedProtocol = null
    selectedSources = null
  }
}

const updateCoords = _ => {
  if(coordinatesString) {
    let converted 
    try {
      converted = convert(coordinatesString, 8)
      coordinatesError = false
      georef.decimalLatitude = converted.decimalLatitude
      georef.decimalLongitude = converted.decimalLongitude
    }
    catch(err){
      coordinatesError = true
      georef.decimalLatitude = null
      georef.decimalLongitude = null
    }
  }
}

const copyGeorefJSON = _ => {
  navigator.clipboard.writeText(JSON.stringify(georef)).then(_ => console.log('coordinates copied'))
}

const handleClearClick = _ => {
  for (let key of Object.keys(georef)){
    georef[key] = null
  }
  coordinatesString = null
  selectedProtocol = null
  selectedSources = []
}

const copyCoords = ev => {
  navigator.clipboard.writeText(coordinatesString)
}

const pasteCoords = ev => {
  navigator.clipboard.readText().then(coords => coordinatesString = coords)
}

const handleGeorefDateCalendarClick = _ => {
  if(georef.by && georef.by.trim()) {
    let now = new Date()
    georef.date = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences
  }
  else {
    alert('georef by is required before a date can be added')
  }
}

const handleGeorefVerifiedDateCalendarClick = _ => {
  if (georef.verifiedBy && georef.verifiedBy.trim()) {
    let now = new Date()
    georef.verifiedDate = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences
  }
  else {
    alert('verified by is required before a date can be added')
  }
}

const handleFormSubmit = _ => {
  //simple validation only for the basics
  let invalidFields = []

  if(!georef.locality || !georef.locality.trim()) invalidFields.push('locality')
  if(!georef.decimalLatitude || !georef.decimalLongitude) {
    invalidFields.push('coordinates')
  }
  else {
    //we dont want silly coordinates
    if(georef.decimalLatitude > 90 || georef.decimalLatitude < -90 || georef.decimalLongitude > 180 || georef.decimalLongitude < -180) {
      invalidFields.push('coordinates')
    }
    else {
      if(!/^-?\d+\.\d{4,8}$/.test(georef.decimalLatitude.toString()) || !/^-?\d+\.\d{4,10}$/.test(georef.decimalLongitude.toString())) {
        invalidFields.push('coordinates')
      }
    }

  }

  if(georef.uncertainty){
    if(!georef.uncertaintyUnit || !georef.uncertaintyUnit.trim() || !uncertaintyUnitsEnum.includes(georef.uncertaintyUnit)) {
      invalidFields.push('uncertainty units')
    }
  }

  if(invalidFields.length) {
    let message = 'The following fields are incomplete: ' + invalidFields.join('; ')
    message += "\r\nPlease note that coordinates can only have 4-8 decimal places"
    alert(message)
  }
  else {
    //just clean up in case
    for (let [key, val] of Object.entries(georef)){
      if (typeof val == 'string'){
        georef[key] = val.replace(/\s+/g, ' ').replace(/[\s\.\-\\\/,~]+$/, '').trim()
      }
    }

    dispatch('set-georef', georef)
  }
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<form on:submit|preventDefault={handleFormSubmit}>
  {#if showButtons}
    <div style="text-align:right">
      <span class="material-icons iconbutton" title="Clear all" on:click={handleClearClick}>restore_page</span>
      <span class="material-icons iconbutton" title="Copy georef JSON"  on:click={copyGeorefJSON}>content_copy</span>
    </div>
  {/if}
  <div>
    <label for="loc" style="width:100%;text-align:right">locality</label><br/>
    <textarea class:hasError={georef && (!georef.locality || !georef.locality.trim())} type="text" id="loc" style="width:100%" rows="2" bind:value={georef.locality}/>
  </div>
  <div class="oneliner">
    <label  for="coords">coordinates</label>
    <input type="text" id="coords" style="min-width:200px" class:hasError={coordinatesError} bind:value={coordinatesString}/>
    <span class="material-icons inline-icon" title="copy coords" style="padding-bottom:0px" on:click={copyCoords}>content_copy</span>
    <span class="material-icons inline-icon" title="paste coords" style="margin-top:8px" on:click={pasteCoords}>content_paste</span>
  </div>
  <div class="oneliner">
    <label for="acc">uncertainty</label>
    <div style="display:inline-block;width:50%">
      <input type="number" id="acc" style="width:57%" min="0" step="0.1" class:hasError={georef && requiredFields.includes('uncertainty') && !georef.uncertainty}   bind:value={georef.uncertainty}/>
      <select class:hasError={georef && georef.uncertainty && !georef.uncertaintyUnit} id='accunit' style="width:40%" bind:value={georef.uncertaintyUnit} bind:this={accuracyUnitSelect}>
        <option />
        {#each uncertaintyUnitsEnum as unit}
          <option value={unit}>{unit}</option>
        {/each}
      </select>
    </div>
  </div>
  {#if showWKT}
    <div>
      <label for="WKT" style="width:100%;text-align:right"><a href="https://dwc.tdwg.org/terms/#dwc:footprintWKT" target="_blank">georef WKT</a></label>
      <textarea id="WKT" rows="3" class:hasError={georef && requiredFields.includes('WKT') && !georef.WKT} bind:value={georef.WKT}/>
    </div>
  {/if}
  <div class="oneliner">
    <label for="datum">datum</label>
    <input id="datum" class:hasError={georef && requiredFields.includes('datum') && !georef.datum} list="datums" name="datum" style="width:50%"  bind:value={georef.datum}>
    <datalist id="datums">
      <option value="WGS84">
    </datalist>
  </div>
  <div class="oneliner">
    <label for="georefBy">georef by</label>
    <input class:hasError={georef && requiredFields.includes('by') && !georef.by} type="text" id="georefBy" style="width:50%" bind:value={georef.by}/>
  </div>
  <div class="oneliner">
    <div class="fields">
      <div class="flex">
        <label for="georefDate" style="padding-right:10px">georef date</label>
        <input  class:hasError={georef && requiredFields.includes('date') && !georefDateOkay} type="text" id="georefDate" autocomplete="off" bind:value={georef.date}/>
        <span class="material-icons inline-icon" title="add date" on:click={handleGeorefDateCalendarClick}>date_range</span>
      </div>
    </div>
  </div>
  <div>
    <label style="width:100%;text-align:right" for="protocol">protocol</label>
    <div class="inline-select">
      <Select items={georefProtocols.map(x=> ({value:x, label:x}))} isCreatable={true} placeholder={'Select a protocol...'} hasError={georef && requiredFields.includes('protocol') && !selectedProtocol} bind:selectedValue={selectedProtocol} />
    </div>
  <div>
    <label style="width:100%;text-align:right" for="sources">sources</label>
    <div class="inline-select">
      <Select items={georefSources.map(x=> ({value:x, label:x}))} isCreatable={true} isMulti={true} placeholder={'Select source/s...'} hasError={georef && requiredFields.includes('sources') && (!selectedSources || !selectedSources.length)} bind:selectedValue={selectedSources}/>
    </div>
  </div>
  {#if showVerification}
    <div class="oneliner">
      <label for="verifiedBy">verified by</label>
      <input type="text" id="verifiedBy" style="width:50%" bind:value={georef.verifiedBy}/>
    </div>
    <div class="oneliner">
      <label for="verifierRole">datum</label>
      <input id="verifierRole" class:hasError={georef && requiredFields.includes('verifierRole') && !georef.verifierRole} list="verifierRoles" name="verifierRole" style="width:50%" bind:value={georef.verifierRole}>
      <datalist id="verifierRoles">
        <option value="QC">
        <option value="curator">
        <option value="collector">
      </datalist>
    </div>
    <div class="oneliner">
      <label for="verifiedDate">verified date</label>
      <div class="fields">
        <div class="flex">
          <input class:hasError={georef && georef.verifiedBy || (requiredFields.includes('verifiedDate') && !verifiedDateOkay)} type="text" id="verifiedDate" autocomplete="off" bind:value={georef.verifiedDate}/>
          <span class="material-icons inline-icon" title="add date" on:click={handleGeorefVerifiedDateCalendarClick}>date_range</span>
        </div>
      </div>
    </div>
  {/if}
  <div>
    <label for="remarks" style="width:100%;text-align:right">remarks</label>
    <textarea id="remarks" rows="3" bind:value={georef.remarks}/>
  </div>
  <div style="text-align:center">
    <button class="georefbutton">{buttonText}</button> <!--this is the form submit-->
  </div>
</form>

<!-- ############################################## -->
<style>
form {
  width:100%;
  height:100%;
  overflow-y: auto;
}

label {
  display: inline-block;
  /* width: 140px; */
  text-align: right;
  color:grey;
  font-weight: bolder;
}

label > a {
  color:grey;
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
  width:80%
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
  --clearSelectTop: 8px;
  --multiItemHeight: 25px;
  --multiClearTop:3px;
  --multiClearPadding: 2px;
  --multiClearBG:none;
  --multiClearFill:grey;
  --multiClearHoverBG:none;
  --multiClearHoverFill:white;
  --disabledBackground:none;
  --disabledColor:dimgrey;
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

.inline-icon {
  width: 20px;
  color:grey;
  padding-bottom:8px;
}

.inline-icon:hover {   
  cursor: pointer;
  color:rgb(26, 25, 25);
}

.iconbutton{
  color:grey;
  border: 1px solid grey;
  border-radius: 2px;
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