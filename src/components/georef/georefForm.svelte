<script>
import convert from 'geo-coordinates-parser'

import Select from 'svelte-select'
import LocalityInput from './localityInput.svelte'
import DecimalCoordsInput from './decimalCoordsInput.svelte'
import VerbatimCoordsInput from './verbatimCoordsInput.svelte'
import DateInput from './dateInput.svelte'
import Georef from './Georef.js'

import {createEventDispatcher} from 'svelte'
let dispatch = createEventDispatcher();

export let georef //must be class Georef or null

$: if(!georef) georef = new Georef() //so we don't deal with all kinds of errors dealing with null

//settings
export let showButtons = true
export let showWKT = false
export let showVerification = false
export let submitButtonText

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

let accuracyUnitSelect = {}

const copyGeorefJSON = ev => {
  ev.preventDefault()
  navigator.clipboard.writeText(JSON.stringify(georef, null, 2)).then(_ => {
      console.log('JSON copied')
      if(window.pushToast) {
        window.pushToast('georef JSON copied')
      }
    })
}

const copyTabDelimited = _ => {
  let res = ''
  for (let val of Object.values(georef)){
    if(val){
      res += val + '\t'
    }
    else {
      res += '' + '\t'
    }
  }
  navigator.clipboard.writeText(res).then(_ => {
    console.log('tab delimited values copied')
    if(window.pushToast) {
      window.pushToast('tab delimited data copied')
    }
  })
  
}

const handleClearClick = _ => {
  for (let key of Object.keys(georef)){
    georef[key] = null
  }
  if(window.pushToast) {
    window.pushToast('new georef')
  }
}

const handleCoordsFromVerbatim = ev => {
  try {
    georef.decimalCoordinates = ev.detail
    georef.sources = 'verbatim coordinates'
  }
  catch(err) {
    alert(err.message)
  }
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
      <button class="json-button" title="Copy georef JSON"  on:click={copyGeorefJSON}>JSON</button>
      <span class="material-icons iconbutton" title="Copy tab delimited" on:click={copyTabDelimited}>clear_all</span>
    </div>
  {/if}
  <div>
    <label for="loc" style="width:100%;text-align:right">locality</label><br/>
    <LocalityInput hasError={georef && georef.decimalCoordinates && (!georef.locality || !georef.locality.trim())} bind:value={georef.locality} />
  </div>
  <div class="oneliner">
    <label  for="verbatimcoords">verbatim coords</label>
    <VerbatimCoordsInput on:coords-from-verbatim={handleCoordsFromVerbatim} bind:value={georef.verbatimCoordinates}/>
  </div>
  <div class="oneliner">
    <label  for="coords">decimal coords</label>
    <DecimalCoordsInput hasError={georef && !georef.decimalCoordinatesOkay} bind:value={georef.decimalCoordinates}/> <!--VERY IMPORTANT THAT COORDINATES BE VALID BEFORE THIS HAPPENS, OTHERWISE IT BREAKS-->
  </div>
  <div class="oneliner">
    <label for="acc">uncertainty</label>
    <div style="display:inline-block;width:50%">
      <input type="number" id="acc" style="width:57%" min="0" step="0.1" class:hasError={requiredFields.includes('uncertainty') && !georef.uncertainty}   bind:value={georef.uncertainty}/>
      <select class:hasError={georef && georef.uncertainty && !georef.uncertaintyUnit} id='accunit' style="width:40%" bind:value={georef.uncertaintyUnit}>
        <option selected="selected"/>
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
        <DateInput hasBy={georef && georef.by && georef.by.trim()} hasError={!georef.dateOkay} bind:value={georef.date} />
      </div>
    </div>
  </div>
  <div>
    <label style="width:100%;text-align:right" for="protocol">protocol</label>
    <div class="inline-select">
      <Select items={georefProtocols.map(x=> ({value:x, label:x}))} isCreatable={true} placeholder={'Select a protocol...'} hasError={georef && requiredFields.includes('protocol') && !georef.protocolObject} bind:selectedValue={georef.protocolObject} />
    </div>
  <div>
    <label style="width:100%;text-align:right" for="sources">sources</label>
    <div class="inline-select">
      <Select items={georefSources.map(x=> ({value:x, label:x}))} isCreatable={true} isMulti={true} placeholder={'Select source/s...'} hasError={georef && requiredFields.includes('sources') && (!georef.sourcesArray.length)} bind:selectedValue={georef.sourcesArray}/>
    </div>
  </div>
  {#if showVerification}
    <div class="oneliner">
      <label for="verifiedBy">verified by</label>
      <input type="text" id="verifiedBy" style="width:50%" class:hasError={georef && requiredFields.includes('verifiedBy') && !georef.verifiedBy} bind:value={georef.verifiedBy}/>
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
          <input class:hasError={georef && !georef.verifiedDateOkay} type="text" id="verifiedDate" autocomplete="off" bind:value={georef.verifiedDate}/>
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
    <button class="georefbutton">{submitButtonText}</button> <!--this is the form submit-->
  </div>
</form>

<!-- ############################################## -->
<style>
form {
  width:100%;
  height:100%;
  max-height:100%;
  box-sizing:border-box;
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
  width:100%
}
.oneliner > .fields > .flex {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
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
  background-color:lightgray;
  border-radius: 2px;
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
  background-color: lightgray;
  border: 1px solid grey;
  border-radius: 2px;
}

.iconbutton:hover{
  cursor:pointer;
  background-color:gray;
  color:white;
}

.json-button {
  color:grey;
  position:relative;
  top:-10px;
  height: 26px;
  width: 26px;
  border: 1px solid grey;
  border-radius: 2px;
  background-color: lightgray;
  font-family:Arial;
  font-stretch:condensed;
  font-size:0.4em;
  font-weight:bold;
}

.json-button:hover {
  cursor:pointer;
  background-color:gray;
  color:white;
}

.georefbutton:hover{
  cursor:pointer;
  background-color:gray;
  color:white;
}
</style>