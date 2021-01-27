<script>

import {createEventDispatcher} from 'svelte'
export let value
export let hasError

const handleCopy = ev => {
  if(value && value.trim()) {
    navigator.clipboard.writeText(value).then(_ => {
      console.log('locality copied')
      if(window.pushToast) {
        window.pushToast('locality copied')
      }
    })
  }
}

const handlePaste = _ => {
  navigator.clipboard.readText().then(coordsString => {
    if(coordsString && coordsString.trim()){
      value = coordsString.trim()
    }
    else {
      if(window.pushToast) {
        window.pushToast('clipboard empty')
      }
      else {
        alert('clipboard empty')
      }
    }
  })
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="icon-input-container">
    <textarea class="icon-input" class:hasError type="text" id="loc" rows="2" bind:value/>
    <span class="material-icons inline-icon icon-input-icon" style="right:30px" title="copy coords" on:click={handleCopy}>content_copy</span>
    <span class="material-icons inline-icon icon-input-icon" style="right:5px" title="paste coords" on:click={handlePaste}>content_paste</span>
</div>

<!-- ############################################## -->
<style>

.icon-input-container {
  display: inline-block;
  position:relative;
  width: 100%;
}

.icon-input {
  padding-right: 60px;
  width: 100%;
  overflow: hidden;
}

.icon-input-icon {
  position:absolute;
  bottom:30px; /* becuase the default bottom margin for an input is 8*/
  /* no right property, that must go into the inline style for the element */
  width:24px;
  height:24px;
  color: grey;
}

.icon-input-icon:hover {
  cursor: pointer;
  color: darkslategray;
}

.hasError {
  border: 1px solid rgb(133, 49, 34);
  background-color: rgb(255, 155, 155)
}
</style>