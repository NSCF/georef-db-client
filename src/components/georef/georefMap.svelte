<!-- Note that this depends on having the google maps api script in your index.html file -->
<script>

export let geoRefs

let ready = false
let container;
let map;
let currentGeoref
let currentMarker
let markers = []
let radii = []

let markersDrawn = false //because otherwise changes to markers are changes to map and it draws markers again!

window.initMap = function ready() {
	map = new google.maps.Map(container, {
    zoom: 5,
    center: {lat: -24.321476, lng: 24.909317}
  });
}

$:geoRefs, resetMarkers()

$:if(map && geoRefs && geoRefs.length && !markersDrawn) {
  console.log('drawing markers')
  let bounds = new google.maps.LatLngBounds()
  for (let geoRef of geoRefs){
    let center = new google.maps.LatLng(geoRef.lat,geoRef.long);
    let marker = new google.maps.Marker({
      position: center,
      map, 
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5, 
        fillColor: 'green', 
        fillOpacity: 1,
        strokeColor: 'green'
      }
    })

    marker.geoRef = geoRef

    let circle = new google.maps.Circle({
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#FF0000",
      fillOpacity: 0.2,
      center,
      map,
      radius:geoRef.radiusM
    });

    bounds.extend(center);

    marker.addListener('click', _ => {
      
      if(marker === currentMarker) {
        console.log('you already clicked me')
      }
      else {
        
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5, 
          fillColor: 'blue', 
          fillOpacity: 1,
          strokeColor: 'blue'
        })

        if(currentMarker) {
          currentMarker.geoRef.clicked = false
          currentMarker.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5, 
            fillColor: 'green', 
            fillOpacity: 1,
            strokeColor: 'green'
          })
        }

        currentMarker = marker
        currentMarker.geoRef.clicked = true
        
      }     
    })

    markers.push(marker)
    radii.push(circle)

    markersDrawn = true

  }

  map.fitBounds(bounds)
}

const resetMarkers = _ => {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
    radii[i].setMap(null);
  }
  markers = [];
  radii = []
  markersDrawn = false
}
  
</script>

<!-- ############################################## -->
<!-- HTML -->

<svelte:head>
  	<script 
      src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD_3Zs4G0iv3_teiE-cPMPEF4lotqiZPqU&callback=initMap">
    </script>
</svelte:head>

<div class="mapview" bind:this={container}></div>

<!-- ############################################## -->
<style>

.mapview {
  width: 60vw;
  height:60vh;
}

</style>