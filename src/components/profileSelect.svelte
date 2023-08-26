<script>
	import {createEventDispatcher} from 'svelte'
	import { Circle } from 'svelte-loading-spinners'
	
	const dispatch = createEventDispatcher()
	
	let fetching = false
	let inputVal
	let input
	let timer;
	
	let items = []
	
	$: inputVal, debounce(inputVal)
	
	//based on https://dev.to/chromiumdev/cancellable-async-functions-in-javascript-5gp7
	//but I dont know if it really works...
	function* searchProfiles(search) {
		fetching = true
    let res = yield fetch(`https://us-central1-georef-745b9.cloudfunctions.net/findprofile?search=${search}`)
    if(res.ok){
      let data = yield res.json()
			if(data.length) {
				items = data
			}
			else {
				if (/\S+@\S+\.\S+/.test(search)) {
					items = ['invite ' + search]
				}
				else {
					items = ['couldn\'t find ' + search]
				}
			}
    }
    else {
			items = ['there was a problem']
    }

		fetching = false
  }
	
	function makeSingle(generator) {
		let globalNonce;
		return async function(...args) {
			const localNonce = globalNonce = new Object();

			const iter = generator(...args);
			let resumeValue;
			for (;;) {
				const n = iter.next(resumeValue);
				if (n.done) {
					return n.value;  // final return value of passed generator
				}

				// whatever the generator yielded, _now_ run await on it
				resumeValue = await n.value;
				if (localNonce !== globalNonce) {
					return;  // a new call was made
				}
				// next loop, we give resumeValue back to the generator
			}
		};
	}
	
	searchProfiles = makeSingle(searchProfiles)
	
	const debounce = v => {
		if(v && v.trim() && v.length > 3) {
			clearTimeout(timer);
			timer = setTimeout(searchProfiles, 500, v);
		}
		else {
			items = []
		}
	}
	
	const dispatchItem = item => {
		items = []
		inputVal = ''
		input.focus()
		dispatch('profile-selected', item)
	}
</script>

<div class="dropcontainer">
	<input style="width:400px;" placeholder="Type a name or email address" bind:value={inputVal} bind:this={input}/> 
	{#if fetching}
	<div class="loader">
		<Circle size="1" color="#1d4a9c" unit="em" />
	</div>
	{/if}
	<div class="optionscontainer">
		{#each items as item}
			{#if typeof item == 'string'}
				{#if item.includes('invite')}
					<div class="selectableitem" on:click='{_ => dispatchItem(item)}'>{item}</div>
				{:else}
					<div class="selectableitem">invite {item}</div>
				{/if}
			{:else}
				<div class="selectableitem" on:click='{_ => dispatchItem(item)}'>invite {`${item.firstName} ${item.lastName} (${item.email})`}</div>
			{/if}
			<hr/>
		{/each}
	</div>
</div>

<style>
	.dropcontainer {
		position:relative;
		border-radius:2px;
	}
	
	.optionscontainer {
		position:absolute;
		bottom: 40px;
		left: 0px;
		border: 1px solid darkslategray
	}

	hr {
		border-top: 1px solid darkslategray
	}

	hr:last-of-type {
		display:none;
	}

	.loader {
		display: inline-block;
	}
	
	.selectableitem {
		padding: 5px;
		width:100%;
		background-color: white;
	}
	
	.selectableitem:nth-child(odd) {
		background-color:whitesmoke;
    color: #777;
	}
	
	.selectableitem:hover {
		cursor:pointer;
	}
</style>
