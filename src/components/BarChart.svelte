<script>

  export let statsObject // this is the response from Firebase
  let charData

  import {
    Chart,
    BarElement,
    BarController,
    CategoryScale,
    Legend,
    Title,
    Tooltip
  } from 'chart.js';

  Chart.register(BarElement,
    BarController,
    CategoryScale,
    Legend,
    Title,
    Tooltip)

  let ctx
  
  let myChart = new Chart(ctx, {});



</script>

<!-- ############################################## -->
<!-- HTML -->

<canvas bind:this={ctx} width="400" height="400"></canvas>

<!-- ############################################## -->
<style>
</style>