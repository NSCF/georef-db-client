<script>
import {onMount} from 'svelte'
import GeorefStat from './georefStat.svelte'

export let Firebase
export let statsRefStrings = []
export let statsLabels = []
export let descriptor

let stats = []

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

$: if(Firebase && statsRefStrings && statsRefStrings.length) {
  getStats()
}

function getStats() {
  stats = []
  for (let [index, refstring] of statsRefStrings.entries()){
    refstring = refstring.replace('yearweek', yearweek).replace('yearmonth', yearmonth).replace('today', today)
    Firebase.ref(refstring).on('value', snap => {
      let val = snap.val()
      if(val) {
        stats[index] = val
      }
      else {
        stats[index] = 0
      }
    })
  }
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="container">
  {#each stats as stat, index}
    <GeorefStat {stat} labelText={statsLabels[index]} isGeoref={!statsRefStrings[index].toLowerCase().includes('record')} />
  {/each}
  <span>{descriptor}:</span>
</div>


<!-- ############################################## -->
<style>
.container {
  display:flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}

span {
  margin-top:10px;
  font-weight: bolder;
  margin-right:10px;
}
</style>

