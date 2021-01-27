<script>
//THIS IS FOR SHOWING INDIVIDUAL COMPONENTS. 
//INDIVIDUAL COMPONENTS ARE BUILT IN THE WORKSHOP, THEY ARE ASSEMBLED INTO BIGGER THINGS IN THE YARD
//each component needs a wrapper that sends down the relevant props, etc

import GeorefForm from './georefFormContainer.svelte'
import IconInput from './decimalCoordsInputContainer.svelte'
import Loader from '../Loader.svelte'

</script>

<!-- ############################################## -->
<!-- HTML -->
<div style="width:500px">
  <GeorefForm/>
</div>

<div>
  <Loader/>
</div>

<!-- ############################################## -->
<style>
</style>