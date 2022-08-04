<script>
//generate the ID and get the dataset details
import { nanoid } from "nanoid"
import Select from 'svelte-select'
import ProfileSelect from './profileSelect.svelte'
import DatasetTeam from './admin/datasetTeam.svelte'
import {Realtime} from '../firebase.js'
import { onMount, createEventDispatcher } from 'svelte';

import {validateCountries, getCountries} from '../dwcUtilities/validateCountries.js'

const dispatch = createEventDispatcher();

export let hasStateProvince
export let userProfile
export let datasetCountries

const domainOptions = [
  {value: 'TER', label:'terrestrial'},
  {value: 'FW', label:'freshwater'},
  {value: 'MAR', label: 'marine'}
]

let regionOptions
let regionInvalidCountries = []
let restCountries

let regionsSelectOptions = []

let contactName =  userProfile.firstName + ' ' + userProfile.lastName
let email = userProfile.email
let datasetName
let collectionCode
let region = undefined
let domain = undefined //terrestrial, freshwater, marine
let remarks = null

let datasetID = nanoid()

let profilesIndex = {}

let invitees = [] //existing users invited to georeference
let newInvitees = [] // emails without profiles invited to georeference
let allInvitees = [] //for the DatasetTeam component

$: userProfile, addNameAndEmail()
$: regionOptions, addRegionSelectOptions()
$: completed = contactName && email && datasetName && collectionCode && region && domain

$: if(region && domain && regionOptions && restCountries) {
  regionInvalidCountries = validateCountries(datasetCountries, restCountries, regionOptions[region.value])
}
else {
  regionInvalidCountries = []
}

onMount(async _ => {
  console.log('fetch georef regions')
  let snap = await Realtime.ref('settings/georefRegions').once('value')
  regionOptions = snap.val() //its an object where keys are regions and values are countries in those regions
  console.log('georef regions fetched')
  restCountries = await getCountries()
})

const addNameAndEmail = _ => {
  contactName = userProfile.firstName + ' ' + userProfile.lastName
  email =  userProfile.email
}

const addRegionSelectOptions = _ => {
  if(regionOptions && Object.keys(regionOptions).length){
    let opts = []
    for (let key of Object.keys(regionOptions)){
      opts.push({
        value: key, 
        label: key
      })
    }
    regionsSelectOptions = opts
  }
  else {
    regionsSelectOptions = []
  }
}

const handleProfileSelected = ev => {
  let item = ev.detail
  if (typeof item == 'string' && item.trim() && item.includes('invite')){
    let s = item.replace('invite', '').trim()
    if (!newInvitees.includes(s)) {
      newInvitees.push(s)
      newInvitees = newInvitees //svelte
    }
  }
  else { //it must be a profile
    if(!invitees.includes(item.uid)) {
      profilesIndex[item.uid] = item
      invitees.push(item.uid)
      invitees = invitees //svelte
    }
  }

  //the rerender
  profilesIndex = profilesIndex
  allInvitees = [...invitees, ...newInvitees]

}

const removeInvitee = ev => {
  let data = ev.detail
  let conf = confirm('Are you certain you want to remove', data.firstName, 'from the invitees?')
  if(conf) {
    let index = invitees.indexOf(x => x.uid == data.uid)
    invitees.splice(index, 1)
    invitees = invitees //svelte
    allInvitees = [...invitees, ...newInvitees]
  }
}

const removeNewInvitee = ev => {
  let email = ev.detail
  let index = newInvitees.indexOf(x => x == email)
  newInvitees.splice(index, 1)
  newInvitees = newInvitees
  allInvitees = [...invitees, ...newInvitees]
}

const handleSubmit = _ => {
  dispatch('register-dataset', {
      datasetDetails: {
        datasetID,
        contactName,
        email,
        createdByID: userProfile.uid,
        datasetName,
        collectionCode,
        region: region.value,
        domain: domain.value,
        hasStateProvince,
        georeferencers: [userProfile.uid], //the creator is automatically a georeferencer
        invitees: invitees, //we only want to store the uid, we don't need the whole profile
        newInvitees: newInvitees, //to simplify search later
        declinedInvitees: [],
        remarks
      }, 
      invalidCountries: regionInvalidCountries.map(x => x.country.toLowerCase()) //lowercase just to be safe
  })
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<h2>Please add the details for this dataset</h2>
<p>Note that only you and administrators will be able to see the dataset</p>
<form class="content">
  <label for="contactName">Contact Name</label>
  <input id="contactName" type="text" bind:value={contactName} />
  <label for="email">Your registered email address</label>
  <input id="email" type="text" bind:value={email} />
  <label for="collcode">Collection Code</label>
  <input id="collcode" type="text" bind:value={collectionCode} placeholder="NU, BOL, NMSA, etc"/>
  <label for="datasetname">Dataset name</label>
  <input id="datasetname" type="text" bind:value={datasetName} placeholder="e.g. NMSA crabs 2019" />
  <label for="region">Target region</label>
  <div style="margin-bottom:0.5em">
    <Select items={regionsSelectOptions} bind:value={region}/>
  </div>
  <label for="domain">Domain</label>
  <div style="margin-bottom:0.5em">
    <Select items={domainOptions} bind:value={domain}/>
  </div>
  {#if regionInvalidCountries.length}
  <p>The following countries in the dataset are not valid for this region and the records will be removed:
    <span>{regionInvalidCountries.map(x => x.ambiguous? `${x.country} (ambiguous)` : x.country).join(';')}</span>
  </p>
  {/if}
  <label for="invite">Invite georeferencers</label>
  <div>
    <ProfileSelect on:profile-selected={handleProfileSelected} />
  </div>
  <label for="invited">Invited</label>
  <DatasetTeam {profilesIndex} ids={allInvitees} invitees={true} 
  on:remove-new={removeNewInvitee}
  on:remove-user={removeInvitee} />
  <label for="remarks">Remarks</label>
  <textarea id="remarks" bind:value={remarks} />
</form>
<br/>
<button on:click={handleSubmit} disabled={!completed}>Submit</button>

<!-- ############################################## -->
<style>

h2 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
	}

.content {
    display: grid;
    grid-template-columns: 20% 40%;
    grid-column-gap: 10px;
  }
button {
  float: right;
}

label {
  text-align: right
}

</style>