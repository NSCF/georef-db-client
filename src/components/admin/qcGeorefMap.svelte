<script>
  import {onMount, createEventDispatcher} from 'svelte'
  import { Loader as MapsAPILoader } from '@googlemaps/js-api-loader';
  import MeasureTool from 'measuretool-googlemaps-v3'; //https://www.npmjs.com/package/measuretool-googlemaps-v3
  import { dataStore } from '../georef/dataStore.js'
  import { mapsAPIKey } from '../../keys.js'

  const dispatch = createEventDispatcher()

  //we need these to store the current uncertainty vals because they get used again
  let georefUncertainty
  let georefUncertaintyUnit

  let container
  let map
  let mapReady = false
  let mapGeoref //the point and it's uncertainty circle on the map for the original georef coordinates and uncertainty
  let coordsPin //used for updated georef coordinates
  let newUncertaintyCircle //for updated uncertainty around the coordsPin

  let circlesOn = true

  //CODE DUPLICATE HERE IS JUST HORRENDOUS!
  onMount(async _ => {
    const googleMapsAPIExists = checkGoogleMapAPIExists()
    if (!googleMapsAPIExists){
      const loader = new MapsAPILoader({
        apiKey: mapsAPIKey,
        version: "weekly",
        libraries: ["geometry"]
      }); 
      await loader.load()
      dispatch('map-ready')
    }
    
    map = new google.maps.Map(container, {
      zoom: 8,
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

    setMarkersForNewGeorefIndex()
  })

  $: $dataStore.georefIndex, setMarkersForNewGeorefIndex(), updateMarkers() //this is being fancy, if one runs the other doesn't

  export const setMapWithNewGeoref = georef => {
    
    if(mapGeoref) {
      removeMapGeoref()
    }

    if(newUncertaintyCircle) {
      removeUncertaintyCircle()
    }

    if(georef.decimalCoordinates) {
      addMapGeoref(georef)

      if(coordsPin) {
        moveCoordsPin(georef.decimalCoordinates)
      }
      else {
        addCoordsPin(georef.decimalCoordinates)
      }
    }
    else { //TODO when we have regional coords, use these here
      map.setCenter({lat: -24.321476, lng: 24.909317})
      map.setZoom(6)
    }

    georefUncertainty = georef.uncertainty
    georefUncertaintyUnit = georef.uncertaintyUnit

  }

  //for responding to changes in the coords or uncertainty
  export const updateGeorefDetails = data => {
    if(data.decimalCoordinates) {
      moveCoordsPin(data.decimalCoordinates)
      if(newUncertaintyCircle) {
        moveUncertaintyCircle(data.decimalCoordinates)
      }
      else if (georefUncertainty && !data.uncertainty) { //ie we create the circle using the original uncertainty if we don't have a new uncertainty here, otherwise it is handled below
        addUncertaintyCircle(data.decimalCoordinates)
      }
    }
    
    if(data.uncertainty && data.uncertainty > 0 && data.uncertaintyUnit) {
      georefUncertainty = data.uncertainty
      georefUncertaintyUnit = data.uncertaintyUnit
      if(newUncertaintyCircle) {
        updateUncertaintyCircle()
      }
      else {
        const coords = coordsPin.getPosition().toUrlValue() //we might not have a data.decimalCoordinates value here
        addUncertaintyCircle(coords)
      }
    }
  }

  const addCoordsPin = coordsString => {
    const coords = coordsString.split(',').map(x => Number(Number(x.trim()).toFixed(8)))
    const pinLocation = {lat: coords[0], lng: coords[1]}
    coordsPin = new google.maps.Marker({
      position: pinLocation,
      map: map,
      draggable: true,
      color: 'blue',
      title: "Move to update coordinates"
    });

    google.maps.event.addListener(coordsPin, 'dragend', function(evt){
      let coords = evt.latLng.toUrlValue()
      
      if(newUncertaintyCircle) {
        moveUncertaintyCircle(evt.latLng)
      }
      else {
        
        addUncertaintyCircle(coords)
      }

      dispatch('new-coords', coords)
    });
  }

  const moveCoordsPin = coordsString => {
    const coords = coordsString.split(',').map(x => Number(Number(x.trim()).toFixed(8)))
    let pinLocation = {lat: coords[0], lng: coords[1]}
    coordsPin.setPosition(pinLocation)
  }

  const addUncertaintyCircle = coordsString => {
    if(georefUncertainty) {
      newUncertaintyCircle = makeCircle(coordsString, georefUncertainty, georefUncertaintyUnit, map, 'blue')
    }
  }

  const moveUncertaintyCircle = latLng => {
    newUncertaintyCircle.setCenter(latLng)
  }

  const removeUncertaintyCircle = _ => {
    newUncertaintyCircle.setMap(null)
    newUncertaintyCircle = null
  }

  //this is for changes to the size of the uncertainty
  const updateUncertaintyCircle = _ => {
    let newUncertainty = getRadiusM(georefUncertainty, georefUncertaintyUnit)
  
    if(newUncertainty > 0) {
      //do we work with the current new circle or create one?
      if(newUncertaintyCircle.getRadius() != newUncertainty) {
        newUncertaintyCircle.setRadius(newUncertainty)
      }
    }
    else {
      removeUncertaintyCircle()
    }
  }

  const addMapGeoref = georef => {
    mapGeoref = makeMarker(georef.decimalCoordinates, map, 'green', 'Original georef location')

    //set the circle
    let circle = makeCircle(georef.decimalCoordinates, georef.uncertainty, georef.uncertaintyUnit, map, 'green')
    if(circle) {
      mapGeoref.circle = circle
    }
  }

  const removeMapGeoref = _ => {
    if(mapGeoref.circle) {
      mapGeoref.circle.setMap(null)
      mapGeoref.circle = null
    }
    mapGeoref.setMap(null)
    mapGeoref = null
  }

  //THESE ARE SAME FUNCTIONS AS FOR georefMatchMap
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
        fillColor: 'lightgrey', 
        fillOpacity: 1,
        strokeColor: 'lightgrey'
      }, 
      zIndex: 0
    })

    let accuracy = getRadiusM(georef.uncertainty, georef.uncertaintyUnit)

    if(accuracy){
      let circle = new google.maps.Circle({
        strokeColor: 'lightgrey',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: 'lightgrey',
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

  //THEN THIS ONE IS DIFFERENT, BECAUSE WE DON'T HAVE A PIN TO WORRY ABOUT
  const setMarkersForNewGeorefIndex = _ => {
    if(mapReady && $dataStore.georefIndex && Object.keys($dataStore.georefIndex).length && currentGeorefs != $dataStore.georefIndex) {
      clearMapMarkers()
      setNewMapMarkers()
      setMapBounds()
    }
  }

  //helpers

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
    console.log('adding marker')
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
    if(uncertainty && uncertaintyUnit){
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