import { nanoid } from "nanoid/nanoid.js"

/**
 * 
 * @param {object} groupingSource - an object with keys as locality strings and values as arrays of recordIDs
 * @param {string} datasetID 
 * @returns {object} Array of locality groups
 */
const groupLocalities = async (groupingSource, datasetID, country, stateProvince) => {
  if(groupingSource && typeof groupingSource == 'object' && Object.keys(groupingSource).length > 0){
    
    let textPackURL = 'https://us-central1-georefmaps.cloudfunctions.net/grouplocalities '
    
    console.log(`grouping localities for ${country}${stateProvince? ':' + stateProvince : ''}`)
    let response
    
    try {
      response = await fetch(textPackURL, {
        method: 'POST', 
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({localityCollector: Object.keys(groupingSource)}) 
      })
    }
    catch(err) {
      throw err
    }

    if(response.status == 200) {
      let textpackgroups = await response.json()
      let georefGroups = []
      for(let groupKey of Object.keys(textpackgroups)){
        //get the recordIDs for each in groupLocs
        let group = textpackgroups[groupKey]
        let groupLocalities = []
        let groupRecordCount = 0
        for(let loc of group){
          let recordIDs = groupingSource[loc]
          if(recordIDs){
            groupRecordCount += recordIDs.length
          }
          else {
            let i = 0 //debug, there is a problem
          }

          groupLocalities.push({ loc, recordIDs })  
          loc = recordIDs = null
        }
        
        let result = {
          datasetID,
          groupID: nanoid(),
          country, 
          stateProvince,
          groupKey,
          groupLocked: false,
          groupLocalities,
          groupRecordCount, 
          completed: false
        }

        //for debugging
        if(result.groupLocalities.length > 1){
          let i = 0
        }

        georefGroups.push(result)

      }
      return georefGroups
    }
    else if (response.status == 400){
      let body = await response.text()
      if (body == "It only makes sense to group large numbers of localities"){
        //then the whole lot is a group
        console.log(`${country}${stateProvince? ':' + stateProvince : ''} has ${Object.keys(groupingSource).length} records and will be processed client side`)
        let groupLocalities = []
        let groupRecordCount = 0
        for (let key of Object.keys(groupingSource)){
          groupLocalities.push({
            loc: key,
            recordIDs: groupingSource[key]
          })
          groupRecordCount += groupingSource[key].length
        }

        let result = {
          datasetID,
          groupID: nanoid(),
          groupKey: 'All localities',
          country, 
          stateProvince,
          groupLocked: false,
          groupLocalities,
          groupRecordCount, 
          completed: false
        }

        return [result]
      }
      else {
        throw new Error('call to textpack failed with message: ' + body)
      }
    }
    else {
      throw new Error('call to textpack failed with status: ' + response.status)
    }
  } 
  else {
    throw new Error('invalid data provided')
  }
}

export default groupLocalities