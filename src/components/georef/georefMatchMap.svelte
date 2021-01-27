<!-- Note that this depends on having the google maps api script in your index.html file -->
<script>
import MeasureTool from 'measuretool-googlemaps-v3';
import { dataStore } from './dataStore.js'
import {onDestroy, createEventDispatcher} from 'svelte'
import MapMarker from './georefMatchMapMarker.svelte'

const dispatch = createEventDispatcher();

let ready = false
let container;
let map;
let marker
let mapReady = false
let currentGeorefs

window.initMap = function ready() {
	map = new google.maps.Map(container, {
    zoom: 5,
    center: {lat: -24.321476, lng: 24.909317}, 
    disableDoubleClickZoom:true
  });

  const measureTool = new MeasureTool(map);
  mapReady = true
}

$:if ($dataStore.georefIndex && Object.keys($dataStore.georefIndex).length && mapReady) prepMap()

const prepMap = _ => {

  if(currentGeorefs == $dataStore.georefIndex) return //so this only happens once

  //set bounds and add marker
  let bounds = new google.maps.LatLngBounds()
  for (let georefKey of Object.keys($dataStore.georefIndex)){
    let georef = $dataStore.georefIndex[georefKey]
    let coords = new google.maps.LatLng(georef.decimalLatitude, georef.decimalLongitude);
    bounds.extend(coords);
  }
  map.fitBounds(bounds)

  let markerPos = bounds.getCenter()
  if(marker){
    //move it
    marker.setPosition(markerPos)
    navigator.clipboard.writeText('') //clear it just in case
  } else {
    //make it
    marker = new google.maps.Marker({
      position: markerPos,
      map: map,
      draggable:true,
      title:"Use for coordinates"
    });

    google.maps.event.addListener(marker, 'dragend', function(evt){
      let coords = evt.latLng.toUrlValue()
      navigator.clipboard.writeText(coords).then(_ => {
        console.log('coords copied')
        if(window.pushToast) {
          window.pushToast('coordinates copied')
        }
      })
    });

    google.maps.event.addListener(map, 'dblclick', function(e) {
      var positionDoubleclick = e.latLng;
      marker.setPosition(positionDoubleclick);
      let coords = positionDoubleclick.toUrlValue()
      navigator.clipboard.writeText(coords).then(_ => console.log('coords copied'))
      map.panTo(positionDoubleclick);
      if(window.pushToast) {
        window.pushToast('coordinates copied')
      }
    });
  }

  currentGeorefs = $dataStore.georefIndex

}

</script>

<!-- ############################################## -->
<!-- HTML -->

<svelte:head>
  	<script 
      src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD_3Zs4G0iv3_teiE-cPMPEF4lotqiZPqU&libraries=geometry&callback=initMap">
    </script>
</svelte:head>

<div class="mapview" bind:this={container}>
  {#if map && $dataStore.georefIndex}
		{#each Object.keys($dataStore.georefIndex) as georefKey}
      <MapMarker {georefKey} {map} />
    {/each}
	{/if}
</div>

<!-- ############################################## -->
<style>

.mapview {
  width: 100%;
  height:100%;
  max-height:100%;
}

</style>