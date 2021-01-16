<script>
import Select from 'svelte-select'
import convert from 'geo-coordinates-parser'

import {createEventDispatcher} from 'svelte'
let dispatch = createEventDispatcher();

import { dataStore } from './dataStore.js'

export let verification

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
  'verbatim coordinates',
  'NSCF georeference database'
]

let formGeoref = {}
let preEditGeoref //for checking if georefs really edited
let editable = false
let newGeoref = false

let coordinatesString
let coordinatesError = false
let selectedProtocol
let selectedSources

let accuracyUnitSelect = {}

$: geoRef, updateFromNewGeoref()

$: georefDateOkay = /^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(formGeoref.georefDate) && new Date(formGeoref.georefDate) < Date.now()
$: verifiedDateOkay = /^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(formGeoref.verifiedDate) && new Date(formGeoref.verifiedDate) < Date.now()

$: coordinatesString, updateCoords()

$: if(!formGeoref.accuracy) {formGeoref.accuracyUnit = null; accuracyUnitSelect.selectedIndex = "-1"} //resetting if accuracy emptied
$: if(selectedProtocol) {formGeoref.protocol = selectedProtocol.value}
$: if(selectedSources) {formGeoref.sources = selectedSources.map(x=>x.value).join(' | ')}

const updateFromNewGeoref = _ => {
  if(geoRef){
    
    formGeoref = geoRef
    
    if (!verification) {
      preEditGeoref = null
      editable = false
      newGeoref = false
    }
    else {
      preEditGeoref = Object.assign({},formGeoref)
      editable = true
    }
    
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

const updateCoords = _ => {
  if(coordinatesString) {
    let converted 
    try {
      converted = convert(coordinatesString, 8)
      coordinatesError = false
      formGeoref.decimalLatitude = converted.decimalLatitude
      formGeoref.decimalLongitude = converted.decimalLongitude
    }
    catch(err){
      coordinatesError = true
      formGeoref.decimalLatitude = null
      formGeoref.decimalLongitude = null
    }
  }
  else {
    coordinatesError = true
    formGeoref.decimalLatitude = null
    formGeoref.decimalLongitude = null
  }
}

const handleEditClick = _ => {
  preEditGeoref = Object.assign({}, formGeoref)
  formGeoref.georefID = null
  formGeoref.verifiedBy = null
  formGeoref.verifierRole = null
  formGeoref.verifiedDate = null
  editable = true
}

const handleNewClick = _ => {
  formGeoref = {}
  preEditGeoref = null
  coordinatesString = ''
  coordinatesError = false
  selectedProtocol = null
  selectedSources = null
  editable = true
  newGeoref = true;
}

const handleGeorefDateCalendarClick = _ => {
  if(editable) {
    if(formGeoref.georefBy && formGeoref.georefBy.trim()) {
      let now = new Date()
      formGeoref.georefDate = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences
    }
    else {
      alert('georef by is required before a date can be added')
    }
  }
}

const handleGeorefVerifiedDateCalendarClick = _ => {
  if(verification) {
    if (formGeoref.verifiedBy && formGeoref.verifiedBy.trim()) {
      let now = new Date()
      formGeoref.verifiedDate = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences
    }
    else {
      alert('verified by is required before a date can be added')
    }
  }
}

const handleFormSubmit = _ => {
  //this is where validation happens
  let invalidFields = []

  if(!formGeoref.locality || !formGeoref.locality.trim()) invalidFields.push('locality')
  if(!formGeoref.decimalLatitude || !formGeoref.decimalLongitude ) invalidFields.push('coordinates')
  if(!formGeoref.accuracy) invalidFields.push('accuracy')
  if(!formGeoref.accuracyUnit) invalidFields.push('accuracy units')
  if(!formGeoref.datum || !formGeoref.datum.trim() || formGeoref.datum.trim().length < 4) invalidFields.push('datum')
  if(!formGeoref.georefBy) invalidFields.push('georef by')
  if(!formGeoref.georefDate) invalidFields.push('georef date')
  if(!formGeoref.protocol) invalidFields.push('protocol')
  if(!formGeoref.sources) invalidFields.push('sources')

  if (verification){
    if(!formGeoref.verifiedBy) invalidFields.push('verified by')
    if(!formGeoref.verifierRole) invalidFields.push('verifier role')
    if(!formGeoref.verifiedDate) invalidFields.push('verified date')
  }

  if(invalidFields.length) {
    let message = 'The following fields are incomplete: ' + invalidFields.join('; ')
    alert(message)
  }
  else {
    //first check if it's actually been edited...
    for (let key of Object.keys(formGeoref)){
      
      if (key == 'georefID') {
        continue
      }

      if (!preEditGeoref[key] && !formGeoref[key]) {
        continue
      }

      if (preEditGeoref[key] != formGeoref[key]){
        if(verification) {
          formGeoref.verified = true
          dispatch('verify-georef', {geoRef: formGeoref})
          return;
        }
        else {
          dispatch('set-georef', {geoRef: formGeoref})
          return;
        }
      }
    }
    //we assume this would only ever happen with setting georefs and not verifications because we can't here unless the verification fields are complete, and we shouldn't be sending verified records for verification
    dispatch('set-georef', {geoRef: preEditGeoref}) //nothing has changed and we still need the old ID
  }
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<form on:submit|preventDefault={handleFormSubmit}>
  {#if !verification}
    <div style="text-align:right">
      <span class="material-icons iconbutton"  class:icongrey={!editable} title="Edit"  class:icongreen={editable}  on:click={handleEditClick}>create</span>
      <span class="material-icons iconbutton"  style="font-weight:bold" title="New"  class:icongrey={!newGeoref}  class:icongreen={newGeoref} on:click={handleNewClick}>add</span>
    </div>
  {/if}
  <div>
    <label for="loc" style="width:100%;text-align:right">locality</label><br/>
    <input class:hasError={editable && !formGeoref.locality} type="text" id="loc" style="width:100%" readonly={!editable} bind:value={formGeoref.locality}/>
  </div>
  <div class="oneliner">
    <label  for="coords">coordinates</label>
    <input type="text" id="coords" style="width:50%" readonly={!editable} class:hasError={coordinatesError} bind:value={coordinatesString}/>
  </div>
  <div class="oneliner">
    <label for="acc">accuracy</label>
    <div style="display:inline-block;width:50%">
      <input class:hasError={editable && (!formGeoref.accuracy || formGeoref.accuracyUnit && (!formGeoref.accuracy || formGeoref.accuracy <= 0))} type="number" id="acc" style="width:57%" min="0" readonly={!editable}  bind:value={formGeoref.accuracy}/>
      <select class:hasError={editable && formGeoref.accuracy && !formGeoref.accuracyUnit} id='accunit' style="width:40%" disabled={!editable} bind:value={formGeoref.accuracyUnit} bind:this={accuracyUnitSelect}>
        <option />
        {#each accuracyUnits as unit}
          <option value={unit}>{unit}</option>
        {/each}
      </select>
    </div>
  </div>
  <div>
    <label for="WKT" style="width:100%;text-align:right"><a href="https://dwc.tdwg.org/terms/#dwc:footprintWKT" target="_blank">georef WKT</a></label>
    <textarea id="WKT" rows="3" readonly={!editable} bind:value={formGeoref.WKT}/>
  </div>
  <div class="oneliner">
    <label for="datum">datum</label>
    <input id="datum" class:hasError={editable && !formGeoref.datum} list="datums" name="datum" style="width:50%" readonly={!editable} bind:value={formGeoref.datum}>
    <datalist id="datums">
      <option value="WGS84">
      <option value="Cape">
      <option value="Clarke 1880">
    </datalist>
  </div>
  <div class="oneliner">
    <label for="georefBy">georef by</label>
    <input class:hasError={editable && !formGeoref.georefBy} type="text" id="georefBy" style="width:50%" readonly={!editable} bind:value={formGeoref.georefBy}/>
  </div>
  <div class="oneliner">
    <label for="georefDate">georef date</label>
    <div class="fields">
      <div class="flex">
        <input  class:hasError={editable && !georefDateOkay} type="text" id="georefDate" autocomplete="off" readonly={!editable} bind:value={formGeoref.georefDate}/>
        <span class="material-icons calendaricon" on:click={handleGeorefDateCalendarClick}>date_range</span>
      </div>
    </div>
  </div>
  <div>
    <label style="width:100%;text-align:right" for="protocol">protocol</label>
    <div class="inline-select">
      <Select id="protocol" items={georefProtocols.map(x=> ({value:x, label:x}))} isCreatable={true} placeholder={'Select a protocol...'} isDisabled={!editable} hasError={editable && !selectedProtocol} bind:selectedValue={selectedProtocol} />
    </div>
  <div>
    <label style="width:100%;text-align:right" for="sources">sources</label>
    <div class="inline-select">
      <Select id="sources" items={georefSources.map(x=> ({value:x, label:x}))} isCreatable={true} isMulti={true} placeholder={'Select source/s...'} isDisabled={!editable} hasError={editable && (!selectedSources || !selectedSources.length)} bind:selectedValue={selectedSources}/>
    </div>
  </div>
  <div class="oneliner">
    <label for="verifiedBy">verified by</label>
    <input type="text" id="verifiedBy" style="width:50%" readonly={!verification} bind:value={formGeoref.verifiedBy}/>
  </div>
  <div class="oneliner">
    <label for="verifierRole">datum</label>
    <input id="verifierRole" class:hasError={verification && !formGeoref.verifierRole} list="verifierRoles" name="verifierRole" style="width:50%" readonly={!verification} bind:value={formGeoref.verifierRole}>
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
        <input class:hasError={verification && formGeoref.verifiedBy && !verifiedDateOkay} type="text" id="verifiedDate" autocomplete="off" readonly={!verification} bind:value={formGeoref.verifiedDate}/>
        <span class="material-icons calendaricon" on:click={handleGeorefVerifiedDateCalendarClick}>date_range</span>
      </div>
    </div>
  </div>
  <div>
    <label for="remarks" style="width:100%;text-align:right">remarks</label>
    <textarea id="remarks" rows="3" readonly={!editable} bind:value={formGeoref.remarks}/>
  </div>
  {#if verification}
    <div style="text-align:center">
      <button class="georefbutton">Save changes</button>
    </div>
  {:else}
    <div style="text-align:center">
      <button class="georefbutton">Use this georeference</button>
    </div>
  {/if}
</form>

<!-- ############################################## -->
<style>
form {
  width:100%
}

label {
  display: inline-block;
  width: 140px;
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