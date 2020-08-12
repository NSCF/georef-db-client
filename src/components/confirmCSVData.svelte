<script>
import { createEventDispatcher } from 'svelte';
import validateCSVContent from '../CSVUtilities/validateCSVContent.js'
import validateCountries from '../dwcUtilities/validateCountries.js'

const dispatch = createEventDispatcher();

//props
export let file
export let requiredFields

//vars
let fileSummary
let countriesCheck
let recordsToGeoreference = 0
let uniqueToGeoreference = 0

//UI vars
let showMissingCountries = false
let showMissingCountriesButtonText = 'show'
let showMissingLocalities = false
let showMissingLocalitiesButtonText = 'show'
let showButtonText

//watchers
$:file, getFileSummary()
$:fileSummary, checkCountries()
$:if(showMissingCountries) {
  showButtonText = 'hide'
} else {
  showButtonText = 'show'
}

async function getFileSummary(){
  fileSummary = await validateCSVContent(file, requiredFields)
}

async function checkCountries(){

  if(fileSummary){
    let countryNames = Object.keys(fileSummary.countriesSummary)
    if(countryNames.length){
      countriesCheck = await validateCountries(countryNames)
    }
    else {
      console.log('no countries to check')
    }  
  }
}

function handleNextClick(){
  dispatch('data-confirmed', 
    {
      localityRecordIDMap: fileSummary.localityRecordIDMap,
      countryCodes: countriesCheck.countryCodes
    }
  )
}

function handleStartOver(){
  dispatch('data-confirm-cancelled')
}

</script>

<!-- ############################################################# -->
<!-- HTML -->
{#if !fileSummary}
  Another spinner here
{:else}
  <h2>File summary:</h2>
  <h4>This file contains {fileSummary.totalRows} records</h4>
  <h4>{recordsToGeoreference} (~{Math.round(recordsToGeoreference/fileSummary.totalRows * 100)}%) qualify for georeferencing</h4>
  <h4>There are {uniqueToGeoreference} unique locality{requiredFields.collectorField? '/collector': ''} values that will be grouped during georeferencing</h4>
  {#if fileSummary.recordIDsMissing}
    <h3 style="color:tomoto">There are records missing IDs. If you continue rows with no IDs will be discarded</h3>
  {/if}
  {#if fileSummary.duplicatedRecordIDs}
    <h3 style="color:tomato">Some record IDs are duplicated. Please ensure every row has a unique ID</h3>
  {/if}
  {#if fileSummary.rowsWithoutCountry && fileSummary.rowsWithoutCountry.length}
    <h4>{fileSummary.rowsWithoutCountry.length} records are missing a country value and therefore cannot be georeferenced:</h4>
    <button on:click={ _ => showMissingCountries = !showMissingCountries}>{showMissingCountriesButtonText}</button>
    {#if showMissingCountries}
      <p><i>{fileSummary.rowsWithoutCountry.join('; ')}</i></p>
    {/if}
  {/if}
  {#if fileSummary.rowsWithoutLocality && fileSummary.rowsWithoutLocality.length}
    {#if fileSummary.rowsWithoutLocality.length <= 20}
      <h4>The following additional records are missing a locality value and cannot be georeferenced:</h4>
      <p><i>{fileSummary.rowsWithoutLocality.join('; ')}</i></p>
    {:else}
      <h4>{fileSummary.rowsWithoutLocality.length} additional records are missing a locality value and therefore cannot be georeferenced:</h4>
      <button on:click={ _ => showMissingLocalities = !showMissingLocalities}>{showMissingLocalitiesButtonText}</button>
      {#if showMissingLocalities}
        <p><i>{fileSummary.rowsWithoutLocality.join('; ')}</i></p>
      {/if}
    {/if}
  {/if}
  {#if !countriesCheck}
    And yet another spinner!!
  {:else}
    {#if countriesCheck.invalid && countriesCheck.invalid.length}
      <h4 style="color:tomato">The following country names are problematic. These records will be excluded if you continue</h4>
      {#each countriesCheck.invalid as invalidCountry}
        <p>{invalidCountry.searchName}: <i>{invalidCountry.message}</i></p>
      {/each}
    {/if}
    {#if Object.keys(countriesCheck.countryCodes).length}
      <h4>The following countries are valid and will be used for georeferencing:</h4>
      <p><i>{Object.keys(countriesCheck.countryCodes).join('; ')}</i></p>
    {/if}
    <button disabled={!requiredFields.recordIDField} style="width:200px;float:right;" on:click={handleNextClick}>Next...</button>
    <button  style="width:200px;float:right;margin-right:20px;" on:click={handleStartOver}>I'll start over</button>
    <div style="clear:both;"/>
  {/if}

{/if}

<!-- ############################################################# -->
<style>

</style>