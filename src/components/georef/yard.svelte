<!-- This a construction yard for building and testing components -->
<script>
import { geoRefs } from './georefStore.js'
import MatchList from './georefMatchList.svelte'
import Map from './georefMatchMap.svelte'

let list1 = [
  {
    locality: 'Kimberley',
    decimalLatitude: -28.742523, 
    decimalLongitude: 24.759596,
    radiusM: 20000, 
    clicked: false
  }, 
  {
    locality: 'near Kimberley',
    decimalLatitude: -28.742523, 
    decimalLongitude: 24.759596,
    radiusM: 20000, 
    clicked: false
  }, 
  {
    locality: 'Riverton, near Kimberley',
    decimalLatitude: -28.517959, 
    decimalLongitude: 24.699433,
    radiusM: 1000, 
    clicked: false
  }, 
  {
    locality: '5km N Kimberley',
    decimalLatitude: -28.696470,  
    decimalLongitude: 24.755523,
    radiusM: 2000, 
    clicked: false
  }

]

$geoRefs.georefArray = list1

</script>

<!-- ############################################## -->
<!-- HTML -->

<MatchList /> 
<Map />

<!-- ############################################## -->
<style>
</style>