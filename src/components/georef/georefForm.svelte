<script>
import convert from 'geo-coordinates-parser'
import { nanoid } from "nanoid/nanoid.js" //see https://github.com/ai/nanoid/issues/237

import Select from 'svelte-select'
import LocalityInput from './localityInput.svelte'
import DecimalCoordsInput from './decimalCoordsInput.svelte'
import VerbatimCoordsInput from './verbatimCoordsInput.svelte'
import DateInput from './dateInput.svelte'
import Georef from './Georef.js'

import { georefsEqual } from './georefFormFuncs.js'

import is from './is.js' //our type checking funcs for validation

import {createEventDispatcher} from 'svelte'
let dispatch = createEventDispatcher();

//must be class Georef or null
//should be a copy that has no references pointing to it in any of of the other components
export let georef = new Georef()

let originalGeoref //for checking if this is a new georef
let originalVals
let originalLocality = null

$: if(georef) {
  if(!originalGeoref || georef != originalGeoref){//its a new georef
    originalGeoref = georef
    originalVals = georef.copy()
    originalLocality = null
  }
}
else  {
   georef = new Georef() //trying to avoid nulls in the HTML here
}

//settings
export let showButtons = true
export let showWKT = false
export let showVerification = false
export let submitButtonText

export let requiredFields = ['datum', 'date'] //for on form validation

let uncertaintyUnitsEnum = ['m', 'km']
let uncertaintySelect

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

//validations
let validationVars = ['localityhasError', 'coordsHasError', 'uncertaintyHasError', 'uncertaintyUnitHasError', 'datumHasError', 'georefByHasError', 'georefDateHasError', 'protocolHasError', 'sourcesHasError', 'verifiedByHasError', 'verifiedDateHasError', 'verifierRoleHasError'] //must match below
$: hasLocalityAndCoords = Boolean(georef.locality && georef.locality.trim() && georef.decimalCoordinates)
$: localityhasError = Boolean(georef.decimalCoordinates && (!georef.locality || !georef.locality.trim()))
$: coordsHasError = Boolean(georef.locality && georef.locality.trim() && (!georef.decimalCoordinates || !georef.decimalCoordinatesOkay || georef.decimalCoordinatesWarning))
$: uncertaintyHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('uncertainty') && !georef.uncertainty)
$: uncertaintyUnitHasError = Boolean(georef.uncertainty && !georef.uncertaintyUnit)
$: datumHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('datum') && (!georef.datum || !georef.datum.trim()))
$: georefByHasError =  Boolean(hasLocalityAndCoords && requiredFields.includes('by') && (!georef.by || !georef.by.trim()))
$: georefDateHasError = Boolean(hasLocalityAndCoords && (georef.by && georef.by.trim() || requiredFields.includes('date')) && (!georef.date || !georef.date.trim())) //see the component for more validation
$: protocolHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('protocol') && (!georef.protocolObject || !georef.protocolObject.value))
$: sourcesHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('sources') && (!georef.sourcesArray || !georef.sourcesArray.length))
$: verifiedByHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('verifiedBy') && (!georef.verifiedBy || !georef.verifiedBy.trim()))
$: verifiedDateHasError = Boolean(hasLocalityAndCoords && (georef.verifiedBy && georef.verifiedBy.trim() || requiredFields.includes('verifiedDate')) && (!georef.verifiedDate || !georef.verifiedDate.trim())) //see the component for more validation
$: verifierRoleHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('verifierrole') && (!georef.verifierRole || !georef.verifierRole.trim()))

//watchers
$: if(georef.locality){ //for updating verbatim coordinates if locality changes
  if(originalLocality){
    if(georef.locality != originalLocality){
      originalLocality = georef.locality
      if(georef.verbatimCoordinates || georef.originalGeorefSource) {
        georef.verbatimCoordinates = null
        georef.originalGeorefSource = null
      }
    }
  }
  else {
    originalLocality = georef.locality
  }
}

$: if(uncertaintySelect && !georef.uncertaintyUnit){
  handleUncertaintyBlur() //this is just to handle new incoming georefs with no uncertainty after previous ones
}

//for testing
/*
$: georef, checkValidations()

const checkValidations = _ => {
  let wrong = []
  for (let v of validationVars){
    if(eval(v)){
      wrong.push(v)
      console.log('value of',v, 'is', eval(v))
    }
  }
  if(wrong.length){
    console.log('WRONG:', wrong)
  }
  else {
    console.log('all good')
  }
}
*/

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

