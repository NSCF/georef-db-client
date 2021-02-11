'use strict';var fetch = require('isomorphic-fetch');var _require =

require('../src/components/georef/georefFuncs'),fetchAdmins = _require.fetchAdmins,fetchCandidateGeorefs = _require.fetchCandidateGeorefs;

var groupLocs = [
{
  id: 'aasdfasdf',
  loc: 'Dwarsriver, Cederberg' },

{
  id: 'gdfasdf',
  loc: 'Langeberge, Western Cape' },

{
  id: 'zxvfasdf',
  loc: 'Sneeukop, Cederberge' }];



fetchCandidateGeorefs(groupLocs, 'southernafricater').then(function (r) {return console.log(r);}).catch(function (err) {return console.log(err.message);}) -

26.07337190, 32.95889062;
//# sourceMappingURL=testGeorefFuncs.js.map