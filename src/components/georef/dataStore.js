import { writable } from 'svelte/store';

export const dataStore = writable({
  recordGroupSnap: null, //these are Firestore documentSnapShots, because we need the refs
  recordGroup: null,
  georefIndex: null,
  locGeorefIndex: null,
  selectedGeoref: null
});