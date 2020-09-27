import groupLocalities from '../src/CSVUtilities/groupLocalities.js'
import {localityRecordIDMap} from './testGoupLocalitiesData.json'
require('isomorphic-fetch')

console.log('groupLocalities is', typeof groupLocalities)
console.log('localityRecordIDMap is', typeof localityRecordIDMap)

let ID = 'asdfasdf'

groupLocalities(localityRecordIDMap, ID).then(groups => {
  let i = 0
})
.catch(err => console.log(err.message))

