<script>
import { dataStore } from './dataStore.js'
import {createEventDispatcher} from 'svelte'
import MatchListRow from './georefMatchListRow.svelte'

</script>

<!-- ############################################## -->
<!-- HTML -->

<table>
  <h4>Candidate georeferences</h4>
  {#if $dataStore.georefIndex && Object.keys($dataStore.georefIndex).length}
    <tr>
      <th>locality</th><th>uncertainty</th><th>sources</th><th>protocol</th><th>verified</th>
    </tr>
    {#each Object.keys($dataStore.georefIndex) as georefKey}
      <MatchListRow {georefKey} />
    {/each}
  {:else}
    waiting for georefs
  {/if}
</table>

<!-- ############################################## -->
<style>
table {
  width:100%;
  max-height: 100%;
  overflow:auto;
}

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