<script>
import {onMount} from 'svelte'
import { Firestore } from '../../firebase.js'

let georefs = new Promise(resolve => {console.log('initiated record groups')})
let lastVisible
let tableHeader = ['country', 'locality', 'province', 'coordinates', 'uncertainty', 'records', 'created', 'last edit', 'verified', 'groups verified']
let tableRowKeys = ['countryCode', 'locality', 'stateProvince', '', '', 'totalAssRecords', 'dateCreated', 'lastEdited', 'verified', 'allGroupsVerified']

let filterCountryCode
let filterProvince
let filterVerified
let filterGroupsVerified

onMount(_ => {
 refreshList()
})

const getGeorefs = async _ => {

  console.log('fetching georeferences')
  let query = Firestore.collection('georefs')

  if(filterCountryCode){
    query = query.where("countryCode", "==", filterCountryCode)
  }

  query = query.where('datasetID', '==', datasetID)
  .where('completed', '==', false)
  .where("groupLocked", "==", false)

  if(!filterCountryCode) {
    query = query.orderBy("countryCode", "desc")
  }
  
  query = query.orderBy("groupRecordCount")

  if(lastVisible){
    query = query.startAfter(lastVisible)
  }
  
  query = query.limit(20)

  let snap = await query.get()

  if(!snap.empty){
    let temp = []
    console.log(snap.size.toString(), 'record groups returned')
    snap.forEach(doc =>{
      temp.push(doc.data())
    })
    lastVisible = snap.docs[snap.docs.length-1]
    return Promise.resolve(temp)
  }
  return Promise.reject()
}

</script>

<!-- ############################################## -->
<!-- HTML -->

<!-- ############################################## -->
<style>
</style>