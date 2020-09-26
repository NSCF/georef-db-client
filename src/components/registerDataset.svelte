<script>
//generate the ID and get the dataset details
import shortid from 'shortid'
import Select from 'svelte-select'
import {Realtime} from '../firebase.js'
import { onMount, createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

const domainOptions = [
  {value: 'TER', label:'terrestrial'},
  {value: 'FW', label:'freshwater'},
  {value: 'MAR', label: 'marine'}
]

let regionOptions

let regionsSelectOptions

let contactName
let email
let datasetName
let collectionCode
let region = undefined
let domain = undefined //terrestrial, freshwater, marine
let remarks

let datasetID = shortid.generate()

$: regionOptions, addRegionSelectOptions()
$: completed = contactName && email && datasetName && collectionCode && region && domain

onMount(async _ => {
  let snap = await Realtime.ref('settings/georefRegions').once('value')
  regionOptions = snap.val() //its an object where keys are regions and values are countries in those regions
})

const addRegionSelectOptions = _ => {
  if(regionOptions && Object.keys(regionOptions).length){
    let opts = []
    for (let key of Object.keys(regionOptions)){
      opts.push({
        value: key, 
        label: key
      })
    }
    regionsSelectOptions =  opts
  }
  else {
    regionsSelectOptions = null
  }
}

const handleSubmit = _ => {
  dispatch('register-dataset', {
      datasetID,
      contactName,
      email,
      datasetName,
      collectionCode,
      region: region.value,
      domain: domain.value
  })
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<form class="content">
  <label>Contact Name</label>
  <input type="text" bind:value={contactName} />
  <label>Your registered email address</label>
  <input type="text" bind:value={email} />
  <label>Collection Code</label>
  <input type="text" bind:value={collectionCode} placeholder="NU, BOL, NMSA, etc"/>
  <label>Dataset name</label>
  <input type="text" bind:value={datasetName} placeholder="e.g. NMSA crabs 2019" />
  <label>Target region</label>
  <Select items={regionsSelectOptions} bind:selectedValue={region}/>
  <label>Domain</label>
  <Select items={domainOptions} bind:selectedValue={domain}/>
  <label>Remarks</label>
  <textarea bind:value={remarks} />
</form>
<br/>
<button on:click={handleSubmit} disabled={!completed}>Submit</button>

<!-- ############################################## -->
<style>

.content {
    display: grid;
    grid-template-columns: 20% 40%;
    grid-column-gap: 10px;
  }
button {
  float: right;
}

</style>