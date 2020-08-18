<script>
import { geoRefs } from './georefStore.js'

export let georefIndex


const handleRowClick = _ => {
  
  if($geoRefs.georefArray[georefIndex].clicked){
    console.log('you already clicked me')
  }
  else {
    if($geoRefs.currentGeoref) {
      $geoRefs.currentGeoref.clicked = false
    }
    $geoRefs.georefArray[georefIndex].clicked = true
    $geoRefs.currentGeoref = $geoRefs.georefArray[georefIndex]

  }
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<tr class:active="{$geoRefs.georefArray[georefIndex].clicked}" on:click={handleRowClick}>
  {#each Object.keys($geoRefs.georefArray[georefIndex]) as key}
    <td>{$geoRefs.georefArray[georefIndex][key]}</td>
  {/each}
</tr>

<!-- ############################################## -->
<style>

.active {
  background-color: blue;
  color: whitesmoke;
}
</style>