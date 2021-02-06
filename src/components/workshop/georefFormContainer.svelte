<script>
  import GeorefForm from '../georef/georefForm.svelte'
  import Georef from '../georef/Georef.js'

  let georefJSON = {
          "georefDate": "2021-01-22",
          "verifiedBy": null,
          "decimalLatitude": -22.321456,
          "verifiedRemarks": null,
          "protocol": "NSCF protocol",
          "locality": "Dwarsrivier, Cederberg",
          "verifiedDate": null,
          "stateProvince": "Western Cape",
          "uncertainty": 5,
          "datum": "WGS84",
          "dateCreated": 1611311189162,
          "decimalLongitude": 19.258882,
          "sources": "Google Maps | 1:250k topomap",
          "uncertaintyUnit": "km",
          "createdBy": "Engelbrecht, I.",
          "country": "South Africa",
          "remarks": null,
          "georefBy": "Engelbrecht, I",
          "verified": false,
          "originalGeorefSource": "NSCF georeference database",
          "georefID": "jRZCLfrNxTnGehBWeLwBW"
        }
  
  let georef = Object.assign(new Georef, georefJSON)
  delete georef.georefDate
  delete georef.georefBy

  /*
  console.log('protocol is', georef.protocol)
  console.log('protocol object is')
  console.log(georef.protocolObject)
  */
 
  //NB for making sure invalid values don't go through
  /*
  if(!georef.decimalCoordinatesOkay){
    georef.clear()
  }
  */

  let submitButtonText = "Test submit georef"

 // georef = null // for testing null

 const clearGeoref = _ => {
   georef = null
 }

  const handleSetGeoref = ev => {
    let emittedGeoref = ev.detail
    alert('received georef with fields ' + Object.keys(emittedGeoref))
  }

</script>

<!-- ############################################## -->
<!-- HTML -->

<GeorefForm {georef} {submitButtonText} on:clear-georef={clearGeoref} on:set-georef={handleSetGeoref} />


<!-- ############################################## -->
<style>

</style>