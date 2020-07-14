<script>

export let validationResult
export let requiredFields

let darwinCoreFields = []
let notDarwinCore
let malformedDarwinCore
let someFieldsNamespaced
let otherFields

let countryField
let localityField
let recordIDfield 
let collectorField

let includesCountry
let includesLocality
let includesCollector

let requiredFieldsMissingMessage

let selectedIDField = undefined;

//watchers
$: updateFrom(validation)
$: if(!includesCountry || !includesLocality) {
  if(!includesCountry && !includesLocality){
    requiredFieldsMissingMessage = "A country and a locality field are both required"
  }
  else if(!includesCountry){
    requiredFieldsMissingMessage = "A country field is required"
  }
  else if(!includesLocality){
    requiredFieldsMissingMessage = "A locality field is required"
  }
}



//computed
$: possibleIdentifierFields = () => {
  let o = [];

  if(!recordIDfield){
    if(darwinCoreFields.includes('catalogNumber')){
      o.push({value: 'catalogNumber', label: 'catalogNumber'})
    }
    else if(darwinCoreFields.includes('dwc:catalogNumber')) {
      o.push({value: 'dwc:catalogNumber', label: 'dwc:catalogNumber'})
    }
    
    let item
    otherFields.forEach(field => {
      item['value'] = field
      item['label:'] = field
      o.push(item)
    });

    return o

  }
  return null
}

$: okayVisible = () => {
  if (requiredFieldsMissingMessage) {
    return 'hidden'
  }
  return 'visible'
}

function _onCancel() {
  console.log('cancelling modal')
  darwinCoreFields = []
  notDarwinCore = undefined
  malformedDarwinCore = undefined
  someFieldsNamespaced = undefined
  otherFields = undefined
  possibleIdentifierFields = undefined

  recordIDfield = undefined
  countryField = undefined
  localityField = undefined
  collectorField = undefined

  includesCountry = undefined
  includesLocality = undefined
  includesCollector = undefined

  requiredFieldsMissingMessage = undefined

  selectedIDField = undefined
  close();
}

function _onOkay() {
  console.log('okay button clicked')
  let fieldsToReturn = {
    rowIDField: recordIDfield || selectedIDField,
    countryField,
    localityField,
    collectorField
  }
  console.log(fieldsToReturn)
  onOkay(fieldsToReturn)
  close();
}

function updateFrom(validation){
  if(validation){
    if(validation.validDWCFields.length > 0) {
      //strip any namespaces
      darwinCoreFields = validation.validDWCFields
    }

    if (validation.notDarwinCore.length || validation.notDublinCore.length) {
      notDarwinCore = [...validation.notDarwinCore, ...validation.notDublinCore]
      //console.log('The following fields include namespace prefixes but don\'t exist in those namespaces.')
      //console.log('Make sure you\'re using the correct namespace prefixes for the Dublin Core terms within Darwin Core')
      //console.log(notDarwinCore.join(', '),'\n')
    }

    if(validation.notDarwinCoreButClose.length || validation.notDublinCoreButClose.length ||
      validation.almostDarwinCore.length || validation.almostDublinCore.length) {
      malformedDarwinCore = [...validation.notDarwinCoreButClose, 
        ...validation.notDublinCoreButClose, 
        ...validation.almostDarwinCore, 
        ...validation.almostDublinCore]
      //console.log('The following fields may be incorrectly formed Darwin Core fields:')
      //console.log(malformedDarwinCore.join(', '),'\n')
    }

    if(validation.someFieldsNamespaced){
      someFieldsNamespaced = validation.someFieldsNamespaced
      //console.log('There appear to be some Darwin Core terms with namespaces and others without. Please use namespaces consistently\n')
    }

    if (validation.otherFields.length) {
      otherFields = validation.otherFields
      //console.log('The dataset includes the following fields that are not Darwin Core:')
      //console.log(validation.otherFields.join(', '), '\n')
    }
  }

  checkRequiredFields()

}

function checkRequiredFields(){
  includesCountry = darwinCoreFields.includes('country') || darwinCoreFields.includes('dwc:country')

  includesLocality = darwinCoreFields.includes('verbatimLocality') || 
  darwinCoreFields.includes('locality') ||
  darwinCoreFields.includes('dwc:verbatimLocality') || 
  darwinCoreFields.includes('dwc:locality') 

  if (!includesCountry) {
    let message = 'A country field is required for georeferencing'
    if (!includesLocality) {
      message = 'Country and locality fields are required for georeferencing'
    }
    return
  }

  if(darwinCoreFields.includes('institutionID')) {
    recordIDfield = 'institutionID'
  }

  if(!recordIDfield){
    if(darwinCoreFields.includes('dwc:institutionID')) {
      recordIDfield = 'dwc:institutionID'
    }
  }

  if(!recordIDfield){
    if(darwinCoreFields.includes('eventID')) {
      recordIDfield = 'eventID'
    }
  }

  if(!recordIDfield){
    if(darwinCoreFields.includes('dwc:eventID')) {
      recordIDfield = 'dwc:eventID'
    }
  }

  if(!recordIDfield){
    if(darwinCoreFields.includes('localityID')) {
      recordIDfield = 'localityID'
    }
  }

  if(!recordIDfield){
    if(darwinCoreFields.includes('dwc:localityID')) {
      recordIDfield = 'dwc:localityID'
    }
  }

  console.log('almost done checking fields')

  if(darwinCoreFields.includes('recordedBy')) {
    collectorField = 'recordedBy'
  }
  else if (darwinCoreFields.includes('dwc:recordedBy')){
    collectorField = 'dwc:recordedBy'
  }
  console.log('all done checking fields')
}

</script>

{#if darwinCoreFields && darwinCoreFields.length}
	<h4>Darwin Core fields:</h4>
  <p><i>{darwinCoreFields.join(', ')}</i></p>
{/if}
{#if someFieldsNamespaced}
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

{#if requiredFieldsMissingMessage}
	<h3 style="color:red">{requiredFieldsMissingMessage}</h3>
  {#if !recordIDfield}
    <p>Please also make sure there is a field that can be used to uniquely identify rows in this dataset</p>
  {/if}
{/if}

{#if !recordIDfield && !requiredFieldsMissingMessage}
  {#if possibleIdentifierFields.length}
    <h4>Please select a field that uniquely identifies rows:</h4>
    <Select {possibleIdentifierFields} bind:selectedIDField></Select>
  {:else}
    <h3 style="color:red">Please add a field that uniquely identifies rows in the dataset</h3>
    <p>Recommended Darwin Core fields are occurrenceID, eventID, or localityID, but other fields like catalog numbers or barcodes can be used</p>
  {/if}
{/if}
<br/>
<div class="buttons">
	<button on:click={_onCancel}>
		Cancel
	</button>
	<button style="background-color:blue;color:white;margin-left:30px;visibility:{okayVisible}" on:click={_onOkay}>
		Okay
	</button>
</div>

<style>
  .buttons {
    display: flex;
    justify-content: flex-end;
  }
</style>


