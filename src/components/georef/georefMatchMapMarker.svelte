<script>
import { createEventDispatcher } from 'svelte'
import { dataStore } from './dataStore.js'
import {onDestroy} from 'svelte'

const dispatch = createEventDispatcher()

export let georefKey
export let map

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
    else  if (unit == 'km') {
      return accuracy * 1000
    }
    else {
      return Math.round(accuracy / 0.00062137)
    }
  }
  else return 0
}

let accuracy = $dataStore.georefIndex[georefKey].uncertainty
let accuracyUnit = $dataStore.georefIndex[georefKey].uncertaintyUnit
let accuracyM = getRadiusM(accuracy, accuracyUnit)

let center = new google.maps.LatLng($dataStore.georefIndex[georefKey].decimalLatitude, $dataStore.georefIndex[georefKey].decimalLongitude);
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

let circle //yes it needs to be here

$: $dataStore.georefIndex[georefKey].selected

if(accuracyM){
  circle = new google.maps.Circle({
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.2,
    center,
    map,
    radius: accuracyM
  });

}

marker.addListener('click', _ => {
  
  if($dataStore.georefIndex[georefKey].selected) {
    console.log('you already clicked me')
  }
  else {
    if($dataStore.selectedGeoref) {
      $dataStore.selectedGeoref.selected = false
      let selectedMarker = $dataStore.markers[$dataStore.selectedGeoref.georefID]
      selectedMarker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5, 
        fillColor: 'green', 
        fillOpacity: 1,
        strokeColor: 'green'
      })

      selectedMarker.setZIndex(0)
    }
    

    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 5, 
      fillColor: 'blue', 
      fillOpacity: 1,
      strokeColor: 'blue'
    })

    marker.setZIndex(1)
    map.panTo(marker.getPosition())

    $dataStore.georefIndex[georefKey].selected = true
    $dataStore.selectedGeoref = $dataStore.georefIndex[georefKey]
    

    dispatch('georef-selected')

  }
})

marker.panToMe = _ => {
  map.panTo(marker.getPosition())
}

if ($dataStore.markers) {
  $dataStore.markers[georefKey] = marker
}
else {
  $dataStore.markers = {}
  $dataStore.markers[georefKey] = marker
}

onDestroy( _ => {
  marker.setMap(null)
  if(circle) {
    circle.setMap(null)
  }
})

</script>
