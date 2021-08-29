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
  let currentGeorefs //just an object pointer to the georefIndex recieved.
  let circlesOn = true

  const checkGoogleMapAPIExists = _ => {
    if(window.google && typeof window.google == 'object') {
      if(window.google.maps && typeof window.google.maps == 'object') {
        if(window.google.maps.Map && typeof window.google.maps.Map == 'function') {
          return true
        }
      }
    }
    return false
  }

  //this creates the map
  onMount(async _ => {
    //we need this because otherwise the script reloads each time the component mounts which it complains about
    const googleMapsAPIExists = checkGoogleMapAPIExists()
    if (!googleMapsAPIExists){
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

    //the circle toggle button....
    //copied and modified from https://developers.google.com/maps/documentation/javascript/examples/control-custom 
    const centerControlDiv = document.createElement("div");
    const controlUI = document.createElement("div");
    controlUI.style.backgroundColor = "#fff";
    controlUI.style.border = "2px solid #fff";
    controlUI.style.borderRadius = "3px";
    controlUI.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
    controlUI.style.cursor = "pointer";
    controlUI.style.margin = "10px";
    controlUI.style.textAlign = "center";
    controlUI.title = "Click to toggle uncertainty circles";
    centerControlDiv.appendChild(controlUI);
    // Set CSS for the control interior.
    const controlText = document.createElement("div");
    controlText.style.color = "rgb(25,25,25)";
    controlText.style.fontFamily = "Roboto,Arial,sans-serif";
    controlText.style.fontSize = "16px";
    controlText.style.lineHeight = "38px";
    controlText.style.paddingLeft = "5px";
    controlText.style.paddingRight = "5px";
    controlText.innerHTML = "Circles";
    controlUI.appendChild(controlText);
    // Setup the click event listeners: simply set the map to Chicago.
    controlUI.addEventListener("click", toggleCircles)

    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(centerControlDiv);

    const measureTool = new MeasureTool(map, {showSegmentLength: false}); //don't remove this
    mapReady = true

    setMarkersAndPinForNewGeorefIndex()

  })

  $: $dataStore.georefIndex, setMarkersAndPinForNewGeorefIndex(), updateMarkers() //this is being fancy, if one runs the other doesn't


  $: if(map && coordsPin && pastedDecimalCoords) {
    let latlon = pastedDecimalCoords.split(',').map(x=>Number(x))
    let pos = {lat: latlon[0], lng: latlon[1]} //google.maps.LatLngLiteral
    coordsPin.setPosition(pos)
    map.panTo(pos)
  }


  const getGeorefsBounds = _ => {
    if($dataStore.georefIndex && Object.keys($dataStore.georefIndex).length) {
      let bounds = new google.maps.LatLngBounds()
      for (let georef of Object.values($dataStore.georefIndex)){
        if(!georef.ambiguous) {
          let coords = new google.maps.LatLng(georef.decimalLatitude, georef.decimalLongitude);
          bounds.extend(coords);
        }
      }

      return bounds
      
    }
    else {
      return null
    }
  }

  const setMapBounds = _ => {
    const bounds = getGeorefsBounds()
    if(bounds) {
      map.fitBounds(bounds)
    }
  }

  const clearMapMarkers = _ => {
    if($dataStore.markers && Object.keys($dataStore.markers).length){
      for (let marker of Object.values($dataStore.markers)){
        if(marker.circle){
          marker.circle.setMap(null)
        }
        marker.setMap(null)
      }
      $dataStore.markers = null
    }
  }
  /**
   * Sets new map markers on change of the georefIndex
   */
  const setNewMapMarkers = _ => {
    if($dataStore.georefIndex && Object.keys($dataStore.georefIndex).length && currentGeorefs != $dataStore.georefIndex) {

      //in case
      circlesOn = true

      for (let [georefID, georef] of Object.entries($dataStore.georefIndex)) {
        if(georef.ambiguous) {
          continue
        }
        
        //else
        let marker
        try {
          marker = createMarker(georef, map, circlesOn)
        }
        catch(err) {
          console.log(`error creating marker for ${georefID}:`, err.message)
          continue
        }
        
        if(!$dataStore.markers){
          $dataStore.markers = {}
        }

        $dataStore.markers[georefID] = marker
        
      }

      currentGeorefs = $dataStore.georefIndex

      setMapBounds()

    }
  }

  const addDraggablePin = _ => {
    const bounds = getGeorefsBounds()
    const boundsCenter = bounds.getCenter()
    coordsPin = new google.maps.Marker({
      position: boundsCenter,
      map: map,
      draggable:true,
      title:"Use for coordinates"
    });

    google.maps.event.addListener(coordsPin, 'dragend', function(evt){
      let coords = evt.latLng.toUrlValue()
      navigator.clipboard.writeText(coords).then(_ => {
        if(window.pushToast) {
          window.pushToast('coordinates copied')
        }
      })
    });

    google.maps.event.addListener(map, 'dblclick', function(e) {
      var positionDoubleclick = e.latLng;
      coordsPin.setPosition(positionDoubleclick);
      let coords = positionDoubleclick.toUrlValue()
      navigator.clipboard.writeText(coords)
      map.panTo(positionDoubleclick);
      if(window.pushToast) {
        window.pushToast('coordinates copied')
      }
    });
  }

  const recenterDraggablePin = _ => {
    if(coordsPin) {
      const bounds = getGeorefsBounds()
      const boundsCenter = bounds.getCenter()
      coordsPin.setPosition(boundsCenter)
      if(navigator && navigator.clipboard) {
        navigator.clipboard.writeText('') //clear it just in case
      }
    }
  }

  const setMarkersAndPinForNewGeorefIndex = _ => {
    if(mapReady && $dataStore.georefIndex && Object.keys($dataStore.georefIndex).length && currentGeorefs != $dataStore.georefIndex) {
      
      clearMapMarkers()
      setNewMapMarkers()
      setMapBounds()
      if(coordsPin) {
        recenterDraggablePin()
      }
      else {
        addDraggablePin()
      }    
    }
  }

  /**
   * Add or remove markers on changes to original $dataStore.georefIndex
   */
  const updateMarkers = _ => {
    if ($dataStore.georefIndex && Object.keys($dataStore.georefIndex).length && currentGeorefs == $dataStore.georefIndex) {
          
      //check if any have been added
      for (let [georefID, georef] of Object.entries($dataStore.georefIndex)){
        if(!georef.ambiguous) { //we don't plot ambiguous georefs
          if ($dataStore.markers) {
            if(!$dataStore.markers.hasOwnProperty(georefID)){
              //add it to the map
              let marker = createMarker(georef, map, circlesOn)
              $dataStore.markers[georefID] = marker
            }
          }
          else {
            let marker = createMarker(georef, map, circlesOn)
            $dataStore.markers = {}
            $dataStore.markers[georefID] = marker
          }
        }
      }

      //check if any georefs have been removed
      for (let [markerID, marker] of Object.entries($dataStore.markers)){
        if(!$dataStore.georefIndex.hasOwnProperty(markerID)){
          //remove it from the map
          marker.circle.setMap(null)
          marker.setMap(null)
          delete $dataStore.markers[markerID]
        }
      }
    }
  }

  const createMarker = (georef, map, showCircle) => {
    if(!georef) {
      throw new Error('georef is null')
    }

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
        clickable: false,
        visible: showCircle
      });

      marker.circle = circle

      google.maps.event.addListener(circle, 'dblclick', function(e) {
        google.maps.event.trigger(map, 'dblclick', e);
      })
    }

    marker.addListener('click', _ => {
      dispatch('georef-selected', georef.georefID)
    })

    marker.panToMe = _ => {
      map.panTo(marker.getPosition())
    }
    return marker
  }

  const toggleCircles = _ => {
    if($dataStore.markers && Object.keys($dataStore.markers).length) {
      if(circlesOn){
        for (let marker of Object.values($dataStore.markers)){
          if(marker.circle) {
            marker.circle.setVisible(false)
          }
        }
        circlesOn = false
      }
      else {
        for (let marker of Object.values($dataStore.markers)){
          if(marker.circle) {
            marker.circle.setVisible(true)
          }
        }
        circlesOn = true
      }
    }
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