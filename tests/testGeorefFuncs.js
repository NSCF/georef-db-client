const fetch = require('isomorphic-fetch')

const { fetchAdmins, fetchCandidateGeorefs } = require('../src/components/georef/georefFuncs')

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

fetchCandidateGeorefs(groupLocs, 'southernafricater').then(r => console.log(r)).catch(err => console.log(err.message))

-26.07337190, 32.95889062