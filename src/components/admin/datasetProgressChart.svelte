<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { Realtime } from '../../firebase.js';
  import LineChart from '../LineChart.svelte';
  import Loader from '../loader.svelte';
  import { getSafeTime } from '../../../src/utilities.js'

  const dispatch = createEventDispatcher()

  export let dataset

  //stats
  let chartData
  let noData = false
  let dailyChartData
  let weeklyChartData
  let monthlyChartData

  let selectedType

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

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
    let now = timeNow
    let diff = now - dataset.dateCreated
    let daysdiff = diff / (1000*60*60*24)
    if (daysdiff < 21) {
      selectedType = 'daily'
      dailyChartData = await getChartData(selectedType)
      chartData = dailyChartData
    }
    else {
      selectedType = 'weekly'
      weeklyChartData = await getChartData(selectedType)
      chartData = weeklyChartData
    }
  })

  //$: if (selectedType) selectChartData(selectedType)

  const selectChartData = async type => {
    
    if (type == 'daily') {
      if(!dailyChartData) {
        dailyChartData = await getChartData('daily')
      }
      chartData = dailyChartData
    }
    
    if (type == 'weekly') {
      if(!weeklyChartData) {
        weeklyChartData = await getChartData('daily')
      }
      chartData = weeklyChartData
    }

    if (type == 'monthly') {
      if(!monthlyChartData) {
        monthlyChartData = await getChartData(type)
      }
      chartData = monthlyChartData
    }
  }

  //converts results from a call to Firebase to the structure needed for linechart
  const getChartData = async type => {
    let snap = await Realtime.ref('stats/perDataset/' + dataset.datasetID + '/' + type).once('value')
    if(snap.exists) {
      let data = snap.val()
      if (!data) { //apparently this is possible before people start georeferencing, so...
        noData = true
        return null
      }

      let labels = []
      let recordsPerPeriod = [] //day week or month

      let indexPeriod
      let startPeriod
      if(type == 'daily') {
        let d = new Date()
        indexPeriod = d.toISOString().split('T')[0]
        startPeriod = startPeriod = Object.keys(data).reduce((a,b) => a < b ? a : b, indexPeriod) //we're going to step backwards from current/index to start
      }
      else if(type == 'weekly') {
        indexPeriod = getYearWeek(new Date())
        startPeriod = Object.keys(data).reduce((a,b) => a < b ? a : b, indexPeriod) //we're going to step backwards from current/index to start
      }
      else { //monthly
        let today = getToday()
        let parts = today.split('-')
        parts.pop()
        indexPeriod = parts.join(' ')
        startPeriod = Object.keys(data).reduce((a,b) => a < b ? a : b, indexPeriod)
      }

      while (indexPeriod >= startPeriod) {
        if(type == 'daily') {
          labels.push(indexPeriod)
        }
        else if(type == 'weekly') {
          let parts = indexPeriod.split(' ')
          labels.push(getDateOfISOWeek(parts[1], parts[0]))
        }
        else {
          let parts = indexPeriod.split(' ')
          let mon = monthNames[Number(parts[1]) - 1]
          let label = mon + ' ' + parts[0]
          labels.push(label)
        }
        
        if(data[indexPeriod]) {
          recordsPerPeriod.push(Number(data[indexPeriod].recordsGeoreferenced))
        }
        else {
          recordsPerPeriod.push(0)
        }

        if (type =='daily') {
          indexPeriod = decrementDate(indexPeriod)
        }
        else if(type == 'weekly'){
          indexPeriod = decrementYearWeek(indexPeriod)
        }
        else {
          indexPeriod = decrementYearMonth(indexPeriod)
        }
      }

      //we need to reverse the order
      labels.reverse()
      recordsPerPeriod.reverse()

      //from https://stackoverflow.com/questions/20477177/creating-an-array-of-cumulative-sum-in-javascript/20477613
      // see comments there that this cannot be reused, so we have to declare it here and use it here
      const cumSum = (sum => value => sum += value)(0);

      let recordsPerPeriodPerc = recordsPerPeriod.map(x => Math.round((x / dataset.recordCount) * 100))

      let recordsCumSum = recordsPerPeriodPerc.map(cumSum)

      let chartData = {
        labels, 
        datasets: [
          {
            label: '% records complete',
            data: recordsCumSum,
            borderColor: '#606060',
            backgroundColor: '#A9A9A9'
          }
        ]
      }
      return chartData
    }
    else {
      noData = true
      return null
    }
  }

  //helpers 
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

  //this is getting copied around the place...
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

  const decrementDate = d => {
    let today = new Date(d)
    //https://stackoverflow.com/a/24774070/3210158
    let yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000)); //(hours * minutes * seconds * milliseconds)
    yesterday = yesterday.toISOString().split('T')[0]
    return yesterday
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
    if(Number(parts[1]) == 1){
      parts[0] = Number(parts[0]) - 1
      parts[1] = 12
    }
    else {
      parts[1] = Number(parts[1]) - 1 
      parts[1] = parts[1].toString().padStart(2, '0')
    }

    return parts.join(' ')
    
  }

  //Gets the timezone corrected ISO date...
  const getToday = _ => {
    let now = new Date()
    let today = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
    return today
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