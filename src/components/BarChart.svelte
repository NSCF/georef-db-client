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

  $: if(chartData && ctx) {
    new Chart(ctx, {
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
  
</script>

<!-- ############################################## -->
<!-- HTML -->

<canvas bind:this={ctx} width="400" height="200"></canvas>

<!-- ############################################## -->
<style>
</style>