<script>
//THIS IS FOR SHOWING INDIVIDUAL COMPONENTS. 
//INDIVIDUAL COMPONENTS ARE BUILT IN THE WORKSHOP, THEY ARE ASSEMBLED INTO BIGGER THINGS IN THE YARD
//each component needs a wrapper that sends down the relevant props, etc

import { Realtime as Firebase } from '../../firebase.js'

import GeorefForm from './georefFormContainer.svelte'
import CustomSearch from '../georef/customSearch.svelte'
import GeorefStat from './georefStatContainer.svelte'
import GeorefStats from './georefStatsContainer.svelte'

let stat = 12


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
<div>
  <GeorefStat stat={23} isGeoref={false} labelText={'georef count'} />
  <GeorefStat stat={stat} isGeoref={true} labelText={'record count'} />
  <GeorefStats {Firebase} userID={'iansuserid'} datasetID={'9jp8aFSneKuDjjfOuJhR'}/>
  <!-- <div class="stuff">
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
  </div> -->
</div>

<!-- ############################################## -->
<style>

.stuff {
  display:flex;
  align-items:center
}
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