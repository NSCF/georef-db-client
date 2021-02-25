<script>
import {createEventDispatcher} from 'svelte'
import Datasets from './admin/datasetsList.svelte'

const dispatch = createEventDispatcher()

export let profile

</script>

<!-- ############################################## -->
<!-- HTML -->
<h2>Current datasets:</h2>
<Datasets {profile} on:dataset-selected/>

<!-- ############################################## -->
<style>
h2 {
		color: rgb(73, 93, 158);
		font-size: 2em;
		font-weight: 100;
	}
</style>