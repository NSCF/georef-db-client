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
  <td>{$dataStore.georefIndex[georefKey].locality}</td>
  <td>{$dataStore.georefIndex[georefKey].uncertainty ? 'yes': ''}</td>
  <td>{$dataStore.georefIndex[georefKey].sources ? 'yes': ''}</td>
  <td>{$dataStore.georefIndex[georefKey].protocol ? 'yes': ''}</td>
  <td>{$dataStore.georefIndex[georefKey].datum ? 'yes': ''}</td>
  <td>{$dataStore.georefIndex[georefKey].verified ? 'yes': ''}</td>
</tr>

<!-- ############################################## -->
<style>

.active {
  background-color:  #bcd0ec;
}

.oddrow {
  background-color: #E8E8E8
}

</style>