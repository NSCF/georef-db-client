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
<h2>Current datasets:</h2>
<Datasets on:dataset-selected={handleDatasetSelected}/>

<!-- ############################################## -->
<style>
h2 {
		color: rgb(73, 93, 158);
		font-size: 2em;
		font-weight: 100;
	}
</style>