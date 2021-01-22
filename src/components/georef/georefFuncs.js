//FUNCTIONS USED BY georef COMPONENT

const fetchCandidateGeorefs = async (groupLocalities, elasticindex) => {
  //groupLocalities must be a set of {id: ..., loc: ... } objects

  if(groupLocalities && groupLocalities.length){
    let elasticFetches = []//promise array

    for (let loc of groupLocalities){
      elasticFetches.push(fetchGeorefsForLoc(loc.loc, elasticindex))
    }

    let fetchResults

    try {
      console.log('calling elastic with', elasticFetches.length, 'calls')
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
    let locGeorefIndex = {} //it will be an object with locID : [georefID] array pairs
    
    if(fetchResults.length){
      for (let [index, locGeorefs] of fetchResults.entries()){
        let locID = groupLocalities[index].id
        if(locGeorefs.length){
          for (let elasticGeoref of locGeorefs){
            if(!georefIndex[elasticGeoref._id]){
              georefIndex[elasticGeoref._id] = elasticGeoref._source
            }

            if(!locGeorefIndex[locID]){
              locGeorefIndex[locID] = [ elasticGeoref._id ]
            }
            else {
              locGeorefIndex[locID].push(elasticGeoref._id)
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
      georefIndex,
      locGeorefIndex
    }
  }
  else {
    throw new Error('no values supplied')
  }
}

//just a helper for above
const fetchGeorefsForLoc = async (locString, index) => {
  let search = encodeURI(locString)
  let url = `https://us-central1-georef-745b9.cloudfunctions.net/getgeorefs?search=${search}&index=${index}`
  let response = await fetch(url)
  let data = await response.json()
  return data
}

//fetch country and province given coordinates
const fetchAdmins = async (lat, long) => {
  if (!lat || !long || isNaN(lat) || isNaN(long)){
    throw new Error('invalid input parameters')
  }

  let geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=AIzaSyD_3Zs4G0iv3_teiE-cPMPEF4lotqiZPqU&result_type=administrative_area_level_1`
  let geocodeResponse
  try {
    geocodeResponse = await fetch(geocodeURL)
  }
  catch(err) {
    let msg = 'there was an error fetching admin divisions:' + err.message
    throw new Error(msg)
  }

  if(geocodeResponse.status == 200){
    let geocode = await geocodeResponse.json()
    if(geocode.results){
      let result = {
        stateProvince: null,
        country: null
      }

      let stateProvs = geocode.results[0].address_components.filter(x =>x.types.includes('administrative_area_level_1'))
      if(stateProvs.length){
        let stateProv = stateProvs[0]
        if(stateProv.long_name && stateProv.long_name.trim()){
          result.stateProvince = stateProv.long_name.replace(/Region|Province|State|District|Tinkulu/i, '').replace('-', ' ').trim()
        }
      }
  
      let countries = geocode.results[0].address_components.filter(x =>x.types.includes('country'))
      if(countries.length){
        let country = countries[0]
        if(country.long_name && country.long_name.trim()){
          if (country.long_name == 'Eswatini'){
            result.country = 'Swaziland'
          }
          else {
            result.country = country.long_name.trim()
          }
        }
      }
      return result
    }
    else {
      throw new Error('geocode API returned no results')
    }
  }
  else {
    throw new Error('geocode API call failed with code', geocodeResponse.status)
  }
    
}

const updateGeorefStats = async (Firebase, georefsAdded, recordsGeoreferenced, userID, userName) => {
  let yearmonth = getYearMonth(new Date())
  let yearweek = getYearWeek(new Date())
  
  let refstrings = [
    'stats/totalGeorefsAdded',
    'stats/totalRecordsGeoreferenced',
    `stats/monthly/${yearmonth}/georefsAdded`, 
    `stats/monthly/${yearmonth}/recordsGeoreferenced`, 
    `stats/monthly/${yearmonth}/user/${userID}/georefsAdded`,
    `stats/monthly/${yearmonth}/user/${userID}/recordsGeoreferenced`,
    `stats/weekly/${yearweek}/georefsAdded`, 
    `stats/weekly/${yearweek}/recordsGeoreferenced`, 
    `stats/weekly/${yearweek}/user/${userID}/georefsAdded`,
    `stats/weekly/${yearweek}/user/${userID}/recordsGeoreferenced`
  ]

  let proms = []
  for (let rs of refstrings){
    let val = georefsAdded
    if (rs.includes('Records')){
      val = recordsGeoreferenced
    }
    let ref = Firebase.ref(rs)
    proms.push(updateStat(ref, val))
  }

  let updateLastGeorefsAdded = Firebase.ref('stats/lastGeorefsAdded').transaction(current => {
    current = Date.now()
    return current
  })

  let updateLastGeorefsAddedBy = Firebase.ref('stats/lastGeorefsAddedBy').transaction(current => {
    current = userName
    return current
  })

  proms.push(updateLastGeorefsAdded)
  proms.push(updateLastGeorefsAddedBy)

  await Promise.all(proms)
  
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

const updateDatasetStats = (Firestore, datasetRef, recordsGeoreferenced, userID) => {
  return Firestore.runTransaction(function(transaction) {
    // This code may get re-run multiple times if there are conflicts.
    return transaction.get(datasetRef).then(function(docSnap) {
      if (!docSnap.exists) {
          throw "Document does not exist!";
      }

      // Add one person to the city population.
      // Note: this could be done without a transaction
      //       by updating the population using FieldValue.increment()
      let data = docSnap.data()
      let update = {
        groupsComplete: data.groupsComplete++, 
        recordsCompleted: data.recordsCompleted += recordsGeoreferenced, 
        lastGeoreference: Date.now(),
        lastGeoreferenceBy: userID
      }
      transaction.update(datasetRef, update);
    });
  }).then(function() {
    console.log("Dataset record updated!");
  }).catch(function(error) {
    throw error;
  });
}

module.exports = {
  fetchAdmins, 
  updateGeorefStats,
  updateDatasetStats, 
  fetchCandidateGeorefs
}

