import { writable } from 'svelte/store';

export const dataStore = writable({
  recordGroupSnap: null, //these are Firestore documentSnapShots, because we need the refs
  recordGroup: null,
  candidateGeorefs: null,
  selectedGeoref: null
});