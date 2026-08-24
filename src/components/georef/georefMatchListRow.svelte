<script>
  import { dataStore } from './dataStore.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let filterBest;
  export let georefKey;

  let rowindex = 0;
  let qualityColor;
  let qualityVal;
  let showThisRow = true;

  //this is basically the onMount...
  $: if (georefKey) {
    if ($dataStore.georefIndex) {
      let keys = Object.keys($dataStore.georefIndex);
      rowindex = keys.indexOf(georefKey);
      qualityVal = getQualityVal();
      qualityColor = getQualityColor();
    }
  }

  $: filterBest, hidden();

  $: selectedLocalities =
    $dataStore.recordGroup && $dataStore.recordGroup.groupLocalities
      ? $dataStore.recordGroup.groupLocalities.filter((x) => x.selected).map((x) => x.loc)
      : [];

  $: georefLoc =
    $dataStore.georefIndex && $dataStore.georefIndex[georefKey]
      ? $dataStore.georefIndex[georefKey].locality
      : null;

  $: isExactMatch = selectedLocalities.some((loc) => {
    if (!loc || !georefLoc) return false;
    const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    return normalize(loc) === normalize(georefLoc);
  });

  const getQualityVal = (_) => {
    let georef = $dataStore.georefIndex[georefKey];
    let qualityVars = ['uncertainty', 'datum', 'sources', 'protocol'];

    let count = 0;
    for (let qVar of qualityVars) {
      if (qVar == 'uncertainty') {
        if (georef[qVar] && georef[qVar] > 0) {
          count++;
        }
      } else {
        if (georef[qVar] && georef[qVar].trim()) {
          count++;
        }
      }
    }

    return count;
  };

  const getQualityColor = (_) => {
    let georef = $dataStore.georefIndex[georefKey];

    if (georef.ambiguous) {
      if (georef.verified) {
        return '#0066ff'; //blue
      } else {
        return '#00CC66'; //green
      }
    }

    if (qualityVal == 4) {
      if (georef.verified) {
        return '#0066ff'; //blue
      }
      //else
      return '#00CC66'; //green
    }

    if (qualityVal >= 2) {
      return '#FF9966'; //orange
    }

    return '#D3D3D3'; //grey
  };

  const hidden = (_) => {
    if ($dataStore.georefIndex && $dataStore.georefIndex[georefKey]) {
      let georef = $dataStore.georefIndex[georefKey];
      if (filterBest) {
        if (georef.ambiguous) {
          showThisRow = true;
          return;
        }

        if (qualityVal == 4) {
          showThisRow = true;
          return;
        }

        //else
        showThisRow = false;
      } else {
        showThisRow = true;
      }
    }
  };

  const handleRowClick = (_) => {
    dispatch('georef-selected', georefKey);
  };
</script>

<!-- ############################################## -->
<!-- HTML -->

<tr
  class:active={$dataStore.georefIndex && $dataStore.georefIndex[georefKey].selected}
  class:oddrow={$dataStore.georefIndex &&
    rowindex % 2 &&
    !$dataStore.georefIndex[georefKey].selected}
  class:hidden={!showThisRow}
  on:click={handleRowClick}
>
  {#if $dataStore.georefIndex}
    <td>
      <span class="material-icons" style="color:{qualityColor};">stop</span>
    </td>
    <td>
      <div style="display:flex;align-items:center;gap:5px;">
        {#if isExactMatch}
          <span
            style="max-width:30px;color:slategrey;text-align:center;font-size:.5em;text-transform:uppercase;"
            title="Exact match for selected locality">exact match</span
          >
        {/if}
        {$dataStore.georefIndex[georefKey].locality}
      </div>
    </td>
    <td class="indicator">
      {#if $dataStore.georefIndex[georefKey].uncertainty}
        <span class="material-icons">task_alt</span>
      {/if}
    </td>
    <td class="indicator">
      {#if $dataStore.georefIndex[georefKey].sources}
        <span class="material-icons">task_alt</span>
      {/if}
    </td>
    <td class="indicator">
      {#if $dataStore.georefIndex[georefKey].protocol && $dataStore.georefIndex[georefKey].protocol
          .toLowerCase()
          .trim() != 'unspecified'}
        <span class="material-icons">task_alt</span>
      {/if}
    </td>
    <td class="indicator">
      {#if $dataStore.georefIndex[georefKey].datum}
        <span class="material-icons">task_alt</span>
      {/if}
    </td>
    <td class="indicator">
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
    background-color: #bcd0ec;
  }

  .oddrow {
    background-color: #e8e8e8;
  }

  .hidden {
    display: none;
  }

  .star-icon {
    color: #ffd700;
    vertical-align: middle;
    font-size: 18px;
    margin-right: 4px;
  }
</style>
