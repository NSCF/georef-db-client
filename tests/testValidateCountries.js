import 'isomorphic-fetch'
import { firebaseConfig }  from '../src/firebaseConfig.js'
import firebase from "firebase/app/dist/index.cjs.js"
import 'firebase/database/dist/index.cjs.js'

import { validateCountries, getCountries } from '../src/dwcUtilities/validateCountries.js'

firebase.initializeApp(firebaseConfig);

const Realtime = firebase.database()


const region = 'Southern Africa'
const testCountries = ['South Africa', 'Namibia', 'Eswatini', 'bla bla', '   ', 'Congo', 'Korea']

getCountries().then(async restCountries => {
  let snap = await Realtime.ref('settings/georefRegions').once('value')
  let regionCountries = snap.val()[region]
  const invalidCountries = validateCountries(testCountries, restCountries, regionCountries)
  if (invalidCountries.length > 0) {
    for (let [key, value] of Object.entries(invalidCountries.countryCodes)){
      console.log(`${key}: ${value}`)
    }
  }
}).catch(err => console.error(err))