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

    if(!requiredFields.recordIDField || !requiredFields.localityField){
      reject('required fields not provided')
      return
    }
    
    //otherwise let's get going....

    let recordIDs = new Map() //for checking duplicates

    let hasStateProvince = false
    let totalRows = 0
    let uniqueLocalityCollectorCount = 0
    let recordsToGeoreference = 0
    let recordIDsMissing = false
    let duplicatedRecordIDs = new Map()
    let duplicateRecordCount = 0
    let recordsMissingCountryAlsoMissingID = false
    let recordsMissingLocalityAlsoMissingID = false
    let rowsWithoutCountry = []
    let rowsWithoutLocality = []
    let localityRecordIDMap = {} //a dictionary to map georeferences back to records - to send to textpack

    let recordID, country, stateProvince, locality
    let records = []
    Papa.parse(targetFile, { header: true,
      step: function(row) {
        totalRows++
        
        recordID = row.data[requiredFields.recordIDField]
        if(recordID && recordID.trim()) {
          recordID = recordID.trim()
          if(recordIDs.has(recordID)){
            duplicatedRecordIDs.set(recordID, true)
            duplicateRecordCount++
          }
          else {
            recordIDs.set(recordID, true)
          }
        }
        else {
          recordIDsMissing = true
        }

        country = row.data[requiredFields.countryField]
        if(country && country.trim()) {
          country = country.trim().replace(/\s+/g, ' ').replace(/[\.,;-\s]+$/, '').replace(/^[\.,;-\s]+/, '')
          if(!country){
            if(recordID){
              rowsWithoutCountry.push(recordID)
            }
            else {
              recordsMissingCountryAlsoMissingID = true
            }
          }
        }
        else {
          country = null
          if(recordID){
            rowsWithoutCountry.push(recordID)
          }
          else {
            recordsMissingCountryAlsoMissingID = true
          }
        }

        if(requiredFields.stateProvinceField){
          stateProvince = row.data[requiredFields.stateProvinceField]
          if(stateProvince && stateProvince.trim()){
            stateProvince = stateProvince.trim().replace(/\s+/g, ' ').replace(/[\.,;-\s]+$/, '').replace(/^[\.,;-\s]+/, '')
            if(stateProvince && !hasStateProvince){
              hasStateProvince = true
            }
          }
        }

        locality = row.data[requiredFields.localityField]
        if(locality && locality.trim()) {
          locality = locality.trim().replace(/\s+/g, ' ').replace(/[\.,;-\s]+$/, '').replace(/^[\.,;-\s]+/, '')
          if(!locality){
            if(recordID){
              rowsWithoutLocality.push(recordID)
            }
            else {
              recordsMissingLocalityAlsoMissingID = true
            }
          }
        }
        else {
          locality = null
          if(recordID){
            rowsWithoutLocality.push(recordID)
          }
          else {
            recordsMissingLocalityAlsoMissingID = true
          }
        }
        
        if(recordID && country && locality){
          let localityCollector = locality

          if(requiredFields.collectorField && row.data[requiredFields.collectorField] && row.data[requiredFields.collectorField].trim()) {
            let collector = row.data[requiredFields.collectorField].trim().replace(/\s+/g, ' ').replace(/\|/g, "; ").replace(/[\.,;-\s]+$/, '')
            localityCollector += ' -- ' + collector
          }

          records.push({recordID, country, stateProvince, localityCollector})
        }

        recordID = country = stateProvince = locality = null
        
      },
      complete: function() {
        console.log("All done parsing file!");

        //this is where to build the duplicate counts and the locality records map
        for (let {recordID, country, stateProvince, localityCollector} of records) {
          if(!duplicatedRecordIDs.has(recordID)){

            if(!localityRecordIDMap[country]){
              localityRecordIDMap[country] = {}
            }

            if(hasStateProvince){
              
              if(!stateProvince) {
                stateProvince = 'none'
              }

              if(localityRecordIDMap[country][stateProvince]){
                if(localityRecordIDMap[country][stateProvince][localityCollector]){
                  localityRecordIDMap[country][stateProvince][localityCollector].push(recordID)
                }
                else {
                  localityRecordIDMap[country][stateProvince][localityCollector] = [recordID]
                  uniqueLocalityCollectorCount++
                }
              }
              else {
                localityRecordIDMap[country][stateProvince] = {}
                localityRecordIDMap[country][stateProvince][localityCollector] = [recordID]
                uniqueLocalityCollectorCount++
              }

            }
            else {
              if(localityRecordIDMap[country][localityCollector]){
                localityRecordIDMap[country][localityCollector].push(recordID)
              }
              else {
                localityRecordIDMap[country][localityCollector] = [recordID]
                uniqueLocalityCollectorCount++
              }
            }
            recordsToGeoreference++
          }
        }
        
        duplicatedRecordIDs = [ ...duplicatedRecordIDs.keys() ] //just converting from Map to an array
        duplicateRecordCount += duplicatedRecordIDs.length // because we haven't counted these yet above

        let result = {
          hasStateProvince,
          totalRows,
          uniqueLocalityCollectorCount,
          recordsToGeoreference,
          recordIDsMissing,
          duplicatedRecordIDs,
          duplicateRecordCount,
          recordsMissingCountryAlsoMissingID,
          recordsMissingLocalityAlsoMissingID,
          rowsWithoutLocality,
          localityRecordIDMap,
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