<script>

  import {onMount, onDestroy, afterUpdate, createEventDispatcher} from 'svelte'
  import {fly } from 'svelte/transition';
  import {Realtime} from '../../firebase'
  import { dataStore } from './dataStore.js'
  import CustomSearch from './customSearch.svelte'
  import GeorefMatchList from './georefMatchList.svelte'
  import GeorefMatchMap from './georefMatchMap.svelte'
  import GeorefForm from './georefForm.svelte'
  import Toast from '../toast.svelte'

  const dispatch = createEventDispatcher()
  
  let regionOptions
  let regionSelectOptions

  let pastedDecimalCoords
  let selectedGeoref

  const domainOptions = [
    {value: 'TER', label:'terrestrial'},
    //{value: 'FW', label:'freshwater'},
    //{value: 'MAR', label: 'marine'}
  ]

  let regionSelect
  let selectedRegion
  let selectedDomain
  let elasticIndex
  
  onMount(async _ => {
    let snap = await Realtime.ref('settings/georefRegions').once('value')
    regionOptions = snap.val() //its an object where keys are regions and values are countries in those regions
    $dataStore.georefIndex = null
  })

  //this is needed because the svelte doesn't update selects correctly, so we need to force the update
  afterUpdate(_ => {
    if(regionSelectOptions && regionSelectOptions.length){
      //we should have a selected region value
      selectedRegion = document.getElementById('region-select').value
    }
  })

  $: if(regionOptions && Object.keys(regionOptions).length) {
    regionSelectOptions = Object.keys(regionOptions).map(key => ({value:key, label:key}))
    selectedRegion = selectedRegion
  }

  $: if(selectedRegion && selectedDomain) {
    elasticIndex = (selectedRegion + selectedDomain).toLowerCase().replace(/\s+/g, '')
  }
  else {
    elasticIndex = null
  }

  const handleCustomGeorefs = ev => {
    $dataStore.georefIndex = ev.detail
  }

  const handleGeorefSelected = ev => {

    if($dataStore.selectedGeorefID){
      resetTableAndMap($dataStore.selectedGeorefID)
    }

    if(ev && ev.detail){
      let georefID = ev.detail
      
      selectedGeoref = $dataStore.georefIndex[georefID]
      selectedGeoref.selected = true

      let selectedMarker = $dataStore.markers[georefID]
      if(selectedMarker) {
        selectedMarker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5, 
          fillColor: 'blue', 
          fillOpacity: 1,
          strokeColor: 'blue'
        })

        selectedMarker.setZIndex(1)
        selectedMarker.panToMe()
      }
      
      $dataStore.selectedGeorefID = georefID
      $dataStore.georefIndex = $dataStore.georefIndex //svelte
    }
  }

  //helper for above and below
  const resetTableAndMap = georefID => {
    let selectedMarker = $dataStore.markers[georefID]
    if(selectedMarker) {
      selectedMarker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5, 
        fillColor: 'green', 
        fillOpacity: 1,
        strokeColor: 'green'
      })
      selectedMarker.setZIndex(0)
    }

    if($dataStore.georefIndex[georefID]) {
      $dataStore.georefIndex[georefID].selected = false
    }
    $dataStore.selectedGeorefID = null

    if(selectedGeoref) {
      selectedGeoref.selected = false
      selectedGeoref = null
    }
  }

  const handleSearchCleared = _ => {
    $dataStore.georefIndex = null
    dispatch('custom-search-cleared')
  }

</script>

<!-- ############################################## -->
<!-- HTML -->

<div class="container" >
  <div class="search-container" class:left={Boolean($dataStore.georefIndex)}>
    <div>
      <CustomSearch 
      placeholder={`Search for a locality in ${selectedRegion}`}
      elasticindex={elasticIndex} 
      on:custom-georefs={handleCustomGeorefs} 
      on:custom-search-searching 
      on:custom-search-cleared={handleSearchCleared} />
      <div class="inline-select" style="width:59%">
        <select id="region-select" bind:value={selectedRegion} bind:this={regionSelect}>
          {#if regionSelectOptions}
            {#each regionSelectOptions as opt}
              <option value={opt.value} selected={opt.value == 'Southern Africa'}>{opt.label}</option>
            {/each}
          {:else}
            <option value="" selected disabled>One moment please...</option>
          {/if}
        </select>
      </div>
      <div class="inline-select" style="width:40%">
        <select bind:value={selectedDomain}>
          {#each domainOptions as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>
  {#if $dataStore.georefIndex} 
    <div class="grid-container" in:fly="{{ y: 200, duration: 1000 }}">
      <div class="table-container">
        <div class="table-flex">
          <GeorefMatchList  on:georef-selected={handleGeorefSelected} />
        </div>
        <div class="table-plug" />
      </div>
      <div class="map-container">
        <GeorefMatchMap {pastedDecimalCoords} on:georef-selected={handleGeorefSelected} />
      </div>
      <div class="form-container">
        <h4>Georeference</h4>
        <GeorefForm editable={false} showVerification={true} georef={selectedGeoref} showSubmitButton={false} />
      </div>
    </div>
    
  {/if}
  <Toast />
</div>

<!-- ############################################## -->
<style>

  h4 {
    color:  #86afe8;
    text-transform: uppercase;
    font-size: 1.5em;
    font-weight: 600;
    text-align: center;
    margin:0;
  }
  .container {
    flex: 1;
    width:100%;
  }

  .search-container {
    position:relative;
		width:50%;
		left: 50%;
		transform:translate(-50%);
		transition: left 1s cubic-bezier(.08,.85,.27,.95);
    will-change: left;
  }

  .left {
		left: 25%;
	}

  .inline-select {
    display: inline-block;
  }

  select {
    width:100%;
  }

  .grid-container {
    display:grid;
    height: 100%;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 0.5fr) minmax(0, 0.5fr);
  }

  .table-container {
    grid-column: 1/2;
    grid-row: 1/2;
    display: flex;
  }

  .table-flex {
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: initial;
    overflow-y: auto;
  }

  .table-plug {
    flex: 0 0 auto;
  }

  .map-container {
    grid-column: 1/2;
    grid-row: 2/3;
  }

  .form-container {
    grid-column: 2/2;
    grid-row: 1/3;
    overflow-y: auto;
    padding-top:5px;
    padding-right:10px;
  }
</style>