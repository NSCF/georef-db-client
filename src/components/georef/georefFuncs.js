//FUNCTIONS USED BY georef COMPONENT
import convert from 'geo-coordinates-parser'
import Georef from './Georef.js'
import { Firestore, FieldValue } from '../../firebase.js'

  /**
   * Fetches and locks a record group. 
   * Returns an array with the recordGroup SNAPSHOT if successful. 
   * Returns an empty array if there are no more available record groups, or null if the lock fails 
   * so we can use it in a loop.
   * @param {string} atOrAfter - Provide 'at' or 'after', used with currentGroupID.
  */
 const getNextAvailableRecordGroup = async (datasetID, country, stateProvince, atOrAfter, currentGroupID) => {
  
  let msg = 'Fetching next record group '
  if(country) {
    if(country == 'all') {
      msg += 'for all countries'
    }
    else {
      msg += 'for ' + country
    }
  }

  if (stateProvince) {
    msg += ', ' + stateProvince + ' '
  }
  else {
    msg += ' '
  }

  if(currentGroupID) {
    if(atOrAfter == 'at') {
      msg += 'starting at ' + currentGroupID
    }
    else {
      msg += 'starting after ' + currentGroupID
    }
  }
  else {
    msg += 'starting at the beginning'
  }

  //console.log(msg) //testing only

  let query = Firestore.collection('recordGroups')
  .where('datasetID', '==', datasetID)
  .where('completed', '==', false)
  .where("groupLocked", "==", false)

  //handle country and province filters
  if(country && country != 'all') {
    query = query.where('country', '==', country)
    
    if(stateProvince && stateProvince != 'all') {
      if(stateProvince == 'none') {
        query = query.where('stateProvince', '==', null)
      }
      else {
        query = query.where('stateProvince', '==', stateProvince)
      }
    }
  }

  query = query.orderBy('groupID')
  
  if(currentGroupID) {
    if(atOrAfter && atOrAfter == 'at')  {
      query = query.startAt(currentGroupID)
    }
    else {
      query = query.startAfter(currentGroupID)
    }
  }

  const qrySnap = await query.limit(1).get()

  if(qrySnap.empty) {
    return []
  }
  else {
    //try lock the doc
    let result = await Firestore.runTransaction(async transaction => {
      let docSnap = await transaction.get(qrySnap.docs[0].ref) //get it again, in case it changed
      let data = docSnap.data()
      if(data.groupLocked) {
        return null
      }
      else {
        try {
          await transaction.update(docSnap.ref, {groupLocked: true})
        }
        catch(err) {
          console.log('failed to lock the group')
          console.error(err)
          return null //we should never get here!
        }
        return docSnap
      }
    })

    if(result) {
      return [result]
    }
    else {
      return null
    }
  }
}

