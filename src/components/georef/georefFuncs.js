//FUNCTIONS USED BY georef COMPONENT

const Georef = require('./Georef.js')

const fetchCandidateGeorefs = async (groupLocalities, elasticindex, limit) => {
  //groupLocalities must be a set of {id: ..., loc: ... } objects

  if(groupLocalities && groupLocalities.length){
    let elasticFetches = []//promise array

    for (let loc of groupLocalities){
      elasticFetches.push(fetchGeorefsForLoc(loc.loc, elasticindex, limit))
    }

    let fetchResults
    try {
      fetchResults = await Promise.all(elasticFetches)
    }
    catch(err){
      throw err
    }
    
    //get the uniques and record who they belong to
    //an object as a dictionary of all the georefs
    //an object with the index of each groupLoc and its associated georefs
    //on select of groupLoc/s destructure all the georef keys from the groupLoc index and make a set
    //iterate the georef dictionary and update each one as visible or not
    
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

    return {
      georefIndex
    }
  }
  else {
    throw new Error('no values supplied')
  }
}

//just a helper for above
const fetchGeorefsForLoc = async (locString, index, limit) => {
  let search = encodeURI(locString)
  let url = `https://us-central1-georef-745b9.cloudfunctions.net/getgeorefs?search=${search}&index=${index}&noflags`
  if (limit && !isNaN(limit)){
    url += `&limit=${limit}`
  }
  let response = await fetch(url)
  let data = await response.json()
  return data
}

const updateGeorefStats = async (Firebase, georefsAdded, recordsGeoreferenced, userID, userName, datasetID, groupComplete) => {
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
    current = Date.now()
    return current
  })

  let updateLastGeorefsAddedBy = Firebase.ref('stats/lastGeorefAddedBy').transaction(current => {
    current = userName
    return current
  })

  let updateDatasetLastGeorefsAdded = Firebase.ref(`stats/perDataset/${datasetID}/lastGeorefAdded`).transaction(current => {
    current = Date.now()
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

    let originalRecordsCompleted = dataset.recordsCompleted
    dataset.recordsCompleted += recordsGeoreferenced
    let datasetUpdate = {
      recordsCompleted: dataset.recordsCompleted,
      lastGeoreference: Date.now(),
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

const updateDatasetGeorefs = (Firestore, FieldValue, datasetID, georefIDs) => {
  return Firestore.runTransaction(async transaction => {
    let datasetGeorefsRef = Firestore.collection('datasetGeorefs').doc(datasetID)
    let datasetGeorefsSnap = await transaction.get(datasetGeorefsRef)
    //we cant add a count here because we don't know what the result of arrayUnion will be
    if(datasetGeorefsSnap.exists){
      await transaction.update(datasetGeorefsRef, {georefIDs: FieldValue.arrayUnion(...georefIDs)}) 
    }
    else {
      await transaction.set(datasetGeorefsRef, {datasets: georefIDs})
    }
    return
  })
}

const updateGeorefRecords = async (Firestore, FieldValue, georef, datasetID, recordIDs) => {
  try {
    await Firestore.runTransaction(async transaction => {
      let ref = Firestore.collection('georefRecords').doc(georef.georefID)
      let docSnap = await transaction.get(ref)
      if (!docSnap.exists) {
        let georefRecord = {
          georefID: georef.georefID,
          country: georef.country,
          stateProvince: georef.stateProvince || null,
          locality: georef.locality || null,
          decimalLatitude: georef.decimalLatitude || null,
          decimalLongitude: georef.decimalLongitude || null,
          locked: false,
          verified: false,
          datasets: {[datasetID]: recordIDs},
          recordCount: recordIDs.length,
        }
  
        transaction.set(ref, georefRecord)
  
      }
      else {
        let georefRecord = docSnap.data()
        
        let update = {}
        update.datasets = {}
        if(georefRecord.datasets && georefRecord.datasets[datasetID]) {
          update.datasets[datasetID] = FieldValue.arrayUnion(...recordIDs)
        }
        else {
          update.datasets[datasetID] = recordIDs
        }
        update.recordCount = georefRecord.recordCount + recordIDs.length
  
        transaction.update(ref, update)
      }
    })
  }
  catch(err) { //this shouldn't happen!
    alert('Error updating georefRecords, see the console')
    console.error(err)
  }
}

module.exports = {
  updateGeorefStats,
  updateDatasetStats, 
  updateDatasetGeorefs,
  fetchCandidateGeorefs,
  updateGeorefRecords
}

