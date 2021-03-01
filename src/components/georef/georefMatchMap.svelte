<!-- Note that this depends on having the google maps api script in your index.html file -->
<script>
import { Loader as MapsAPILoader } from '@googlemaps/js-api-loader';
import MeasureTool from 'measuretool-googlemaps-v3';
import { dataStore } from './dataStore.js'
import {onMount} from 'svelte'
import MapMarker from './georefMatchMapMarker.svelte'
import {mapsAPIKey} from '../../keys.js'

export let pastedDecimalCoords

let container;
let map;
let marker
let mapReady = false
let currentGeorefs

let googleMapAPIExists = false

$: if(window.google) {
  if (typeof window.google == 'object' && typeof window.google.maps == 'object' && typeof window.google.maps.Map == 'function') {
    googleMapAPIExists = true
  }
  else {
    googleMapAPIExists = false
  }
} 

onMount(async _ => {
  //we need this because otherwise the script reloads each time the component mounts which it complains about
  if (!googleMapAPIExists){
    const loader = new MapsAPILoader({
      apiKey: mapsAPIKey,
      version: "weekly",
      libraries: ["geometry"]
    }); 
    await loader.load()
  }

  map = new google.maps.Map(container, {
    zoom: 5,
    center: {lat: -24.321476, lng: 24.909317}, 
    disableDoubleClickZoom:true
  });

  const measureTool = new MeasureTool(map); //don't remove this
  mapReady = true
})



$:if ($dataStore.georefIndex && Object.keys($dataStore.georefIndex).length && mapReady) prepMap()

$: if(map && marker && pastedDecimalCoords) {
  let latlon = pastedDecimalCoords.split(',').map(x=>Number(x))
  let pos = {lat: latlon[0], lng: latlon[1]} //google.maps.LatLngLiteral
  marker.setPosition(pos)
  map.panTo(pos)
}

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

<div class="mapview" bind:this={container}>
  {#if map && $dataStore.georefIndex}
		{#each Object.keys($dataStore.georefIndex) as georefKey}
      <MapMarker {georefKey} {map} on:georef-selected/>
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