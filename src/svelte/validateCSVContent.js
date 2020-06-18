import Papa from 'papaparse'

let validateCSVContent = (targetFile, requiredFields) => {
  return new Promise((resolve, reject) => {
    
    let totalRows = 0
    let recordIDs = []
    let recordIDsMissing = false
    let recordsMissingCountryAlsoMissingID = false
    let duplicatedRecordIDs = []
    let rowsWithoutCountry = []
    let recordsMissingLocalityAlsoMissingID = false
    let rowsWithoutLocality = []
    let localityRecordIDMap = {} //a dictionary to map georeferences back to records - to send to textpack

    //read the file and validate - recordID is unique and locality contains data
    let recordID
    
    Papa.parse(targetFile, {
      step: function(row, parser) {
        recordID = null
        totalRows++
        let country = row.data[requiredFields.countryField].trim()
        let locality = row.data[requiredFields.localityField].trim()
        if(!row.data[requiredFields.rowIDField] || !row.data[requiredFields.rowIDField].trim()) {
          recordIDsMissing = true
          
          if(!country){
            recordsMissingCountryAlsoMissingID = true
          }

          if(!locality) {
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

          if(!country) {
            rowsWithoutCountry.push(recordID)
          }
          //TODO we need to validate countries also against a master list

          if(!locality) {
            rowsWithoutLocality.push(recordID)
          }

          if(country && locality){
            let cleanedLocality = locality.replace(/\w+/g, ' ')
            if (cleanedLocality.endsWith('.')){
              cleanedLocality = cleanedLocality.substring(0, cleanedLocality.length-1)
            }

            if(!row.data[requiredFields.collectorField] || !row.data[requiredFields.collectorField].trim()) {
              cleanedLocality += ' -- ' + row.data[requiredFields.collectorField].trim()
            }

            //add to the dictionary
            if(localityRecordIDMap[country]){
              if(localityRecordIDMap[country][cleanedLocality]){
                localityRecordIDMap[country][cleanedLocality].push(recordID)
              }
              else {
                localityRecordIDMap[country][cleanedLocality] = [recordID]
              }
            }
            else {
              localityRecordIDMap[country] = {}
              localityRecordIDMap[country][cleanedLocality] = [recordID]
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