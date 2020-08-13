const groupLocalities = async (localityRecordIDMap, datasetID, countryCodes) => {
  if(localityRecordIDMap && typeof localityRecordIDMap == 'object' && Object.keys(localityRecordIDMap).length > 0){
    
    let locGroups = []
    let failedCalls = 0
    let groupLocCalls = {}
    let textPackURL = 'https://us-central1-georefmaps.cloudfunctions.net/grouplocalities '

    let countries = Object.keys(localityRecordIDMap)
    let includedCountryCodes = []
    
    for (let country of countries ){
      if(countryCodes.hasOwnProperty(country)){ //validated countries only
        includedCountryCodes.push(countryCodes[country])
        groupLocCalls[country] = fetch(textPackURL, {
          method: 'POST', 
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({localityCollector: Object.keys(localityRecordIDMap[country])}) 
        });
      }
    }

    console.log('grouping localities')
    await Promise.all(Object.values(groupLocCalls))
      //each value is now a response object
    let totalRecordCount = 0

    for (let [country, prom] of Object.entries(groupLocCalls)) {
      let response = await prom.then()
      if(response.status == 200) {
        let textpackgroups = await response.json()
        
        for(let [groupKey, group] of Object.entries(textpackgroups)){
          //get the recordIDs for each in groupLocs
          let locRecords = []
          let groupRecordCount = 0
          for(let loc of group){
            let recordIDs = localityRecordIDMap[country][loc]
            let recordCount
            if(recordIDs){
              recordCount = recordIDs.length
              groupRecordCount += recordCount
            }
            else {
              let i = 0 //there is a problem
            }

            locRecords.push({ loc, recordIDs, recordCount })  
            loc = recordIDs = recordCount = null
          }
          
          let recordGroup = {
            countryCode: countryCodes[country],
            datasetID,
            groupKey,
            groupLocked: false,
            locStringCount: locRecords.length,
            locRecords,
            groupRecordCount, 
            completed: false
          }

          locGroups.push(recordGroup)
          totalRecordCount += groupRecordCount

        }
      }
      else if (response.status == 400){
        let body = await response.text()
        if (body == "It only makes sense to group large numbers of localities"){
          //then the whole lot is a group
          let countryCode = countryCodes[country]
          let locRecords = []
          let groupRecordCount = 0
          let countryLocalities = Object.keys(localityRecordIDMap[country])
          for (let loc of countryLocalities){
            let recordIDs = localityRecordIDMap[country][loc]
            let recordCount 
            if(recordIDs){
              recordCount = recordIDs.length
              groupRecordCount += recordCount
            }
            else {
              let i = 0 //there is a problem
            }
            locRecords.push({loc, recordIDs, recordCount})
          }

          let recordGroup = {
            countryCode,
            datasetID,
            groupKey: locRecords[0].loc,
            groupLocked: false,
            locStringCount: locRecords.length,
            locRecords,
            groupRecordCount, 
            completed: false
          }

          locGroups.push(recordGroup)
          totalRecordCount += groupRecordCount
        }
        else {
          failedCalls++
        }
      }
      else {
        failedCalls++
      }
    }
    
    return {
      locGroups,
      failedCalls,
      totalRecordCount,
      includedCountryCodes
    }
      
  } 
  else {
    throw new Error('invalid data provided')
  }
}

export default groupLocalities