<script>
import { nanoid } from "nanoid/nanoid.js" //see https://github.com/ai/nanoid/issues/237

import Select from 'svelte-select'
import LocalityInput from './localityInput.svelte'
import DecimalCoordsInput from './decimalCoordsInput.svelte'
import VerbatimCoordsInput from './verbatimCoordsInput.svelte'
import DateInput from './dateInput.svelte'
import Georef from './Georef.js'

import { georefsEqual } from './georefFormFuncs.js'

import {createEventDispatcher} from 'svelte'
let dispatch = createEventDispatcher();

//must be class Georef or null
//should be a copy that has no references pointing to it in any of of the other components
export let georef
export let defaultGeorefBy = null
export let defaultGeorefByORCID = null
let localGeoref = new Georef() //this is the local copy we work with

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

//validations
let validationVars = ['localityhasError', 'coordsHasError', 'uncertaintyHasError', 'uncertaintyUnitHasError', 'datumHasError', 'georefByHasError', 'georefDateHasError', 'protocolHasError', 'sourcesHasError', 'verifiedByHasError', 'verifiedDateHasError', 'verifierRoleHasError'] //must match below
$: hasLocalityAndCoords = Boolean(localGeoref.locality && localGeoref.locality.trim() && localGeoref.decimalCoordinates)
$: localityhasError = Boolean(localGeoref.decimalCoordinates && (!localGeoref.locality || !localGeoref.locality.trim()))
$: coordsHasError = Boolean(localGeoref.locality && localGeoref.locality.trim() && (!localGeoref.decimalCoordinates || !localGeoref.decimalCoordinatesOkay || localGeoref.decimalCoordinatesWarning))
$: uncertaintyHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('uncertainty') && !localGeoref.uncertainty)
$: uncertaintyUnitHasError = Boolean(localGeoref.uncertainty && !localGeoref.uncertaintyUnit)
$: datumHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('datum') && (!localGeoref.datum || !localGeoref.datum.trim()))
$: georefByHasError =  Boolean(hasLocalityAndCoords && requiredFields.includes('by') && (!localGeoref.by || !localGeoref.by.trim()))
$: georefDateHasError = Boolean(hasLocalityAndCoords && (localGeoref.by && localGeoref.by.trim() || requiredFields.includes('date')) && (!localGeoref.date || !localGeoref.date.trim())) //see the component for more validation
$: protocolHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('protocol') && (!localGeoref.protocolObject || !localGeoref.protocolObject.value))
$: sourcesHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('sources') && (!localGeoref.sourcesArray || !localGeoref.sourcesArray.length))
$: verifiedByHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('verifiedBy') && (!localGeoref.verifiedBy || !localGeoref.verifiedBy.trim()))
$: verifiedDateHasError = Boolean(hasLocalityAndCoords && (localGeoref.verifiedBy && localGeoref.verifiedBy.trim() || requiredFields.includes('verifiedDate')) && (!localGeoref.verifiedDate || !localGeoref.verifiedDate.trim())) //see the component for more validation
$: verifierRoleHasError = Boolean(hasLocalityAndCoords && requiredFields.includes('verifierrole') && (!localGeoref.verifierRole || !localGeoref.verifierRole.trim()))

//watchers
$: georef, setLocalGeoref()

$: localGeoref.by, setDefaultORCID('by')
$: localGeoref.verifiedBy, setDefaultORCID('verifiedBy')

$: localGeoref.locality, updateOnLocalityChange()

