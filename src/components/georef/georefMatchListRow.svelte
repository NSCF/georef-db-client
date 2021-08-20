<script>
  import { dataStore } from './dataStore.js'
  import  {onMount, createEventDispatcher} from 'svelte'

  const dispatch = createEventDispatcher()

  export let filterBest
  export let georefKey

  let rowindex = 0
  let qualityColor
  let qualityVal
  let showThisRow = true

  //this is basically the onMount...
  $: if(georefKey){
    if($dataStore.georefIndex) {
      let keys = Object.keys($dataStore.georefIndex)
      rowindex = keys.indexOf(georefKey)
      qualityVal = getQualityVal()
      qualityColor = getQualityColor()
    }
  }

  $: filterBest, hidden()

  const getQualityVal = _ => {
    let georef = $dataStore.georefIndex[georefKey]
    let qualityVars = ['uncertainty', 'datum', 'sources', 'protocol']

    let count = 0
    for (let qVar of qualityVars){
      if(qVar == 'uncertainty') {
        if(georef[qVar] && georef[qVar] > 0) {
          count++
        }
      }
      else {
        if(georef[qVar] && georef[qVar].trim()) {
          count++
        }
      }
    }

    return count
  }

  const getQualityColor = _ => {
    let georef = $dataStore.georefIndex[georefKey]

    if(georef.ambiguous) {
      if(georef.verified) {
        return '#0066ff' //blue
      }
      else {
        return '#00CC66' //green
      }
    }

    if(qualityVal == 4) {
      if(georef.verified) {
        return '#0066ff' //blue
      }
      //else
      return '#00CC66' //green
    }

    if (qualityVal >= 2) {
      return '#FF9966' //orange
    }

    return '#D3D3D3' //grey

  }

  const hidden = _ => {
    if ($dataStore.georefIndex && $dataStore.georefIndex[georefKey]) {
      let georef = $dataStore.georefIndex[georefKey]
      if(filterBest) {

        if(georef.ambiguous) {
          showThisRow = true
          return
        }

        if(qualityVal == 4) {
          showThisRow = true
          return 
        }

        //else
        showThisRow = false
      }
      else {
        showThisRow = true
      }
    }
  }

  const handleRowClick = _ => {
    dispatch('georef-selected', georefKey)
  }

</script>

<!-- ############################################## -->
<!-- HTML -->

<tr 
class:active="{$dataStore.georefIndex && $dataStore.georefIndex[georefKey].selected}" 
class:oddrow={$dataStore.georefIndex && rowindex % 2 && !$dataStore.georefIndex[georefKey].selected}
class:hidden={!showThisRow}
on:click={handleRowClick}>
  {#if $dataStore.georefIndex}
    <td>
      <span class="material-icons" style="color:{qualityColor};">stop</span>
    </td>
    <td>{$dataStore.georefIndex[georefKey].locality}</td>
    <td class='indicator'>
      {#if $dataStore.georefIndex[georefKey].uncertainty}
        <span class="material-icons">task_alt</span>
      {/if}
    </td>
    <td class='indicator'>
      {#if $dataStore.georefIndex[georefKey].sources}
        <span class="material-icons">task_alt</span>
      {/if}
    </td>
    <td class='indicator'>
      {#if $dataStore.georefIndex[georefKey].protocol && $dataStore.georefIndex[georefKey].protocol.toLowerCase().trim() != 'unspecified'}
        <span class="material-icons">task_alt</span>
      {/if}
    </td>
    <td class='indicator'>
      {#if $dataStore.georefIndex[georefKey].datum}
        <span class="material-icons">task_alt</span>
      {/if}  
    </td>
    <td class='indicator'>
      {#if $dataStore.georefIndex[georefKey].verified}
        <span class="material-icons">task_alt</span>
      {/if}
    </td>
  {/if}
</tr>

<!-- ############################################## -->
<style>

tr:hover {
  cursor: pointer;
}

.indicator {
  color: gray;
  text-align: center;
}

.active {
  background-color:  #bcd0ec;
}

.oddrow {
  background-color: #E8E8E8
}

.hidden {
  display: none;
}

</style>