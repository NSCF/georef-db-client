<script>
const goToDatasets = _ => {
	//TODO
}

const startGeoreferencing = _ => {
	//TODO
}
</script>

<div>
  <h4>Congratulations, your dataset has been uploaded for georeferencing!</h4>
	<p>You can <span class="clickable-text" on:click={goToDatasets}>proceed to your list of datasets</span> and their progress or <span class="clickable-text" on:click={startGeoreferencing}>start georeferencing</span></p>
</div>

<style>
	div {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
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