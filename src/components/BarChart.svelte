<script>

  import {
    Chart,
    BarElement,
    BarController,
    CategoryScale,
    LinearScale,
    Legend,
    Title,
    Tooltip
  } from 'chart.js';

  Chart.register(BarElement,
    BarController,
    CategoryScale,
    LinearScale,
    Legend,
    Title,
    Tooltip)

  export let chartData 

  let ctx

  let chart

  $: if(chartData && ctx) {
    if(!chart) {
      chart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
          legend: { display: false },
          title: {
            display: false
          }
        }
      })
    }
    else {
      chart.data = chartData
      chart.update()
    }
    
  }
  
</script>

<!-- ############################################## -->
<!-- HTML -->

<canvas bind:this={ctx} width="400" height="200"></canvas>

<!-- ############################################## -->
<style>
</style>