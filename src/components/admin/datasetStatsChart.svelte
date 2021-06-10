<script>

  import {onMount} from 'svelte'
  import { Realtime } from '../../firebase.js'
  import BarChart from '../BarChart.svelte'
  import Loader from '../loader.svelte'

  export let dataset
  export let profilesIndex = null
  export let userID
  export let size = 6 //the number of columns in the graph

  //stats
  let chartData
  let dailyChartData
  let weeklyChartData
  let monthlyChartData

  let profilesData = {}

  let selectedType
  let selectedUID

  const weekDays = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat']
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  let greens = ['#c3c388', '#77b300'] //for records
  let browns = ['#ff944d', '#cc5200'] //for georefs

  onMount(_ => {
    fetchAndMakeChartData(size, 'weekly', null)
  })

  $: selectedType, selectedUID, setChartData()

  const setChartData = async _ =>{
    if(selectedType) { //needed to prevent this from running on load
      if(selectedUID) {
        if(profilesData[selectedUID] && profilesData[selectedUID][selectedType]){
          chartData = profilesData[selectedUID] && profilesData[selectedUID][selectedType]
        }
        else {
          await fetchAndMakeChartData(size, selectedType, selectedUID)
        }
      }
      else {
        let found = false
        if(selectedType == 'daily' && dailyChartData) {
          chartData = dailyChartData
          found = true
        }
        if(selectedType == 'weekly' && weeklyChartData) {
          chartData = weeklyChartData
          found = true
        }
        if(selectedType == 'monthly' && monthlyChartData) {
          chartData = monthlyChartData
          found = true
        }

        if(!found) {
          fetchAndMakeChartData(size, selectedType, null)
        }
      }
    }
    
  }

  //ties all the below together, called on select change
  const fetchAndMakeChartData =  async (size, type, uid) => {
    let statsObj = await fetchStats(size, type, uid)
    let cd = makeChartData(statsObj, type) //name so as not to class with the above
    if(uid){
      if(profilesData[uid]) {
        profilesData[uid][type] = cd //this shouldn't happen because we check it first above
      }
      else {
        profilesData[uid] = {}
        profilesData[uid][type] = cd
      }
    }
    else {
      if(type == 'daily') {
        dailyChartData = cd
      }
      if(type == 'weekly') {
        weeklyChartData = cd
      }
      if(type == 'monthly') {
        monthlyChartData = cd
      }
    }

    chartData = cd //the final one!!
  }

  const makeChartData = (statsObj, type) => {
    let labels = []
    let georefs = []
    let records = []

    for (let [key, stats] of Object.entries(statsObj)) {
      labels.push(key)
      georefs.push(stats.georefsAdded)
      records.push(stats.recordsGeoreferenced)
    }

    if(type == 'daily'){
      labels = labels.map(x => {
        let d = new Date(x)
        let ind = d.getDay()
        return weekDays[ind]
      })
    }

    if(type == 'weekly'){
      labels = labels.map(x => {
        let parts = x.split(' ')
        return getDateOfISOWeek(parts[1], parts[0])
      })
    }

    if(type == 'monthly') {
      labels = labels.map(x => {
        let parts = x.split(' ')
        let ind = Number(parts[1]) - 1
        parts[1] = monthNames[ind]
        parts.reverse()
        return parts.join(' ')
      })
    }

    let data = {
      labels, 
      datasets: [
        {
          label: 'georefs',
          data: georefs,
          borderColor: browns[1],
          backgroundColor: browns[0]
        }, 
        {
          label: 'records',
          data: records,
          borderColor: greens[1],
          backgroundColor: greens[0]
        }
      ]
    }
    return data

  }

  /**
   * 
   * @param Realtime
   * @param {number} size - the number of dates to fetch
   * @param {string} type - daily, weekly or monthly
   * @param {string} uid - a user id, used to fetch stats for a specific user
   */
  const fetchStats = async (size, type, uid) => {
    
    let dates
    if(type == 'daily') {
      dates = getLastDays(size)
    }
    
    if(type == 'weekly') {
      dates = getLastWeeks(size)
    }

    if(type == 'monthly') {
      dates = getLastMonths(size)
    }
    
    let proms = {} //use an object to keep track of the keys and values
    for (let date of dates) {
      let path
      if(uid) {
        path = `stats/perDataset/${dataset.datasetID}/perUser/${uid}/${type}/${date}`
      }
      else {
        path = `stats/perDataset/${dataset.datasetID}/${type}/${date}`
      }
      proms[date] = Realtime.ref(path).once('value')
    }

    await Promise.all(Object.values(proms))

    let data = {}
    for (let [date, prom] of Object.entries(proms)) {
      prom.then(snap => {
        if(snap.exists()) {
          data[date] = snap.val()
        }
        else {
          data[date] = {
            georefsAdded: 0,
            recordsGeoreferenced: 0
          }
        }
      })
    }

    return data
    
  }

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

  const getLastDays = size => {
    let days = []
    let today = getToday()
    days.push(today)
    
    let d = new Date(today)
    for (let i = 1; i < size; i++) {
      d.setDate(d.getDate() - 1)
      let day = d.toISOString().split('T')[0]
      days.push(day)
    }
    days.reverse()
    return days
  }

  const getLastWeeks = size => {
    let weeks = []
    let thisWeek = getYearWeek(new Date())
    weeks.push(thisWeek)
    while(weeks.length < size) {
      thisWeek = decrementYearWeek(thisWeek)
      weeks.push(thisWeek)
    }

    weeks.reverse()

    return weeks

  }

  const getLastMonths = size => {
    let months = []
    let thisMonth = getYearMonth(new Date())
    months.push(thisMonth)

    while(months.length < size) {
      thisMonth = decrementYearMonth(thisMonth)
      months.push(thisMonth)
    }

    months.reverse()
    return months
  }

  const decrementYearWeek = yw => {
    let parts = yw.split(' ')
    let d = getDateOfISOWeek(parts[1], parts[0])
    d = new Date(d)
    d.setDate(d.getDate()-7);
    return getYearWeek(d)
  }

  const decrementYearMonth = ym => {
    let parts = ym.split(' ')
    let d = new Date(parts[0], parts[1], 1) //gives us the first of the month
    d.setMonth(d.getMonth() - 1);
    d = d.toISOString().split('T')[0]
    let newparts = d.split('-')
    newparts.pop()
    return newparts.join(' ')
  }

  const getDateOfISOWeek = (w, y) => {
    var simple = new Date(y, 0, 1 + (w - 1) * 7); 
    var dow = simple.getDay();
    var ISOweekStart = simple;
    if (dow <= 4){
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } 
    else{
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }

    //note we need to increment to get Monday instead of Sunday
    ISOweekStart.setDate(ISOweekStart.getDate() + 1)
        
    let ISODate = ISOweekStart.toISOString().split('T')[0];
    return ISODate
  }

  const getToday = _ => {
    let now = new Date()
    let today = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
    return today
  }

