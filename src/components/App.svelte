<script>
import Modal from 'svelte-simple-modal';
import ChooseFile from './chooseFile.svelte'
import ConfirmFields from './confirmCSVFields.svelte'
import ConfirmData from './confirmCSVData.svelte'
import RegisterDataset from './registerDataset.svelte'
import PackAndLoad from './packAndLoad.svelte'
import WellDone from './welldone.svelte'

import DatasetList from './datasetsListPage.svelte'
import DatasetDetail from './admin/datasetDetail.svelte'

import Georeferencer from './georef/georef.svelte'

//for 'page navigation'
// do we need a router??????
let pages = ['ChooseFile', 'ConfirmFields', 'ConfirmData', 'RegisterDataset', 'UploadData', 'Georeference' ]
let datasetPages = ['datsetList', 'datasetDetail']
let georeferencePage = 'georef' //just the one

let currentPage = 'ChooseFile'

//locals
let fileForGeoref
let requiredFields
let georefInputs
let datasetDetails
let selectedDataset

//WATCHERS
$: georefInputs, copyGeorefInputsToClipBoard()

function copyGeorefInputsToClipBoard(){
	if(georefInputs){
		var text = JSON.stringify(georefInputs, undefined, 2)
		navigator.clipboard.writeText(text).then(function() {
			console.log('Async: Copying to clipboard was successful!');
		}, function(err) {
			console.error('Async: Could not copy text: ', err);
		});
	}
}

//METHODS

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

function handleToDatasets(){
	currentPage = 'datasetList'
}


function handleDatasetSelected(ev){
	selectedDataset = ev.detail
	currentPage='datasetDetail'
}

</script>

<main>
	<Modal>
		{#if currentPage == 'ChooseFile'}
			<ChooseFile 
			on:file-selected={handleFileSelected} 
			on:to-datasets={handleToDatasets}
			fileMIMETypes={['text/csv', 'application/vnd.ms-excel']}/>
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
				{datasetDetails}
				{fileForGeoref}
				on:upload-complete={handleUploadComplete}
			/>
		{/if}
		{#if currentPage == 'WellDone'}
			<WellDone />
		{/if}
		{#if currentPage == 'datasetList'}
			<DatasetList on:dataset-selected={handleDatasetSelected}/>
		{/if}
		{#if currentPage == 'datasetDetail'}
			<DatasetDetail dataset={selectedDataset} />
		{/if}
		{#if currentPage == 'georef'}
			<Georeferencer datasetID={selectedDataset.datasetID} />
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



	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>