<script>
  import {onMount, createEventDispatcher} from 'svelte'
  import { Loader as MapsAPILoader } from '@googlemaps/js-api-loader';
  import MeasureTool from 'measuretool-googlemaps-v3'; //https://www.npmjs.com/package/measuretool-googlemaps-v3
  import {mapsAPIKey} from '../../keys'

  const dispatch = createEventDispatcher()

  export let subGeoref //note is just the coords and the uncertainty which we need here, not the whole georef...
  let prevGeoref = null //This is just a pointer to the georef so we can manage changes

  let container
  let map
  let mapReady = false
  let originalGeorefMarker, newGeorefCircle, coordsPin

  onMount(async _ => {
    try {
      if (typeof google == 'undefined' || typeof google.maps == 'undefined'){
        const loader = new MapsAPILoader({
          apiKey: mapsAPIKey,
          version: "weekly",
          libraries: ["geometry"]
        }); 
        await loader.load()
      }
    }
    catch(err) {
      console.error('error loading google maps:', err)
      return
    }
    
    map = new google.maps.Map(container, {
      zoom: 5,
      center: {lat: -24.321476, lng: 24.909317}, //TODO set an appropriate coordinate for the region
      disableDoubleClickZoom:true
    });

    const measureTool = new MeasureTool(map, {showSegmentLength: false}); //don't remove this
    mapReady = true
  })

  //lets set everything we need on the map
  //note this differs for a new georef vs changes to a previous georef
  $: if(subGeoref && mapReady) {
    if(subGeoref == prevGeoref) {
      //something has changed so we update
      let newUncertainty = getRadiusM(subGeoref.accuracy, subGeoref.accuracyUnit)
      
      //check if it's different
      if(newUncertainty > 0) {
        //do we work with the current new circle or create one?
        if(newGeorefCircle) {
          if(newGeorefCircle.getRadius() != newUncertainty) {
            newGeorefCircle.setRarius(newUncertainty)
          }
        }
        else if (originalGeorefMarker.circle) {
          if(originalGeorefMarker.circle.getRadius() != newUncertainty) {
            //make a new one
            newGeorefCircle = makeCircle(subGeoref.decimalCoordinates, subGeoref.uncertainty, subGeoref.uncertaintyUnit, map, 'blue')
          }
        }
        else {
          //we just make the new circle
          newGeorefCircle = makeCircle(subGeoref.decimalCoordinates, subGeoref.uncertainty, subGeoref.uncertaintyUnit, map, 'blue')
        }
      }

      //and if coords change
      //we use 8 decimal places
      let originalCoords = coordsPin.getPosition().toUrlValue().split(',').map(x => Number(Number(x.trim()).toFixed(8)))
      let newCoords = subGeoref.decimalCoordinates.split(',').map(x => Number(Number(x.trim()).toFixed(8)))
      if(originalCoords[0] != newCoords[0] || originalCoords[1] != newCoords[1]) {
        //coords have changed
        let latlng = {lat: newCoords[0], lng: newCoords[1]}
        coordsPin.setPosition(latlng)

        if(newGeorefCircle) {
          newGeorefCircle.setPosition(latlng)
        }
        else {
          newGeorefCircle = makeCircle(subGeoref.decimalCoordinates, subGeoref.accuracy, subGeoref.accuracyUnit, map, 'blue')
        }
      }
    }
    else {
      //remove
      if(originalGeorefMarker) {
        if(originalGeorefMarker.circle) {
          originalGeorefMarker.circle.setMap(null)
          originalGeorefMarker.circle = null
        }
        originalGeorefMarker.setMap(null)
        originalGeorefMarker = null
      }

      //and recreate
      originalGeorefMarker = makeMarker(subGeoref.decimalCoordinates, map, 'green', 'Original georef location')

      //set the circle
      let circle = makeCircle(subGeoref.decimalCoordinates, subGeoref.uncertainty, subGeoref.uncertaintyUnit, map, 'green')
      if(circle) {
        originalGeorefMarker.circle = circle
      }

      //remove the newGeorefCircle
      if (newGeorefCircle) {
        newGeorefCircle.setMap(null)
        newGeorefCircle = null
      }

      //set the draggable pin
      let coords = subGeoref.decimalCoordinates.split(',').map(x => Number(Number(x.trim()).toFixed(8)))

      let pinLocation = {lat: coords[0], lng: coords[1]}
      if (coordsPin) { 
        coordsPin.setPosition(pinLocation)
      }
      else {
        coordsPin = new google.maps.Marker({
          position: pinLocation,
          map: map,
          draggable: true,
          title: "Move to update coordinates"
        });

        google.maps.event.addListener(coordsPin, 'dragend', function(evt){
          let coords = evt.latLng.toUrlValue()
          if(newGeorefCircle) {
            newGeorefCircle.setPosition(evt.latLng)
          }
          else {
            newGeorefCircle = makeCircle(coords, subGeoref.uncertainty, subGeoref.uncertaintyUnit, map, 'blue')
          }
          dispatch('new-coords', coords)
        });
      }

      prevGeoref = subGeoref

      map.panTo(pinLocation)

    }    
  }

  //helpers
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

  const makeMarker = (coords, map, color, title) => {
    let coordsParts = coords.split(',').map(x => Number(Number(x.trim()).toFixed(8)))
    let center = new google.maps.LatLng(...coordsParts)

    let marker = new google.maps.Marker({
      position: center,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5, 
        fillColor: color, 
        fillOpacity: 1,
        strokeColor: color
      }, 
      zIndex: 0,
      title
    });

    return marker

  }

  const makeCircle = (coords, uncertainty, uncertaintyUnit, map, color) => {
    let coordsParts = coords.split(',').map(x => Number(Number(x.trim()).toFixed(8)))
    let center = new google.maps.LatLng(...coordsParts)
    if( uncertainty && uncertaintyUnit){
      let accuracy = getRadiusM(uncertainty, uncertaintyUnit)
      if(accuracy){
        let circle = new google.maps.Circle({
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.2,
          center,
          map,
          radius: accuracy, 
          clickable: false
        });
        return circle
      }
      else {
        return null
      }
    }
    else {
      return null
    }
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
  }

</style>