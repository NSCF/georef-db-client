<script>
  //a component for running custom searches against the georef database
  import { createEventDispatcher } from 'svelte'
  import { fetchCandidateGeorefs } from './georefFuncs.js'

  const dispatch = createEventDispatcher()

  export let customSearchString = null //prop so we can reset from outside
  export let elasticindex
  export let placeholder = "Search for a custom locality here"
  let customSearchSearching = false
  
  const getGeorefs = async _ => {
    if(customSearchString && elasticindex) {
      dispatch('custom-search-searching')
      customSearchSearching = true
      let obj = {loc:customSearchString}
      try{
        let georefs = await fetchCandidateGeorefs([obj], elasticindex, 20) //this usually works with groupLocalities
        dispatch('custom-georefs', georefs.georefIndex)
        customSearchSearching = false
      }
      catch(err){
        alert('there was an error fetching georefs: ' + err.message)
        customSearchSearching = false
      }
    }
    else {
      if(!customSearchString) {
        alert('Please add a suitable locality to search for')
      }
      else {
        console.log('elastic indiex is', elasticindex)
        alert('Please select a region and domain to search')
      }
    }
  }

  const handlePaste = _ => {
    if(navigator.clipboard.writeText){
      navigator.clipboard.readText().then(text => {
        customSearchString = text
      })
    }
    else {
      alert('this browser does not support programmatic paste')
    }
  }

  const clearCustomSearch = _ => {
    if(!customSearchSearching) {
      customSearchString = null
      dispatch('custom-search-cleared')
    }
  }   
</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="container" >
  <div class="icon-input-container">
    <input class="icon-input" 
    class:input-active={customSearchString && customSearchString.trim().length} 
    disabled={customSearchSearching} 
    placeholder={placeholder}
    on:keyup={e=>e.key==='Enter' && getGeorefs()}
    bind:value={customSearchString} />
    <span class="material-icons inline-icon icon-input-icon" style="right:30px" title="paste clipboard" on:click={handlePaste}>content_paste</span>
    <span class="material-icons icon-input-icon" style="right:5px" title="clear" on:click={clearCustomSearch}>clear</span>
  </div>
  <button 
    class="search-button" 
    disabled={!customSearchString || !customSearchString.trim().length  || customSearchSearching} 
    on:click={getGeorefs}>
    Search 
  </button>
</div>

<!-- ############################################## -->
<style>

.container {
  display:flex;
  width:100%;
}

.icon-input-container {
  flex: 1 1 auto;
  display: flex;
  position:relative;
  width: 100%;
  box-sizing: border-box;
}

.icon-input {
  flex: 1 1 auto;
  box-sizing: border-box;
  padding-right: 60px;
}

.input-active {
  outline:none;
  border-color:#bcd0ec;
  box-shadow:0 0 10px #8896aa;
}

.icon-input-icon {
  flex: 0 0 auto;
  position:absolute;
  bottom:13px; /* becuase the default bottom margin for an input is 8*/
  /* no right property, that must go into the inline style for the element */
  width:24px;
  height:24px;
  color: grey;
}

.icon-input-icon:hover {
  cursor: pointer;
  color: darkslategray;
}

.search-button {
  flex: 0 0 auto;
  margin-left: 5px;
  background-color:lightgray;
  border-radius: 2px;
}

.search-button:hover:enabled{
  cursor:pointer;
  background-color:gray;
  color:white;
}

.scaled {
  transform: scale(0.1)
}

</style>