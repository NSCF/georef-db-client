<script>
import { onMount, onDestroy, createEventDispatcher } from 'svelte';
import { Firestore, FieldValue } from '../../firebase.js'

import { dataStore } from './dataStore.js'

const handleGroupLocClick = (ev, index) => {
  if(ev.ctrlKey){
    $dataStore.recordGroup.groupLocalities[index].selected = !$dataStore.recordGroup.groupLocalities[index].selected
  }
  else if (ev.shiftKey){
    let maxSelectedIndex
    for (let i = 0; i < $dataStore.recordGroup.groupLocalities.length; i++){
      if ($dataStore.recordGroup.groupLocalities[i].selected){
        maxSelectedIndex = i
      }
    }

    for (let g of $dataStore.recordGroup.groupLocalities){
      g.selected = false
    }

    if(maxSelectedIndex< index){
      [index, maxSelectedIndex] = [maxSelectedIndex, index]
    }

    if(index < maxSelectedIndex){
      for (let i = index; i <= maxSelectedIndex; i++){
        $dataStore.recordGroup.groupLocalities[i].selected = true
      }
    }
    else {
      $dataStore.recordGroup.groupLocalities[index].selected = true
    }

  }
  else {
    for (let g of $dataStore.recordGroup.groupLocalities){
      g.selected = false
    }
    $dataStore.recordGroup.groupLocalities[index].selected = true
  }
  
}

const copyLocality = async _ => {
  let selected = $dataStore.recordGroup.groupLocalities.filter(x=>x.selected)
  if(selected.length == 1){
    await navigator.clipboard.writeText(selected[0].loc)
  }
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="select-container">
  <h4>Locality strings</h4>
  {#if $dataStore.recordGroup}
    <p><i>Select the items below that represent the same locality and then choose and apply or create an appropriate georeference</i></p>
    <button style="float:right" title="copy locality" disabled={$dataStore.recordGroup.groupLocalities.filter(x=>x.selected).length != 1} on:click={copyLocality}><i class="material-icons md-dark">content_copy</i></button>
    <div class="div-select" >
      {#each $dataStore.recordGroup.groupLocalities as groupLoc, i}
        <p style="padding:10px" class="text-unselectable" class:selected="{groupLoc.selected}" hidden={groupLoc.georefID} on:click="{ev => handleGroupLocClick(ev,i)}">{groupLoc.loc}</p>
        {#if i < $dataStore.recordGroup.groupLocalities.length - 1}
          <hr hidden={groupLoc.georefID}/>
        {/if}
      {/each}
    </div>
  {:else}
    waiting for record group
  {/if}
</div>

<!-- ############################################## -->
<style>

.select-container {
  width:100%;
  height:100%;
  overflow:auto;
}

.div-select {
  width:100%;
  height: 100%;
  overflow:auto;
}

.selected {
  background-color:aliceblue 
}

.text-unselectable {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

</style>