<script>

  import {onMount, createEventDispatcher} from 'svelte'
  import Select from 'svelte-select';

  const dispatch = createEventDispatcher()

  export let hasStateProvince
  export let countryProvs
  export let disabled

  let countriesOptions = [] //array, we need to generate this with onMount so we can add 'all'
  let selectedCountry = null
  let stateProvOptions = []
  let selectedStateProv = null

  let provincChangeFromCountryChange = false //we use this to suppress dispatches from stateProvince change handler when country changes

  onMount(() => {
    //if we have countryProvs, we can set the options
    if(countryProvs) {
      setCountryAndStateOptions()
    }
  })

  const setCountryAndStateOptions = _ => {

    let countries = Object.keys(countryProvs)
    countries.sort()
    if(countries.length > 1) {
      countries.unshift('all')
    }

    countriesOptions = countries.map(x => ({value: x, label: x}))
    selectedCountry = countriesOptions[0]

    //if we have only one country, we can show the first option for it's stateProvinces
    if(hasStateProvince) {
      if(selectedCountry.value != 'all') {
        stateProvOptions = countryProvs[selectedCountry.value].map(x => ({value: x, label: x}))
        selectedStateProv = stateProvOptions[0]
      }
      else {
        stateProvOptions = []
        selectedStateProv = undefined
      }
    }

    dispatchAdmins()
    
  }

  const handleSelectedCountryChanged = async _ => {

    if(hasStateProvince) {
      provincChangeFromCountryChange = true
      if(selectedCountry.value == 'all') {
        stateProvOptions = []
        selectedStateProv = undefined
      }
      else {
        stateProvOptions = countryProvs[selectedCountry.value].map(x => ({value: x, label: x}))
        selectedStateProv = stateProvOptions[0]
      }
    }

    dispatchAdmins()
   
  }

  const handleSelectedStateProvChanged = async _ => {

    //we only send this out if it's from a change on the countryProvs select!
    if(provincChangeFromCountryChange) {
      provincChangeFromCountryChange =  false //now we can make changes from the select
    }
    else {
      dispatchAdmins()
    }
    
  }

  const dispatchAdmins = _ => {
    let selectedAdmins = {
      country: selectedCountry.value
    }
    if(selectedStateProv) {
      selectedAdmins.stateProvince = selectedStateProv.value
    }
    else {
      selectedAdmins.stateProvince = null
    }
    
    dispatch('admin-selected', selectedAdmins)
  }

</script>

<!-- ############################################## -->
<!-- HTML -->
<div>
  <div class="inline-select">
    <span class="label">country</span>
    <div class="inline-select-fill">
      <Select 
        items={countriesOptions} 
        isClearable={false} 
        isDisabled={disabled}
        bind:value={selectedCountry} 
        on:select={handleSelectedCountryChanged}/>
    </div>
  </div>
  {#if hasStateProvince}
    <div class="inline-select" style="margin-top:5px;">
      <span class="label">stateProvince</span>
      <div class="inline-select-fill" style="--disabledBorderColor:darkgrey">
        <Select 
          items={stateProvOptions} 
          placeholder={null} 
          isClearable={false} 
          bind:value={selectedStateProv} 
          isDisabled={disabled || stateProvOptions.length <= 1} 
          on:select={handleSelectedStateProvChanged} />
      </div>
    </div>
  {/if}
</div>

<!-- ############################################## -->
<style>
  .label {
    color:grey;
    font-weight: bolder;
  }

  .inline-select {
    display: flex;
    width:100%;
    align-items: center;
  }

  .inline-select-fill {
    margin-left:5px;
    flex: 1
  }

</style>