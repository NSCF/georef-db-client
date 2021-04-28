<script>
  import {onMount} from 'svelte'
  import { Realtime } from '../../firebase.js'
  import BarChart from '../BarChart.svelte'
  import Loader from '../loader.svelte'

  export let datasetID
  export let type //weekly or monthly
  export let size = 6 //the number of columns in the graph

  //stats
  let chartData

  let greens = ['#c3c388', '#77b300'] //for records
  let browns = ['#ff944d', '#cc5200'] //for georefs

  onMount(_ => {
    //fetch the chart data
    Realtime.ref('stats/perDataset/' + datasetID + '/' + type).once('value').then(snap => {
      if(snap.exists){
        console.log(snap.val())
        chartData = makeChartStats(snap.val(), type, size)
      }
    })
  })
  
  //converts results from a call to Firebase to the structure needed for barchart
  //this is for dataset stats. See different function call for georeferencer stats
  const makeChartStats = (firebaseData, type, size) => {

    let labels = []
    let georefs = []
    let records = []
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    for (let [key, val] of Object.entries(firebaseData)) {
      if(type == 'weekly') {
        let parts = key.split(' ') //key is YYYY WW
        let d = getDateOfISOWeek(parts[1], parts[0])
        labels.push(d)
      }
      else if(type == 'monthly') {
        let parts = key.split(' ') //key is YYYY MM
        let mon = monthNames[Number(parts[1]) - 1]
        labels.push(mon)
      }
      georefs.push(val.georefsAdded)
      records.push(val.recordsGeoreferenced)
    }

    //add the additional records up to the required number of entries for the graph
    while (labels.length < size) {
      if(type == 'weekly') {
        let earliest =  labels[0]
        let parts = earliest.split('-')
        let d = new Date(parts[0], parts[1] - 1, parts[2])
        d.setDate(d.getDate() - 7 ) //one week earlier
        let iso = d.toISOString().split('T')[0] //just the date part
        labels.unshift(iso)
      }
      else if (type == 'monthly') {
        //here we have to use the first key because we discarded the year above
        let earliest =  labels[0]
        let index = monthNames.findIndex(x => x == earliest)
        if(index == 0) {
          index = 11
        }
        labels.unshift(monthNames[--index])
      }
      georefs.unshift(0)
      records.unshift(0)
    }

    console.log('labels is:', labels.join(';'))

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

  //helper for above
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
</script>

<!-- ############################################## -->
<!-- HTML -->
{#if chartData}
  <BarChart {chartData}/>
{:else}
  <div>
    <Loader />
  </div>
{/if}
<!-- ############################################## -->
<style>
  div {
    height: 200px;
  }
</style>