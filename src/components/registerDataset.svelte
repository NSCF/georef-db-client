<script>
//generate the ID and get the dataset details
import shortid from 'shortid'
import Select from 'svelte-select'
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

const domainOptions = [
  {value: 'TER', label:'terrestrial'},
  {value: 'FW', label:'freshwater'},
  {value: 'MAR', label: 'marine'}
]

let contactName
let email
let datasetName
let collectionCode
let domain = undefined //terrestrial, freshwater, marine

let datasetID = shortid.generate()

$: completed = contactName && email && datasetName && collectionCode && domain

const handleSubmit = _ => {
  dispatch('register-dataset', {
      datasetID,
      contactName,
      email,
      datasetName,
      collectionCode,
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
  <label>Domain</label>
  <Select items={domainOptions} bind:selectedValue={domain}/>
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