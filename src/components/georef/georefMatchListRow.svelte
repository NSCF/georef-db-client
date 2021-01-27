<script>
import { dataStore } from './dataStore.js'

export let georefKey
let rowindex = 0

$: if(georefKey){
  let keys = Object.keys($dataStore.georefIndex)
  rowindex = keys.indexOf(georefKey)
}

const handleRowClick = _ => {
  
  if($dataStore.georefIndex[georefKey].selected){
    console.log('you already clicked me')
  }
  else {
    //we need an error check here
    let georef = $dataStore.georefIndex[georefKey]
    if(georef.decimalCoordinatesOkay){
      if($dataStore.selectedGeoref) {
        $dataStore.selectedGeoref.selected = false
      }
      georef.selected = true
      $dataStore.selectedGeoref = georef
    }
    else {
      let id = georef.georefID
      let locality = georef.locality
      let coords = georef.decimalCoordinates
      console.log(`error with coordinates for ${locality} with ID ${id} : ${coords}`) //these should ideally be deleted
      alert('there is an error with the coordinates for this georef, it will not be used. See console for details')
    }
    
  }
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