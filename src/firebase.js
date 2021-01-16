import {firebaseConfig}  from './firebaseConfig.js'
import firebase from "firebase/app"
import 'firebase/firestore'
import 'firebase/database'
//import 'firebase/firebase-auth'
//import 'firebase/firebase-functions'
import 'firebase/firebase-storage'

firebase.initializeApp(firebaseConfig);

const Realtime = firebase.database()
const Firestore = firebase.firestore()
const Storage = firebase.storage()
const FieldValue = firebase.firestore.FieldValue
//const Functions = firebase.app().functions('europe-west1')

/*
const Auth = firebase.auth()


*/

export { 
  Realtime,
  Firestore, 
  FieldValue,
  //Auth, 
  //Functions, 
  Storage 
}