//FUNCTIONS USED BY georef COMPONENT

const Georef =require('./Georef.js')

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
      for (let [index, elasticGeorefs] of fetchResults.entries()){
        if(elasticGeorefs.length){
          for (let elasticGeoref of elasticGeorefs){
            
            let georef = Object.assign(new Georef, elasticGeoref._source)
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

            if(!georefIndex[georef.georefID]){
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
  let url = `https://us-central1-georef-745b9.cloudfunctions.net/getgeorefs?search=${search}&index=${index}`
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

  console.log('georef count stats updated')
  
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

const updateGeorefRecords = (Firestore, FieldValue, docRef, georef, datasetID, recordIDs) => {
  return Firestore.runTransaction(function(transaction) {
    return transaction.get(docRef).then(function(docSnap) {
      if (!docSnap.exists) {
        let newDoc = {}
        //just some redundancy here for ease of use
        //we also add the fields for verification
        newDoc.georefID = georef.georefID
        newDoc.country = georef.country || null
        newDoc.stateProvince = georef.stateProvince || null
        newDoc.locality = georef.locality || null
        newDoc.decimalLatitude = georef.decimalLatitude || null
        newDoc.decimalLongitude = georef.decimalLongitude || null
        newDoc.locked = false
        newDoc.verified = false
        newDoc.datasets = {}
        newDoc.datasets[datasetID] = recordIDs
        newDoc.recordCount = recordIDs.length
        transaction.set(docRef, newDoc)
      }
      else {
        let doc = docSnap.data()
        
        let update = {}
        update.datasets = {}
        if(doc.datasets && doc.datasets[datasetID]) {
          update.datasets[datasetID] = FieldValue.arrayUnion(...recordIDs)
        }
        else {
          update.datasets[datasetID] = recordIDs
        }
        update.recordCount = doc.recordCount + recordIDs.length

        transaction.update(docRef, update)
      }

    });
  }).then(function() {
    let i = 0 //do nothing
    //console.log("Dataset record updated!");
  }).catch(function(error) {
    throw error;
  });
}

module.exports = {
  updateGeorefStats,
  updateDatasetStats, 
  updateDatasetGeorefs,
  fetchCandidateGeorefs,
  updateGeorefRecords
}

