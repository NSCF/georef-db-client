<script>
import Modal from 'svelte-simple-modal';
import ChooseFile from './chooseFile.svelte'
import ConfirmFields from './confirmCSVfields.svelte'
import WellDone from './welldone.svelte'

//for 'page navigation'
// do we need a router??????
let pages = ['ChooseFile', 'ConfirmFields', 'ConfirmData', 'UploadData', 'Georeference' ]
let currentPage = 'ChooseFile'

//locals
let fileForGeoref
let requiredFields

//METHODS
function handleFileSelected(event){
	fileForGeoref = event.detail.file
	console.log('we got file', fileForGeoref.name)
	currentPage = 'ConfirmFields'
}

function handleFieldsConfirmed(event){
	requiredFields = event.detail.requiredFields
	currentPage = 'ConfirmData'
}

</script>

<main>
	<h1>Welcome to the georeferencer</h1>
	<Modal>
		{#if currentPage == 'ChooseFile'}
			<ChooseFile on:file-selected={handleFileSelected} fileMIMETypes={['text/csv', 'application/vnd.ms-excel']}/>
		{/if}
		{#if currentPage == 'ConfirmFields'}
			<ConfirmFields file={fileForGeoref} on:fields-confirmed={handleFieldsConfirmed}/>
		{/if}
		{#if currentPage == 'WellDone'}
			<WellDone />
		{/if}
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