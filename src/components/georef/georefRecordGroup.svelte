<script>
import { onMount, onDestroy, createEventDispatcher } from 'svelte';
import { Firestore, FieldValue } from '../../firebase.js'

import { dataStore } from './dataStore.js'
import Loader from '../loader.svelte'

export let busy = false //to show a loader if busy

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



</script>

<!-- ############################################## -->
<!-- HTML -->
<div>
  {#if $dataStore.recordGroup && !busy}
    {#each $dataStore.recordGroup.groupLocalities as groupLoc, i}
      <p style="padding:10px" class="text-unselectable" class:selected="{groupLoc.selected}" hidden={groupLoc.georefID} on:click="{ev => handleGroupLocClick(ev,i)}">{groupLoc.loc}</p>
      {#if i < $dataStore.recordGroup.groupLocalities.length - 1}
        <hr hidden={groupLoc.georefID}/>
      {/if}
    {/each}
  {:else}
    <Loader />
  {/if}
</div>

<!-- ############################################## -->
<style>


.selected {
  background-color: #bcd0ec;
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