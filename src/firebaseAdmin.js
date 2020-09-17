import { getRecordGroup, countRecords, testFirebase, emptyCollection } from './firebaseAdminFuncs.js'


//emptyCollection('recordGroups').then(_ => console.log('all done'))

//countRecords('recordGroups', 'completed', true).then(count => console.log(count, 'records match query'))

getRecordGroup().then(groupKey => console.log(groupKey))