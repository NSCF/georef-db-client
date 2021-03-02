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
    let uniqueLocalityCollector = new Map()

    let totalRows = 0
    let uniqueLocalityCollectorCount = 0
    let recordsToGeoreference = 0
    let recordIDsMissing = false
    let duplicatedRecordIDs = new Map()
    let duplicateRecordCount = 0
    let recordsMissingLocalityAlsoMissingID = false
    let rowsWithoutLocality = []
    let localityRecordIDMap = {} //a dictionary to map georeferences back to records - to send to textpack

    let recordID, locality
    let records = []
    Papa.parse(targetFile, { header: true,
      step: function(row) {
        let record = {}
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
        
        if(recordID && locality){
          let localityCollector = locality

          if(requiredFields.collectorField && row.data[requiredFields.collectorField] && row.data[requiredFields.collectorField].trim()) {
            let collector = row.data[requiredFields.collectorField].trim().replace(/\s+/g, ' ').replace(/\|/g, "; ").replace(/[\.,;-\s]+$/, '')
            localityCollector += ' -- ' + collector
          }

          records.push({recordID, localityCollector})
        }

        recordID = locality = null
        
      },
      complete: function() {
        console.log("All done parsing file!");

        //TODO, this is where to build the duplicate counts and the locality records map
        for (let {recordID, localityCollector} of records) {
          if(!duplicatedRecordIDs.has(recordID)){
            if(localityRecordIDMap[localityCollector]){
              localityRecordIDMap[localityCollector].push(recordID)
            }
            else {
              localityRecordIDMap[localityCollector] = [recordID]
            }
            recordsToGeoreference++
          }
        }
        
        uniqueLocalityCollectorCount = Object.keys(localityRecordIDMap).length
        duplicatedRecordIDs = [ ...duplicatedRecordIDs.keys() ] //just converting from Map to an array
        duplicateRecordCount += duplicatedRecordIDs.length // because we haven't counted these yet above

        let result = {
          totalRows,
          uniqueLocalityCollectorCount,
          recordsToGeoreference,
          recordIDsMissing,
          duplicatedRecordIDs,
          duplicateRecordCount,
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