//this one is tricky because the way we handle depends on whether there is a georef prop value or not
const handleClearClick = _ => {
  if(georef){
    dispatch('clear-georef') //tell the parent to clear the prop
  }
  else {
    georef = new Georef() //svelte
    originalGeoref = null
    originalLocality = null
    if(window.pushToast) {
      window.pushToast('new georef')
    }
  }
}

const flagGeoref = _ => {
  //fire off a message to the api to update on elastic and the parent to flag the original record
  georef.flagged = true
  dispatch('georef-flagged', georef.georefID)
  let url = `https://us-central1-georef-745b9.cloudfunctions.net/flaggeoref?georefID=${georef.georefID}`
  fetch(url)
}

const handleCoordsFromVerbatim = ev => {
  console.log('coordinates recievied:', ev.detail)
  try {
    let coordsFromVerbatim = ev.detail
    if (georef.decimalCoordinates && georef.decimalCoordinates.replace(/\s+/g, '') != coordsFromVerbatim) {
      georef.decimalCoordinates = coordsFromVerbatim
      georef.sources = 'verbatim coordinates'
      georef.originalGeorefSource = null
      dispatch('coords-from-paste')
    }
  }
  catch(err) {
    alert(err.message)
  }
}

const handleCoordsFromPaste = _ => {
  //because the coords have changed
  georef.verbatimCoordinates = null
  georef.originalGeorefSource = null
  dispatch('coords-from-paste', georef.decimalCoordinates)
}

const handleUncertaintyBlur = _ => {
  //from https://stackoverflow.com/questions/12737528/reset-the-value-of-a-select-box
  if(!georef.uncertainty){
    let options = uncertaintySelect.options;
    // Look for a default selected option
    for (let i=0, iLen=options.length; i<iLen; i++) {
        if (options[i].defaultSelected) {
            uncertaintySelect.selectedIndex = i;
            return;
        }
    }

    // If no option is the default, select first or none as appropriate
    uncertaintySelect.selectedIndex = 0; // or -1 for no option selected
  }
}

