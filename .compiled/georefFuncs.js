'use strict';var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}(); //FUNCTIONS USED BY georef COMPONENT

var Georef = require('./Georef.js');

var fetchCandidateGeorefs = async function fetchCandidateGeorefs(groupLocalities, elasticindex) {
  //groupLocalities must be a set of {id: ..., loc: ... } objects

  if (groupLocalities && groupLocalities.length) {
    var elasticFetches = []; //promise array
    var _iteratorNormalCompletion = true;var _didIteratorError = false;var _iteratorError = undefined;try {
      for (var _iterator = groupLocalities[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {var loc = _step.value;
        elasticFetches.push(fetchGeorefsForLoc(loc.loc, elasticindex));
      }} catch (err) {_didIteratorError = true;_iteratorError = err;} finally {try {if (!_iteratorNormalCompletion && _iterator.return) {_iterator.return();}} finally {if (_didIteratorError) {throw _iteratorError;}}}

    var fetchResults = void 0;

    try {
      fetchResults = await Promise.all(elasticFetches);
    }
    catch (err) {
      throw err;
    }

    //get the uniques and record who they belong to
    //an object as a dictionary of all the georefs
    //an object with the index of each groupLoc and its associated georefs
    //on select of groupLoc/s destructure all the georef keys from the groupLoc index and make a set
    //iterate the georef dictionary and update each one as visible or not

    var georefIndex = {}; //it will be a and object of georefID: georefobject pairs

    if (fetchResults.length) {var _iteratorNormalCompletion2 = true;var _didIteratorError2 = false;var _iteratorError2 = undefined;try {
        for (var _iterator2 = fetchResults.entries()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {var _step2$value = _slicedToArray(_step2.value, 2),index = _step2$value[0],elasticGeorefs = _step2$value[1];
          if (elasticGeorefs.length) {var _iteratorNormalCompletion3 = true;var _didIteratorError3 = false;var _iteratorError3 = undefined;try {
              for (var _iterator3 = elasticGeorefs[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {var elasticGeoref = _step3.value;

                var georef = Object.assign(new Georef(), elasticGeoref._source);
                if (georef.selected) {//just in case any of these sneak through
                  delete georef.selected;
                }

                if (!georef.decimalCoordinatesOkay) {
                  //console.log('error with coordinates for georef', elasticGeoref._id)
                  continue;
                }

                if (!georefIndex[georef.georefID]) {
                  georefIndex[georef.georefID] = georef;
                }
              }} catch (err) {_didIteratorError3 = true;_iteratorError3 = err;} finally {try {if (!_iteratorNormalCompletion3 && _iterator3.return) {_iterator3.return();}} finally {if (_didIteratorError3) {throw _iteratorError3;}}}
          }
        }} catch (err) {_didIteratorError2 = true;_iteratorError2 = err;} finally {try {if (!_iteratorNormalCompletion2 && _iterator2.return) {_iterator2.return();}} finally {if (_didIteratorError2) {throw _iteratorError2;}}}
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
      georefIndex: georefIndex };

  } else
  {
    throw new Error('no values supplied');
  }
};

//just a helper for above
var fetchGeorefsForLoc = async function fetchGeorefsForLoc(locString, index) {
  var search = encodeURI(locString);
  var url = 'https://us-central1-georef-745b9.cloudfunctions.net/getgeorefs?search=' + search + '&index=' + index;
  var response = await fetch(url);
  var data = await response.json();
  return data;
};

var updateGeorefStats = async function updateGeorefStats(Firebase, georefsAdded, recordsGeoreferenced, userID, userName, datasetID) {
  var yearmonth = getYearMonth(new Date());
  var yearweek = getYearWeek(new Date());
  var now = new Date();
  var today = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0]; //we need this horrible thing to adjust for time zone differences as getTime gives a utc time

  var refstrings = [
  //totals
  'stats/georefsAdded',
  'stats/recordsGeoreferenced', 'stats/weekly/' +
  yearweek + '/georefsAdded', 'stats/weekly/' +
  yearweek + '/recordsGeoreferenced', 'stats/monthly/' +
  yearmonth + '/georefsAdded', 'stats/monthly/' +
  yearmonth + '/recordsGeoreferenced',

  //perDataset
  'stats/perDataset/' + datasetID + '/georefsAdded', 'stats/perDataset/' +
  datasetID + '/recordsGeoreferenced', 'stats/perDataset/' +
  datasetID + '/perUser/' + userID + '/georefsAdded', 'stats/perDataset/' +
  datasetID + '/perUser/' + userID + '/recordsGeoreferenced', 'stats/perDataset/' +
  datasetID + '/perUser/' + userID + '/daily/' + today + '/georefsAdded', 'stats/perDataset/' +
  datasetID + '/perUser/' + userID + '/daily/' + today + '/recordsGeoreferenced', 'stats/perDataset/' +
  datasetID + '/perUser/' + userID + '/weekly/' + yearweek + '/georefsAdded', 'stats/perDataset/' +
  datasetID + '/perUser/' + userID + '/weekly/' + yearweek + '/recordsGeoreferenced', 'stats/perDataset/' +
  datasetID + '/perUser/' + userID + '/monthly/' + yearmonth + '/georefsAdded', 'stats/perDataset/' +
  datasetID + '/perUser/' + userID + '/monthly/' + yearmonth + '/recordsGeoreferenced',

  //perUser
  'stats/perUser/' + userID + '/georefsAdded', 'stats/perUser/' +
  userID + '/recordsGeoreferenced', 'stats/perUser/' +
  userID + '/daily/' + today + '/georefsAdded', 'stats/perUser/' +
  userID + '/daily/' + today + '/recordsGeoreferenced', 'stats/perUser/' +
  userID + '/weekly/' + yearweek + '/georefsAdded', 'stats/perUser/' +
  userID + '/weekly/' + yearweek + '/recordsGeoreferenced', 'stats/perUser/' +
  userID + '/monthly/' + yearmonth + '/georefsAdded', 'stats/perUser/' +
  userID + '/monthly/' + yearmonth + '/recordsGeoreferenced'];


  var proms = [];var _iteratorNormalCompletion4 = true;var _didIteratorError4 = false;var _iteratorError4 = undefined;try {
    for (var _iterator4 = refstrings[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {var rs = _step4.value;
      var val = georefsAdded;
      if (rs.endsWith('recordsGeoreferenced')) {
        val = recordsGeoreferenced;
      }
      var ref = Firebase.ref(rs);
      proms.push(updateStat(ref, val));
    }} catch (err) {_didIteratorError4 = true;_iteratorError4 = err;} finally {try {if (!_iteratorNormalCompletion4 && _iterator4.return) {_iterator4.return();}} finally {if (_didIteratorError4) {throw _iteratorError4;}}}

  var updateLastGeorefsAdded = Firebase.ref('stats/lastGeorefAdded').transaction(function (current) {
    current = Date.now();
    return current;
  });

  var updateLastGeorefsAddedBy = Firebase.ref('stats/lastGeorefAddedBy').transaction(function (current) {
    current = userName;
    return current;
  });

  var updateLastGeorefsAddedByID = Firebase.ref('stats/lastGeorefAddedByID').transaction(function (current) {
    current = userID;
    return current;
  });

  var updateDatasetLastGeorefsAdded = Firebase.ref('stats/perDataset/' + datasetID + '/lastGeorefAdded').transaction(function (current) {
    current = Date.now();
    return current;
  });

  var updateDatasetLastGeorefsAddedBy = Firebase.ref('stats/perDataset/' + datasetID + '/lastGeorefAddedBy').transaction(function (current) {
    current = userName;
    return current;
  });

  var updateDatasetLastGeorefsAddedByID = Firebase.ref('stats/perDataset/' + datasetID + '/lastGeorefAddedByID').transaction(function (current) {
    current = userID;
    return current;
  });

  proms.push(updateLastGeorefsAdded);
  proms.push(updateLastGeorefsAddedBy);
  proms.push(updateLastGeorefsAddedByID);

  proms.push(updateDatasetLastGeorefsAdded);
  proms.push(updateDatasetLastGeorefsAddedBy);
  proms.push(updateDatasetLastGeorefsAddedByID);

  await Promise.all(proms); //thats 30 in total!!

  console.log('georef count stats updated');

};

var updateStat = function updateStat(statRef, increment) {
  statRef.transaction(function (current) {
    if (current) {
      current += increment;
    } else
    {
      current = increment;
    }
    return current;
  });
};

var getYearWeek = function getYearWeek(d) {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  // Return array of year and week number
  return d.getUTCFullYear() + ' ' + weekNo.toString().padStart(2, '0');
};

var getYearMonth = function getYearMonth(d) {
  var y = d.getUTCFullYear();
  var m = d.getMonth() + 1;
  return y + ' ' + m.toString().padStart(2, '0');
};

var updateDatasetStats = function updateDatasetStats(Firestore, datasetRef, recordsGeoreferenced, userID, groupComplete) {
  return Firestore.runTransaction(function (transaction) {
    // This code may get re-run multiple times if there are conflicts.
    return transaction.get(datasetRef).then(function (docSnap) {
      if (!docSnap.exists) {
        throw "Document does not exist!";
      }

      var data = docSnap.data();
      var update = {
        recordsCompleted: data.recordsCompleted += recordsGeoreferenced,
        lastGeoreference: Date.now(),
        lastGeoreferenceBy: userID };


      if (groupComplete) {
        //console.log('updating groups completed')
        //console.log('Value of dataset.groupsComplete:', data.groupsComplete)
        update.groupsComplete = data.groupsComplete++;
      }

      transaction.update(datasetRef, update);
    });
  }).then(function () {
    var i = 0; //do nothing
    //console.log("Dataset record updated!");
  }).catch(function (error) {
    throw error;
  });
};

module.exports = {
  updateGeorefStats: updateGeorefStats,
  updateDatasetStats: updateDatasetStats,
  fetchCandidateGeorefs: fetchCandidateGeorefs };
//# sourceMappingURL=georefFuncs.js.map