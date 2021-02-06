<script>
//THIS IS FOR SHOWING INDIVIDUAL COMPONENTS. 
//INDIVIDUAL COMPONENTS ARE BUILT IN THE WORKSHOP, THEY ARE ASSEMBLED INTO BIGGER THINGS IN THE YARD
//each component needs a wrapper that sends down the relevant props, etc

import GeorefForm from './georefFormContainer.svelte'
import IconInput from './decimalCoordsInputContainer.svelte'
import Loader from '../Loader.svelte'
import CustomSearch from '../georef/customSearch.svelte'

const handleCustomGeorefs = ev => {
  let georefs = ev.detail
  console.log(georefs)
}

let customSearchString

const clearCustomSearch = _ => {
  console.log('clearning custom search')
  customSearchString = null
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="container">
  <div class="form-container" style="width:500px">
    <div class="form-flex">
      <GeorefForm/>
    </div>
    <div style="height:0;" />
  </div>
  <div>
    <CustomSearch bind:customSearchString elasticindex="southernafricater" on:custom-georefs={handleCustomGeorefs}/>
    <br/>
    <button on:click={clearCustomSearch}>Clear custom search</button>
  </div>
  <div>
    <Loader/>
  </div>
</div>

<!-- ############################################## -->
<style>
.form-container {
  display: flex;
  flex-direction: column;
  height:100%;
}

.form-flex {
  flex: 1 1 auto;
  overflow-y: auto;
}
</style>