const fetchCandidateGeorefs = async (groupLocalities, elasticindex, limit, excludeFlagged) => {
  //groupLocalities must be a set of {id: ..., loc: ... } objects

  if(groupLocalities && groupLocalities.length){
    let elasticFetches = []//promise array

    for (let groupLoc of groupLocalities) {

      //we need to remove elevation and coordinates so it doesn't confuse the locality search
      let searchLoc = groupLoc.loc.replace(/(alt|elev)[:;\.]{0,1}\s+\d+(m|ft|f)/i, "").trim()
      
      try {
        let coords = convert(searchLoc) //coords, this will throw if there aren't any
        searchLoc = searchLoc.replace(coords.verbatimCoordinates, "")
      }
      catch(err) {
        //do nothing
      }

      elasticFetches.push(fetchGeorefsForLoc(searchLoc, elasticindex, limit, excludeFlagged))

    }

    let fetchResults
    try {
      fetchResults = await Promise.all(elasticFetches) //this should be fine
    }
    catch(err){
      throw err
    }
    
    //get the uniques and record who they belong to
    //an object as a dictionary of all the georefs
    //an object with the index of each groupLoc and its associated georefs
    //on select of groupLoc/s destructure all the georef keys from the groupLoc index and make a set
    //iterate the georef dictionary and update each one as visible or not
    

    //remove any failed responses first
    fetchResults = fetchResults.filter(x => x)

    let georefIndex = {} //it will be a and object of georefID: georefobject pairs
    
    if(fetchResults.length){
      for (let elasticGeorefs of fetchResults){
        if(elasticGeorefs.length){
          for (let elasticGeoref of elasticGeorefs){
            
            let georef = Object.assign(new Georef, elasticGeoref._source)
            if(!georefIndex[georef.georefID]){
              if(georef.selected) { //just in case any of these sneak through
                georef.selected = false
              }

              if(!georef.decimalCoordinatesOkay){
                //console.log('error with coordinates for georef', elasticGeoref._id)
                continue
              }

              if (georef.flagged) { //we don't want to see flagged georefs
                continue;
              }

              //fix uncertainty because it seems it's sometimes a string...
              //double check uncertainty, it seems to be causing issues with some georefs...
              if(georef.uncertaintyUnit && georef.uncertaintyUnit.trim()) {
                if(!georef.uncertainty || isNaN(georef.uncertainty)) {
                  georef.uncertainty = null
                  georef.uncertaintyUnit = null
                }
                else { 
                  if(typeof georef.uncertainty == 'string') {
                    let val = Number(georef.uncertainty)
                    if(!isNaN(val) && val && val > 0) {
                      georef.uncertainty = val
                    }
                    else {
                      georef.uncertainty = null
                      georef.uncertaintyUnit = null
                    }
                  }
                }
              }
              else {
                georef.uncertainty = null
                georef.uncertaintyUnit = null
              }
              
              georefIndex[georef.georefID] = georef
              
            }  
          }
        } 
      }
    }

    //for testing
    /*
    let georeflocs = []
    for (const [key, value] of Object.entries(georefIndex)) {
      georeflocs.push(value.locality)
    }
    console.log(georeflocs)
    */

    return { georefIndex }
  }
  else {
    throw new Error('no values supplied')
  }
}

const fetchGeorefsForLoc = async (locString, index, limit, excludeFlagged) => {
  let search = encodeURI(locString)
  let url = `https://us-central1-georef-745b9.cloudfunctions.net/getgeorefs?search=${search}&index=${index}`
  
  if (excludeFlagged) {
    url += '&flagged=false'
  }

  if (limit && !isNaN(limit)){
    url += `&limit=${limit}`
  }

  let response
  try {
    response = await fetch(url)
  }
  catch(err) {
    return null
  }
  
  if(response.ok){
    let data = await response.json()
    return data
  }
  else {
    return null
  }  
}

