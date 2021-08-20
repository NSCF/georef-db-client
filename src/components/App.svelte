<script>
	import {onMount} from 'svelte'
	import {Auth, Firestore, FieldValue, Realtime as Firebase } from '../firebase.js'

	import Modal from 'svelte-simple-modal';
	import Register from './signUp.svelte'
	import SignIn from './signIn.svelte'
	import ForgotPwd from './signInForgotPwd.svelte'
	import PwdReset from './signInPwdReset.svelte'
	import About from './About.svelte'
	import Home from './home.svelte'
	import ConfirmFields from './confirmCSVFields.svelte'
	import ConfirmData from './confirmCSVData.svelte'
	import RegisterDataset from './registerDataset.svelte'
	import PackAndLoad from './packAndLoad.svelte'
	import WellDone from './welldone.svelte'

	import DatasetsList from './admin/datasetsList.svelte'
	import DatasetDetail from './admin/datasetDetail.svelte'

	import Georeferencer from './georef/georef.svelte'

	import QualityControl from './admin/qualityControl.svelte'

	import OverallStats from './stats/overallStats.svelte'
	import DatasetStats from './stats/datasetStats.svelte'

	import { Circle } from 'svelte-loading-spinners'

	//just for now
	let profile
	let fbUser //the firebase user object
	let userID
	let firstAuth = false

	//for 'page navigation'
	// do we need a router??????
	let pages = ['Register', 'SignIn', 'ForgotPwd', 'ResetPwd', 'About', 'Home', 'ConfirmFields', 'ConfirmData', 'RegisterDataset', 'UploadData', 'Georeferencer', 'QualityControl' ]
	let datasetPages = ['DatasetList', 'DatasetDetail']
	let georeferencePage = 'Georeferencer' //just the one

	let currentPage = 'Home'
	let pwdResetCode

	//locals
	let homePage //to bind:this to control the manual georef
	let fileForGeoref
	let requiredFields
	let datasetSummary
	let datasetDetails
	let selectedDataset
	let invalidCountries

	//LIFECYCLE
	onMount(_ => {
		//hopefully this is triggered when we open the page again and sign in is persisted
		Auth.onAuthStateChanged(async user => {
			//TODO wait to get it from the registration dispatch
			fbUser = user
			if(user){
				//this
				if(window.location.href.includes('/auth/userMgmt')) {
					window.location = window.location.href.split('/auth/userMgmt')[0]
				} 
				else {
					//wait one moment for the dispatch to catch up if this is new registration
					setTimeout( async _ => {
						if(!profile){
							try {
								let snap = await Firestore.collection('userProfiles').doc(user.uid).get()
								if (snap.exists){
									profile = snap.data()
									userID = user.uid
									firstAuth = true
									currentPage = 'Home'// TODO this must go back to previous page the user was on
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

						//record the person as signed in
						await Firestore.collection('usersSignedIn').doc('users').update({uids: FieldValue.arrayUnion(profile.uid)})

					}, 100)
				}
			}
			else {
				profile = null
				userID = null
				firstAuth = true
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

	function handleHomeClick() {
		if(currentPage == 'Georeferencer') {
			alert('Please click \'Done\' above the locality group to return')
		}
		else if (currentPage == 'Home') { //we presume the user is trying to escape the manual georef
			homePage.closeSearching()
		}
		else {
			currentPage = "Home"
		}
	}

	function handleAboutClick() {
		if (currentPage == 'About'){
			return //do nothing
		}
		else {
			currentPage = 'About'
		}
	}

	function handleSignInSuccess(ev){
		let user = ev.detail.userCredential.user
		userID = user.uid
		profile = ev.detail.profile
	}

	function signOutClick () {
		Auth.signOut().then(_ => {
			profile = null
			userID = null
			currentPage = 'Home'
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
		currentPage = 'Home'
	}

	function handleFileContentsConfirmed(ev) {
			datasetSummary = ev.detail
			currentPage = 'RegisterDataset'
	}

	function handleRegisterDataset(ev) {
		datasetDetails = ev.detail.datasetDetails
		invalidCountries = ev.detail.invalidCountries
		datasetDetails.recordIDField = requiredFields.recordIDField //very important!!
		datasetDetails.localityField = requiredFields.localityField
		currentPage = 'UploadData'
	}

	function handleUploadComplete(ev){
		currentPage = 'WellDone'
	}

	function handleToDatasets(){
		currentPage = 'DatasetList'
	}

	function handleDatasetSelected(ev){
		selectedDataset = ev.detail
		currentPage = 'DatasetDetail'
	}

	function handleToDatasetDetail() {
		currentPage = 'DatasetDetail'
	}

	function handleStartGeoreferencing(){
		currentPage = 'Georeferencer'
	}

	function handleBackToDatasets() {
		selectedDataset = null
		currentPage = 'DatasetList'
	}

	//just for debugging
	const testAuth = _ => {
		if (fbUser) {
			fbUser.getIdToken(true).then(token => {
				console.log('id token is', token)
				fetch('https://us-central1-georef-745b9.cloudfunctions.net/hello', {
					headers: {
						Authorization: token
					}
				}).then(res => {
					if (res.ok){
						res.json().then(data => {
							console.log(data)
							alert('Success!! See console for response data')
						})
					}
					else {
						alert('unsuccessfull with body: ' + res.body)
					}
				}).catch(err => {
					alert('fetch failed with message: ' + err.message)
				})
			})
		}
		else {
			alert('there is no user yet')
		}
	}

</script>
<svelte:window on:unload={async _ => await Firestore.collection('usersSignedIn').doc('users').update({uids: FieldValue.arrayRemove(profile.uid)})} />
<main>
	<Modal>
		<div class="main-flex-container">
			<div class="header">
				<div class="header-flex" style="height:100%" on:click={handleHomeClick}>
					<img src="images/NSCF logo no text transparent.png" alt="NSCF logo"  style="height:100%" />
					<span class="logo-span">NSCF Georeferencer</span>
				</div>
				<div class="header-right">
					<div class="menu">
						<span class="menuitem" on:click={handleHomeClick}>Home</span>
						<span class="menuitem" on:click={handleAboutClick}>About</span>
					</div>
					{#if !firstAuth}
						<Circle size="1.5" color="#1d4a9c" unit="em" />
					{:else}
						{#if !profile}
							<div class="header-right">
								<button class="signin" on:click='{_ => currentPage = 'Register'}'><strong>Register</strong></button>
								<button on:click='{_ => currentPage = 'SignIn'}'><strong>Sign In</strong></button>
							</div>
						{:else}
							<div class="header-right">
								<span style="margin-right:10px">Logged in as {profile.firstName} {profile.lastName}</span>
								<button on:click={signOutClick}><strong>Sign Out</strong></button>
							</div>
						{/if}	
					{/if}
				</div>
			</div>
			{#if profile}
				{#if selectedDataset && ['Georeferencer', 'DatasetDetail'].includes(currentPage)}
					<DatasetStats {profile} dataset={selectedDataset} />
				{:else if ['Home', 'DatasetList'].includes(currentPage)}
					<OverallStats {profile} />
				{/if}
			{/if}
			<div class="content-container">
				{#if currentPage == 'Register'}
					<Register on:user-sign-in={handleSignInSuccess} />	
				{/if}
				{#if currentPage == 'SignIn'}
					<SignIn
					on:to-forgot-pwd='{_ => currentPage = 'ForgotPwd'}' 
					on:user-sign-in={handleSignInSuccess} />	
				{/if}
				{#if currentPage == 'ForgotPwd'}
					<ForgotPwd {Auth} />	
				{/if}
				{#if currentPage == 'ResetPwd'}
					<PwdReset {Auth} code={pwdResetCode} on:to-sign-in='{_ => currentPage = 'SignIn'}'/>	
				{/if}
				{#if currentPage == 'About'}
					<About/>
				{/if}
				{#if currentPage == 'Home'}
				<Home 
					{profile}
					on:to-about={handleAboutClick}
					on:file-selected={handleFileSelected} 
					on:to-datasets={handleToDatasets}
					bind:this={homePage}
					fileMIMETypes={['text/csv', 'application/vnd.ms-excel']}/>
				{/if}
				{#if currentPage == 'ConfirmFields'}
					<ConfirmFields file={fileForGeoref} on:fields-confirmed={handleFieldsConfirmed} on:fields-confirm-cancelled={handleConfirmCanceled}/>
				{/if}
				{#if currentPage == 'ConfirmData'}
					<ConfirmData file={fileForGeoref} requiredFields={requiredFields} on:data-confirmed={handleFileContentsConfirmed} on:data-confirm-cancelled={handleConfirmCanceled}/>
				{/if}
				{#if currentPage == 'RegisterDataset'}
					<RegisterDataset userProfile={profile} hasStateProvince={datasetSummary.hasStateProvince} datasetCountries={Object.keys(datasetSummary.localityRecordIDMap)} on:register-dataset={handleRegisterDataset}/>
				{/if}
				{#if currentPage == 'UploadData'}
					<PackAndLoad 
						localityRecordIDMap={datasetSummary.localityRecordIDMap} 
						{invalidCountries}
						dataset={datasetDetails}
						{fileForGeoref}
						{userID}
						on:upload-complete={handleUploadComplete}
					/>
				{/if}
				{#if currentPage == 'WellDone'}
					<WellDone />
				{/if}
				{#if currentPage == 'DatasetList'}
					<DatasetsList {profile} on:dataset-selected={handleDatasetSelected}/>
				{/if}
				{#if currentPage == 'DatasetDetail'}
					<DatasetDetail {profile} dataset={selectedDataset} on:to-datasets={handleToDatasets} on:start-georeferencing={handleStartGeoreferencing} on:quality-control={_ => currentPage = 'QualityControl'}/>
				{/if}
				{#if currentPage == 'Georeferencer'}
					<Georeferencer {profile} dataset={selectedDataset} on:back-to-datasets='{_=> currentPage = 'DatasetList'}'/>
				{/if}
				{#if currentPage == "QualityControl"}
					<QualityControl {profile} dataset={selectedDataset} on:to-datasets={handleBackToDatasets}/>
				{/if}
			</div>
		</div>
	</Modal>
</main>

<style>

	main {
		width:100%;
		height:100%;
	}

	.main-flex-container {
		display: flex;
		position: relative;
		flex-direction: column;
		width:100%;
		height:100%;
	}

	.header {
		width:100%;
		height: 50px;
		display:flex;
		justify-content: space-between;
		align-items: center;
		box-sizing: border-box;
	}

	.header-right {
		display:flex;
		align-items: center;
	}

	.menu {
		display: flex;
		margin-right:20px;
	}

	.menuitem {
		width:40px;
		margin-right:20px;
		text-decoration: underline;
	}

	.menuitem:hover {
		cursor: pointer;
		font-weight:bold;
	}

	.content-container {
		flex: 1;
		overflow: hidden;
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

	.header-flex:hover {
		cursor: pointer;
	}

	.logo-span {
		color:rgb(72, 72, 148);
		margin-left:5px;
		font-size:1.5em;
		font-weight: 400;
	}
	
</style>