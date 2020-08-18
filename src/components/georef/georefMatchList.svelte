<script>
import { geoRefs } from './georefStore.js'
import {createEventDispatcher} from 'svelte'
import MatchListRow from './georefMatchListRow.svelte'

const dispatch = createEventDispatcher();

</script>

<!-- ############################################## -->
<!-- HTML -->
<table>
{#if $geoRefs && $geoRefs.georefArray.length}
  <tr>
    {#each Object.keys($geoRefs.georefArray[0]) as key}
      <th>{key}</th>
     {/each}
  </tr>
  {#each $geoRefs.georefArray as geoRef, georefIndex}
    <MatchListRow {georefIndex} />
  {/each}
{/if}
</table>

<!-- ############################################## -->
<style>
th {
  background-color: whitesmoke;
  text-align: left;
}

tr:nth-child(even) {
  background-color: #f2f7ff;
}
tr:nth-child(odd) {
  background-color: #cfe1ff;
}
</style>