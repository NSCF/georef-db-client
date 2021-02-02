<script>
export let value
export let hasError
export let hasBy = false //for the rule about having an agent name first

let re = /^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/ //for valid dates

$: invalidFormat = Boolean(value && value.trim() && !re.test(value))

const addDate = _ => {
  if(hasBy){
    let now = new Date()
    value = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
  }
  else {
    alert('\'by\' is required before a date can be added')
  }
}

const handleInputPasteDate = ev => {
  ev.preventDefault()
  let pasteData = ev.clipboardData.getData("text")

  //for alternative regex that allows YYYY, YYY-MM or YYYY-MM-DD see https://stackoverflow.com/questions/53175624/javascript-regex-for-yyyy-mm-dd-with-an-optional-month-and-day
  if(re.test(pasteData)) {
    value = pasteData
  }
  else {
    alert('invalid date value: ' + pasteData)
  }
}

</script>

<!-- ############################################## -->
<!-- HTML -->
<div class="icon-input-container">
    <input type="text" class="icon-input" class:hasError={hasError || invalidFormat} on:paste={handleInputPasteDate} bind:value>
    <span class="material-icons inline-icon icon-input-icon" style="right:5px" title="copy coords" on:click={addDate}>today</span>
</div>

<!-- ############################################## -->
<style>

.icon-input-container {
  display: inline-block;
  position:relative;
  max-width: 200px;
  text-align: right;
}

.icon-input {
  padding-right: 30px;
  width: 100%;
  max-width:200px;
}

.icon-input-icon {
  position:absolute;
  bottom:13px; /* becuase the default bottom margin for an input is 8*/
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