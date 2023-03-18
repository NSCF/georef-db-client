<script>
  export let labelText
  export let stat
  export let isGeoref //for recording whether this is georefs or records

  let greens = ['#c3c388', '#77b300'] //for records
  let browns = ['#ff944d', '#cc5200'] //for georefs
  let baseColour
  let flashColour

  let el 

  $: if(isGeoref) {
    baseColour = browns[0]
    flashColour = browns[1]
  }
  else {
    baseColour = greens[0]
    flashColour = greens[1]
  }

  $: if (el) {
    el.style.setProperty('--base-color', baseColour)
    el.style.setProperty('--flash-color', flashColour)
  }

  $: stat, (_ => {
    if (el) {
      console.log('running flash')
      el.classList.remove('flash');
      void el.offsetWidth; //see https://stackoverflow.com/a/30072037/3210158
      el.classList.add('flash');
    }
  })()

  const getDateFromTimestamp = timestamp => {
    let dts = new Date(timestamp)// dts = date from time stamp
    let d = new Date(dts.getTime() - dts.getTimezoneOffset() * 60 * 1000) //corrected to current timezone so .toISOString will work
    return d.toISOString().split('.')[0].replace('T', ' ')
  }

</script>

<!-- HTML ############################################## -->

<span class="flash" bind:this={el}>{labelText}: {isNaN(stat) || stat < 1000000000 ? stat : getDateFromTimestamp(stat)}</span>


<!-- ############################################## -->
<style>

  span {
    --base-color: undefined;
    --flash-color: undefined;
    background-color: var(--base-color);
    box-shadow: 0 0 2px 3px var(--base-color);
    color: black;
    font-weight: bolder;
    margin-right:5px;
    border-radius: 2px;
    padding: 3px;
    margin: 5px;
  }

  .flash {
    animation-name: flash;
    animation-timing-function: ease-out;
    animation-duration: 1s;
  }

  @keyframes flash {
    0%   {background-color: var(--flash-color); box-shadow: 0 0 2px 3px var(--flash-color);}
    100% {background-color: var(--base-color); box-shadow: 0 0 2px 3px var(--base-color);}
  }


</style>