const updateGeorefStats = async (Firebase, ServerValue, georefsAdded, recordsGeoreferenced, userID, userName, datasetID, groupComplete) => {
  let yearmonth = getYearMonth(new Date())
  let yearweek = getYearWeek(new Date())
  let now = new Date()
  let today = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
   
  let refstrings = [
    //totals
    'stats/georefsAdded',
    'stats/recordsGeoreferenced',
    `stats/weekly/${yearweek}/georefsAdded`, 
    `stats/weekly/${yearweek}/recordsGeoreferenced`, 
    `stats/monthly/${yearmonth}/georefsAdded`, 
    `stats/monthly/${yearmonth}/recordsGeoreferenced`, 

    //perDataset
    `stats/perDataset/${datasetID}/georefsAdded`,
    `stats/perDataset/${datasetID}/recordsGeoreferenced`,
    `stats/perDataset/${datasetID}/daily/${today}/georefsAdded`,
    `stats/perDataset/${datasetID}/daily/${today}/recordsGeoreferenced`,
    `stats/perDataset/${datasetID}/weekly/${yearweek}/georefsAdded`,
    `stats/perDataset/${datasetID}/weekly/${yearweek}/recordsGeoreferenced`,
    `stats/perDataset/${datasetID}/monthly/${yearmonth}/georefsAdded`,
    `stats/perDataset/${datasetID}/monthly/${yearmonth}/recordsGeoreferenced`,
    `stats/perDataset/${datasetID}/perUser/${userID}/georefsAdded`,
    `stats/perDataset/${datasetID}/perUser/${userID}/recordsGeoreferenced`,
    `stats/perDataset/${datasetID}/perUser/${userID}/daily/${today}/georefsAdded`,
    `stats/perDataset/${datasetID}/perUser/${userID}/daily/${today}/recordsGeoreferenced`,
    `stats/perDataset/${datasetID}/perUser/${userID}/weekly/${yearweek}/georefsAdded`,
    `stats/perDataset/${datasetID}/perUser/${userID}/weekly/${yearweek}/recordsGeoreferenced`,
    `stats/perDataset/${datasetID}/perUser/${userID}/monthly/${yearmonth}/georefsAdded`,
    `stats/perDataset/${datasetID}/perUser/${userID}/monthly/${yearmonth}/recordsGeoreferenced`,
    

    //perUser
    `stats/perUser/${userID}/georefsAdded`,
    `stats/perUser/${userID}/recordsGeoreferenced`,
    `stats/perUser/${userID}/daily/${today}/georefsAdded`,
    `stats/perUser/${userID}/daily/${today}/recordsGeoreferenced`,
    `stats/perUser/${userID}/weekly/${yearweek}/georefsAdded`,
    `stats/perUser/${userID}/weekly/${yearweek}/recordsGeoreferenced`,
    `stats/perUser/${userID}/monthly/${yearmonth}/georefsAdded`,
    `stats/perUser/${userID}/monthly/${yearmonth}/recordsGeoreferenced`
  ]

  let proms = []
  for (let rs of refstrings){
    let val = georefsAdded
    if (rs.endsWith('recordsGeoreferenced')){
      val = recordsGeoreferenced
    }
    let ref = Firebase.ref(rs)
    proms.push(updateStat(ref, val))
  }

  if(groupComplete) {

    let paths = [
      'stats/perDataset/' + datasetID +'/daily/' + today + '/groupsCompleted',
      'stats/perDataset/' + datasetID +'/weekly/' + yearweek + '/groupsCompleted',
      'stats/perDataset/' + datasetID +'/monthly/' + yearmonth + '/groupsCompleted'
    ]

    for (let p of paths) {
      let increment = Firebase.ref(p).transaction(current => {
        if(current) {
          current++
        }
        else {
          current = 1
        }
        return current;
      })
      proms.push(increment)
    }
  }

  let updateLastGeorefsAdded = Firebase.ref('stats/lastGeorefAdded').transaction(current => {
    current = ServerValue.TIMESTAMP
    return current
  })

  let updateLastGeorefsAddedBy = Firebase.ref('stats/lastGeorefAddedBy').transaction(current => {
    current = userName
    return current
  })

  let updateDatasetLastGeorefsAdded = Firebase.ref(`stats/perDataset/${datasetID}/lastGeorefAdded`).transaction(current => {
    current = ServerValue.TIMESTAMP
    return current
  })

  let updateDatasetLastGeorefsAddedBy = Firebase.ref(`stats/perDataset/${datasetID}/lastGeorefAddedBy`).transaction(current => {
    current = userName
    return current
  })

  proms.push(updateLastGeorefsAdded)
  proms.push(updateLastGeorefsAddedBy)

  proms.push(updateDatasetLastGeorefsAdded)
  proms.push(updateDatasetLastGeorefsAddedBy)

  await Promise.all(proms) //thats 30 in total!!
  
}

const updateStat = (statRef, increment) => {
  statRef.transaction( current => {
    if(current){
      current += increment
    }
    else {
      current = increment
    }
    return current
  })
}

const getYearWeek = d => {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  // Return array of year and week number
  return `${d.getUTCFullYear()} ${weekNo.toString().padStart(2, '0')}`
}

const getYearMonth = d => {
  let y = d.getUTCFullYear()
  let m = d.getMonth() + 1
  return `${y} ${m.toString().padStart(2, '0')}`
}

