<script>

  //This was derived from datasetTeam, intended here for lists of users on teams

  import {createEventDispatcher} from 'svelte'
  const dispatch = createEventDispatcher()

  export let userProfile
  export let teamProfiles

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="inviteelist">
  {#if teamProfiles}
    {#each teamProfiles as profile}
      <div class="inviteecontainer">
        <div style="padding-right:5px">{profile.formattedName}</div>
        {#if userProfile.uid != profile.uid}
        <span class="material-icons icon-input-icon" title="remove" on:click='{_ => dispatch('remove-user', profile)}'>clear</span>
        {:else}
        <span class="owner-icon">OWNER</span>
        {/if}
      </div>
    {/each}
  {/if}
</div>
<!-- ############################################## -->
<style>
  .inviteelist {
    display:flex;
    flex-wrap: wrap;
    width: 100%;
    background-color: white;
    border-radius: 2px;
    border: 1px solid gainsboro;
    margin-bottom:5px;
  }

  .inviteecontainer {
    display:flex;
    align-items: center;
    color:white;
    background-color: grey;
    border-radius: 4px;
    border: 1px solid rgb(70, 69, 69);
    padding: 4px;
    margin: 2px;
  }

  .owner-icon {
    font-size: 50%;
    font-weight: 500;
    font-stretch: condensed;
    text-transform: capitalize;
  }

  .icon-input-icon {
    width:24px;
    height:24px;
    color: white;
  }

  .icon-input-icon:hover {
    cursor: pointer;
  }
</style>