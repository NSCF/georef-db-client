<!-- Note that this depends on having the google maps api script in your index.html file -->
<script>
import { Loader as MapsAPILoader } from '@googlemaps/js-api-loader';
import MeasureTool from 'measuretool-googlemaps-v3'; //https://www.npmjs.com/package/measuretool-googlemaps-v3
import { dataStore } from './dataStore.js'
import {onMount, createEventDispatcher} from 'svelte'
import {mapsAPIKey} from '../../keys.js'

const dispatch = createEventDispatcher()

export let pastedDecimalCoords

let container;
let map;
let coordsPin
let mapReady = false
let currentGeorefs

let measureTool

let googleMapAPIExists = false

$: if(window.google) {
  if (typeof window.google == 'object' && typeof window.google.maps == 'object' && typeof window.google.maps.Map == 'function') {
    googleMapAPIExists = true
  }
  else {
    googleMapAPIExists = false
  }
} 

//this creates the map
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
    center: {lat: -24.321476, lng: 24.909317}, //TODO set an appropriate coordinate for the region
    disableDoubleClickZoom:true
  });

  measureTool = new MeasureTool(map, {showSegmentLength: false}); //don't remove this
  mapReady = true
})

$: if ($dataStore.georefIndex && Object.keys($dataStore.georefIndex).length && mapReady) setPoints()

$: if(map && coordsPin && pastedDecimalCoords) {
  let latlon = pastedDecimalCoords.split(',').map(x=>Number(x))
  let pos = {lat: latlon[0], lng: latlon[1]} //google.maps.LatLngLiteral
  coordsPin.setPosition(pos)
  map.panTo(pos)
}

const setPoints = _ => {

  if(currentGeorefs == $dataStore.georefIndex) { //so this only happens once
    return
  }


  //set bounds and add marker
  let bounds = new google.maps.LatLngBounds()
  for (let georefID of Object.keys($dataStore.georefIndex)){
    let georef = $dataStore.georefIndex[georefID]
    let coords = new google.maps.LatLng(georef.decimalLatitude, georef.decimalLongitude);
    bounds.extend(coords);
  }
  
  map.fitBounds(bounds)

  let coordsPinPos = bounds.getCenter()
  if(coordsPin){
    //move it
    coordsPin.setPosition(coordsPinPos)
    navigator.clipboard.writeText('') //clear it just in case
  } else {
    //make it
    coordsPin = new google.maps.Marker({
      position: coordsPinPos,
      map: map,
      draggable:true,
      title:"Use for coordinates"
    });

    google.maps.event.addListener(coordsPin, 'dragend', function(evt){
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
      coordsPin.setPosition(positionDoubleclick);
      let coords = positionDoubleclick.toUrlValue()
      navigator.clipboard.writeText(coords).then(_ => console.log('coords copied'))
      map.panTo(positionDoubleclick);
      if(window.pushToast) {
        window.pushToast('coordinates copied')
      }
    });
  }

  //add the markers, but first remove the last ones if we already have markers
  if($dataStore.markers && Object.keys($dataStore.markers).length){
    for (let marker of Object.values($dataStore.markers)){
      if(marker.circle){
        marker.circle.setMap(null)
      }
      marker.setMap(null)
    }
    $dataStore.markers = null
  }
  else {
  }

  for (let [georefID, georef] of Object.entries($dataStore.georefIndex)) {
    let center = new google.maps.LatLng(georef.decimalLatitude, georef.decimalLongitude);
    let marker = new google.maps.Marker({
      position: center,
      map, 
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5, 
        fillColor: 'green', 
        fillOpacity: 1,
        strokeColor: 'green'
      }, 
      zIndex: 0
    })

    let accuracy = getRadiusM(georef.uncertainty, georef.uncertaintyUnit)

    if(accuracy){
      let circle = new google.maps.Circle({
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.2,
        center,
        map,
        radius: accuracy, 
        clickable: false
      });

      marker.circle = circle

      google.maps.event.addListener(circle, 'dblclick', function(e) {
        google.maps.event.trigger(map, 'dblclick', e);
      })
    }

    marker.addListener('click', _ => {
      dispatch('georef-selected', georefID)
    })

    marker.panToMe = _ => {
      map.panTo(marker.getPosition())
    }

    if(!$dataStore.markers){
      $dataStore.markers = {}
    }

    $dataStore.markers[georefID] = marker
  }

  currentGeorefs = $dataStore.georefIndex
}

//helper for above
const getRadiusM = (accuracy, unit) => {
  if (!isNaN(accuracy) && 
    accuracy > 0 &&
    unit && 
    unit.trim() && 
    ['m', 'km', 'mi'].includes(unit.toLowerCase())){
    unit = unit.trim().toLowerCase()
    if (unit == 'm'){
      return accuracy
    }
    else if (unit == 'km') {
      return accuracy * 1000
    }
    else { //it's miles
      return Number((accuracy * 1.60934 * 1000).toFixed(2))
    }
  }
  else return 0
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<div class="mapview" bind:this={container} />

<!-- ############################################## -->
<style>

.mapview {
  width: 100%;
  height:100%;
  max-height:100%;
}

</style>