<script>
import Select from 'svelte-select'
import LocalityInput from './localityInput.svelte'
import DecimalCoordsInput from './decimalCoordsInput.svelte'
import VerbatimCoordsInput from './verbatimCoordsInput.svelte'
import DateInput from './dateInput.svelte'
import Georef from './Georef.js'
import Checkbox from '../Checkbox.svelte'

import {onMount, createEventDispatcher} from 'svelte'
let dispatch = createEventDispatcher();

//must be class Georef or null
//should be a copy that has no references pointing to it in any of of the other components
export let georef
export let defaultGeorefBy = null
export let defaultGeorefByORCID = null
let localGeoref = new Georef() //this is the local copy we work with

//settings
export let editable = true
export let showButtons = true
export let showSubmitButton = true
export let showWKT = false
export let showGeorefBy = true
export let showVerification = false
export let showResetButton = true
export let submitButtonText = ""

export let requiredFields = ['uncertainty', 'datum', 'by', 'date'] //for on form validation

let uncertaintyUnitsEnum = ['m', 'km']
let uncertaintySelect

//TODO make prop and must come from a database
export let georefProtocols = [
  'NSCF protocol',
  'SANBI georeferencing guide', 
  'Chapman & Wieczorek 2020',
  'Chapman & Wieczorek 2006',
  'Wieczorek et al. 2004'
]

//TODO make prop and must come from a database
export let georefSources = [
  'Google Maps', 
  'Google Earth',
  'Google Satellite',
  'Google Terrain',
  'Google Search',
  '1:250k topomap',
  '1:50k topomap',
  'SANBI gazetteer',
  'Geolocate', 
  'Nominatum',
  'verbatim coordinates',
  'NSCF georeference database'
]

onMount(_ => {
  let savedProtocols = localStorage.getItem('custom-protocols')
  if(savedProtocols){
    georefProtocols = [...georefProtocols, ...JSON.parse(savedProtocols)]
  }

  let savedSources = localStorage.getItem('custom-sources')
  if(savedSources){
    georefSources = [...georefSources, ...JSON.parse(savedSources)]
  }
})

//control editing of metadatafields
let metaEditable

//field validations
let validationVars = ['localityhasError', 'coordsHasError', 'uncertaintyHasError', 'uncertaintyUnitHasError', 'datumHasError', 'georefByHasError', 'georefDateHasError', 'protocolHasError', 'sourcesHasError', 'verifiedByHasError', 'verifiedDateHasError', 'verifierRoleHasError'] //must match below
$: hasLocalityAndCoords = editable && Boolean(localGeoref.locality && localGeoref.locality.trim() && localGeoref.decimalCoordinates)
$: localityhasError = editable && Boolean(localGeoref.decimalCoordinates && (!localGeoref.locality || !localGeoref.locality.trim()))
$: coordsHasError = editable && Boolean(localGeoref.locality && localGeoref.locality.trim() && (!localGeoref.decimalCoordinates || !localGeoref.decimalCoordinatesOkay || localGeoref.decimalCoordinatesWarning) && !localGeoref.ambiguous)
$: uncertaintyHasError = editable && Boolean(hasLocalityAndCoords && requiredFields.includes('uncertainty') && !localGeoref.uncertainty && !localGeoref.ambiguous)
$: uncertaintyUnitHasError = editable && Boolean(localGeoref.uncertainty && !localGeoref.uncertaintyUnit && !localGeoref.ambiguous)
$: datumHasError = editable && Boolean(hasLocalityAndCoords && requiredFields.includes('datum') && (!localGeoref.datum || !localGeoref.datum.trim()) && !localGeoref.ambiguous)
$: georefByHasError =  editable && Boolean(hasLocalityAndCoords && requiredFields.includes('by') && (!localGeoref.by || !localGeoref.by.trim()) && !localGeoref.ambiguous)
$: georefDateHasError = editable && Boolean(hasLocalityAndCoords && (localGeoref.by && localGeoref.by.trim() || requiredFields.includes('date')) && (!localGeoref.date || !localGeoref.date.trim()) && !localGeoref.ambiguous) //see the component for more validation
$: protocolHasError = editable && Boolean(hasLocalityAndCoords && requiredFields.includes('protocol') && (!localGeoref.protocolObject || !localGeoref.protocolObject.value) && !localGeoref.ambiguous)
$: sourcesHasError = editable && Boolean(hasLocalityAndCoords && requiredFields.includes('sources') && (!localGeoref.sourcesArray || !localGeoref.sourcesArray.length) && !localGeoref.ambiguous)
$: verifiedByHasError = editable && Boolean(hasLocalityAndCoords && requiredFields.includes('verifiedBy') && (!localGeoref.verifiedBy || !localGeoref.verifiedBy.trim()))
$: verifiedDateHasError = editable && Boolean(hasLocalityAndCoords && (localGeoref.verifiedBy && localGeoref.verifiedBy.trim() || requiredFields.includes('verifiedDate')) && (!localGeoref.verifiedDate || !localGeoref.verifiedDate.trim())) //see the component for more validation
$: verifierRoleHasError = editable && Boolean(hasLocalityAndCoords && requiredFields.includes('verifierRole') && (!localGeoref.verifierRole || !localGeoref.verifierRole.trim()))

