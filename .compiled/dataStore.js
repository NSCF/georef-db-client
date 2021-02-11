'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.dataStore = undefined;var _store = require('svelte/store');

var dataStore = exports.dataStore = (0, _store.writable)({
  recordGroupSnap: null, //these are Firestore documentSnapShots, because we need the refs
  recordGroup: null,
  georefIndex: null,
  locGeorefIndex: null,
  selectedGeoref: null,
  selectedMarker: null, //for storing the map marker that's selected
  markers: null //a dictionary for storing pointers to all the markers
});
//# sourceMappingURL=dataStore.js.map