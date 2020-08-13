<script>
import Modal from 'svelte-simple-modal';
import ChooseFile from './chooseFile.svelte'
import ConfirmFields from './confirmCSVFields.svelte'
import ConfirmData from './confirmCSVData.svelte'
import RegisterDataset from './registerDataset.svelte'
import PackAndLoad from './packAndLoad.svelte'
import WellDone from './welldone.svelte'

//for 'page navigation'
// do we need a router??????
let pages = ['ChooseFile', 'ConfirmFields', 'ConfirmData', 'RegisterDataset', 'UploadData', 'Georeference' ]
let currentPage = 'ChooseFile'

//locals
let fileForGeoref
let requiredFields
let georefInputs
let datasetDetails

//METHODS

function handleGoToDatasets(ev){
	currentPage = "datasets"
}

function handleFileSelected(event){
	fileForGeoref = event.detail.file
	console.log('we got file', fileForGeoref.name)
	currentPage = 'ConfirmFields'
}

function handleFieldsConfirmed(event){
	requiredFields = event.detail
	currentPage = 'ConfirmData'
}

function handleConfirmCanceled() {
	fileForGeoref = requiredFields = stuffToUpload = null
	currentPage = 'ChooseFile'
}

function handleFileContentsConfirmed(ev) {
		georefInputs = ev.detail
		console.log(georefInputs)
		currentPage = 'RegisterDataset'
}

function handleRegisterDataset(ev) {
	datasetDetails = ev.detail
	console.log(datasetDetails)
	currentPage = 'UploadData'
}

function handleUploadComplete(ev){
	currentPage = 'WellDone'
}

</script>

<main>
	<h1>Welcome to the georeferencer</h1>
	<button on:click={handleGoToDatasets}>Go to datasets</button>
	<h2 style="color:#363636">OR</h2>
	<Modal>
		{#if currentPage == 'ChooseFile'}
			<ChooseFile on:file-selected={handleFileSelected} fileMIMETypes={['text/csv', 'application/vnd.ms-excel']}/>
		{/if}
		{#if currentPage == 'ConfirmFields'}
			<ConfirmFields file={fileForGeoref} on:fields-confirmed={handleFieldsConfirmed} on:fields-confirm-cancelled={handleConfirmCanceled}/>
		{/if}
		{#if currentPage == 'ConfirmData'}
			<ConfirmData file={fileForGeoref} requiredFields={requiredFields} on:data-confirmed={handleFileContentsConfirmed} on:data-confirm-cancelled={handleConfirmCanceled}/>
		{/if}
		{#if currentPage == 'RegisterDataset'}
			<RegisterDataset on:register-dataset={handleRegisterDataset}/>
		{/if}
		{#if currentPage == 'UploadData'}
			<PackAndLoad 
				localityRecordIDMap={georefInputs.localityRecordIDMap} 
				countryCodes={georefInputs.countryCodes}
				{datasetDetails}
				{fileForGeoref}
				on:upload-complete={handleUploadComplete}
			/>
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