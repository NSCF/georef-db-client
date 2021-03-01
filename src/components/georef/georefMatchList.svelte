<script>
import { dataStore } from './dataStore.js'
import {createEventDispatcher} from 'svelte'
import MatchListRow from './georefMatchListRow.svelte'
import Loader from '../loader.svelte'

</script>

<!-- ############################################## -->
<!-- HTML -->
<table>
  {#if $dataStore.georefIndex && Object.keys($dataStore.georefIndex).length}
    <thead>
      <tr>
        <th>locality</th><th>uncertainty</th><th>sources</th><th>protocol</th><th>datum</th><th>verified</th>
      </tr>
    </thead>
    {#each Object.keys($dataStore.georefIndex) as georefKey}
      <MatchListRow {georefKey}/>
    {/each}
  {:else}
    <Loader/>
  {/if}
</table>

<!-- ############################################## -->
<style>
table {
  width:100%;
  overflow-y: auto;
}

thead th {
  position: sticky;
  top: 0;
}

th {
  background-color: lightgray;
  text-align: center;
  border-bottom: 1px
}

</style>