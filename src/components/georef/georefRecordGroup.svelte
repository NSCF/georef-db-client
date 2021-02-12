<script>
import { onMount, onDestroy, createEventDispatcher } from 'svelte';
import { Firestore, FieldValue } from '../../firebase.js'

import { dataStore } from './dataStore.js'
import Loader from '../loader.svelte'

const dispatch = createEventDispatcher()

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

const copyLocality = loc => {
  if(navigator.clipboard.writeText){
    navigator.clipboard.writeText(loc).then( _ => {
      dispatch('locality-copied')
    })
  }
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div>
  {#if $dataStore.recordGroup && !busy}
    {#each $dataStore.recordGroup.groupLocalities as groupLoc, i}
      <div hidden={groupLoc.georefID}>
        <div class="container">
          <p class="grouptext text-unselectable" class:selected="{groupLoc.selected}"  on:click="{ev => handleGroupLocClick(ev,i)}">{groupLoc.loc}</p>
          <p class="material-icons inline-icon" style="margin-right:5px; margin-left:5px" title="copy locality string" on:click={copyLocality(groupLoc.loc)}>content_copy</p>
        </div>
      </div>
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

.container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.container:not(:first-child):before {
    content: "";
    border-top: 1px solid grey
}

.grouptext {
  flex: 1 1 auto;
  padding:10px;
  padding-right: 30px;
}

.text-unselectable {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.inline-icon {
  width:24px;
  height:24px;
  color: grey;
}

.inline-icon:hover {
  color:#404040;
  border-color:	#404040;
  cursor: pointer;
}

</style>