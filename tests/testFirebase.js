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

testFirebase()
