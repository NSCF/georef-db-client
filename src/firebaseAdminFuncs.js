import {  Firestore  } from '../src/firebase.js'
import groupLocalities from './CSVUtilities/groupLocalities.js'

const testFirebase = async _ => {

  let testDataRef = await Firestore.collection('datasets').doc('OzFuXcbACEpFv9YHxEeZ')
  let doc = await testDataRef.get()
  let data = doc.data()

  try{
    let i = 0
    while (i < 5){
      await Firestore.collection('datasets').add({
        first: "Alan",
        middle: "Mathison",
        last: "Turing",
        born: 1912
      })
      i++
    }
  }
  catch(err){
    console.log("error loading to firestore:", err.message)
  }
  
  let i = 0

  return
}

const emptyCollection = async (collection, wherefield, wherevalue) => {
  if(collection) {

    console.log('starting empty collection')


    let query = Firestore.collection(collection)
    if(wherefield && wherevalue) {
      query = query.where(wherefield, '==', wherevalue)
    }

    let snap = await query.get()
    let deletes = []
    let counter = 0
    let groupSize = 50
    while (counter < snap.docs.length){
      deletes.push(snap.docs[counter].ref.delete())
      if (counter % groupSize == 0 || counter == snap.docs.length - 1){
        await Promise.all(deletes)
        deletes = []
        console.log('deleted some records')
      }

      counter++

    }

    console.log(`${counter} record${counter > 1? 's' : ''} deleted from '${collection}'`)
    return

  }
  else {
    console.log('no collection provided for emptyCollection')
    return 
  }
}

const countRecords = async (collection, wherefield, wherevalue) => {
  let query = Firestore.collection(collection).where(wherefield, '==', wherevalue)
  let snap = await query.get()
  return snap.size
}

const getRecordGroup = async () => {
  let query = Firestore.collection('recordGroups')
  .where('completed', '==', false)
  .where("groupLocked", "==", false)
  .orderBy("locStringCount", "desc").limit(1)

  let snap = await query.get()
  if(snap.empty) {
    return null
  }
  else {
    return snap.docs[0].data().groupKey + '; count: ' + snap.docs[0].data().groupRecordCount
  }
}

export {
  getRecordGroup,
  countRecords,
  testFirebase,
  emptyCollection
}