const updateDatasetStats = (Firestore, datasetRef, recordsGeoreferenced, formattedName, groupComplete) => {
  return Firestore.runTransaction(async transaction => {
    // This code may get re-run multiple times if there are conflicts.
    let datasetSnap = await transaction.get(datasetRef)
    if (!datasetSnap.exists) {
      throw "Document does not exist!"; //this should not happen!!!
    }

    let dataset = datasetSnap.data()

    dataset.recordsCompleted += recordsGeoreferenced
    let datasetUpdate = {
      recordsCompleted: dataset.recordsCompleted,
      lastGeoreference: FieldValue.serverTimestamp(),
      lastGeoreferenceBy: formattedName
    }

    if(groupComplete) {
      //console.log('updating groups completed')
      //console.log('Value of dataset.groupsComplete:', data.groupsComplete)
      datasetUpdate.groupsComplete = ++dataset.groupsComplete
    }

    await transaction.update(datasetRef, datasetUpdate);
    return
  })
}

const updateDatasetGeorefs = async (Firestore, FieldValue, datasetID, georefIDs) => {
  
  let datasetGeorefsRef = Firestore.collection('datasetGeorefs').doc(datasetID)
  let georefsAddedRef = Firestore.collection('datasetGeorefsAdded').doc(datasetID)
  let snap = await georefsAddedRef.get()

  if(snap.exists) {
    await datasetGeorefsRef.update({georefIDs: FieldValue.arrayUnion(...georefIDs)})
  }
  else {
    let proms = [datasetGeorefsRef.set({georefIDs}), georefsAddedRef.set({added: true})]
    await Promise.all(proms)
  }
  
  return
  
}

const updateGeorefRecords = async (Firestore, FieldValue, georef, datasetID, recordIDs) => {
  try {
    await Firestore.runTransaction(async transaction => {
      let ref = Firestore.collection('georefRecords').doc(georef.georefID)
      let docSnap = await transaction.get(ref)
      if (!docSnap.exists) {
        const records = {}
        records[datasetID] = recordIDs
        let georefRecord = {
          georefID: georef.georefID,
          country: georef.country,
          stateProvince: georef.stateProvince || null,
          locality: georef.locality || null,
          decimalLatitude: georef.decimalLatitude || null,
          decimalLongitude: georef.decimalLongitude || null,
          locked: false,
          verified: false,
          records: {[datasetID]: recordIDs},
          datasetIDs: [datasetID],
          recordCount: recordIDs.length,
          createdByID: georef.createdByID, 
          dateCreated: georef.dateCreated
        }
  
        transaction.set(ref, georefRecord)
  
      }
      else {
        let georefRecord = docSnap.data()
        
        let update = {}
        update.datasetIDs = FieldValue.arrayUnion(datasetID)
        update.records = {}
        if(georefRecord.records) {
          if(georefRecord.records[datasetID]) {
            update.records[datasetID] = FieldValue.arrayUnion(...recordIDs)
            georefRecord.records[datasetID] = [...georefRecord.records[datasetID], ...recordIDs]
          }
          else {
            update.records[datasetID] = recordIDs
            georefRecord.records[datasetID] = recordIDs
          }
        }
        else {
          update.records[datasetID] = recordIDs
          georefRecord.records = {}
          georefRecord.records[datasetID] = recordIDs
        }

        //it's safer to do this, since we have the object, than to increment on recordIDs, because we don't know what the result of arrayUnion will be
        let updatedCount = 0
        for (let recordIDs of Object.values(georefRecord.records)) {
          updatedCount += recordIDs.length
        }

        update.recordCount = updatedCount
  
        transaction.update(ref, update)
      }
    })
  }
  catch(err) { //this shouldn't happen!
    alert('Error updating georefRecords, see the console')
    console.error(err)
  }
}

const flagGeoref = async (georefID, elasticIndex) => {
  let url = `https://us-central1-georef-745b9.cloudfunctions.net/flaggeoref?georefID=${georefID}&index=${elasticIndex}`
  let res
  try {
    res = await fetch(url)
  }
  catch(err) {
    alert('Failed to flag georef:' + err.message)
  }
  if(res.status != 200){
    let body = await res.json()
    console.error(body)
    alert('Failed to flag georef:' + JSON.stringify(body, null, 2))
  }
  else {
    if(window.pushToast) {
      window.pushToast('georef flagged')
    }
  }
}

export {
  getNextAvailableRecordGroup,
  updateGeorefStats,
  updateDatasetStats, 
  updateDatasetGeorefs,
  fetchCandidateGeorefs,
  fetchGeorefsForLoc,
  updateGeorefRecords, 
  flagGeoref
}

