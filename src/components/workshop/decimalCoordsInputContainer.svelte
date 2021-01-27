<script>
  import CoordsInput from '../georef/decimalCoordsInput.svelte'
  import Georef from '../georef/Georef.js'

  let georef = new Georef()



</script>

<!-- ############################################## -->
<!-- HTML -->
<CoordsInput bind:value={georef.decimalCoordinates} />

<!-- ############################################## -->
<style>
</style>