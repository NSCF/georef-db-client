<!-- This a construction yard for building and testing components -->
<script>
import GeorefForm from './georefForm.svelte'

let list1 = [
  {
    id: 12345,
    locality: 'Kimberley',
    decimalLatitude: -28.742523, 
    decimalLongitude: 24.759596,
    sources: 'one source | another source',
    accuracy: 20,
    accuracyUnit: 'km',
    clicked: false
  }, 
  {
    locality: 'near Kimberley',
    decimalLatitude: -28.742523, 
    decimalLongitude: 24.759596,
    accuracy: 20,
    accuracyUnit: 'km',
    clicked: false
  }, 
  {
    locality: 'Riverton, near Kimberley',
    decimalLatitude: -28.517959, 
    decimalLongitude: 24.699433,
    radiusM: 1000, 
    accuracy: 1000,
    accuracyUnit: 'm',
    clicked: false
  }, 
  {
    locality: '5km N Kimberley',
    decimalLatitude: -28.696470,  
    decimalLongitude: 24.755523,
    radiusM: 2000, 
    accuracy: 2,
    accuracyUnit: 'km',
    clicked: false
  }

]

</script>

<!-- ############################################## -->
<!-- HTML -->
<GeorefForm geoRef={list1[0]} /> 
<!-- ############################################## -->
<style>
</style>