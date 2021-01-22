<!-- This a construction yard for building and testing components -->
<script>
//import DatasetsList from './admin/datasetsList.svelte'

import {dataStore} from './georef/dataStore.js'

//import RecordGroupList from './admin/recordGroupList.svelte'
import Georef from './georef/georef.svelte'

//import RecordGroup from './georef/georefRecordGroup.svelte'

//mock recordGroup from Firestore
//let recordGroup = {"groupKey":"Uitenhage. Uitenhage C.P","groupID":"jDNgrAb7graniw5gWJek7","datasetID":"Wg9BIXqNJ","groupLocked":false,"completed":false,"groupRecordCount":29,"groupLocalities":[{"loc":"CAPE.. Uitenhage Dist; by the Zwartkop River","recordIDs":["NBG1510211-0"]},{"recordIDs":["NBG1505441-0"],"loc":"South-Eastern Region. Uitenhage Div.; Bethelsdorp"},{"loc":"GRID REF. | REGIO CAPE. Uitenhage Dist., in channel of the Zwartkop River","recordIDs":["NBG1505684-0"]},{"recordIDs":["NBG1505837-0"],"loc":"Prov.: Cape. Dist.: Uitenhage. On hills of Quaggas-vlaktes"},{"recordIDs":["NBG1505840-0"],"loc":"Van Staden Mts. Uitenhage Div. C.P"},{"recordIDs":["NBG1506071-0"],"loc":"Between Zwartkops and Boesmans Rivers. District of Uitenhage"},{"loc":"Between the Zwartkops & Boscheman's River. Dist.: Uitenhage C.P","recordIDs":["NBG1506072-0"]},{"loc":"Between Zwartkop & Sundays Rivers. Dist.; Uitenhage C.P","recordIDs":["NBG1506073-0"]},{"loc":"Between Zwartkop & Boscheman's R","recordIDs":["NBG1506074-0"]},{"loc":"Prov. Cape. Dist.: Uitenhage. Between Zwartkop & Sundays Riv","recordIDs":["NBG1506075-0"]},{"recordIDs":["NBG1506178-0"],"loc":"On Karroolike hills, between Zwartkop and Sunday Rivers, in the second altitude. District of Uitenhage"},{"loc":"On the downs by the mouth of Zwartkop River. Uitenhage, C.P","recordIDs":["NBG1506339-0"]},{"recordIDs":["NBG1506340-0","NBG1511929-0"],"loc":"On the downs by the mouth of the Zwartkop River. District of Uitenhage"},{"recordIDs":["NBG1506342-0"],"loc":"Cape. Uitenhage district. Mouth of Zwartkop River on downs"},{"recordIDs":["NBG1506344-0"],"loc":"On the downs by mouth of Zwartkop River. Uitenhage District"},{"loc":"In the flats . Van Staden's River mountains . District of Uitenhage","recordIDs":["NBG1501016-0"]},{"recordIDs":["NBG1501019-0"],"loc":"In the flats. Van Stadens River mountain. District of Uitenhage"},{"loc":"Near the Van Staden's River Mountains","recordIDs":["NBG1501020-0"]},{"recordIDs":["NBG1501247"],"loc":"CAPE . Uitenhage Dist., on the Van Staden's River Mountains"},{"recordIDs":["NBG1489349-0"],"loc":"Near the Zwartkop River, and on the hills of Adow. District of Uitenhage"},{"loc":"Uitenhage salt pan. Uitenhage, C.P. 3325CD (Port Elizabeth)","recordIDs":["NBG1511888-0"]},{"recordIDs":["NBG1511913-0"],"loc":"Uitenhage District, near Zwartkop River"},{"loc":"Near the Zwartkop River, in the first altitude. District of Uitenhage","recordIDs":["NBG1511937-0"]},{"recordIDs":["NBG1511944-0"],"loc":"Near the Zwartkop River, in the first alt. Uitenhage Div"},{"loc":"Mouth of the Zwartkop River, Uitenhage District","recordIDs":["NBG1511949-0"]},{"recordIDs":["NBG1511050-0"],"loc":"On the grassvelds near the Zwartkop River"},{"recordIDs":["NBG1511240-0"],"loc":"hills of Krakakamma. Uitenhage C.P"},{"loc":"hills of Krakakamma. District of Uitenhage","recordIDs":["NBG1511241-0"]}]}
//$dataStore.recordGroup = recordGroup

const handleSkipRecordGroup = _ => {
  alert('this is a mock')
}

let mockDataset = {
  datasetID: 'Wg9BIXqNJ', 
  region: 'southern africa', 
  domain: 'TER'
}

</script>

<!-- ############################################## -->
<!-- HTML<h2>Datasets</h2>
<DatasetsList />
<h2>locality groups</h2>
-->

<!-- <RecordGroup on:skip-recordgroup={handleSkipRecordGroup}/>  -->

<Georef dataset={mockDataset}/>



<!-- ############################################## -->
<style>
</style>