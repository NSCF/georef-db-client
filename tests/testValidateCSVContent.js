//this tests groupLocalities now too

require('isomorphic-fetch')

import validate from '../src/CSVUtilities/validateCSVContent.js'
import groupLocalities from '../src/CSVUtilities/groupLocalities.js'
import validateCountries from '../src/dwcUtilities/validateCountries.js'
import fs from 'fs-extra'
import path from 'path'

let testFileName = String.raw`McGregorHerps_accessioned_wb_import_final - Copy for testing.csv`
let testFilePath = String.raw`C:\Users\engelbrechti\Google Drive\SANBI NSCF\NSCF Data WG\Current projects\Herp specimen digitization\HerpSpecimenData\McGregor Herp Specimen Data`
let fullPath = path.join(testFilePath, testFileName)

let requiredFields = {
  countryField: 'dwc:country',
  recordIDField: 'dwc:catalogNumber',
  localityField: 'dwc:locality',
  collectorField: 'dwc:recordedBy'
}

fs.readFile(fullPath, 'utf8').then(fileString=> {
  validate(fileString, requiredFields).then(async fileSummary => {

    let countries = Object.keys(fileSummary.localityRecordIDMap)
    let countryCheck = await validateCountries(countries)


    let groupResults = await groupLocalities(fileSummary.localityRecordIDMap, 'testID', countryCheck.countryCodes )

    let i = 0

    console.log('all done')
  }).catch(err => console.log(err))
}).catch(err => console.log(err))