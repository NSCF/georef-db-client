<script>
  import onlyUnique from "../../generalUtilities/onlyUnique";
  import { Firestore } from "../../firebase";
  import { onMount, createEventDispatcher } from "svelte";
  import TeamStatsChart from "./teamStatsChart.svelte";

  export let userProfile

  const dispatch = createEventDispatcher()
  let userTeams = []
  let selectedIndex = 0
  let selectedTeamProfiles = null
  let selectPlaceholder = 'One moment please...'

  onMount(async _ => {

    //fetch teams
    try {
      const querySnap = await Firestore.collection('teams').where('teamAdminUIDs', 'array-contains', userProfile.uid).get()
      const teams = querySnap.docs.map(snap => snap.data())

      //for each team get the profiles
      for (const team of teams) {
        const allUIDs = [...team.teamAdminUIDs, ...team.teamMemberUIDs].filter(onlyUnique)

        try {
          const querySnap = await Firestore.collection('userProfiles').where('uid', 'in', allUIDs).get()
          team.allProfiles = querySnap.docs.map(snap => snap.data())
          team.allProfiles.sort(sortProfiles)
        }
        catch(err) {
          console.error(err)
          alert('error fetching team member profiles: ' + err.message)
          return
        }
      }

      userTeams = teams //make it available for the UI
      selectPlaceholder = 'Select a team...'

    }
    catch(err) {
      console.error(err)
      alert('error fetching teams: ' + err.message)
      return
    }
    
  })

  const handleTeamSelected = _ => {
    if (selectedIndex === "") {
      selectedTeamProfiles = null
    }
    else {
      selectedTeamProfiles = userTeams[selectedIndex].allProfiles
    }
  }

  const sortProfiles = (a, b) => {
    if (a.firstName < b.firstName) {
      return -1
    }
    else {
      return 1
    }
  }

</script>

<!-- TODO add picklist of teams -->
<div style="display: flex; flex-direction:column; height: 100%">
  <div style="padding-bottom: 2em; padding-top: 5em; ">
    <select  id="team-select" style="width: 400px;" bind:value={selectedIndex} on:change={handleTeamSelected}>
      <option value="">{selectPlaceholder}</option>
      {#each userTeams as team, index}
      <option value={index}>{team.name}</option>
      {/each}
    </select>
    <button style="display:block" on:click={_ => dispatch('new-team')}>Add new team</button>
  </div>
  {#if selectedTeamProfiles}
  <div style="width: 50%">
    <TeamStatsChart teamProfiles={selectedTeamProfiles} />
  </div>
  {/if}
</div>

