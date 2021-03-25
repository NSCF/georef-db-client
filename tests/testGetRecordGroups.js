var firebase = require("firebase/app");

// Add the Firebase products that you want to use
//require("firebase/auth");
require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyBwK_DbeqcjfjRbqlZcrYnFYMn8GmbarHQ",
  authDomain: "georef-745b9.firebaseapp.com",
  databaseURL: "https://georef-745b9.firebaseio.com",
  projectId: "georef-745b9",
  storageBucket: "georef-745b9.appspot.com",
  //messagingSenderId: "162606464079",
  appId: "1:162606464079:web:ed51bb48a5443b0795be3a"
};

firebase.initializeApp(firebaseConfig);

let Firestore = firebase.firestore()

let dataset = {
  datasetID: 'lgWpH1KRRqCaqeKnW90zL'
}

const getRecordGroups = async _ => {
  let recordGroupsQuerySnap = await Firestore.collection('recordGroups')
  .where('datasetID', '==', dataset.datasetID).get()

  if(recordGroupsQuerySnap.empty) { 
    //this should never happen!!
    throw new Error('no record groups returned for this dataset!!')
  }
  else {
    let recordGroups = recordGroupsQuerySnap.docs.map(x=>x.data())
    let recordGroupIndex = {} //this is the beginning of the data to be returned........
    let recordIndex = {}
    for (let recordGroup of recordGroups){
      recordGroupIndex[recordGroup.groupID] = recordGroup
      if(recordGroup.groupLocalities && recordGroup.groupLocalities.length){
        for (let [index, groupLoc] of recordGroup.groupLocalities.entries()) { //this now has the georef fields
          for (let recordID of groupLoc.recordIDs) {
            let obj = {}
            obj[recordGroup.groupID] = index
            recordIndex[recordID] = obj
          }
        }
      }
    }

    return {
      recordGroupIndex,
      recordIndex
    }
  }
}

getRecordGroups().then(res => {

  let i = 0
})