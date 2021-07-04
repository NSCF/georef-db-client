<script>

  import {createEventDispatcher} from 'svelte'
  import QCGeoref from './qcGeoref.svelte'

  const dispatch = createEventDispatcher()
  
  export let profile
  export let dataset

  let selectedTab = 'georefs'

  const handleBackToDatasets = _ => {
    dispatch('to-datasets')
  }

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="qc-container"> <!--just in case-->
  <div class="tools-container">
    <button class="dataset-tool" title="back to datasets" on:click={handleBackToDatasets}>
      <span class="material-icons">list</span>
    </button>
  </div>
  <div>
    <h4>Quality control for {dataset.datasetName}</h4>
    <div class="tabs">
      <div class="tab" class:tab-selected={selectedTab == 'georefs'} on:click='{_ => selectedTab = 'georefs'}'>
        Georeferences
      </div>
      <div class="tab" class:tab-selected={selectedTab == 'localitygroups'} on:click='{_ => selectedTab = 'localitygroups'}'>
        Locality groups
      </div>
      <div class="tab" class:tab-selected={selectedTab == 'species'} on:click='{_ => selectedTab = 'species'}'>
        Species
      </div>
    </div>
  </div>
  <div class="working-area">
    {#if selectedTab == 'georefs'}
      <QCGeoref {profile} {dataset} />
    {:else if selectedTab == 'localitygroups'}
      <div>nothing here yet</div>
    {:else}
      <div>nothing here yet either</div>
    {/if}
  </div>
</div>

<!-- ############################################## -->
<style>
  .qc-container {
    position:relative;
    display:flex;
    flex-direction:column;
    height: 100%;
    width:100%;
  }

  .tabs {
    display: grid;
    grid-template-columns: auto auto auto;
    width: 600px;
    height: 40px;
  }

  .tab {
    text-align:center;
    border-bottom: 5px solid #99ccff;
  }
  .tab:hover {
    cursor:pointer
  }

  .tab-selected {
    background-color:#b6d8fc;
    font-weight:500;
  }

  .working-area {
    flex: 1;
    overflow-y:auto; /*absolutely no idea why this works but it does */
    width:100%;
  }

  .tools-container {
    position:absolute;
    top:10px;
    right:10px;
  }

  .tools-container::after {
    content: "";
    display: block; 
    clear: both;
  }

  .dataset-tool {
    float:right;
    margin-left:5px;
    padding-bottom:0;
    background-color: lightgray;
  }

  .dataset-tool:hover {
    cursor:pointer;
    background-color:grey;
    color:white;
  }
</style>