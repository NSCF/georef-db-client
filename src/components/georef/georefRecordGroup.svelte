<script>
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();

export let groupLocs

let selectedLocs = []

$:selectedLocs, dispatch('selected-locs', {selectedLocs})

</script>

<!-- ############################################## -->
<!-- HTML -->
<h4>Locality strings</h4>
<p><i>Select the items below that represent the same locality</i></p>
{#if groupLocs && groupLocs.length}
  <select multiple bind:value={selectedLocs}>
    {#each groupLocs as locRecord}
      <option value={locRecord}>
        {locRecord.loc}
      </option>
    {/each}
  </select>
{:else}
  <p>One moment please...</p>
{/if}

<!-- ############################################## -->
<style>

select {
  width:100%;
  height:100%
}


</style>