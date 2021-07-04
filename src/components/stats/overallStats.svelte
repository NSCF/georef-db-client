<script>
  import {Realtime as Firebase} from '../../firebase.js'
  import GeorefStats from './georefStats.svelte'

  export let profile

  let statsRefStrings = [
    `stats/perUser/${profile.uid}/georefsAdded`,
    `stats/perUser/${profile.uid}/recordsGeoreferenced`,
    'stats/georefsAdded',
    'stats/recordsGeoreferenced',
    'stats/lastGeorefAdded', 
    'stats/lastGeorefAddedBy'
  ]

  let statsLabels = [
    'My georefs', 
    'My records',
    'Total georefs',
    'Total records',
    'Last georef', 
    'Last georef by'
  ]
</script>

<!-- ############################################## -->
<!-- HTML -->
<div>
  <GeorefStats {Firebase} {statsRefStrings}  {statsLabels} descriptor={'Georef stats:'}/>
</div>
<!-- ############################################## -->
<style>
</style>