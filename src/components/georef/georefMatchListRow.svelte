<script>
import { dataStore } from './dataStore.js'
import  {createEventDispatcher} from 'svelte'

const dispatch = createEventDispatcher()

export let georefKey
let rowindex = 0

$: if(georefKey){
  let keys = Object.keys($dataStore.georefIndex)
  rowindex = keys.indexOf(georefKey)
}

const qualityColor = _ => {
  let georef = $dataStore.georefIndex[georefKey]
  let qualityVars = ['uncertainty', 'datum', 'sources', 'protocol']

  let count = 0
  for (let qVar of qualityVars){
    if(Boolean(georef[qVar])) {
      count++
    }
  }

  if( count == 4) {
    return '#00CC66'
  }

  if (count >= 2) {
    return '#FF9966'
  }

  return '#D3D3D3'

}

const handleRowClick = _ => {
  dispatch('georef-selected', georefKey)
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<tr 
class:active="{$dataStore.georefIndex[georefKey].selected}" 
class:oddrow={rowindex % 2 && !$dataStore.georefIndex[georefKey].selected}
on:click={handleRowClick}>
  <td>
    <span class="material-icons" style="color:{qualityColor()};">stop</span>
  </td>
  <td>{$dataStore.georefIndex[georefKey].locality}</td>
  <td class='indicator'>
    {#if $dataStore.georefIndex[georefKey].uncertainty}
      <span class="material-icons">task_alt</span>
    {/if}
  </td>
  <td class='indicator'>
    {#if $dataStore.georefIndex[georefKey].sources}
      <span class="material-icons">task_alt</span>
    {/if}
  </td>
  <td class='indicator'>
    {#if $dataStore.georefIndex[georefKey].protocol}
      <span class="material-icons">task_alt</span>
    {/if}
  </td>
  <td class='indicator'>
    {#if $dataStore.georefIndex[georefKey].datum}
      <span class="material-icons">task_alt</span>
    {/if}  
  </td>
  <td class='indicator'>
    {#if $dataStore.georefIndex[georefKey].verified}
      <span class="material-icons">task_alt</span>
    {/if}
  </td>
</tr>

<!-- ############################################## -->
<style>

tr:hover {
  cursor: pointer;
}

.indicator {
  color: gray;
  text-align: center;
}

.active {
  background-color:  #bcd0ec;
}

.oddrow {
  background-color: #E8E8E8
}

</style>