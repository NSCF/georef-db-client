<script>

  import {
    Chart,
    LineElement,
    PointElement,
    LineController,
    LinearScale,
    CategoryScale,
    Legend,
    Title,
    Tooltip
  } from 'chart.js';

  Chart.register(
    LineElement,
    PointElement,
    LineController,
    LinearScale,
    CategoryScale,
    Legend,
    Title,
    Tooltip)

  export let chartData 

  let ctx
  let chart

  $: if(chartData && ctx) {
    if(!chart) {
      chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          legend: { display: false },
          title: {
            display: false
          }, 
          scales: {
            y: {
              min:0,
              max:100
            }
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