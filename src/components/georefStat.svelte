<script>
import {onMount} from 'svelte'

export let labelText
export let stat
export let isGeoref //for recording whether this is georefs or records

let greens = ['#c3c388', '#77b300']
let browns = ['#ff944d', '#cc5200']

let el 
let cols

$: stat, flash()

onMount(_ => {

  if(isGeoref){
    cols = browns
  }
  else {
    cols = greens
  }

  el.style.backgroundColor = cols[0]
  el.style.boxShadow = '0 0 2px 2px' + cols[0]

})

function flash() {
  if(stat != null && stat != undefined && el) {
    //first stop it in case it is still transitioning
    el.style.transitionProperty = 'none'
    el.style.backgroundColor = getComputedStyle(el).backgroundColor //yes it's needed
    el.style.boxShadow = getComputedStyle(el).boxShadow //yes its needed
    
    //and start over
    el.style.transition = "all 0.01s"
    el.style.backgroundColor = cols[1]
    el.style.boxShadow = '0 0 2px 2px' + cols[1]
  }
}

const handleTransitionend = _ => {
  el.style.transition = "all 0.5s ease-out"
  el.style.backgroundColor = cols[0]
  el.style.boxShadow = '0 0 2px 2px' + cols[0]
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<span class="container" on:transitionend={handleTransitionend} bind:this={el}>
  <span class="label">{labelText}:</span><span class="stat">{stat}</span>
</span>


<!-- ############################################## -->
<style>
.container {
  border-radius: 2px;
  padding: 3px;
  margin:5px
}
.label {
  margin-right:5px;
}
.stat {
  font-weight: bolder;
}
</style>