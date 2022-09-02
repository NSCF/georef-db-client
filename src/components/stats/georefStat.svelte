<script>
import {onMount} from 'svelte'

export let labelText
export let stat
export let isGeoref //for recording whether this is georefs or records

let greens = ['#c3c388', '#77b300'] //for records
let browns = ['#ff944d', '#cc5200'] //for georefs

let el 

$: stat, flash()

onMount(_ => {
  el.classList.remove('ping')
  if(isGeoref){
    el.style.backgroundColor = browns[0]
    el.style.color = browns[0] //for box shadow
  }
  else {
    el.style.backgroundColor = greens[0]
    el.style.color = greens[0] //for box shadow
  }
})

function flash() {
  if(stat != null && stat != undefined && el) {
    el.classList.add('ping')
    if(isGeoref) {
      el.style.backgroundColor = browns[1]
      el.style.color = browns[1] //for box shadow
    }
    else {
      el.style.backgroundColor = greens[1]
      el.style.color = greens[1] //for box shadow
    }
  }
}

const handleTransitionend = _ => {
  if(el.classList.contains('ping')){
    el.classList.remove('ping') 
  }

  if(isGeoref){
    el.style.backgroundColor = browns[0]
    el.style.color = browns[0] //for box shadow
  }
  else {
    el.style.backgroundColor = greens[0]
    el.style.color = greens[0] //for box shadow
  }
}

const getDateFromTimestamp = timestamp => {
  console.log(timestamp)
  let dts = new Date(timestamp)// dts = date from time stamp
  let d = new Date(dts.getTime() - dts.getTimezoneOffset() * 60 * 1000) //corrected to current timezone so .toISOString will work
  return d.toISOString().split('.')[0].replace('T', ' ')
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<span class="base ping" on:transitionend={handleTransitionend} bind:this={el}>
  <!--assume that any stats that are very large integers are timestamps-->
  <span class="label">{labelText}:</span><span>{isNaN(stat) || stat < 1000000000 ? stat : getDateFromTimestamp(stat)}</span>
</span>

<!-- ############################################## -->
<style>
.base {
  will-change: background-color, box-shadow;
  border-radius: 2px;
  padding: 3px;
  margin:5px;
  transition: background-color 500ms ease-out, box-shadow 500ms ease-out;
  box-shadow: 0 0 2px 2px;
}

.ping {
  transition: background-color 5ms;
  box-shadow: 0 0 2px 2px;
}

span {
  color:black; /*because we have to tackle the box shadow of the other element itself*/
}

.label {
  font-weight: bolder;
  margin-right:5px;
}

</style>