//watchers
$: georef, setLocalGeoref()

$: localGeoref.by, setDefaultORCID('by')
$: localGeoref.verifiedBy, setDefaultORCID('verifiedBy')

$: localGeoref.locality, updateOnLocalityChange()

$: if(uncertaintySelect && !localGeoref.uncertaintyUnit){
  handleUncertaintyBlur() //this is just to handle new incoming georefs with no uncertainty after previous ones
}

//for dispatching changes to uncertainty during verification
$: if (localGeoref && showVerification && localGeoref.uncertainty && localGeoref.uncertaintyUnit) {
  dispatch('uncertainty-changed',  {
    uncertainty: localGeoref.uncertainty,
    uncertaintyUnit: localGeoref.uncertaintyUnit
  })
}

//for dispatching locality during verification
$: if (localGeoref && showVerification && localGeoref.locality ) {
  dispatch('locality-changed',  {
    locality: localGeoref.locality
  })
}

//update verification status
$: if (localGeoref && localGeoref.verifiedBy && localGeoref.verifiedDate && localGeoref.verifiedByRole) {
  localGeoref.verified = true
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

export const clear = _ => {
  localGeoref = new Georef()
  if (defaultGeorefBy) {
    localGeoref.by = defaultGeorefBy
    let now = new Date()
    localGeoref.date = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
    if(defaultGeorefByORCID){
      localGeoref.byORCID = defaultGeorefByORCID
    }
  }
}

const setLocalGeoref = _ => {
  metaEditable = false;
  if(georef && georef instanceof Georef) {
    localGeoref = georef.copy()
    if(editable && !localGeoref.ambiguous) {
      //we'll use an array of values to check
      let checkVars =  [localGeoref.uncertainty, localGeoref.datum, localGeoref.by, localGeoref.date, localGeoref.sources, localGeoref.protocol]
      metaEditable = showVerification || checkVars.some(x => !x) //any are empty
    }
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
  if(localGeoref[field] && localGeoref[field].trim()){ //make changes if there is a value
    if(defaultGeorefBy){
      if(defaultGeorefByORCID) {
        if(localGeoref[field] == defaultGeorefBy){
          localGeoref[field + 'ORCID'] = defaultGeorefByORCID
        }
      }
      else { //it's changed and we don't have a default
        localGeoref[field + 'ORCID'] = null
      }
    }
  }
  else { //its blank/empty
    localGeoref[field + 'ORCID'] = null
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
        localGeoref.ambiguous = false //it's no longer a blank georef if we start editing
        if(editable){
          metaEditable = true //the locality has changed so other things can too
        }
      }
    }
  }
}

