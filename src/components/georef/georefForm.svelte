<script>
import convert from 'geo-coordinates-parser'
import { nanoid } from "nanoid/nanoid.js" //see https://github.com/ai/nanoid/issues/237

import Select from 'svelte-select'
import LocalityInput from './localityInput.svelte'
import DecimalCoordsInput from './decimalCoordsInput.svelte'
import VerbatimCoordsInput from './verbatimCoordsInput.svelte'
import DateInput from './dateInput.svelte'
import Georef from './Georef.js'

import {createEventDispatcher} from 'svelte'
let dispatch = createEventDispatcher();

export let georef //must be class Georef or null
let thisGeoref = new Georef() //the local copy of georef, so that we don't have to deal with null

$: georef, georef? thisGeoref = georef : thisGeoref = new Georef()


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
$: hasLocalityAndCoords = Boolean(thisGeoref.locality && thisGeoref.locality.trim() && thisGeoref.decimalCoordinates)
$: localityhasError = Boolean(thisGeoref.decimalCoordinates && (!thisGeoref.locality || !thisGeoref.locality.trim()))
$: coordsHasError = Boolean(thisGeoref.locality && thisGeoref.locality.trim() && (!thisGeoref.decimalCoordinates || !thisGeoref.decimalCoordinatesOkay || thisGeoref.decimalCoordinatesWarning))
$: uncertaintyHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('uncertainty') && !thisGeoref.uncertainty)
$: uncertaintyUnitHasError = Boolean(thisGeoref.uncertainty && !thisGeoref.uncertaintyUnit)
$: datumHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('datum') && (!thisGeoref.datum || !thisGeoref.datum.trim()))
$: georefByHasError =  Boolean(hasLocalityAndCoords && requiredFields.includes('by') && (!thisGeoref.by || !thisGeoref.by.trim()))
$: georefDateHasError = Boolean(hasLocalityAndCoords && (thisGeoref.by && thisGeoref.by.trim() || requiredFields.includes('date')) && (!thisGeoref.date || !thisGeoref.date.trim())) //see the component for more validation
$: protocolHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('protocol') && (!thisGeoref.protocolObject || !thisGeoref.protocolObject.value))
$: sourcesHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('sources') && (!thisGeoref.sourcesArray || !thisGeoref.sourcesArray.length))
$: verifiedByHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('verifiedBy') && (!thisGeoref.verifiedBy || !thisGeoref.verifiedBy.trim()))
$: verifiedDateHasError = Boolean(hasLocalityAndCoords && (thisGeoref.verifiedBy && thisGeoref.verifiedBy.trim() || requiredFields.includes('verifiedDate')) && (!thisGeoref.verifiedDate || !thisGeoref.verifiedDate.trim())) //see the component for more validation
$: verifierRoleHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('verifierrole') && (!thisGeoref.verifierRole || !thisGeoref.verifierRole.trim()))

//watchers
let originalLocality
$: if(thisGeoref.locality){ //for updating verbatim coordinates if locality changes
  if(originalLocality){
    if(thisGeoref.locality != originalLocality){
      originalLocality = thisGeoref.locality
      thisGeoref.verbatimCoordinates = null
      thisGeoref.originalGeorefSource = null
    }
  }
  else {
    originalLocality = thisGeoref.locality
  }
}

$: if(uncertaintySelect && !thisGeoref.uncertaintyUnit){
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

window.showGeorefVals = _ => {
  for (let [key, val] of Object.entries(thisGeoref)){
    if(val) {
      if(typeof val =='string' && val.trim()) {
        console.log(`${key}: ${val.trim()}`)
      }
      else {
        console.log(`${key}: ${val}`)
      }
    }
  }
}

const copyGeorefJSON = ev => {
  ev.preventDefault()
  navigator.clipboard.writeText(JSON.stringify(thisGeoref, null, 2)).then(_ => {
      console.log('JSON copied')
      if(window.pushToast) {
        window.pushToast('georef JSON copied')
      }
    })
}

const copyTabDelimited = _ => {
  let res = ''
  for (let val of Object.values(thisGeoref)){
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
    thisGeoref = new Georef() //svelte
    if(window.pushToast) {
      window.pushToast('new georef')
    }
  }
}

const handleCoordsFromVerbatim = ev => {
  console.log('coordinates recievied:', ev.detail)
  try {
    let coordsFromVerbatim = ev.detail
    if (thisGeoref.decimalCoordinates && thisGeoref.decimalCoordinates.replace(/\s+/g, '') != coordsFromVerbatim) {
      thisGeoref.decimalCoordinates = coordsFromVerbatim
      thisGeoref.sources = 'verbatim coordinates'
      thisGeoref.originalGeorefSource = null
      dispatch('coords-from-paste')
    }
  }
  catch(err) {
    alert(err.message)
  }
}

const handleCoordsFromPaste = _ => {
  //because the coords have changed
  thisGeoref.verbatimCoordinates = null
  thisGeoref.originalGeorefSource = null
  dispatch('coords-from-paste', thisGeoref.decimalCoordinates)
}

const handleUncertaintyBlur = _ => {
  //from https://stackoverflow.com/questions/12737528/reset-the-value-of-a-select-box
  if(!thisGeoref.uncertainty){
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
      for (let [key, val] of Object.entries(thisGeoref)){
        if (typeof val == 'string'){
          thisGeoref[key] = val.replace(/\s+/g, ' ').replace(/[\.\-\\\/,~]+$/, '').trim() //just some tidying up
        }
      }

      if(thisGeoref.hasOwnProperty('selected')){
        delete georef.selected
      }
  
      if(!georefsEqual(georef, thisGeoref)){
        thisGeoref.georefID = nanoid()
      }

      dispatch('set-georef', {georef: thisGeoref, saveGeoref: true})
    }
  }
  else {
    for (let [key, val] of Object.entries(thisGeoref)){
      if (typeof val == 'string'){
        thisGeoref[key] = val.replace(/\s+/g, ' ').replace(/[\.\-\\\/,~]+$/, '').trim() //just some tidying up
      }
    }

    if(thisGeoref.hasOwnProperty('selected')){
      delete georef.selected
    }

    if(!georefsEqual(georef, thisGeoref)){
      thisGeoref.georefID = nanoid()
    }

    dispatch('set-georef', {georef: thisGeoref, saveGeoref: false})
  }
    
}

