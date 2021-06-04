<script>
  import { Realtime } from '../../firebase.js'
  import BarChart from '../BarChart.svelte'
  import Loader from '../loader.svelte'

  export let dataset
  export let profilesIndex
  
  //stats
  let chartData

  let greens = ['#c3c388', '#77b300'] //for records
  let browns = ['#ff944d', '#cc5200'] //for georefs

  $: if(dataset && profilesIndex) {
    let labels = []
    let georefs = []
    let records =[]
    let proms = []
    for (let [key, val] of Object.entries(profilesIndex)) {
      if(dataset.georeferencers.includes(key)) {
        proms.push(statsForUser(key))
        labels.push(val.firstName)
      }
    }

    Promise.all(proms).then(res => { //res is an array of arrays
      
      for (let r of res) {
        georefs.push(r[0])
        records.push(r[1])
      }

      chartData = {
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
    })
  }

  const statsForUser = async uid => {
    let georefs = Realtime.ref('stats/perDataset/' + dataset.datasetID + '/perUser/' + uid + '/georefsAdded').once('value')
    let records = Realtime.ref('stats/perDataset/' + dataset.datasetID + '/perUser/' + uid + '/recordsGeoreferenced').once('value')
    let snaps = await Promise.all([georefs, records])
    let counts = snaps.map(x => x.val())
    return counts
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