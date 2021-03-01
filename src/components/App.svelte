<script>
import {onMount} from 'svelte'
import {Auth, Firestore, FieldValue, Realtime as Firebase } from '../firebase.js'

import Modal from 'svelte-simple-modal';
import Register from './signUp.svelte'
import SignIn from './signIn.svelte'
import ForgotPwd from './signInForgotPwd.svelte'
import PwdReset from './signInPwdReset.svelte'
import ChooseFile from './chooseFile.svelte'
import ConfirmFields from './confirmCSVFields.svelte'
import ConfirmData from './confirmCSVData.svelte'
import RegisterDataset from './registerDataset.svelte'
import PackAndLoad from './packAndLoad.svelte'
import WellDone from './welldone.svelte'

import DatasetList from './datasetsListPage.svelte'
import DatasetDetail from './admin/datasetDetail.svelte'

import Georeferencer from './georef/georef.svelte'

import GeorefStats from './georefStats.svelte'

import Workshop from './workshop/workshop.svelte'
import Yard from './yard.svelte'

//just for now
let profile
let userID

//the stats we want to show
let statsRefStrings = [
	`stats/perUser/${userID}/georefsAdded`,
  `stats/perUser/${userID}/recordsGeoreferenced`,
	'stats/georefsAdded',
	'stats/recordsGeoreferenced',
	'stats/lastGeorefAdded', 
	'stats/lastGeorefAddedBy'
]

let statsLabels = [
	'My georefs', 
	'My records',
	'Total georefs',
	'Total records',
	'Last georef', 
	'Last georef by'
]

//for 'page navigation'
// do we need a router??????
let pages = ['Register', 'SignIn', 'ForgotPwd', 'ResetPwd', 'ChooseFile', 'ConfirmFields', 'ConfirmData', 'RegisterDataset', 'UploadData', 'Georeferencer' ]
let datasetPages = ['datsetList', 'datasetDetail']
let georeferencePage = 'Georeferencer' //just the one

let currentPage = 'ChooseFile'
let pwdResetCode

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

//LIFECYCLE
onMount(_ => {
	//hopefully this is triggered when we open the page again and sign in is persisted
	Auth.onAuthStateChanged(async user => {
		console.log('sign in state changed')
		//TODO wait to get it from the registration dispatch
		if(user){
			console.log('we have a user')
			if(window.location.href.includes('/auth/userMgmt')) {
				window.location = window.location.href.split('/auth/userMgmt')[0]
			} 
			else {
				//wait one moment for the dispatch to catch up if this is new registration
				setTimeout( async _ => {
					if(!profile){
						try {
							let fetchURL =`https://us-central1-georef-745b9.cloudfunctions.net/getprofilebyid?uid=${user.uid}`
							let res = await fetch(fetchURL)
							let fetchData = await res.json()
							if (fetchData){
								profile = fetchData
								userID = user.uid
								if(currentPage != 'workshop') {
									currentPage = 'ChooseFile'// TODO this must go back to previous page the user was on
								}
							}
							else {
								console.log('no profile for this user')
								//then we assume this is from first sing up, and the profile is not created yet. We'll get it from the dispatch
							}
						}
						catch(err) {
							alert('error fetching user profile: ' + err.message) //hopefully also doesn't happen
						}
					}
				}, 100)
			}
		}
	})

	//ALL THIS STUFF BELOW MUST BE REWIRED WHEN REAL ROUTING IS ADDED LATER

	//and our one and only real 'route'
	//remember to set the appropriate rewrite for hosting, see https://firebase.google.com/docs/hosting/full-config#rewrites
	let currentURL = window.location
	if(currentURL.href.includes('/auth/userMgmt')) {
		console.log('got this far')
		let params = (new URL(window.location)).searchParams;
		console.log('mode is', params.get('mode'))
		if(params.get('mode') == 'resetPassword') {
			pwdResetCode = params.get('oobCode')
			currentPage = 'ResetPwd'
		}
	}

	//if the user reloads
	if(window.performance){
		if (performance.navigation.type == performance.navigation.TYPE_RELOAD) { //deprecated but still works and WAY simpler than the new thing...
			if(window.location.href.includes('/auth/userMgmt')) {
				window.location = window.location.href.split('/auth/userMgmt')[0]
			}
		}
	}
})

//METHODS

function handleSignInSuccess(ev){
	let user = ev.detail.userCredential.user
	userID = user.uid
	profile = ev.detail.profile
}

function signOutClick () {
	Auth.signOut().then(_ => {
		profile = null
		userID = null
	})
	.catch(err => {
		alert('error signing out: ' + err.message)
	}) 
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
	fileForGeoref = requiredFields = null
	currentPage = 'ChooseFile'
}

function handleFileContentsConfirmed(ev) {
		georefInputs = ev.detail
		console.log(georefInputs)
		currentPage = 'RegisterDataset'
}

