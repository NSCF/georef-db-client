<script>
import { geoRefs } from './georefStore.js'
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

let accuracy = $geoRefs.georefArray[georefIndex].accuracy
let accuracyUnit = $geoRefs.georefArray[georefIndex].accuracyUnit
let accuracyM = getRadiusM(accuracy, accuracyUnit)

let center = new google.maps.LatLng($geoRefs.georefArray[georefIndex].decimalLatitude, $geoRefs.georefArray[georefIndex].decimalLongitude);
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
  
  if($geoRefs.georefArray[georefIndex].clicked) {
    console.log('you already clicked me')
  }
  else {
    if($geoRefs.currentGeoref) {
      $geoRefs.currentGeoref.clicked = false
    }
    $geoRefs.georefArray[georefIndex].clicked = true
    $geoRefs.currentGeoref = $geoRefs.georefArray[georefIndex]
  }     
})

$: $geoRefs.georefArray[georefIndex], updateMarkerDisplay()

const updateMarkerDisplay = _ => {
  if($geoRefs.georefArray[georefIndex].clicked){
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
