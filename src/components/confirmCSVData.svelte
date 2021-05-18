<script>
import { createEventDispatcher } from 'svelte';
import validateCSVContent from '../CSVUtilities/validateCSVContent.js'
import Loader from './loader.svelte'

const dispatch = createEventDispatcher();

//props
export let file
export let requiredFields

//vars
let fileSummary
let uniqueToGeoreference = 0

//UI vars
let showMissingCountries = false
let showMissingCountriesButtonText = 'show'
let showMissingLocalities = false
let showMissingLocalitiesButtonText = 'show'
let showButtonText
let showDuplicateRecordIDs = false

//watchers
$:file, getFileSummary()
$:if(showMissingCountries) {
  showButtonText = 'hide'
} else {
  showButtonText = 'show'
}

async function getFileSummary(){
  fileSummary = await validateCSVContent(file, requiredFields)
}

function toggleShowDuplicatesRecordIDs() {
  showDuplicateRecordIDs = !showDuplicateRecordIDs
}

function handleNextClick(){
  dispatch('data-confirmed', fileSummary
  )
}

function handleStartOver(){
  dispatch('data-confirm-cancelled')
}

</script>

<!-- ############################################################# -->
<!-- HTML -->
{#if !fileSummary}
  <Loader />
{:else}
  <h2>Please check your file summary before proceeding:</h2>
  <h4>This file contains {fileSummary.totalRows} records</h4>
  <h4>{fileSummary.recordsToGeoreference} (~{Math.round(fileSummary.recordsToGeoreference/fileSummary.totalRows * 100)}%) qualify for georeferencing</h4>
  <h3>There are {fileSummary.uniqueLocalityCollectorCount} unique locality{requiredFields.collectorField? '/collector': ''} values that will be grouped during georeferencing</h3>
  {#if fileSummary.uniqueLocalityCollectorCount <= 20}
    <p>It doesn't make sense to use bulk georeferencing for this number of localities. Rather start over, extract the unique localities from your dataset and use the manual georeferencing option.</p>
    <button  style="width:200px;float:right;margin-right:20px;" on:click={handleStartOver}>I'll start over</button>
  {:else}
    {#if fileSummary.recordIDsMissing}
      <h3 style="color:tomoto">There are records missing IDs. If you continue rows with no IDs will be discarded</h3>
    {/if}
    {#if fileSummary.recordsMissingLocalityAlsoMissingID}
      <h3 style="color:tomoto">There are records missing IDs AND locality values. If you continue these will be discarded</h3>
    {/if}
    {#if fileSummary.duplicatedRecordIDs.length}
      <h3 style="color:tomato">There are {fileSummary.duplicateRecordCount} duplicated records for {fileSummary.duplicatedRecordIDs.length} recordID values. Please ensure every row has a unique ID, otherwise these will be discarded</h3>
      <button on:click={toggleShowDuplicatesRecordIDs}>
        {#if showDuplicateRecordIDs}
          hide
        {:else}
          show
        {/if}
      </button>
      {#if showDuplicateRecordIDs}
        <p><i>{fileSummary.duplicatedRecordIDs.join('; ')}</i></p>
      {/if}
    {/if}
    {#if fileSummary.rowsWithoutLocality && fileSummary.rowsWithoutLocality.length}
      {#if fileSummary.rowsWithoutLocality.length <= 20}
        <h4>The following records are missing a locality value and cannot be georeferenced:</h4>
        <p><i>{fileSummary.rowsWithoutLocality.join('; ')}</i></p>
      {:else}
        <h4>{fileSummary.rowsWithoutLocality.length} records are missing a locality value and therefore cannot be georeferenced:</h4>
        <button on:click={ _ => showMissingLocalities = !showMissingLocalities}>{showMissingLocalitiesButtonText}</button>
        {#if showMissingLocalities}
          <p><i>{fileSummary.rowsWithoutLocality.join('; ')}</i></p>
        {/if}
      {/if}
    {/if}
    <br/>
    <button disabled={!requiredFields.recordIDField} style="width:200px;float:right;" on:click={handleNextClick}>Next...</button>
    <button  style="width:200px;float:right;margin-right:20px;" on:click={handleStartOver}>I'll start over</button>
    <div style="clear:both;"/>
  {/if}
{/if}


<!-- ############################################################# -->
<style>
h2 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
	}
</style>