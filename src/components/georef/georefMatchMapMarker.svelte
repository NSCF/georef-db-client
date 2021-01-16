<script>
import { dataStore } from './dataStore.js'
import {onDestroy} from 'svelte'

export let georefIndex
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

let accuracy = $dataStore.georefArray[georefIndex].accuracy
let accuracyUnit = $dataStore.georefArray[georefIndex].accuracyUnit
let accuracyM = getRadiusM(accuracy, accuracyUnit)

let center = new google.maps.LatLng($dataStore.georefArray[georefIndex].decimalLatitude, $dataStore.georefArray[georefIndex].decimalLongitude);
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

let circle 

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
  
  if($dataStore.georefArray[georefIndex].clicked) {
    console.log('you already clicked me')
  }
  else {
    if($dataStore.currentGeoref) {
      $dataStore.currentGeoref.clicked = false
    }
    $dataStore.georefArray[georefIndex].clicked = true
    $dataStore.currentGeoref = $dataStore.georefArray[georefIndex]
  }     
})

$: $dataStore.georefArray[georefIndex], updateMarkerDisplay()

const updateMarkerDisplay = _ => {
  if($dataStore.georefArray[georefIndex].clicked){
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 5, 
      fillColor: 'blue', 
      fillOpacity: 1,
      strokeColor: 'blue'
    })
    marker.setZIndex(1)
  }
  else {
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 5, 
      fillColor: 'green', 
      fillOpacity: 1,
      strokeColor: 'green'
    })
    marker.setZIndex(0)
  }
}

onDestroy( _ => {
  marker.setMap(null)
  if(circle) {
    circle.setMap(null)
  }
})

</script>
