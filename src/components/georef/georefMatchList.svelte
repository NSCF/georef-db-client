<script>
import { dataStore } from './dataStore.js'
import {createEventDispatcher} from 'svelte'
import MatchListRow from './georefMatchListRow.svelte'

</script>

<!-- ############################################## -->
<!-- HTML -->
<table>
{#if $dataStore && $dataStore.georefArray.length}
  <tr>
    {#each Object.keys($dataStore.georefArray[0]) as key}
      <th>{key}</th>
     {/each}
  </tr>
  {#each $dataStore.georefArray as geoRef, georefIndex}
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