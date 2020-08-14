import * as funcs from './firebaseAdminFuncs.js'


funcs.default.emptyCollection('recordGroups').then(_ => console.log('all done'))