function handleRegisterDataset(ev) {
	datasetDetails = ev.detail
	datasetDetails.recordIDField = requiredFields.recordIDField //very important!!
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
	currentPage = 'datasetDetail'
}

function handleStartGeoreferencing(){
	currentPage = 'Georeferencer'
}

function handleBackToDatasets() {
	selectedDataset = null
	currentPage = 'datasetList'
}

function handleYardClick() {
	currentPage = 'yard'
}

function handleHomeClick() {
	if(currentPage = 'Georeferencer'){
		alert('to return home from the georeferencer please click on Done above the record group')
	}
	else {
		currentPage = 'ChooseFile'
	}
}

</script>

<main>
	<Modal>
		<div class="flex-container">
			<div class="header">
				<div class="header-flex" style="height:100%">
					<img src="images/NSCF logo.jpg" alt="NSCF logo"  style="height:100%" />
					<span class="logo-span">Georeferencer</span>
				</div>
				{#if !profile}
					<div>
						<button class="signin" on:click='{_ => currentPage = 'Register'}'><strong>Register</strong></button>
						<button on:click='{_ => currentPage = 'SignIn'}'><strong>Sign In</strong></button>
					</div>
				{:else}
					<div>
						<span>Logged in as {profile.firstName} {profile.lastName}</span>
						<button on:click={signOutClick}><strong>Sign Out</strong></button>
					</div>
				{/if}
			</div>
			<div class="content">
				{#if userID && currentPage != 'Georeferencer'}
					<GeorefStats {Firebase} {statsRefStrings}  {statsLabels} descriptor={'Georef stats:'}/>
				{/if}
				{#if currentPage == 'Register'}
					<Register {Firestore} {Auth} on:user-sign-in={handleSignInSuccess} />	
				{/if}
				{#if currentPage == 'SignIn'}
					<SignIn {Firestore} {Auth} 
					on:to-forgot-pwd='{_ => currentPage = 'ForgotPwd'}' 
					on:user-sign-in={handleSignInSuccess} />	
				{/if}
				{#if currentPage == 'ForgotPwd'}
					<ForgotPwd {Auth} />	
				{/if}
				{#if currentPage == 'ResetPwd'}
					<PwdReset {Auth} code={pwdResetCode} on:to-sign-in='{_ => currentPage = 'SignIn'}'/>	
				{/if}
				{#if currentPage == 'ChooseFile'}
				<ChooseFile 
					{profile}
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
					<RegisterDataset userProfile={profile} on:register-dataset={handleRegisterDataset}/>
				{/if}
				{#if currentPage == 'UploadData'}
					<PackAndLoad 
						localityRecordIDMap={georefInputs.localityRecordIDMap} 
						{datasetDetails}
						{fileForGeoref}
						{userID}
						on:upload-complete={handleUploadComplete}
					/>
				{/if}
				{#if currentPage == 'WellDone'}
					<WellDone />
				{/if}
				{#if currentPage == 'datasetList'}
					<DatasetList {profile} on:dataset-selected={handleDatasetSelected}/>
				{/if}
				{#if currentPage == 'datasetDetail'}
					<DatasetDetail userID={profile.uid} dataset={selectedDataset} on:to-datasets={handleToDatasets} on:start-georeferencing={handleStartGeoreferencing}/>
				{/if}
				{#if currentPage == 'Georeferencer'}
					<Georeferencer {Firestore} {Firebase} {FieldValue} {profile} dataset={selectedDataset} on:back-to-datasets='{_=> currentPage = 'datasetList'}'/>
				{/if}
				{#if currentPage == 'workshop'}
					<Workshop />
				{/if}
				{#if currentPage == 'yard'}
					<Yard {Firestore} {Firebase} {FieldValue} {profile} />
				{/if}
			</div>
		</div>
		<div class="stopper"></div>
	</Modal>
</main>

<style>

	main {
		width:99vw;
		height:99vh;
		padding:5px;
		box-sizing: border-box;
	}

	.flex-container {
		display: flex;
		position: relative;
		flex-direction: column;
		width:100%;
		height:100%;
		box-sizing: border-box;
	}

	.header {
		width:100%;
		height: 50px;
		display:flex;
		justify-content: space-between;
		align-items: center;
		box-sizing: border-box;
	}

	.content {
		flex-grow: 1;
		flex-shrink: 1;
		flex-basis: auto;
		max-height:calc(height-50px);
		box-sizing: border-box;
		overflow:hidden;
	}

/* This bugger is needed to stop the overflow!!!!*/
	.stopper {
		position: absolute;
		height:0;
		bottom:0;
	}

	button {
		background-color: lightgray;
	}

	button:hover {
		color:white;
		background-color: gray;
	}

	.signin {
		color:white;
		background-color:rgb(29, 74, 156);
		font-weight: bolder;
	}

	.header-flex {
		display:flex;
		align-items: center;
	}

	.logo-span {
		color:rgb(72, 72, 148);
		margin-left:5px;
		font-size:1.5em;
		font-weight: 400;
	}
	
</style>