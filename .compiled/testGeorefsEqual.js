"use strict";

var _georefFormFuncs = require("../src/components/georef/georefFormFuncs.js");

var a = {
  "locality": "Dwarsrivier, Cederberg",
  "decimalLatitude": -32.5037960,
  "decimalLongitude": 19.258882,
  "uncertainty": 5,
  "uncertaintyUnit": "km",
  "datum": "WGS84",
  "georefBy": "Engelbrecht, I",
  "georefDate": "2021-01-22",
  "protocol": "NSCF protocol",
  "sources": "Google Maps | 1:250k topomap",
  "remarks": null,
  "verified": false,
  "verifiedDate": null,
  "verifiedBy": null,
  "verifiedRemarks": null,
  "georefID": "jRZCLfrNxTnGehBWeLwBW",
  "country": "South Africa",
  "stateProvince": "Western Cape",
  "originalGeorefSource": "NSCF georeference database",
  "dateCreated": 1611311189162,
  "createdBy": "Engelbrecht, I." }; //run this in the debugger


var b = {
  "locality": "Dwarsrivier, Cederberg",
  "decimalLatitude": -32.503796,
  "decimalLongitude": 19.258882,
  "uncertainty": 4,
  "uncertaintyUnit": "km",
  "datum": "WGS84",
  "georefBy": "Engelbrecht, I",
  "georefDate": "2021-01-22",
  "protocol": "NSCF protocol",
  "sources": "Google Maps | 1:250k topomap",
  "remarks": null,
  "verified": false,
  "verifiedDate": null,
  "verifiedBy": null,
  "verifiedRemarks": null,
  "georefID": "jRZCLfrNxTnGehBWeLwBW",
  "country": "South Africa",
  "stateProvince": "Western Cape",
  "originalGeorefSource": "NSCF georeference database",
  "dateCreated": 1611311189162,
  "createdBy": "Engelbrecht, I." };


console.log('gerefs are equal?', (0, _georefFormFuncs.georefsEqual)(a, b));
//# sourceMappingURL=testGeorefsEqual.js.map