const handleFormSubmit = _ => {
  
  //simple validation first
  let invalidFields = []
  for(let v of validationVars){
    if(eval(v)){
      invalidFields.push(v.replace('HasError', ''))
    }
  }

  if(invalidFields.length){
    let message = `The following fields have invalid values: ${invalidFields}.\r\n\r\nDo you want to continue?`
    let cont = confirm(message)
    if(cont) {
      for (let [key, val] of Object.entries(georef)){
        if (typeof val == 'string'){
          georef[key] = val.replace(/\s+/g, ' ').replace(/[\.\-\\\/,~]+$/, '').trim() //just some tidying up
        }
      }
  
      try {
        let saveGeoref = false
        let georefsAreEqual = georefsEqual(georef, originalVals)
        if(!georefsAreEqual){
          console.log('the georef has changed')
          georef.georefID = nanoid()
          delete georef.flagged
          delete georef.selected
          saveGeoref = true
        }
        dispatch('set-georef', {georef, saveGeoref})
      }
      catch(err) {
        alert('error checking georefs are equal: ' + err.message)
      }
    }
  }
  else {
    for (let [key, val] of Object.entries(georef)){
      if (typeof val == 'string'){
        georef[key] = val.replace(/\s+/g, ' ').replace(/[\.\-\\\/,~]+$/, '').trim() //just some tidying up
      }
    }

    try {
      let saveGeoref = false
      let georefsAreEqual = georefsEqual(georef, originalVals)
      if(!georefsAreEqual){
        console.log('the georef has changed')
        georef.georefID = nanoid()
        delete georef.flagged
        delete georef.selected
        saveGeoref = true
      }
      dispatch('set-georef', {georef, saveGeoref})
    }
    catch(err) {
      alert('error checking georefs are equal: ' + err.message)
    }
    
  }
    
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<form on:submit|preventDefault={handleFormSubmit}>
  {#if showButtons}
    <div style="text-align:right">
      <span class="material-icons iconbutton" title="Clear all" on:click={handleClearClick}>restore_page</span>
      <span class="material-icons iconbutton" title="Clear all" disabled={georef.flagged} on:click={flagGeoref}>report</span>
      <button class="json-button" title="Copy georef JSON"  on:click={copyGeorefJSON}>JSON</button>
      <span class="material-icons iconbutton" title="Copy tab delimited" on:click={copyTabDelimited}>clear_all</span>
    </div>
  {/if}
  <div>
    <label for="loc" style="width:100%;text-align:right">locality</label><br/>
    <LocalityInput hasError={localityhasError} bind:value={georef.locality} />
  </div>
  <div class="oneliner">
    <label  for="verbatimcoords">verbatim coords</label>
    <VerbatimCoordsInput on:coords-from-verbatim={handleCoordsFromVerbatim} on:coords-from-paste={handleCoordsFromPaste} bind:value={georef.verbatimCoordinates}/>
  </div>
  <div class="oneliner">
    <label  for="coords">decimal coords</label>
    <DecimalCoordsInput hasError={coordsHasError} on:coords-from-paste={handleCoordsFromPaste} bind:value={georef.decimalCoordinates}/> <!--VERY IMPORTANT THAT COORDINATES BE VALID BEFORE THIS HAPPENS, OTHERWISE IT BREAKS-->
  </div>
  <div class="oneliner">
    <label for="acc">uncertainty</label>
    <div style="display:inline-block;width:50%">
      <input type="number" id="acc" style="width:57%" min="0" step="0.1" class:hasError={uncertaintyHasError} on:blur={handleUncertaintyBlur}  bind:value={georef.uncertainty}/>
      <select class:hasError={uncertaintyUnitHasError} id='accunit' style="width:40%" bind:value={georef.uncertaintyUnit} bind:this={uncertaintySelect}>
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
      <textarea id="WKT" rows="3" bind:value={georef.WKT}/>
    </div>
  {/if}
  <div class="oneliner">
    <label for="datum">datum</label>
    <input id="datum" class:hasError={datumHasError} list="datums" name="datum" style="width:50%"  bind:value={georef.datum}>
    <datalist id="datums">
      <option value="WGS84">
    </datalist>
  </div>
  <div class="oneliner">
    <label for="georefBy">georef by</label>
    <input class:hasError={georefByHasError} type="text" id="georefBy" style="width:50%" bind:value={georef.by}/>
  </div>
  <div class="oneliner">
    <div class="fields">
      <div class="flex">
        <label for="georefDate" style="padding-right:10px">georef date</label>
        <DateInput hasBy={georef.by && georef.by.trim()} hasError={georefDateHasError} bind:value={georef.date} />
      </div>
    </div>
  </div>
  <div>
    <label style="width:100%;text-align:right" for="protocol">protocol</label>
    <div class="inline-select">
      <Select items={georefProtocols.map(x=> ({value:x, label:x}))} isCreatable={true} placeholder={'Select a protocol...'} hasError={protocolHasError} bind:selectedValue={georef.protocolObject} />
    </div>
  <div>
    <label style="width:100%;text-align:right" for="sources">sources</label>
    <div class="inline-select">
      <Select items={georefSources.map(x=> ({value:x, label:x}))} isCreatable={true} isMulti={true} placeholder={'Select source/s...'} hasError={sourcesHasError} bind:selectedValue={georef.sourcesArray}/>
    </div>
  </div>
  {#if showVerification}
    <div class="oneliner">
      <label for="verifiedBy">verified by</label>
      <input type="text" id="verifiedBy" style="width:50%" class:hasError={verifiedByHasError} bind:value={georef.verifiedBy}/>
    </div>
    <div class="oneliner">
      <label for="verifierRole">verifier role</label>
      <input id="verifierRole" class:hasError={verifierRoleHasError} list="verifierRoles" name="verifierRole" style="width:50%" bind:value={georef.verifierRole}>
      <datalist id="verifierRoles">
        <option value="QC">
        <option value="curator">
        <option value="collector">
      </datalist>
    </div>
    <div class="oneliner">
    <div class="fields">
      <div class="flex">
        <label for="verifiedDate" style="padding-right:10px">georef date</label>
        <DateInput hasBy={georef.verifiedBy && georef.verifiedBy.trim()} hasError={verifiedDateHasError} bind:value={georef.verifiedDate} />
      </div>
    </div>
  </div>
  {/if}
  <div>
    <label for="remarks" style="width:100%;text-align:right">remarks</label>
    <textarea id="remarks" rows="3" bind:value={georef.remarks}/>
  </div>
  <div style="text-align:center">
    <button class="georefbutton" disabled={!hasLocalityAndCoords}>{submitButtonText}</button> <!--this is the form submit-->
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

.iconbutton{
  color:grey;
  background-color: lightgray;
  border: 1px solid grey;
  border-radius: 2px;
}

.iconbutton:hover:enabled{
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

.json-button:hover:enabled {
  cursor:pointer;
  background-color:gray;
  color:white;
}

.georefbutton:hover:enabled{
  cursor:pointer;
  background-color:gray;
  color:white;
}
</style>