$: if(uncertaintySelect && !localGeoref.uncertaintyUnit){
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

const setLocalGeoref = _ => {
  if(georef) {
    localGeoref = georef.copy()
  }
  else  {
    localGeoref = new Georef() //trying to avoid nulls in the HTML here
    if (defaultGeorefBy) {
      localGeoref.by = defaultGeorefBy
      let now = new Date()
      localGeoref.date = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
      if(defaultGeorefByORCID){
        localGeoref.byORCID = defaultGeorefByORCID
      }
    }
  }
}

const setDefaultORCID = field => {
  if(localGeoref[field] && localGeoref[field].trim()){
    if(defaultGeorefBy){
      if(defaultGeorefByORCID) {
        if(!localGeoref[field + 'ORCID'] || !localGeoref[field + 'ORCID'].trim()){
          if(localGeoref[field] == defaultGeorefBy){
            localGeoref[field + 'ORCID'] = defaultGeorefByORCID
          }
        }
      }
    }
  }
}

const updateOnLocalityChange = _ => {
  if(localGeoref.locality){ //for updating verbatim coordinates if locality changes
    if(georef && (localGeoref.verbatimCoordinates || localGeoref.originalGeorefSource)){
      //just some cleaning so we don't do arbitrary updates
      let localCleaned = localGeoref.locality.replace(/\s+/, ' ').toLowerCase()
      let originalCleaned = georef.locality.replace(/\s+/, ' ').toLowerCase()
      if(localCleaned != originalCleaned){
        localGeoref.verbatimCoordinates = null
        localGeoref.originalGeorefSource = null
      }
    }
  }
}

const copyGeorefJSON = ev => {
  ev.preventDefault()
  navigator.clipboard.writeText(JSON.stringify(localGeoref, null, 2)).then(_ => {
      console.log('JSON copied')
      if(window.pushToast) {
        window.pushToast('georef JSON copied')
      }
    })
}

const copyTabDelimited = _ => {
  let res = ''
  for (let val of Object.values(localGeoref)){
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

//the way we handle depends on whether there is a georef prop value or not
const handleClearClick = _ => {
  if(georef){ //we got the original as a prop
    dispatch('clear-georef') //tell the parent to clear the prop
  }
  else {
    localGeoref = new Georef()
    if (defaultGeorefBy) {
      localGeoref.by = defaultGeorefBy
      let now = new Date()
      localGeoref.date = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
      if(defaultGeorefByORCID){
        localGeoref.byORCID = defaultGeorefByORCID
      }
    }

    if(window.pushToast) {
      window.pushToast('new georef')
    }
  }
}

const flagGeoref = _ => {
  //fire off a message to the api to update on elastic and the parent to flag the original record
  if(!localGeoref.flagged) {
    let cont = confirm('Are you sure you want to flag this georeference?')
    if(cont){
      localGeoref.flagged = true
      dispatch('georef-flagged', localGeoref.georefID) //the parent must do the API call
    }
  }
}

const handleCoordsFromVerbatim = ev => {
  console.log('coordinates received:', ev.detail)
  try {
    let coordsFromVerbatim = ev.detail
    if (localGeoref.decimalCoordinates && localGeoref.decimalCoordinates.replace(/\s+/g, '') != coordsFromVerbatim) { //only change if they are different
      localGeoref.decimalCoordinates = coordsFromVerbatim
      localGeoref.sources = 'verbatim coordinates'
      localGeoref.originalGeorefSource = null
      dispatch('coords-from-paste')
    }
    else {
      localGeoref.decimalCoordinates = coordsFromVerbatim
      localGeoref.sources = 'verbatim coordinates'
      localGeoref.originalGeorefSource = null
      dispatch('coords-from-paste')
    }
  }
  catch(err) {
    alert(err.message)
  }
}

const handleCoordsFromPaste = _ => {
  //because the coords have changed
  localGeoref.verbatimCoordinates = null
  localGeoref.originalGeorefSource = null
  dispatch('coords-from-paste', localGeoref.decimalCoordinates)
}

const handleUncertaintyBlur = _ => {
  //from https://stackoverflow.com/questions/12737528/reset-the-value-of-a-select-box
  if(!localGeoref.uncertainty){
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

const checkAndDispatchGeoref = _ => {
  
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
    if(!cont) {
      return
    }
  }
  //else
  try {
    let saveGeoref = false
    let georefsAreEqual = georefsEqual(georef, localGeoref)
    if(!georefsAreEqual){
      localGeoref.georefID = nanoid()
      localGeoref.flagged = false
      localGeoref.selected = false
      localGeoref.verified = false
      localGeoref.verifiedBy = null
      localGeoref.verifiedDate = null
      localGeoref.verifiedByRole = null
      saveGeoref = true
    }
    dispatch('set-georef', {georef: localGeoref, saveGeoref})
  }
  catch(err) {
    alert('error checking georefs are equal: ' + err.message)
  }
    
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<form on:submit|preventDefault={checkAndDispatchGeoref}>
  {#if showButtons}
    <div style="text-align:right">
      <span class="material-icons iconbutton" title="Clear all" on:click={handleClearClick}>restore_page</span>
      <span class="material-icons iconbutton" title="Flag this georef" class:md-inactive={localGeoref.flagged} on:click={flagGeoref}>report</span>
      <button class="json-button" title="Copy georef JSON"  on:click={copyGeorefJSON}>JSON</button>
      <span class="material-icons iconbutton" title="Copy tab delimited" on:click={copyTabDelimited}>clear_all</span>
    </div>
  {/if}
  <div>
    <label for="loc" style="width:100%;text-align:right">locality</label><br/>
    <LocalityInput hasError={localityhasError} bind:value={localGeoref.locality} />
  </div>
  <div class="oneliner">
    <label  for="verbatimcoords">verbatim coords</label>
    <VerbatimCoordsInput on:coords-from-verbatim={handleCoordsFromVerbatim} on:coords-from-paste={handleCoordsFromPaste} bind:value={localGeoref.verbatimCoordinates}/>
  </div>
  <div class="oneliner">
    <label  for="coords">decimal coords</label>
    <DecimalCoordsInput hasError={coordsHasError} on:coords-from-paste={handleCoordsFromPaste} bind:value={localGeoref.decimalCoordinates}/> <!--VERY IMPORTANT THAT COORDINATES BE VALID BEFORE THIS HAPPENS, OTHERWISE IT BREAKS-->
  </div>
  <div class="oneliner">
    <label for="acc">uncertainty</label>
    <div style="display:inline-block;width:50%">
      <input type="number" id="acc" style="width:57%" min="0" step="0.1" class:hasError={uncertaintyHasError} on:blur={handleUncertaintyBlur}  bind:value={localGeoref.uncertainty}/>
      <select class:hasError={uncertaintyUnitHasError} id='accunit' style="width:40%" bind:value={localGeoref.uncertaintyUnit} bind:this={uncertaintySelect}>
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
      <textarea id="WKT" rows="3" bind:value={localGeoref.WKT}/>
    </div>
  {/if}
  <div class="oneliner">
    <label for="datum">datum</label>
    <input id="datum" class:hasError={datumHasError} list="datums" name="datum" style="width:50%"  bind:value={localGeoref.datum}>
    <datalist id="datums">
      <option value="WGS84">
    </datalist>
  </div>
  <div class="oneliner">
    <label for="georefBy">georef by</label>
    {#if defaultGeorefBy}
      <input class:hasError={georefByHasError} type="text" list="defaultGeorefBy" id="georefBy" style="width:50%" bind:value={localGeoref.by}/>
      <datalist id="defaultGeorefBy">
        <option value={defaultGeorefBy}>
      </datalist>
    {:else}
      <input class:hasError={georefByHasError} type="text" id="georefBy" style="width:50%" bind:value={localGeoref.by}/>
    {/if}
  </div>
  <div class="oneliner">
    <label for="georefByORCID">georef by ORCID</label>
    <input type="text" id="georefByORCID" style="width:100%;max-width:300px" bind:value={localGeoref.byORCID}/>
  </div>
  <div class="oneliner">
    <div class="fields">
      <div class="flex">
        <label for="georefDate" style="padding-right:10px">georef date</label>
        <DateInput hasBy={localGeoref.by && localGeoref.by.trim()} hasError={georefDateHasError} bind:value={localGeoref.date} />
      </div>
    </div>
  </div>
  <div>
    <label style="width:100%;text-align:right" for="protocol">protocol</label>
    <div class="inline-select">
      <Select items={georefProtocols.map(x=> ({value:x, label:x}))} isCreatable={true} placeholder={'Select a protocol...'} hasError={protocolHasError} bind:selectedValue={localGeoref.protocolObject} />
    </div>
  <div>
    <label style="width:100%;text-align:right" for="sources">sources</label>
    <div class="inline-select">
      <Select items={georefSources.map(x => ({value:x, label:x}))} isCreatable={true} isMulti={true} placeholder={'Select source/s...'} hasError={sourcesHasError} bind:selectedValue={localGeoref.sourcesArray}/>
    </div>
  </div>
  {#if showVerification}
    <div class="oneliner">
      <label for="verifiedBy">verified by</label>
      <input type="text" id="verifiedBy" style="width:50%" class:hasError={verifiedByHasError} bind:value={localGeoref.verifiedBy}/>
    </div>
    <div class="oneliner">
      <label for="verifiedByORCID">verified by ORCID</label>
      <input type="text" id="verifiedByORCID" style="width:100%;max-width:300px" bind:value={localGeoref.verifiedByORCID}/>
    </div>
    <div class="oneliner">
      <label for="verifierRole">verifier role</label>
      <input id="verifierRole" class:hasError={verifierRoleHasError} list="verifierRoles" name="verifierRole" style="width:50%" bind:value={localGeoref.verifierRole}>
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
        <DateInput hasBy={localGeoref.verifiedBy && localGeoref.verifiedBy.trim()} hasError={verifiedDateHasError} bind:value={localGeoref.verifiedDate} />
      </div>
    </div>
  </div>
  {/if}
  <div>
    <label for="remarks" style="width:100%;text-align:right">remarks</label>
    <textarea id="remarks" rows="3" bind:value={localGeoref.remarks}/>
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

.iconbutton:hover{
  cursor:pointer;
  background-color:gray;
  color:white;
}

.material-icons.md-inactive:hover {
  cursor: auto;
  color:grey;
  background-color: lightgray;
  border: 1px solid grey;
  border-radius: 2px;
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