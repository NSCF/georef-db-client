<script>

  //shows the records/georefs for the whole team, or per team member over the last time period (days, weeks, months)
  import makeTeamMemberData from '../../generalUtilities/makeTeamMemberData'
  import makeTeamTotals from '../../generalUtilities/makeTeamTotals'
  import makeChartData from '../../generalUtilities/makeChartData'
  import { Realtime } from '../../firebase.js'
  import BarChart from '../BarChart.svelte'
  import Loader from '../loader.svelte'
  import { text } from 'svelte/internal';

  export let teamProfiles
  export let size = '6' //the number of columns in the graph

  //stats
  let stats = null //For the raw georef and record counts
  let chartData = null

  let selectTypes = ['daily', 'weekly', 'monthly']

  let selectedType = 'weekly'
  let selectedUID = 'all'

  let browns = ['#ff944d', '#cc5200'] //for georefs
  let greens = ['#c3c388', '#77b300'] //for records

  const setChartData = _ => {
    if(selectedType) { //needed to prevent this from running on load
      if(stats[selectedUID] && stats[selectedUID][selectedType]){
        chartData = makeChartData(stats[selectedUID][selectedType], browns[1], browns[0], greens[1], greens[0])
      }
      else {
        chartData = null
        console.error(`data for ${selectedUID} ${selectedType} does not exist. Something must be wrong...`)
        console.log(stats)
      }
    }
  }

  const fetchUserStats = async uid => {
    try {
      const userStatsSnap = await Realtime.ref('stats/perUser/' + uid).once('value')
      const userStats = userStatsSnap.val()
      return userStats
    }
    catch(err) {
      console.error(err)
      alert('error fetching user stats: ' + err.messge )
    }
  }

  const fetchAndMakeChartData =  async _ => {
    console.log('running fetchAndMakeChartData')
    if (teamProfiles && Array.isArray(teamProfiles) && teamProfiles.length) {

      //reset
      // selectedType = 'weekly'
      // selectedUID = 'all'
      
      const proms = {}
      for (const profile of teamProfiles) {
        proms[profile.uid] = fetchUserStats(profile.uid)
      }

      //resolve all promises
      try {
        await Promise.all(Object.values(proms))
      }
      catch(err) {
        console.error(err)
        alert('error fetching user stats: ' + err.message)
        return
      }

      //make the chart data for each user
      const localStats = {}
      for (const [uid, prom] of Object.entries(proms)) {
        const userStats = await prom
        localStats[uid] = makeTeamMemberData(userStats, size)
      }

      const totals = makeTeamTotals(localStats)
      localStats['all'] = totals

      stats = localStats
      setChartData()

    }
  }

  $:  getGeorefTotals = function() {
    if (stats) {
      if(selectedType) { //needed to prevent this from running on load
        if(stats[selectedUID] && stats[selectedUID][selectedType]){
          return stats[selectedUID][selectedType].georefs.reduce((accumulator, currentValue) => {
            return accumulator + currentValue
          },0)
        }
      }
    } 
  }

  $:  getRecordTotals = function() {
    if (stats) {
      if(selectedType) { //needed to prevent this from running on load
        if(stats[selectedUID] && stats[selectedUID][selectedType]){
          return stats[selectedUID][selectedType].records.reduce((accumulator, currentValue) => {
            return accumulator + currentValue
          },0)
        }
      }
    } 
  }

  const copyStats = () => {
    if (chartData) {
      let textData = ''
      const labels = chartData.labels
      const datasets = chartData.datasets
      const georefs = datasets[0].data
      const records = datasets[1].data
      textData += 'date\tgeorefs\trecords\n' 
      for (let i = 0; i < labels.length; i++) {
        textData += labels[i] + '\t' + georefs[i] + '\t' + records[i] + '\n'
      }
      navigator.clipboard.writeText(textData).then(_ => alert('stats copied'))
    }
    else {
      alert('no stats to copy')
    }
  }

</script>

<!-- ############################################## -->
<!-- HTML -->
<div style="max-height: 100%">
  <div style="display:flex; gap:1em;">
    <button on:click={fetchAndMakeChartData}>Get team stats</button>
    <button on:click={copyStats}>Copy stats</button>
  </div>
  <!-- <button on:click={_ => chartData = null}>clear chart data</button>
  <button on:click={setChartData}>Add chart data</button> -->
  <div class="chart-div">
    {#if selectedType == 'daily'}
      <div class="chart-title">Team stats for last {size} days</div>
    {:else if selectedType == 'weekly'}
      <div class="chart-title">Team stats for last {size} weeks</div>
    {:else if selectedType == 'monthly'}
      <div class="chart-title">Team stats for last {size} months</div>
    {/if}
    <select class='profile-select' bind:value={selectedUID} on:change={setChartData}>
      <option value="all">all</option>
      {#each teamProfiles as profile}
        <option value={profile.uid}>{profile.firstName}</option>
      {/each}
    </select>
    <div class="time-select">
      <!-- <select bind:value={size} on:change={fetchAndMakeChartData()}>
        {#each selectPeriods as period}
        <option value={period}>{period}</option>
        {/each}
      </select> -->
      <input type="number" id="timespan" style="width:60px" bind:value={size} on:change={fetchAndMakeChartData} />
      <select bind:value={selectedType} on:change={setChartData}>
        {#each selectTypes as type}
        <option value={type}>{type}</option>
        {/each}
      </select>
    </div>
    
    {#if chartData}
    <BarChart {chartData}/>
    {:else}
    <div class="loader">
      <Loader />
    </div>
    {/if}
    <div style="display: flex; justify-content: space-between;">
      <span>Total georefs: {getGeorefTotals()}</span>
      <span>Total records: {getRecordTotals()}</span>
    </div>
  </div>
</div>

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
    width: 200px;
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