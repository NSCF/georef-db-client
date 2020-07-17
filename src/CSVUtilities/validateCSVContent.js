import Papa from 'papaparse'

let validateCSVContent = (targetFile, requiredFields) => {
  return new Promise((resolve, reject) => {

    if (!targetFile){
      reject('file data required')
      return
    }

    if(!requiredFields){
      reject('required fields object must be provided')
      return
    }

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
      return
    }
    
    //otherwise let's get going....
    let totalRows = 0
    let uniqueRecordIDs = []
    let recordIDsMissing = false
    let recordsMissingCountryAlsoMissingID = false
    let duplicatedRecordIDs = []
    let rowsWithoutCountry = []
    let recordsMissingLocalityAlsoMissingID = false
    let rowsWithoutLocality = []
    let localityRecordIDMap = {} //a dictionary to map georeferences back to records - to send to textpack
    let countriesSummary = {}

    let recordID, country, locality
    Papa.parse(targetFile, { header: true,
      step: function(row) {
        totalRows++
        
        recordID = row.data[requiredFields.recordIDField]
        if(recordID && recordID.trim()) {
          recordID = recordID.trim()
          row.data[requiredFields.recordIDField] = recordID
        }
        else {
          row.data[requiredFields.recordIDField] = null
          recordIDsMissing = true
        }
        
        country = row.data[requiredFields.countryField]
        if(country && country.trim()) {
          country = country.trim()
          row.data[requiredFields.countryField] = country
          if(countriesSummary[country]){
            countriesSummary[country]++
          }
          else {
            countriesSummary[country] = 1
          }
        }
        else {
          row.data[requiredFields.countryField] = null
          if(recordID){
            rowsWithoutCountry.push(recordID)
          }
          else {
            recordsMissingCountryAlsoMissingID = true
          }
        }

        locality = row.data[requiredFields.localityField]
        if(locality && locality.trim()) {
          locality = locality.trim()
          row.data[requiredFields.localityField] = locality
        }
        else {
          row.data[requiredFields.localityField] = null
          if(recordID){
            if(!rowsWithoutCountry.includes(recordID)){
              rowsWithoutLocality.push(recordID)
            }
          }
          else {
            recordsMissingLocalityAlsoMissingID = true
          }
        }

        if(recordID && country && locality){
          let localityCollector = locality.replace(/\s+/g, ' ')
          if (localityCollector.endsWith('.')){
            localityCollector = localityCollector.substring(0, localityCollector.length-1)
          }

          if(requiredFields.collectorField && row.data[requiredFields.collectorField] && row.data[requiredFields.collectorField].trim()) {
            let collector = row.data[requiredFields.collectorField].trim().replace(/\s+/g, ' ').replace(/\|/g, "; ")
            localityCollector += ' -- ' + collector
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

        recordID = country = locality = null
        
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
          localityRecordIDMap,
          countriesSummary
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