import 'isomorphic-fetch'

import { fetchAdmins, fetchCandidateGeorefs, getNextAvailableRecordGroup } from '../src/components/georef/georefFuncs.js'

let groupLocs = [
  {
    id: 'aasdfasdf',
    loc: 'Dwarsriver, Cederberg', 
  }, 
  {
    id: 'gdfasdf',
    loc: 'Langeberge, Western Cape', 
  }, 
  {
    id: 'zxvfasdf',
    loc: 'Sneeukop, Cederberge', 
  }
]

//fetchCandidateGeorefs(groupLocs, 'southernafricater').then(r => console.log(r)).catch(err => console.log(err.message))

const datasetID = 'TKvfDkR6ps_X9q9oKfus1'
const admins = [
  {
    country: 'South Africa', 
    stateProvs: ['all', 'KwaZulu-Natal', 'Eastern Cape', 'Limpopo']
  }, 
  {
    country: 'Lesotho',
    stateProvs: ['all', 'none', 'berea']
  }
]

//NOTE this doesn't work because we can't test Firebase javascript client in node
testEach().then(_ => console.log('all done')).catch(err => console.error('error testing function', err.message))

async function testEach() {
  for (const admin of admins) {
    for (const stateProv of admin.stateProvs) {
      let res
      try {
        res = await getNextAvailableRecordGroup(datasetID, admin.country, stateProv)
      }
      catch(err) {
        let i = 0
      }

      if(res) {
        if(res.length) {
          let record = res[0].data()
          console.log('got a recordGroup for', country, stateProvince, 'with locality', record.groupKey)
        }
        else {
          console.log('there are no available recordGroups for', country, stateProvince)
        }
      }
      else {
        console.log('fetching recordGroup for', country, stateProvince, 'failed!')
      }
    }
  }
}