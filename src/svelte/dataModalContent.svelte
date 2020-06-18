<script>

  import { getContext } from 'svelte';

  export let fileSummary;
  export let onOkay = () => {};

  const { close } = getContext('simple-modal');

  function _onCancel() {
    _close()
  }

  function _onOkay(){
    onOkay()
    close()
  }

</script>

<h4>File contains {fileSummary.totalRows} rows</h4>

{#if fileSummary.recordIDsMissing}
<h3 style="color:red">There are records missing IDs. Please ensure every row has a unique ID</h3>
{/if}

{#if fileSummary.duplicatedRecordIDs}
<h3 style="color:red">Some record IDs are duplicated. Please ensure every row has a unique ID</h3>
{/if}

{#if fileSummary.rowsWithoutCountry && fileSummary.rowsWithoutCountry.length}
<h4>The follow records are missing a country value and therefore cannot be georeferenced:</h4>
<p><i>{fileSummary.rowsWithoutCountry.join(', ')}</i></p>
{#if fileSummary.recordsMissingCountryAlsoMissingID}
<p style="color:red"><strong>Some records missing IDs are also missing country</strong></p>
{/if}
{/if}

{#if fileSummary.rowsWithoutLocality && fileSummary.rowsWithoutLocality.length}
<h4>The follow records are missing a locality value and therefore cannot be georeferenced:</h4>
<p><i>{fileSummary.rowsWithoutLocality.join(', ')}</i></p>
{#if fileSummary.recordsMissingCountryAlsoMissingID}
<p style="color:red"><strong>Some records missing IDs are also missing locality</strong></p>
{/if}
{/if}
<br/>
<div class="buttons">
	<button on:click={_onCancel}>
		Cancel
	</button>
	<button style="background-color:blue;color:white" on:click={_onOkay}>
		Okay
	</button>
</div>

<style>
  .buttons {
    display: flex;
    justify-content: flex-end;
  }
</style>

