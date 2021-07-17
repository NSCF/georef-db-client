<script>
  import {createEventDispatcher} from 'svelte'

  const dispatch = createEventDispatcher()

  //we need lots of flags because behaviour is different for each category of team members...
  export let datasetCreatedByID = null
  export let ids //these might be uids or email addresses
  export let profilesIndex
  export let georef = false //a flag for whether this is georeferencers or not
  export let invitees = false //a flag for whether this is past georeferencers
  export let admins = [] //these are uids


  console.log(ids)

  let re = new RegExp(/^[a-z0-9\.-_]*@[a-z0-9\.-_]*\.[a-z]+$/i) //simple email regex, hope it works!

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="inviteelist">
  {#if profilesIndex}
    {#each ids as id}
      <div class="inviteecontainer">
        {#if profilesIndex[id]} <!--id is a uid--> 
          <div style="padding-right:5px">{profilesIndex[id].formattedName}</div>
          {#if georef}
            {#if datasetCreatedByID != id}
              {#if admins && admins.includes(id)}
                <span class="material-icons" title="is admin">person</span>
              {:else}
                <span class="material-icons icon-input-icon" title="make admin" on:click='{_ => dispatch('make-admin', {uid:id, firstName: profilesIndex[id].firstName})}'>person_add_alt</span>
              {/if}
              <span class="material-icons icon-input-icon" title="remove" on:click='{_ => dispatch('remove-user', {uid: id, firstName: profilesIndex[id].firstName, list: 'georeferencers'})}'>clear</span>
            {:else}
              <span class="owner-icon">OWNER</span>
            {/if}
          {:else if invitees}
            <span class="material-icons icon-input-icon" title="remove" on:click='{_ => dispatch('remove-user', {uid: id, firstName: profilesIndex[id].firstName, list: 'invitees'})}'>clear</span>
          {:else}  <!--either past or declined, they can be reinvited-->
            <span class="material-icons icon-input-icon" title="re-invite" on:click='{_ => dispatch('reinvite', id)}'>mail_outline</span>
          {/if}
        {:else} <!--it's an email--> 
          <span style="padding-right:5px">{id}</span>
          <span class="material-icons icon-input-icon" title="remove" on:click='{_ => dispatch('remove-new', id)}'>clear</span>
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