import Papa from 'papaparse'
import convert from 'xml-js'

let validateCSVContent = (targetFile, requiredFields) => {
  return new Promise((resolve, reject) => {

    //just some cleaning/validation
    Object.keys(requiredFields).forEach(key => {
      if(requiredFields[key] && requiredFields[key].trim()){
        requiredFields[key] = requiredFields[key].trim()
      }
      else {
        requiredFields[key] = null
      }
    })

    if(!requiredFields.recordIDField || !requiredFields.countryField || !requiredFields.localityField){
      reject('required fields not provided')
    }
    
    //otherwise let's get going....
    let totalRows = 0
    let recordIDs = []
    let recordIDsMissing = false
    let recordsMissingCountryAlsoMissingID = false
    let duplicatedRecordIDs = []
    let rowsWithoutCountry = []
    let recordsMissingLocalityAlsoMissingID = false
    let rowsWithoutLocality = []
    let localityRecordIDMap = {} //a dictionary to map georeferences back to records - to send to textpack

    //we use TGN country names as the standard
    let countries = new Set()

    let recordID, country, locality
    Papa.parse(targetFile, {
      step: function(row, parser) {
        totalRows++
        
        recordID = row.data[requiredFields.recordIDField]
        if(recordID && recordID.trim()) {
          recordID = recordID.trim()
        }
        else {
          recordID = null
        }
        
        country = row.data[requiredFields.countryField]
        if(country && country.trim()) {
          country = country.trim()
        }
        else {
          country = null
        }

        locality = row.data[requiredFields.localityField]
        if(locality && locality.trim()) {
          locality = locality.trim()
        }
        else {
          locality = null
        }

        if(!recordID) {
          recordIDsMissing = true
          
          if(!country || ! country.trim()){
            recordsMissingCountryAlsoMissingID = true
          }

          if(!locality || !locality.trim()) {
            recordsMissingLocalityAlsoMissingID = true
          }

        }
        else {
          recordID = row.data[requiredFields.rowIDField].trim().toLowerCase()
          
          if(recordsIDs.includes(recordID)) {
            duplicatedRecordIDs.push(recordIDs)
          }
          else {
            recordIDs.push(recordID)
          }

          if(!country || !country.trim()) {
            rowsWithoutCountry.push(recordID)
          }
          else{
            countries.add(country.trim().toLowerCase())
          }

          if(!locality || !locality.trim()) {
            rowsWithoutLocality.push(recordID)
          }

          if(recordID && country && locality){
            let localityCollector = locality.replace(/\w+/g, ' ')
            if (localityCollector.endsWith('.')){
              localityCollector = localityCollector.substring(0, localityCollector.length-1)
            }

            if(requiredFields.collectorField && row.data[requiredFields.collectorField] && row.data[requiredFields.collectorField].trim()) {
              localityCollector += ' -- ' + row.data[requiredFields.collectorField].trim().replace(/\|/g, "; ")
            }

            //build the dictionary
            if(localityRecordIDMap[country]){
              if(localityRecordIDMap[country][localityCollector]){
                localityRecordIDMap[country][localityCollector].push(recordID)
              }
              else {
                localityRecordIDMap[country][localityCollector] = [recordID]
              }
            }
            else {
              localityRecordIDMap[country] = {}
              localityRecordIDMap[country][localityCollector] = [recordID]
            }
          }
        }  
      },
      complete: function() {
        console.log("All done parsing file!");
        let result = {
          totalRows,
          recordIDsMissing,
          recordsMissingCountryAlsoMissingID,
          duplicatedRecordIDs,
          rowsWithoutCountry,
          recordsMissingLocalityAlsoMissingID,
          rowsWithoutLocality,
          localityRecordIDMap
        }
        resolve(result)
      },
      error(err){
        reject(new Error(`error reading file: ${err.message}`))
      }
    });
  })
}

export default validateCSVContent