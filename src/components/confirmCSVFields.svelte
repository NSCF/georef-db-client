<script>

import Select from 'svelte-select';
import validateCSVHeaders from '../CSVUtilities/validateCSVHeaders.js'

export let file

let validationResult

//computed properties
let darwinCoreFields
let notDarwinCore
let malformedDarwinCore
let otherFields
let possibleIdentifierFields

//use namespaces for required fields
// ||s indicate options in order of preference, one is required 
//not ideal that this is hard coded here but thats what it is for now. 
let requiredFieldsList = [
  {key: 'countryField', targetfields: 'dwc:country', required: true},
  {key: 'localityField', targetfields: 'dwc:verbatimLocality || dwc:locality', required: true},
  {key: 'recordIDField', targetfields: 'dwc:occurrenceID || dwc:eventID || dwc:localityID', required: true},
  {key: 'collectorsField', targetfields: 'dwc:recordedBy', required: false},
]

let requiredFields = { }

let requiredFieldsMissing = false

//watchers
$: file, async() => {
  if(file){
    console.log('we should be validating the file here')
    validationResult = await validateCSVHeaders(targetFile)
  }
}

$: validationResult, updateVars()

//Methods
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
        let foundField = darwinCoreFields.find(dwcField => dwcField == requiredFieldOption || dwcField == requiredFieldOption.split(':')[1] || dwcField.split(':')[1] == requiredFieldOption)
        if(foundField){
          requiredFields[requiredFieldsItem.key] = foundField
          break
        }
        else {
          requiredFields[requiredFieldsItem.key] = null
          requiredFieldsMissing = true
        }
      }
    }
    console.log(requiredFields)

    if(!requiredFields['recordIDField']) {
      let catNumField = darwinCoreFields.find(dwc => dwc == 'catalogNumber' || dwc.split(':')[1] == 'catalogNumber')
      let optionFields = [catNumField, ...otherFields].filter(field => field && field.trim())
      possibleIdentifierFields = optionFields.map(f => ({value: f, label: f }))
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

function handleSelect(selectedValue){
  requiredFields['recordIDField'] = selectedValue.value //TODO I have to $set this
}

function handleNextClick(event){
  //TODO emit the requiredfields
}

</script>

<!-- ############################################################# -->
<!-- HTML -->
{#if !validationResult} 
 <!-- TODO what if no internet connection -->
  spinner goes here
{:else}
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
          <p>Required: {requiredFieldsItem.targetfields.replace(/\s*\|\|\s*/g, ' OR ')}</p>
        {:else}
          <p>Recommended: {requiredFieldsItem.targetfields.replace(/\s*\|\|\s*/g, ' OR ')}</p>
        {/if}
      {/if}
    {/each}
  {/if}
  {#if !requiredFieldsMissing && !requiredFields['recordIDfield']}
    <h4 style="color:tomato">Unique row identifier required</h4>
    <p>Please select a field that uniquely identifies rows in the dataset. Recommended Darwin Core fields are occurrenceID, eventID, or localityID, but other fields like catalog numbers or barcodes can be used as long as they are unique per row</p>
    <Select items={possibleIdentifierFields} on:select={handleSelect}></Select>
  {/if}
  <button disabled={!requiredFields.recordIDField} style="float:right;">Next...</button>
  <div style="clear:both;"/>
{/if}

<!-- ############################################################# -->
<style>

</style>