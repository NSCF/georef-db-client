import { writable } from 'svelte/store';

export const geoRefs = writable({
  georefArray: [], 
  currentGeoref: null
});