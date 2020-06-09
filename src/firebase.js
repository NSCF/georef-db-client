import firebase from "firebase/app"
import 'firebase/firestore'
import 'firebase/database'
//import 'firebase/firebase-auth'
//import 'firebase/firebase-functions'
import 'firebase/firebase-storage'

console.log(Object.keys(firebase))

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

console.log(Object.keys(firebase))

const Realtime = firebase.database()
const Firestore = firebase.firestore()
const Storage = firebase.storage()
/*
const Auth = firebase.auth()
const Functions = firebase.app().functions('europe-west1')

*/

export { 
  Realtime,
  Firestore, 
  //Auth, 
  //Functions, 
  Storage 
}