//helpers
const georefsEqual = (georef1, georef2) => {
  if(georef1 && georef2) {
    for (let [key, val] of Object.entries(georef1)){

      if(key == 'georefID'){
        continue
      }

      if(!val && (!georef2[key] || georef2[key].trim())){ //both empty
        return false
      }
      
      if(typeof val == 'string'){
        if(!georef2[key] || georef2[key].trim() != val.trim()){
          return false
        }
      }
      
      if (typeof val == 'number'){
        if(!georef2[key] || isNaN(georef2[key])) {
          return false
        }
        else {
          let diff = val - georef2[key]
          if(Math.abs(diff) > 0.000001){
            return false
          }
        }
      }

    }
    //they are the same
      return true
  }
  else {
    return false
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
    <LocalityInput hasError={localityhasError} bind:value={thisGeoref.locality} />
  </div>
  <div class="oneliner">
    <label  for="verbatimcoords">verbatim coords</label>
    <VerbatimCoordsInput on:coords-from-verbatim={handleCoordsFromVerbatim} on:coords-from-paste={handleCoordsFromPaste} bind:value={thisGeoref.verbatimCoordinates}/>
  </div>
  <div class="oneliner">
    <label  for="coords">decimal coords</label>
    <DecimalCoordsInput hasError={coordsHasError} on:coords-from-paste={handleCoordsFromPaste} bind:value={thisGeoref.decimalCoordinates}/> <!--VERY IMPORTANT THAT COORDINATES BE VALID BEFORE THIS HAPPENS, OTHERWISE IT BREAKS-->
  </div>
  <div class="oneliner">
    <label for="acc">uncertainty</label>
    <div style="display:inline-block;width:50%">
      <input type="number" id="acc" style="width:57%" min="0" step="0.1" class:hasError={uncertaintyHasError} on:blur={handleUncertaintyBlur}  bind:value={thisGeoref.uncertainty}/>
      <select class:hasError={uncertaintyUnitHasError} id='accunit' style="width:40%" bind:value={thisGeoref.uncertaintyUnit} bind:this={uncertaintySelect}>
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
      <textarea id="WKT" rows="3" bind:value={thisGeoref.WKT}/>
    </div>
  {/if}
  <div class="oneliner">
    <label for="datum">datum</label>
    <input id="datum" class:hasError={datumHasError} list="datums" name="datum" style="width:50%"  bind:value={thisGeoref.datum}>
    <datalist id="datums">
      <option value="WGS84">
    </datalist>
  </div>
  <div class="oneliner">
    <label for="georefBy">georef by</label>
    <input class:hasError={georefByHasError} type="text" id="georefBy" style="width:50%" bind:value={thisGeoref.by}/>
  </div>
  <div class="oneliner">
    <div class="fields">
      <div class="flex">
        <label for="georefDate" style="padding-right:10px">georef date</label>
        <DateInput hasBy={thisGeoref.by && thisGeoref.by.trim()} hasError={georefDateHasError} bind:value={thisGeoref.date} />
      </div>
    </div>
  </div>
  <div>
    <label style="width:100%;text-align:right" for="protocol">protocol</label>
    <div class="inline-select">
      <Select items={georefProtocols.map(x=> ({value:x, label:x}))} isCreatable={true} placeholder={'Select a protocol...'} hasError={protocolHasError} bind:selectedValue={thisGeoref.protocolObject} />
    </div>
  <div>
    <label style="width:100%;text-align:right" for="sources">sources</label>
    <div class="inline-select">
      <Select items={georefSources.map(x=> ({value:x, label:x}))} isCreatable={true} isMulti={true} placeholder={'Select source/s...'} hasError={sourcesHasError} bind:selectedValue={thisGeoref.sourcesArray}/>
    </div>
  </div>
  {#if showVerification}
    <div class="oneliner">
      <label for="verifiedBy">verified by</label>
      <input type="text" id="verifiedBy" style="width:50%" class:hasError={verifiedByHasError} bind:value={thisGeoref.verifiedBy}/>
    </div>
    <div class="oneliner">
      <label for="verifierRole">verifier role</label>
      <input id="verifierRole" class:hasError={verifierRoleHasError} list="verifierRoles" name="verifierRole" style="width:50%" bind:value={thisGeoref.verifierRole}>
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
        <DateInput hasBy={thisGeoref.verifiedBy && thisGeoref.verifiedBy.trim()} hasError={verifiedDateHasError} bind:value={thisGeoref.verifiedDate} />
      </div>
    </div>
  </div>
  {/if}
  <div>
    <label for="remarks" style="width:100%;text-align:right">remarks</label>
    <textarea id="remarks" rows="3" bind:value={thisGeoref.remarks}/>
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

.georefbutton:hover:enabled{
  cursor:pointer;
  background-color:gray;
  color:white;
}
</style>