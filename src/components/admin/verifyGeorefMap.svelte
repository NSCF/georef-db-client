<script>
  import {onMount, createEventDispatcher} from 'svelte'
  import { Loader as MapsAPILoader } from '@googlemaps/js-api-loader';
  import mapsAPIKey from '../../keys'

  const dispatch = createEventDispatcher()

  export let georef

  let container
  let map
  let mapReady = false
  let marker

  onMount(async _ => {
    if (!google || !google.maps){
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

    const measureTool = new MeasureTool(map, {showSegmentLength: false}); //don't remove this
    mapReady = true
  })

  $: if(georef && mapReady) {
    try {
      let center = new google.maps.LatLng(georef.decimalLatitude, georef.decimalLongitude);
      if(!marker) {
        marker = new google.maps.Marker({
          position: center,
          map: map,
          draggable:true,
          title:"Drag to update coordinates"
        });

        google.maps.event.addListener(coordsPin, 'dragend', function(evt){
          let coords = evt.latLng.toUrlValue()
          dispatch('new-coords', coords)
        });
      }
      else {
        marker.setPosition(center)
        if(marker.circle) {
          marker.circle.setMap(null)
        }
      }

      //set the circle
      if(georef.uncertainty && georef.uncertaintyUnit){
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
        }
      }

      map.panTo(center)

    }
    catch(err) {
      alert('oops, something went wrong, there are no coordinates for this georef')
    }
  }

  //helper
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
  }

</style>