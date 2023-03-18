<script>
import GeorefStat from '../stats/georefStat.svelte'
export let stat
export let labelText
export let isGeoref

const updateStat = _ => {
  stat++
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<GeorefStat {stat} {labelText} {isGeoref} />
<button on:click={updateStat}>Update stat</button>
<!-- ############################################## -->
<style>
</style>