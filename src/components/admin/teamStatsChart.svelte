<script>

  //shows the records/georefs for the whole team, or per team member over the last time period (days, weeks, months)
  import { onMount } from 'svelte'
  import makeTeamMemberData from '../../generalUtilities/makeTeamMemberData'
  import makeTeamTotals from '../../generalUtilities/makeTeamTotals'
  import makeChartData from '../../generalUtilities/makeChartData'
  import { Realtime } from '../../firebase.js'
  import BarChart from '../BarChart.svelte'
  import Loader from '../loader.svelte'

  export let teamProfiles
  export let size = 6 //the number of columns in the graph

  //stats
  let stats = null //For the raw georef and record counts
  let chartData = null

  let selectTypes = ['daily', 'weekly', 'monthly']
  let userSelect

  let selectedType = 'weekly'
  let selectedUID = 'all'

  let browns = ['#ff944d', '#cc5200'] //for georefs
  let greens = ['#c3c388', '#77b300'] //for records

  // $: teamProfiles, fetchAndMakeChartData()
  $: teamProfiles, console.log('teamProfiles changed')
  $: selectedType, console.log('selectedType changed')
  $: selectedUID, console.log('selectedUID changed')


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
      selectedType = 'weekly'
      selectedUID = 'all'
      
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

</script>

<!-- ############################################## -->
<!-- HTML -->
<div style="max-height: 100%">
  <button on:click={fetchAndMakeChartData}>Get team stats</button>
  <button on:click={_ => chartData = null}>clear chart data</button>
  <button on:click={setChartData}>Add chart data</button>
  <div class="chart-div">
    {#if selectedType == 'daily'}
      <div class="chart-title">Dataset stats for last six days</div>
    {:else if selectedType == 'weekly'}
      <div class="chart-title">Dataset stats for last six weeks</div>
    {:else if selectedType == 'monthly'}
      <div class="chart-title">Dataset stats for last six months</div>
    {/if}
    <select class='profile-select' bind:value={selectedUID} on:change={setChartData}>
      <option value="all">all</option>
      {#each teamProfiles as profile}
        <option value={profile.uid}>{profile.firstName}</option>
      {/each}
    </select>
    <select class='time-select' bind:value={selectedType} on:change={setChartData}>
      {#each selectTypes as type}
      <option value={type}>{type}</option>
      {/each}
    </select>
    {#if chartData}
    <BarChart {chartData}/>
    {:else}
    <div class="loader">
      <Loader />
    </div>
    {/if}
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