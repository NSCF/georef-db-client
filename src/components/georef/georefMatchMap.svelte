<!-- Note that this depends on having the google maps api script in your index.html file -->
<script>
import { geoRefs } from './georefStore.js'
import {onDestroy, createEventDispatcher} from 'svelte'
import MapMarker from './georefMatchMapMarker.svelte'

const dispatch = createEventDispatcher();

let ready = false
let container;
let map;
let mapReady = false

window.initMap = function ready() {
	map = new google.maps.Map(container, {
    zoom: 5,
    center: {lat: -24.321476, lng: 24.909317}
  });
  mapReady = true
}

$:if ($geoRefs && $geoRefs.georefArray.length && mapReady) setBounds()

const setBounds = _ => {
  let bounds = new google.maps.LatLngBounds()
    for (let geoRef of $geoRefs.georefArray){
      let center = new google.maps.LatLng(geoRef.decimalLatitude, geoRef.decimalLongitude);
      bounds.extend(center);
    }
    map.fitBounds(bounds)
}
  
</script>

<!-- ############################################## -->
<!-- HTML -->

<svelte:head>
  	<script 
      src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD_3Zs4G0iv3_teiE-cPMPEF4lotqiZPqU&callback=initMap">
    </script>
</svelte:head>

<div class="mapview" bind:this={container}>
  {#if map}
		{#each $geoRefs.georefArray as geoRef, georefIndex}
      <MapMarker {georefIndex} {map} />
    {/each}
	{/if}
</div>

<!-- ############################################## -->
<style>

.mapview {
  width: 100%;
  height:100%;
}

</style>