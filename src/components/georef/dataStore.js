import { writable } from 'svelte/store';

export const dataStore = writable({
  recordGroupRef: null, //these are Firestore documentSnapShots, because we need the refs
  recordGroup: null,
  candidateGeorefs: null,
  selectedGeoref: null
});