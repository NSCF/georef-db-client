import validate from '../src/CSVUtilities/validateCSVContent.js'
import fs from 'fs-extra'
import path from 'path'

let testFileName = String.raw`McGregorHerps_accessioned_wb_import_final.csv`
let testFilePath = String.raw`C:\Users\engelbrechti\Google Drive\SANBI NSCF\NSCF Data WG\Current projects\Herp specimen digitization\HerpSpecimenData\McGregor Herp Specimen Data`
let fullPath = path.join(testFilePath, testFileName)

let requiredFields = {
  countryField: 'dwc:country',
  recordIDField: 'dwc:catalogNumber',
  localityField: 'dwc:locality',
  collectorField: 'dwc:recordedBy'
}

fs.readFile(fullPath, 'utf8').then(fileString=> {
  validate(fileString, requiredFields).then(fileSummary => {

    let recordsToGeoreference = 0
    let georefCountries = Object.keys(fileSummary.localityRecordIDMap)
    for (const georefCountry of georefCountries){
      let localityCollectors = Object.keys(fileSummary.localityRecordIDMap[georefCountry])
      for (const locCol of localityCollectors){
        recordsToGeoreference += fileSummary.localityRecordIDMap[georefCountry][locCol].length
      }
    }

    console.log('all done')
  }).catch(err => console.log(err))
}).catch(err => console.log(err))