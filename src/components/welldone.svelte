<script>
const goToDatasets = _ => {
	//TODO
}

const startGeoreferencing = _ => {
	//TODO
}
</script>
<h2>Congratulations, your dataset has been uploaded for georeferencing!</h2>
<p>You can <span class="clickable-text" on:click={goToDatasets}>proceed to your list of datasets</span> and their progress or <span class="clickable-text" on:click={startGeoreferencing}>start georeferencing</span></p>

<style>
h2 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 100;
	}

.clickable-text {
	color: rgb(0,100,200);
	text-decoration: none;
}
.clickable-text:hover {
	text-decoration: underline;
	cursor: pointer;
}
</style>