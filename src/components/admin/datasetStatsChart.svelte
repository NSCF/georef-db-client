<script>
  import {onMount} from 'svelte'
  import { Realtime } from '../../firebase.js'
  import BarChart from '../BarChart.svelte'

  export let datasetID
  export let type //weekly or monthly

  //stats
  let chartData

  let greens = ['#c3c388', '#77b300'] //for records
  let browns = ['#ff944d', '#cc5200'] //for georefs

  onMount(_ => {
    //fetch the chart data
    Realtime.ref('stats/perDataset/' + datasetID + '/' + type).once('value').then(snap => {
      if(snap.exists){
        console.log(snap.val())
        chartData = makeChartStats(snap.val(), type)
      }
    })
  })
  
  //converts results from a call to Firebase to the structure needed for barchart
  //this is for dataset stats. See different function call for georeferencer stats
  const makeChartStats = (firebaseData, type) => {

    console.log('type is', type)
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
{/if}
<!-- ############################################## -->
<style>
</style>