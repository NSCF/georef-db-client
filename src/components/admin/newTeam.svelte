<script>
  import onlyUnique from '../../generalUtilities/onlyUnique'
  import { Firestore } from "../../firebase";
  import { createEventDispatcher } from "svelte";
  import ProfileSelect from "../profileSelect.svelte";
  import TeamList from './teamList.svelte';

  const dispatch = createEventDispatcher()

  export let userProfile = null //the user that creates the team is automatically an admin

  const formTeam = {
    name: null,
    teamAdmins: [],
    teamAdminUIDs: [],
    teamMembers: [],
    teamMemberUIDs: [],
    allProfiles: null, //null here but used later
    created: null,
    createdBy: null
  }

  const handleAdminSelected = ev => {
    const adminProfile = ev.detail
    formTeam.teamAdmins = [...formTeam.teamAdmins, adminProfile].filter(onlyUnique)
  }

  const handleMemberSelected = ev => {
    const memberProfile = ev.detail
    formTeam.teamMembers = [...formTeam.teamMembers, memberProfile].filter(onlyUnique)
  }

  const handleSubmit = async _ => {
    
    if (!formTeam.name || !formTeam.name.trim() || formTeam.name.length < 3) {
      alert('please add a team name')
      return
    }
    
    //we can only create a team if we have members
    if (!formTeam.teamMembers.length) {
      alert('please select team members before proceeding')
      return
    }
    
    formTeam.name = formTeam.name.trim()
    formTeam.teamMemberUIDs = formTeam.teamMembers.map(profile => profile.uid)
    formTeam.teamAdminUIDs = formTeam.teamAdmins.map(profile => profile.uid)
    formTeam.teamAdminUIDs.push(userProfile.uid) //add this user

    formTeam.created = Date.now()
    formTeam.createdBy = userProfile.uid

    delete formTeam.teamMembers
    delete formTeam.teamAdmins

    try {
      await Firestore.collection('teams').add(formTeam)
      dispatch('team-created')
    }
    catch(err) {
      console.error(err)
      alert('error saving team:',  + err.message)
      return
    }

  }

  const handleRemoveUser = ev => {

    const profile = ev.detail
    
    //We can do the below because the profiles come from an api and so are different objects...
    const adminIndex = formTeam.teamAdmins.indexOf(profile)
    if (adminIndex >= 0) {
      formTeam.teamAdmins.splice(adminIndex, 1)
      formTeam.teamAdmins = formTeam.teamAdmins
    }

    const memberIndex = formTeam.teamMembers.indexOf(profile)
    if(memberIndex >= 0) {
      formTeam.teamMembers.splice(memberIndex, 1)
      formTeam.teamMembers = formTeam.teamMembers
    }
  }

</script>

<form style="margin-top: 5em; width: 50%; margin-left: auto; margin-right:auto;">
  <label for="team-name">Team name</label>
  <input type="text" id="team-name" style="width: 400px;" bind:value={formTeam.name}>
  <div>
    <h4 style="margin-bottom:0">Select team admins</h4>
    <ProfileSelect on:profile-selected={handleAdminSelected}/>
  </div>
  <TeamList {userProfile} teamProfiles={formTeam.teamAdmins} on:remove-user={handleRemoveUser}/>
  <div>
    <h4 style="margin-bottom:0">Select team members</h4>
    <ProfileSelect on:profile-selected={handleMemberSelected}/>
  </div>
  <TeamList {userProfile} teamProfiles={formTeam.teamMembers} on:remove-user={handleRemoveUser}/>

  <button on:click|preventDefault={handleSubmit}>Create team</button>
</form>
