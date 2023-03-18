<script>
import GeorefStats from '../stats/georefStats.svelte'

export let Firebase
export let userID
export let datasetID

//testing with the same as georef component
let statsRefStrings = [
	`stats/perDataset/${datasetID}/perUser/${userID}/georefsAdded`,
	`stats/perDataset/${datasetID}/perUser/${userID}/recordsGeoreferenced`,
	`stats/perDataset/${datasetID}/perUser/${userID}/daily/today/georefsAdded`,
  `stats/perDataset/${datasetID}/perUser/${userID}/daily/today/recordsGeoreferenced`,
  `stats/perDataset/${datasetID}/perUser/${userID}/weekly/yearweek/georefsAdded`,
  `stats/perDataset/${datasetID}/perUser/${userID}/weekly/yearweek/recordsGeoreferenced`,
  `stats/perDataset/${datasetID}/perUser/${userID}/monthly/yearmonth/georefsAdded`,
  `stats/perDataset/${datasetID}/perUser/${userID}/monthly/yearmonth/recordsGeoreferenced`,
  `stats/perDataset/${datasetID}/georefsAdded`,
  `stats/perDataset/${datasetID}/recordsGeoreferenced`
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
  'Total georefs',
  'Total records'
]

const getYearWeek = d => {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  // Return array of year and week number
  return `${d.getUTCFullYear()} ${weekNo.toString().padStart(2, '0')}`
}

const getYearMonth = d => {
  let y = d.getUTCFullYear()
  let m = d.getMonth() + 1
  return `${y} ${m.toString().padStart(2, '0')}`
}

let d = new Date()
let yearmonth = getYearMonth(d)
let yearweek = getYearWeek(d)
let today = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time


const incrementFirebase = async _ => {
  for (let ref of statsRefStrings) {
    ref = ref.replace('yearweek', yearweek).replace('yearmonth', yearmonth).replace('today', today)
    Firebase.ref(ref).transaction(val => {
      val++
      return val
    })
  }
}
</script>

<!-- ############################################## -->
<!-- HTML -->
<GeorefStats {Firebase} {statsRefStrings} {statsLabels} descriptor={'This dataset'}/>
<button on:click={incrementFirebase}>inc via Firebase</button>


<!-- ############################################## -->
<style>
</style>