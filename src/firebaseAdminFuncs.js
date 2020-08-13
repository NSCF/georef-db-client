import {  Firestore  } from '../src/firebase.js'

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
    let counter = 0
    let query = Firestore.collection(collection)
    if(wherefield && wherevalue) {
      query = query.where(wherefield, '==', wherevalue)
    }

    let snap = await query.get()
    for (let doc of snap.docs){
      await doc.ref.delete()
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

export default {
  testFirebase,
  emptyCollection
}