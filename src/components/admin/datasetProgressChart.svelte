<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { Realtime } from '../../firebase.js';
  import LineChart from '../LineChart.svelte';
  import Loader from '../loader.svelte';
  import { getSafeTime } from '../../../src/utilities.js'
  import getProgressChartData from '../../generalUtilities/getProgressChartData.js';

  const dispatch = createEventDispatcher()

  export let dataset

  //stats
  let chartData
  let noData = false
  let dailyChartData
  let weeklyChartData
  let monthlyChartData

  let selectedType

  onMount(async _ => {

    let timeNow = null
    try {
      timeNow = await getSafeTime()
    }
    catch(err) {
      dispatch('componenterror', err)
      return
    }
    
    //work out if we must show days or weeks to start
    let created = dataset.dateCreated
    let end
    if (dataset.completed) {
      end = new Date(dataset.lastGeoreference).getTime()
    }

    let diff
    if (end) {
      diff = end - dataset.dateCreated
    }
    else {
      diff = timeNow - dataset.dateCreated
    }

    let daysdiff = diff / (1000*60*60*24)
    if (daysdiff < 21) {
      selectedType = 'daily'
      let dailyChartData = await getProgressChartData(Realtime, dataset.datasetID, dataset.recordCount, selectedType)
      if (dailyChartData){ //it could be null
        chartData = dailyChartData
      }
      else {
        noData = true
      }
    }
    else {
      selectedType = 'weekly'
      let weeklyChartData = await getProgressChartData(Realtime, dataset.datasetID, dataset.recordCount, selectedType)
      if (weeklyChartData){ //it could be null
        chartData = weeklyChartData
      }
      else {
        noData = true
      }
    }
  })

  //$: if (selectedType) selectChartData(selectedType)

  const selectChartData = async type => {

    chartData = null
    
    if (type == 'daily') {
      if(!dailyChartData) {
        dailyChartData = await getProgressChartData(Realtime, dataset.datasetID, dataset.recordCount, type)
        if(dailyChartData) {
          chartData = dailyChartData
        }
        else {
          noData = true
        }
      }
      
    }
    
    if (type == 'weekly') {
      if(!weeklyChartData) {
        weeklyChartData = await getProgressChartData(Realtime, dataset.datasetID, dataset.recordCount, type)
        if (weeklyChartData) {
          chartData = weeklyChartData
        }
        else {
          noData = true
        }
      }
      
    }

    if (type == 'monthly') {
      if(!monthlyChartData) {
        monthlyChartData = await getProgressChartData(Realtime, dataset.datasetID, dataset.recordCount, type)
        if (monthlyChartData) {
          chartData = monthlyChartData
        }
        else {
          noData = true
        }
      }
      
    }
  }


</script>

<!-- ############################################## -->
<!-- HTML -->
{#if chartData}
  <div class="chart-title">Dataset completion progress</div>
  <div class="chart-div">
    <select class='chart-select' bind:value={selectedType} on:change="{_ => selectChartData(selectedType)}">
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
    </select>
    <LineChart {chartData}/>
  </div>
{:else if noData}
  <div></div>
{:else }
  <div class='loader'>
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

  .chart-select {
    position:absolute;
    right: 40px;
    top: -15px;
    width: 100px;
  }

  .chart-title {
    font-weight:bolder;
    text-align: center;
    text-decoration:underline;
  }
</style>