require('isomorphic-fetch')

import validateCountries from '../src/dwcUtilities/validateCountries.js'

validateCountries(['South Africa', 'Namibia', 'bla bla', '   ', 'Congo', 'Korea'])
.then(results => {
  //console.log(results.invalid.map(x => `${x.searchName}: ${x.message}`).join('; '))
  for (let [key, value] of Object.entries(results.countryCodes)){
    console.log(`${key}: ${value}`)
  }
})