import { nanoid } from "nanoid/nanoid.js"

const groupLocalities = async (localityRecordIDMap, datasetID) => {
  if(localityRecordIDMap && typeof localityRecordIDMap == 'object' && Object.keys(localityRecordIDMap).length > 0){
    
    //if it's less that a certain number just return all as a group, no point grouping. These better georeferenced individually
    //this is a first catch, I've left in the response 400 below just in case...
    if(Object.keys(localityRecordIDMap).length <= 20) { //
      let groupLocalities = []
      let groupRecordCount = 0
      for (let key of Object.keys(localityRecordIDMap)){
        groupLocalities.push({
          loc: key,
          recordIDs: localityRecordIDMap[key]
        })
        groupRecordCount += localityRecordIDMap[key].length
      }

      let group = {
        datasetID,
        groupID: nanoid(),
        groupKey: 'All localities',
        groupLocked: false,
        groupLocalities,
        groupRecordCount, 
        completed: false
      }

      return [group]
    }
    
    //else
    let textPackURL = 'https://us-central1-georefmaps.cloudfunctions.net/grouplocalities '
    
    console.log('grouping localities')
    let response = await fetch(textPackURL, {
      method: 'POST', 
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({localityCollector: Object.keys(localityRecordIDMap)}) 
    })

    if(response.status == 200) {
      let textpackgroups = await response.json()
      let georefGroups = []
      for(let groupKey of Object.keys(textpackgroups)){
        //get the recordIDs for each in groupLocs
        let group = textpackgroups[groupKey]
        let groupLocalities = []
        let groupRecordCount = 0
        for(let loc of group){
          let recordIDs = localityRecordIDMap[loc]
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
        let groupLocalities = []
        let groupRecordCount = 0
        for (let key of Object.keys(localityRecordIDMap)){
          groupLocalities.push({
            loc: key,
            recordIDs: localityRecordIDMap[key]
          })
          groupRecordCount += localityRecordIDMap[key].length
        }

        let result = {
          datasetID,
          groupID: nanoid(),
          groupKey: 'All localities',
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