</script>

<!-- ############################################## -->
<!-- HTML -->
{#if chartData}
  {#if selectedType == 'daily'}
    <div class="chart-title">Dataset stats for last six days</div>
  {:else if selectedType == 'weekly'}
    <div class="chart-title">Dataset stats for last six weeks</div>
  {:else if selectedType == 'monthly'}
    <div class="chart-title">Dataset stats for last six months</div>
  {/if}
  <div class="chart-div">
    <select class='time-select' bind:value={selectedType}>
      <option value="daily" selected>Daily</option>
      <option value="weekly" selected>Weekly</option>
      <option value="monthly">Monthly</option>
    </select>
    {#if profilesIndex && (dataset.createdByID == userID  || (dataset.admins && dataset.admins.includes(userID)))}
      <select class='profile-select' bind:value={selectedUID}>
        <option value="" selected>All</option>
        {#each dataset.georeferencers.sort((a, b) => profilesIndex[a].firstName.toLowerCase().localeCompare(profilesIndex[b].firstName.toLowerCase())) as uid}
          <option value={uid}>{profilesIndex[uid].firstName}</option>
        {/each}
      </select>
    {:else}
      <select class='profile-select' bind:value={selectedUID}>
        <option value="" selected>All</option>
        <option value={userID}>Just mine</option>
      </select>
    {/if}
    <BarChart {chartData}/>
  </div>
{:else}
  <div class="loader">
    <Loader />
  </div>
{/if}
<!-- ############################################## -->
<style>
  .loader {
    height: 200px;
  }
  .chart-div {
    position: relative;
  }

  .time-select {
    position:absolute;
    right: 20px;
    top: -15px;
    width: 100px;
  }

  .profile-select {
    position:absolute;
    left: 40px;
    top: -15px;
    width: 100px;
  }

  .chart-title {
    font-weight:bolder;
    text-align: center;
    text-decoration:underline;
  }
</style>