<script>
import { dataStore } from './dataStore.js'

export let georefKey


const handleRowClick = _ => {
  
  if($dataStore.georefIndex[georefKey].selected){
    console.log('you already clicked me')
  }
  else {
    if($dataStore.selectedGeoref) {
      $dataStore.selectedGeoref.selected = false
    }
    $dataStore.georefIndex[georefKey].selected = true
    $dataStore.selectedGeoref = $dataStore.georefIndex[georefKey]
  }
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<tr class:active="{$dataStore.georefIndex[georefKey].selected}" on:click={handleRowClick}>
  <td>{$dataStore.georefIndex[georefKey].locality}</td>
  <td>{$dataStore.georefIndex[georefKey].uncertainty ? 'yes': ''}</td>
  <td>{$dataStore.georefIndex[georefKey].sources ? 'yes': ''}</td>
  <td>{$dataStore.georefIndex[georefKey].protocol ? 'yes': ''}</td>
  <td>{$dataStore.georefIndex[georefKey].verified ? 'yes': ''}</td>
</tr>

<!-- ############################################## -->
<style>

.active {
  background-color: blue;
  color: whitesmoke;
}
</style>