const copyGeorefJSON = ev => {
  ev.preventDefault()
  navigator.clipboard.writeText(JSON.stringify(localGeoref, null, 2)).then(_ => {
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
  if(georef && georef instanceof Georef) { //we got a georef from the parent
    dispatch('clear-georef') //tell the parent to clear any selected georeferences
  }
  clear()

  if(window.pushToast) {
    window.pushToast('new georef')
  }
}

const flagGeoref = _ => {
  //fire off a message to parent to flag the original record
  if(!localGeoref.flagged) {
    let cont = confirm('Are you sure you want to flag this georeference?')
    if(cont){
      localGeoref.flagged = true
      dispatch('georef-flagged', localGeoref.georefID) //the parent must do the API call
    }
  }
}

const handleCoordsFromVerbatim = ev => {
  try {
    let coordsFromVerbatim = ev.detail
    if (localGeoref.decimalCoordinates && localGeoref.decimalCoordinates.replace(/\s+/g, '') != coordsFromVerbatim) { //only change if they are different
      localGeoref.decimalCoordinates = coordsFromVerbatim
      localGeoref.sources = 'verbatim coordinates'
      localGeoref.originalGeorefSource = null
      localGeoref.ambiguous = false //its no longer blank if we edit
      dispatch('coords-from-paste', localGeoref.decimalCoordinates)
    }
    else {
      localGeoref.decimalCoordinates = coordsFromVerbatim
      localGeoref.sources = 'verbatim coordinates'
      localGeoref.originalGeorefSource = null
      dispatch('coords-from-paste', localGeoref.decimalCoordinates)
    }
    if(editable){
      metaEditable = true //the locality has changed so other things can too
    }
  }
  catch(err) {
    alert(err.message)
  }
}

const handleCoordsFromPaste = _ => {
  //because the coords have changed
  if(editable){
    metaEditable = true //the coords have changed so other things can too
  }
  localGeoref.verbatimCoordinates = null
  localGeoref.originalGeorefSource = null
  localGeoref.ambiguous = false //its no longer blank if we edit

  dispatch('coords-from-paste', localGeoref.decimalCoordinates)
}

const handleUncertaintyBlur = _ => {
  //reset if the value has been removed
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

const handleProtocolSelected = _ => {
  //add new items to localStorage
  //here it's just one so we can use the value directly
  if(localGeoref.protocolObject) {
    if(!georefProtocols.includes(localGeoref.protocolObject.value)){
      //add it so we can reuse it
      georefProtocols = [...georefProtocols, localGeoref.protocolObject.value]
      let protocols = []
      let savedProtocols = localStorage.getItem('custom-protocols')
      if(savedProtocols){
        protocols = JSON.parse(savedProtocols)
      }
      protocols.push(localGeoref.protocolObject.value)
      localStorage.setItem('custom-protocols', JSON.stringify(protocols))
    }
  }
}

const handleSourceSelected = _ => {
  //add new items to localStorage
  //more complicated than for protocol because of multiple arrays
  //lets use sets
  if(localGeoref.sourcesArray && localGeoref.sourcesArray.length) { //check we have values first
    //for each one check if in original array
    for (let selectedSource of localGeoref.sourcesArray) {
      if(!georefSources.includes(selectedSource.value)) {
        georefSources = [...georefSources, selectedSource.value] //add it
        let sources = [] //this should only happen once so we should be able to do this in the loop...
        let savedSources = localStorage.getItem('custom-sources')
        if(savedSources) {
          sources = JSON.parse(savedSources)
        }
        sources.push(selectedSource.value)
        localStorage.setItem('custom-sources', JSON.stringify(sources))
        break //this should be safe...
      }
    }
  }
}

const checkAndDispatchGeoref = _ => {

  try {
    if(localGeoref.differentTo(georef)) {
      //some validation first
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
      localGeoref.resetFieldsIfDifferent()
    }

    dispatch('set-georef', localGeoref)

  }
  catch(err) {
    alert('error checking georefs are equal: ' + err.message)
  }
    
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<form on:submit|preventDefault={checkAndDispatchGeoref}
  class:form-ambiguous={localGeoref.ambiguous}
>
  {#if showButtons}
    <div class="georef-tool-container">
      {#if showResetButton}
        <button class="georef-tool-button" title="Clear all" on:click|preventDefault={handleClearClick}>
          <span class="material-icons">restore_page</span>
        </button>
      {/if}
      <button class="georef-tool-button" title="Flag this georef" disabled={localGeoref.flagged} on:click|preventDefault={flagGeoref}>
        <span class="material-icons">report</span>
      </button>
      <button class="georef-tool-button json-button" title="Copy georef JSON" on:click|preventDefault={copyGeorefJSON}>
        <span>JSON</span>
      </button>
      <button class="georef-tool-button" title="Copy tab delimited" on:click|preventDefault={copyTabDelimited}>
        <span class="material-icons" >clear_all</span>
      </button>
    </div>
  {/if}
  {#if localGeoref.ambiguous}
    <div class="ambiguous-alert-container">
      <div class="ambiguous-alert">
        Please note this is a blank geoference used for imprecise, ambiguous, or otherwise ungeoreferencable locality strings. Any edits will update it to a regular georeference. Only edit if you understand the consequences for other locaties that might use it...
      </div>
    </div>
  {/if}
  <fieldset disabled={!editable}>
    <div>
      <label for="loc" style="width:100%;text-align:right">locality</label><br/>
      <LocalityInput hasError={localityhasError} {editable} bind:value={localGeoref.locality} />
    </div>
    <div class="oneliner">
      <label  for="verbatimcoords">verbatim coords</label>
      <VerbatimCoordsInput {editable} on:coords-from-verbatim={handleCoordsFromVerbatim} on:coords-from-paste={handleCoordsFromPaste} bind:value={localGeoref.verbatimCoordinates}/>
    </div>
    <div class="oneliner">
      <label  for="coords">decimal coords</label>
      <DecimalCoordsInput hasError={coordsHasError} {editable} on:coords-from-paste={handleCoordsFromPaste} bind:value={localGeoref.decimalCoordinates}/> <!--VERY IMPORTANT THAT COORDINATES BE VALID BEFORE THIS HAPPENS, OTHERWISE IT BREAKS-->
    </div>
    <fieldset class="innerfieldset" disabled={!metaEditable}>
      <div class="oneliner">
        <label for="acc">uncertainty</label>
        <div class="uncertainty-fields">
          <input type="number" id="acc" min="0" step="0.1" class:hasError={uncertaintyHasError} on:blur={handleUncertaintyBlur}  bind:value={localGeoref.uncertainty}/>
          <select class:hasError={uncertaintyUnitHasError} id='accunit' bind:value={localGeoref.uncertaintyUnit} bind:this={uncertaintySelect}>
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
      {#if showGeorefBy}
        <div class="oneliner">
          <label for="georefBy">georef by</label>
          {#if defaultGeorefBy}
            <input class:hasError={georefByHasError} type="text" list="defaultGeorefBy" id="georefBy" style="width:70%" bind:value={localGeoref.by}/>
            <datalist id="defaultGeorefBy">
              <option value={defaultGeorefBy}>
            </datalist>
          {:else}
            <input class:hasError={georefByHasError} type="text" id="georefBy" style="width:50%" bind:value={localGeoref.by}/>
          {/if}
        </div>
        <div class="oneliner">
          <label for="georefByORCID">georef by ID</label>
          <input type="text" id="georefByORCID" style="width:100%;max-width:300px" bind:value={localGeoref.byORCID}/>
        </div>
      {/if}
      <div class="oneliner">
        <div class="fields">
          <div class="flex">
            <label for="georefDate" style="padding-right:10px">georef date</label>
            <DateInput hasBy={localGeoref.by && localGeoref.by.trim()} {editable} hasError={georefDateHasError} bind:value={localGeoref.date} />
          </div>
        </div>
      </div>
      {#if editable}
        <div>
          <label style="width:100%;text-align:right" for="protocol">protocol</label>
          <div class="inline-select">
            <Select items={georefProtocols.map(x=> ({value:x, label:x}))} isCreatable={true} placeholder={'Select a protocol...'} hasError={protocolHasError} on:select={handleProtocolSelected} bind:value={localGeoref.protocolObject} />
          </div>
        </div>
      {:else}
        <div class="oneliner" >
          <label for="protocol">protocol</label>
          <input type="text" style="width:100%;max-width:300px" bind:value={localGeoref.protocol} />
        </div>
      {/if}
      {#if editable}
      <div>
        <label style="width:100%;text-align:right" for="sources">sources</label>
        <div class="inline-select">
          <Select items={georefSources.map(x => ({value:x, label:x}))} isCreatable={true} isMulti={true} placeholder={'Select source/s...'} hasError={sourcesHasError} on:select={handleSourceSelected} bind:value={localGeoref.sourcesArray}/>
        </div>
      </div>
      {:else}
        <div class="oneliner" >
          <label for="sources">sources</label>
          <textarea style="width:100%;max-width:300px;rows:2;resize:vertical;" bind:value={localGeoref.sources} />
        </div>
      {/if}
    </fieldset>
    <div>
      <label for="remarks" style="width:100%;text-align:right">georef remarks</label>
      <textarea id="remarks" rows="3" disabled={!editable || !metaEditable} bind:value={localGeoref.remarks}/>
    </div>
    {#if showVerification}
      <div class="hr-break">
        <hr/><hr/>
      </div>
      <div class="oneliner">
        <label for="verifiedBy">verified by</label>
        {#if defaultGeorefBy}
          <input type="text" list="defaultVerifiedBy" id="verifiedBy" style="width:70%" class:hasError={verifiedByHasError} bind:value={localGeoref.verifiedBy}/>
          <datalist id="defaultVerifiedBy">
            <option value={defaultGeorefBy}>
          </datalist>
        {:else}
          <input type="text" id="verifiedBy" style="width:70%" class:hasError={verifiedByHasError} bind:value={localGeoref.verifiedBy}/>
        {/if}
      </div>
      <div class="oneliner">
        <label for="verifiedByORCID">verified by ID</label>
        <input type="text" id="verifiedByORCID" style="width:100%;max-width:300px" bind:value={localGeoref.verifiedByORCID}/>
      </div>
      <div class="oneliner">
        <label for="verifierRole">verifier role</label>
        <input id="verifierRole" class:hasError={verifierRoleHasError} list="verifierRoles" name="verifierRole" style="width:50%" bind:value={localGeoref.verifierRole}>
        <datalist id="verifierRoles">
          <option value="quality controller">
          <option value="curator">
          <option value="collector">
        </datalist>
      </div>
      {#if editable}
        <div class="oneliner">
          <div class="fields">
            <div class="flex">
              <label for="verifiedDate" style="padding-right:10px">verified date</label>
              <DateInput hasBy={localGeoref.verifiedBy && localGeoref.verifiedBy.trim()} {editable} hasError={verifiedDateHasError} bind:value={localGeoref.verifiedDate} />
            </div>
          </div>
        </div>
        <div>
          <label for="veriremarks" style="width:100%;text-align:right">verification remarks</label>
          <textarea id="veriremarks" rows="3" bind:value={localGeoref.verificationRemarks}/>
        </div>
        <div>
          <Checkbox label={"Send feedback"} bind:checked={localGeoref.sendVerificationFeedback} />
        </div>
      {/if}
      <div class="hr-break">
        <hr/><hr/>
      </div>
    {/if}
  </fieldset>
  {#if showSubmitButton}
    <div style="text-align:center">
      <button class="georefbutton" disabled={!hasLocalityAndCoords && !localGeoref.ambiguous}>{submitButtonText}</button> <!--this is the form submit-->
    </div>
  {/if}
</form>

<!-- ############################################## -->
<style>

  .georef-tool-container {
    display:flex;
    justify-content: flex-end;
  }

  .georef-tool-button {
    color: darkslategray;
    margin-left:5px;
    padding-bottom:0;
    background-color: lightgray;
  }

  .georef-tool-button:disabled {
    color: lightgray;
    background-color: whitesmoke;
  }

  .georef-tool-button:enabled:hover {
    cursor: pointer;
    background-color:grey;
    color:white;
  }

  form {
    width:100%;
    /* height:100%; */
    /* max-height:100%; */
  }

  .form-ambiguous {
    background-color: #ffe6b4;
  }

  .ambiguous-alert-container {
    width:100%;
    display:flex;
    justify-content: space-around;
  }

  .ambiguous-alert {
    width:80%;
    background-color: #ffd47d;
    color: rgb(73, 93, 158);
    border-radius: 2px;
    border-width: 20px;
    border: 4px solid #c98f18;
  }

  fieldset {
    width:100%;
    padding: 0;
    border:none;
  }

  label {
    display: inline-block;
    /* width: 140px; */
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

  input:disabled {
    color:black;
    background-color: white;
  }

  textarea:disabled {
    color: black;
    background-color: white;
  }

  .oneliner {
    display: flex;
    width: 100%;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
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

  .uncertainty-fields {
    display: inline-flex;
    width:50%;
    min-width: 160px;
  }

  .uncertainty-fields > input {
    flex: 1;
    width: 80px;
		margin-left:5px;
  }

  .uncertainty-fields > select {
    width: 80px;
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

  .json-button {
    display: inline-flex;
    align-items: center; 
    justify-content: center;
    padding:0;
    height:36.4px;
    width:38.8px;
    font-family:Arial;
    font-stretch:condensed;
    font-size:0.9em;
    font-weight:bold;
  }

  .georefbutton:hover:enabled{
    cursor:pointer;
    background-color:lightskyblue;
    color:white;
  }

  .hr-break {
    margin-bottom:10px;
  }

  hr {
    border: 1px solid lightgray;
    margin:1px;
  }
</style>