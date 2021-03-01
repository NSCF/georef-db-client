<script>
//generate the ID and get the dataset details
import {nanoid} from "nanoid/nanoid.js"
import Select from 'svelte-select'
import ProfileSelect from './profileSelect.svelte'
import {Realtime} from '../firebase.js'
import { onMount, createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

export let userProfile

const domainOptions = [
  {value: 'TER', label:'terrestrial'},
  {value: 'FW', label:'freshwater'},
  {value: 'MAR', label: 'marine'}
]

let regionOptions

let regionsSelectOptions = []

let contactName =  userProfile.firstName + ' ' + userProfile.lastName
let email = userProfile.email
let datasetName
let collectionCode
let region = undefined
let domain = undefined //terrestrial, freshwater, marine
let remarks

let datasetID = nanoid()

let invitees = [] //existing users invited to georeference
let newInvitees = [] // emails without profiles invited to georeference

$: userProfile, addNameAndEmail()
$: regionOptions, addRegionSelectOptions()
$: completed = contactName && email && datasetName && collectionCode && region && domain

onMount(async _ => {
  console.log('fetch georef regions')
  let snap = await Realtime.ref('settings/georefRegions').once('value')
  regionOptions = snap.val() //its an object where keys are regions and values are countries in those regions
  console.log('georef regions fetched')
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
    newInvitees.push(s)
    newInvitees = newInvitees //svelte
  }
  else { //it must be a profile
    invitees.push(item)
    invitees = invitees //svelte
  }
}

const removeInvitee = uid => {
  let index = invitees.indexOf(x => x.uid == uid)
  invitees.splice(index, 1)
  invitees = invitees //svelte
}

const removeNewInvitee = email => {
  let index = newInvitees.indexOf(x => x == email)
  newInvitees.splice(index, 1)
  newInvitees = newInvitees
}

const handleSubmit = _ => {
  dispatch('register-dataset', {
      datasetID,
      contactName,
      email,
      createdByID: userProfile.uid,
      datasetName,
      collectionCode,
      region: region.value,
      domain: domain.value,
      georeferencers: [userProfile.uid], //the creator is automatically a georeferencer
      invitees: invitees.map(x=>x.uid), //we only want to store the uid, we don't need the whole profile
      newInvitees: newInvitees.map(x => x.toLowerCase()), //to simplify search later
      declinedInvitees: [],
      remarks
  })
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<h2>Please add the details for this dataset</h2>
<p>Note that only you and administrators will be able to see the dataset</p>
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
  <div style="margin-bottom:0.5em">
    <Select items={regionsSelectOptions} bind:selectedValue={region}/>
  </div>
  <label>Domain</label>
  <div style="margin-bottom:0.5em">
    <Select items={domainOptions} bind:selectedValue={domain}/>
  </div>
  <label>Invite georeferencers</label>
  <div>
    <ProfileSelect on:profile-selected={handleProfileSelected} />
  </div>
  <label>Invited</label>
  <div>
    <div class="inviteelist">
      {#each invitees as profile}
        <div class="inviteecontainer">
          <span>{profile.formattedName + " (" + profile.email + ")"}</span>
          <span class="material-icons icon-input-icon" title="remove" on:click='{_ => removeInvitee(profile.uid)}'>clear</span>
        </div>
      {/each}
      {#each newInvitees as email}
        <div class="inviteecontainer">
          <span>{email}</span>
          <span class="material-icons icon-input-icon" title="remove" on:click='{_ => removeNewInvitee(email)}'>clear</span>
        </div>
      {/each}
    </div>
  </div>
  <label>Remarks</label>
  <textarea bind:value={remarks} />
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

.inviteelist {
  display:flex;
  width: 100%;
  height:80px;
  background-color: white;
  border-radius: 2px;
  border: 1px solid gainsboro;
  margin-bottom:5px;
}


.icon-input-icon {
  width:24px;
  height:24px;
  color: white;
}

.icon-input-icon:hover {
  cursor: pointer;
}

.inviteecontainer {
  display:flex;
  align-items: center;
  height:1em;
  color:white;
  background-color: grey;
  border-radius: 4px;
  border: 1px solid rgb(70, 69, 69);
  padding: 4px;
  margin: 2px;
}
</style>