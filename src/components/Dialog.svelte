<script>
  import { getContext } from 'svelte';
  export let message;
	export let hasForm = false;
	export let onCancel = () => {};
	export let onOkay = () => {};

  const { close } = getContext('simple-modal');
	
	let value;
	
	function _onCancel() {
		onCancel();
		close();
	}
	
	function _onOkay() {
		onOkay(value);
		close();
	}
	
</script>

<style>
  h4 {
		text-align: center;
	}
	
	textarea {
		width: 100%;
	}
	
	.buttons {
		display: flex;
		justify-content: space-between;
	}
</style>

<h4>{message}</h4>

{#if hasForm}
	<textarea
	  bind:value
	 />
{/if}

<div class="buttons">
	<button on:click={_onCancel}>
		Cancel
	</button>
	<button on:click={_onOkay}>
		Okay
	</button>
</div>