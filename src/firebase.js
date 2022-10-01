import { firebaseConfig }  from './firebaseConfig.js'
import firebase from "firebase/app"
import 'firebase/firestore'
import 'firebase/database'
import 'firebase/firebase-auth'
//import 'firebase/firebase-functions'
import 'firebase/firebase-storage'

firebase.initializeApp(firebaseConfig);

const Realtime = firebase.database()
const Firestore = firebase.firestore()
const Auth = firebase.auth()
const Storage = firebase.storage()
const FieldValue = firebase.firestore.FieldValue
const FieldPath = firebase.firestore.FieldPath
const ServerValue = firebase.database.ServerValue
//const Functions = firebase.app().functions('europe-west1')

export { 
  Realtime,
  Firestore, 
  FieldValue,
  FieldPath,
  Auth, 
  //Functions, 
  Storage,
  ServerValue 
}