<script>
  import {Realtime as Firebase} from '../../firebase.js'
  import GeorefStats from './georefStats.svelte'

  export let dataset
  export let profile

  let statsRefStrings = [
    `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/georefsAdded`,
    `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/recordsGeoreferenced`,
    `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/daily/today/georefsAdded`,
    `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/daily/today/recordsGeoreferenced`,
    `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/weekly/yearweek/georefsAdded`,
    `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/weekly/yearweek/recordsGeoreferenced`,
    `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/monthly/yearmonth/georefsAdded`,
    `stats/perDataset/${dataset.datasetID}/perUser/${profile.uid}/monthly/yearmonth/recordsGeoreferenced`,
    `stats/perDataset/${dataset.datasetID}/daily/today/georefsAdded`,
    `stats/perDataset/${dataset.datasetID}/daily/today/recordsGeoreferenced`,
    `stats/perDataset/${dataset.datasetID}/weekly/yearweek/georefsAdded`,
    `stats/perDataset/${dataset.datasetID}/weekly/yearweek/recordsGeoreferenced`,
    `stats/perDataset/${dataset.datasetID}/monthly/yearmonth/georefsAdded`,
    `stats/perDataset/${dataset.datasetID}/monthly/yearmonth/recordsGeoreferenced`,
    `stats/perDataset/${dataset.datasetID}/georefsAdded`,
    `stats/perDataset/${dataset.datasetID}/recordsGeoreferenced`,
    `stats/perDataset/${dataset.datasetID}/lastGeorefAdded`,
    `stats/perDataset/${dataset.datasetID}/lastGeorefAddedBy`
  ]

  let statsLabels = [
    'My total georefs', 
    'My total records',
    'My georefs today',
    'My records today',
    'My georefs this week', 
    'My records this week', 
    'My georefs this month', 
    'My records this month', 
    'All georefs today',
    'All records today',
    'All georefs this week', 
    'All records this week', 
    'All georefs this month', 
    'All records this month',
    'Total georefs',
    'Total records', 
    'Last georef', 
    'Last georef by'
  ]     
</script>

<!-- ############################################## -->
<!-- HTML -->
<div >
  <GeorefStats {Firebase} {statsRefStrings} {statsLabels} descriptor={dataset.datasetName}/>
</div>
<!-- ############################################## -->
<style>
</style>