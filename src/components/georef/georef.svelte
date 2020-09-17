<script>
import shortid from 'shortid'

import RecordGroup from './georefRecordGroup.svelte'
import MatchList from './georefMatchList.svelte'
import MatchMap from './georefMatchMap.svelte'
import GeorefForm from './georefForm.svelte'

let datasetID
let selectedGeoref
let datasetComplete = false

//NB TODO all this new georef stuff must be delegated to georefRecordGroup
const handleSetGeoref = async ev => {
  let geoRef = ev.detail.geoRef
  console.log('got the georef!')
  /*
  let selectedLocRecordIDs = selectedLocs.reduce((a,b) => [...a, ...b.recordIDs], [])
  if(geoRef.georefID) { //it's an existing georef
    // update the georef on firebase to indicate used in this dataset
    //TODO sort this out with a many to many
    if(geoRef.assocDatasets[datasetID]){
      geoRef.assocDatasets[datasetID] = [...geoRef.assocDatasets[datasetID], ...selectedLocRecordIDs]
      geoRef.totalAssRecords += selectedLocRecordIDs.length
    }
    else {
      geoRef.assocDatasets[datasetID] = selectedLocRecordIDs
      geoRef.totalAssRecords = selectedLocRecordIDs.length
    }

    geoRef.lastUsed = Date.now()
    //update it here
  }
  else {
    //create the new georef 
    geoRef.georefID = shortid.generate()
    geoRef.assocDatasets[datasetID] = selectedLocRecordIDs
    geoRef.totalAssRecords = selectedLocRecordIDs.length
    geoRef.dateCreated = Date.now()
    geoRef.lastUsed = Date.now()
    //TODO createdBy = logged in user name
    //save it here
  }

  //push to each of the record group locs
  for (let selectedLoc of selectedLocs) {
    for (let recordGroupLoc of recordGroup.locRecords){
      if (selectedLoc.loc == recordGroupLoc.loc){
        recordGroupLoc.georef = geoRef
        recordGroupLoc.completed = true
        break;
      }
    }
  }  

  //TODO update the Meili records with these georeferences -- this is async on the db so we send and assume it works

  //TODO if this is the last batch of locs being updated
  //save it
  if(!incompleteGroupLocs.length) {
    await recordGroupRef.update(recordGroup)
    recordGroup = null
  }
  

  */
}

const handleBackToDatasets =  _ => {
  //TODO
}

</script>

<!-- ############################################## -->
{#if !datasetComplete}
  
  <div class="grid-container">
    <div class="recordgroup-container">
      <RecordGroup {datasetID} {selectedGeoref}></RecordGroup>
    </div>
    <div class="matchlist-container">
      <MatchList />
    </div>
    <div class="matchmap-container">
      <MatchMap />
    </div>
    <div class="georef-form-container">
      <GeorefForm geoRef={selectedGeoref} on:set-georef={handleSetGeoref}/>
    </div>
  </div>
{:else}
  <div style="text-align:center;margin-top:300px">
    <h3>There are no more records in this dataset</h3>
    <button on:click={handleBackToDatasets}>Back to datasets...</button>
  </div>
{/if}

<!-- ############################################## -->
<style>
.grid-container {
  display: grid;
  grid-template-columns: 20% auto 20%;
  grid-column-gap:10px;
}

.recordgroup-container {
  grid-row: 1 / 3
}

.matchlist-container {
  grid-row: 1 / 2
}

.matchmap-container {
  grid-row: 2 / 3
}

.georef-form-container {
  grid-row: 1 / 3
}
</style>