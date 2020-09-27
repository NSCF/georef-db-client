<script>
import {createEventDispatcher} from 'svelte'
import Datasets from './admin/datasetsList.svelte'

const dispatch = createEventDispatcher()

const handleDatasetSelected = ev => { //just bubbling up
  let dataset = ev.detail
  dispatch('dataset-selected', dataset)
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<h2>Your current datasets:</h2>
<Datasets on:dataset-selected={handleDatasetSelected}/>

<!-- ############################################## -->
<style>
h2 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
	}
</style>