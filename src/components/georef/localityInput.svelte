<script>

import {createEventDispatcher} from 'svelte'
export let value
export let hasError

let thisel

const handleCopy = ev => {
  if(navigator.clipboard.writeText) {
    if(value && value.trim()) {
      //anything selected?
      let selected = getSelectedText()
      if(selected){
        navigator.clipboard.writeText(selected).then(_ => {
          if(window.pushToast) {
            window.pushToast('selection copied')
          }
        })
      }
      else {
        navigator.clipboard.writeText(value).then(_ => {
          console.log('locality copied')
          if(window.pushToast) {
            window.pushToast('locality copied')
          }
        })
      }
    }
    else {
      alert('no content to copy')
    }
  }
  else {
     alert('this browser does not support programmatic copy/paste')
  }
}

const handlePaste = _ => {
  if(navigator.clipboard.readText){
    navigator.clipboard.readText().then(pasteVal => {
      if(pasteVal && pasteVal.trim()){
        value = pasteVal.trim()
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
  else {
    alert('this browser does not support programmatic copy/paste')
  }
  
}

//helper
//modified from https://stackoverflow.com/questions/4342229/copy-selected-text-from-one-textarea-to-another
function getSelectedText() {
    if (typeof thisel.selectionStart == "number") {
        return thisel.value.slice(thisel.selectionStart, thisel.selectionEnd);
    } else if (typeof document.selection != "undefined") {
        var range = document.selection.createRange();
        if (range.parentElement() == thisel) {
            return range.text;
        }
    }
    console.log('no value to copy')
    return null;
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="icon-input-container">
    <textarea class="icon-input" class:hasError type="text" id="loc" rows="2" bind:value bind:this={thisel}/>
    <span class="material-icons inline-icon icon-input-icon" style="right:30px" title="copy coords" on:click={handleCopy}>content_copy</span>
    <span class="material-icons inline-icon icon-input-icon" style="right:5px" title="paste coords" on:click={handlePaste}>content_paste</span>
</div>

<!-- ############################################## -->
<style>

textarea {
  resize: vertical;
}

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