<script>
	import ReadCSV from './readCSV.svelte'
	import { onMount } from 'svelte';
	import Modal from 'svelte-simple-modal';
	import {Realtime, Firestore, Storage} from '../firebase.js'
	
	//props
	export let name;

	//locals
	let dwcTerms
	let dcTerms

	onMount(async () => {
		

	})

</script>

<main>
	<h1>Hello {name}!</h1>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
	<Modal>
		<ReadCSV Realtime={Realtime} Storage={Storage} Firestore={Firestore}></ReadCSV>
		<!--Add a little message bar for reporting-->
		<!--add fields for dataset name and institution code-->
		<!--Add button to start process-->
	</Modal>
	
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>