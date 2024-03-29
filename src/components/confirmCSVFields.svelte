<script>
import { createEventDispatcher } from 'svelte';
import Select from 'svelte-select';
import Loader from './loader.svelte'
import validateCSVHeaders from '../CSVUtilities/validateCSVHeaders.js'

const dispatch = createEventDispatcher();

export let file

let validationResult

//computed properties
let darwinCoreFields = []
let notDarwinCore = []
let malformedDarwinCore = []
let otherFields = []
let possibleIdentifierFields = []

//use namespaces for required fields
// ||s indicate options in order of preference, one is required 
//not ideal that this is hard coded here but thats what it is for now. 
let requiredFieldsList = [
  {key: 'taxonField', targetfields: 'dwc:acceptedNameUsage || dwc:scientificName', required: true},
  {key: 'recordIDField', targetfields: 'dwc:occurrenceID', required: true},
  {key: 'countryField', targetfields: 'dwc:country', required: true},
  {key: 'stateProvinceField', targetfields: 'dwc:stateProvince', required: false},
  {key: 'localityField', targetfields: 'dwc:verbatimLocality || dwc:locality', required: true},
  {key: 'collectorsField', targetfields: 'dwc:recordedBy', required: false},
]

let requiredFields = { }

let requiredFieldsMissing = false

//watchers
$: validate(file)

$: validationResult, console.log(validationResult), updateVars()

//Methods
async function validate(targetFile) {
  if(targetFile){
    validationResult = await validateCSVHeaders(targetFile)
  }
}

function updateVars() {
  
  resetVars()

  if(validationResult){
    if(validationResult.validDWCFields.length > 0) {
      darwinCoreFields = validationResult.validDWCFields
    }

    if (validationResult.notDarwinCore.length || validationResult.notDublinCore.length) {
      notDarwinCore = [...validationResult.notDarwinCore, ...validationResult.notDublinCore]
    }

    if(validationResult.notDarwinCoreButClose.length || validationResult.notDublinCoreButClose.length ||
      validationResult.almostDarwinCore.length || validationResult.almostDublinCore.length) {
      malformedDarwinCore = [...validationResult.notDarwinCoreButClose, 
        ...validationResult.notDublinCoreButClose, 
        ...validationResult.almostDarwinCore, 
        ...validationResult.almostDublinCore]
    }

    if (validationResult.otherFields.length) {
      otherFields = validationResult.otherFields
    }

    for (let requiredFieldsItem of requiredFieldsList) {
      let requiredFieldOptions = requiredFieldsItem.targetfields.trim().split(/\s*\|\|\s*/g)
      for(let requiredFieldOption of requiredFieldOptions) {  
        let foundField = null
        if(darwinCoreFields) {
          foundField = darwinCoreFields.find(dwcField => dwcField == requiredFieldOption || dwcField == requiredFieldOption.split(':')[1] || dwcField.split(':')[1] == requiredFieldOption)
        } 
        if(foundField){
          requiredFields[requiredFieldsItem.key] = foundField
          break
        }
        else {
          requiredFields[requiredFieldsItem.key] = null
        }
      }
    }

    checkRequiredFields()

    if(!requiredFields['recordIDField']) {
      let candidateIDFields = null

      if(darwinCoreFields) {
        candidateIDFields = [darwinCoreFields.find(dwc => dwc == 'catalogNumber' || dwc.split(':')[1] == 'catalogNumber')]
      }

      if (!candidateIDFields) {
        candidateIDFields = []
      }

      if(otherFields && otherFields.length){
        candidateIDFields = [...candidateIDFields, ...otherFields].filter(field => field && field.trim())
      }

      if(malformedDarwinCore && malformedDarwinCore.length) {
        candidateIDFields = [...candidateIDFields, ...malformedDarwinCore].filter(field => field && field.trim())
      }

      possibleIdentifierFields = candidateIDFields.map(f => ({value: f, label: f }))
      
    }
  }
}

function resetVars() {
  requiredFields = {}

  darwinCoreFields = null
  notDarwinCore = null
  malformedDarwinCore = null
  otherFields = null
  possibleIdentifierFields = null

  requiredFieldsMissing = false

}

function handleSelect(ev){
  requiredFields.recordIDField = ev.detail.value 
  checkRequiredFields()
}

