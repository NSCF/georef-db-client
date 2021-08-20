<script>
  import {afterUpdate} from 'svelte'
  import { dataStore } from './dataStore.js'
  import MatchListRow from './georefMatchListRow.svelte'
  import Loader from '../loader.svelte'

  let filterBest = false
  let tableRows = 0
  let table

  afterUpdate(_ => {
    if(table) {
      let count = 0
      for (let i = 0; i < table.rows.length; i++) {
        if(getComputedStyle(table.rows[i]).display != 'none'){
          count++
        }
      }
      tableRows = count
    }
  })

</script>

<!-- ############################################## -->
<!-- HTML -->
<table bind:this={table}>
  {#if $dataStore.georefIndex && Object.keys($dataStore.georefIndex).length}
    <thead>
      <tr>
        <th style="width:20px">
          <span class="material-icons" class:icon-selected={filterBest} on:click={_ => filterBest = !filterBest}>filter_alt</span>
        </th>
        <th>locality</th>
        <th>uncertainty</th>
        <th>sources</th>
        <th>protocol</th>
        <th>datum</th>
        <th>verified</th>
      </tr>
    </thead>
    {#each Object.keys($dataStore.georefIndex) as georefKey}
      <MatchListRow {georefKey} {filterBest} on:georef-selected/>
    {/each}
    {#if tableRows == 1}
      <tr class="no-row-message">
        <td colspan="7">Check the filter top left if no georefs here</td>
      </tr>
    {/if}
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
.icon-selected {
  color: #0066ff;
}
.material-icons:hover {
  cursor: pointer;
}

.no-row-message {
  text-align: center;
}

</style>