<script>
import validateCSVContent from '../CSVUtilities/validateCSVContent.js'

//props
export let file
export let requiredFields

//vars
let fileSummary

//watchers
$:file, 

async function getFileSummary(){
  fileSummary = await validationResult(file, requiredFields)
}

</script>

<!-- ############################################################# -->
<!-- HTML -->



<!-- ############################################################# -->
<style>

</style>