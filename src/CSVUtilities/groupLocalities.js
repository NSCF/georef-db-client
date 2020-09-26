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
        groupKey = 'All localities',
        groupLocked: false,
        locStringCount: groupLocalities.length,
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

    
    let totalRecordCount = 0
    if(response.status == 200) {
      let textpackgroups = await response.json()
      let georefGroups = []
      for(let [groupKey, group] of Object.entries(textpackgroups)){
        //get the recordIDs for each in groupLocs
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
        
        let group = {
          datasetID,
          groupKey,
          groupLocked: false,
          locStringCount: locRecords.length,
          groupLocalities,
          groupRecordCount, 
          completed: false
        }

        georefGroups.push(group)

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

        let group = {
          datasetID,
          groupKey = 'All localities',
          groupLocked: false,
          locStringCount: groupLocalities.length,
          groupLocalities,
          groupRecordCount, 
          completed: false
        }

        return [group]
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