function checkRequiredFields(){
  let isMissing = false
  for (let requiredFieldsItem of requiredFieldsList) {
    if(requiredFieldsItem.required) {
      if (!requiredFields[requiredFieldsItem.key]) {
        isMissing = true
        break
      }
    }
  }
  if(isMissing){
    requiredFieldsMissing = true
  }
  else {
    requiredFieldsMissing = false
  }
}

function handleNextClick(){
  dispatch('fields-confirmed', requiredFields);
}

function handleStartOver(){
  dispatch('fields-confirm-cancelled')
}

</script>

<!-- ############################################################# -->
<!-- HTML -->
{#if !validationResult} 
  <Loader />
{:else}
  <div class="confirmfield-container">
    <h2>Please confirm the fields in your dataset</h2>
    {#if darwinCoreFields && darwinCoreFields.length}
      <h4>Darwin Core fields:</h4>
      <p><i>{darwinCoreFields.join(', ')}</i></p>
    {/if}
    {#if validationResult.someFieldsNamespaced}
      <p style="color:red"><strong>Some fields are namespaced and others not - it's best to be consistent</strong></p>
    {/if}
    {#if malformedDarwinCore && malformedDarwinCore.length}
      <h4>Malformed fields:</h4>
      <p>The following fields may be incorrectly formed Darwin Core fields. Darwin Core terms are <a href="https://en.wikipedia.org/wiki/Camel_case" target="_blank">camelCase</a> and don't include spaces, numbers or punctuation. Please see <a href="https://dwc.tdwg.org/terms/" target="_blank">the standard</a></p>
      <p><i>{malformedDarwinCore.join(', ')}</i></p>
    {/if}
    {#if notDarwinCore && notDarwinCore.length}
      <h4>Not Darwin Core:</h4>
      <p>The following fields include namespace prefixes but don't exist in those namespaces. Make sure you're using the correct namespace prefixes for the Dublin Core terms within Darwin Core</p>
      <p><i>{malformedDarwinCore.join(', ')}</i></p>
    {/if}
    {#if otherFields && otherFields.length}
      <h4>Other fields:</h4>
      <p>The following additional fields were found in the dataset:</p>
      <p><i>{otherFields.join(', ')}</i></p>
    {/if}
    {#if requiredFieldsMissing}
      <h3 style="color:tomato">The following required or recommended fields are missing:</h3>
      {#each requiredFieldsList as requiredFieldsItem}
        {#if !requiredFields[requiredFieldsItem.key]}
          {#if requiredFieldsItem.required}
            <p>{requiredFieldsItem.targetfields.replace(/\s*\|\|\s*/g, ' OR ')}</p>
          {:else}
            <p>{requiredFieldsItem.targetfields.replace(/\s*\|\|\s*/g, ' OR ')}</p>
          {/if}
        {/if}
      {/each}
    {/if}
    {#if requiredFieldsMissing && !requiredFields['recordIDField']}
      <h3 style="color:tomato">A unique row identifier field is required</h3>
      {#if possibleIdentifierFields.length > 0}
        <p>Please select a field that uniquely identifies rows in the dataset. Recommended Darwin Core fields are occurrenceID and catalogNumber, but other fields like can be used as long as they are unique per row</p>
        <div style="width:500px;text-align:center">
          <Select items={possibleIdentifierFields} on:select={handleSelect}></Select>
        </div> 
      {/if}
    {/if}
    {#if !requiredFieldsMissing}
      <h4>Fields to be used for georeferencing:</h4>
      {#each requiredFieldsList as requiredFieldsItem}
        {#if requiredFieldsItem.required}
          <p>{requiredFieldsItem.key} (required): <i>{requiredFields[requiredFieldsItem.key]}</i></p>
        {:else}
          <p>{requiredFieldsItem.key} (recommended): <i>{requiredFields[requiredFieldsItem.key] || 'none'}</i></p>
        {/if}
      {/each}
    {/if}
    {#if requiredFieldsMissing}
      <button  style="width:200px;float:right;margin-right:20px;" on:click={handleStartOver}>I'll start over</button>
    {:else}
      <button style="width:200px;float:right;" on:click={handleNextClick}>Next...</button>
    {/if}
    <div style="clear:both;"/>
  </div>
{/if}

<!-- ############################################################# -->
<style>
  .confirmfield-container {
    height: 100%;
    overflow-y: auto;
  }

  h2 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
	}
</style>