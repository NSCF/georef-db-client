import {Firestore, FieldPath} from '../../firebase'

const FirestoreGeorefRecords = Firestore.collection('georefRecords')

/**
 * 
 * @param {string} datasetID 
 * @param {string} georeferencerID 
 * @param {string} startAtOrAfter 
 * @param {DocumentSnapshot} queuePosition 
 * @returns DocSnapshot for a georeference or null if there are no more georeferences 
 */
const findNextGeorefToVerify = async (datasetID, currentUserID, georeferencerID, startAtOrAfter, queuePosition) => {

  if(!datasetID){
    throw new Error('no datasetID provided to findNextGeorefToVerify')
  }

  if(!currentUserID){
    throw new Error('no currentUserID provided to findNextGeorefToVerify')
  }

  //build the query
  let query = FirestoreGeorefRecords
    .where('datasetIDs', 'array-contains', datasetID)
    .where('verified', '==', false)
    .where('locked', '==', false)
    .orderBy(FieldPath.documentId())

  if(georeferencerID) {
    console.log('filtering georefs for user', georeferencerID)
    query = query.where('createdByID', '==', georeferencerID)
  }
  else {
    query = query.where('createdByID', '!=', currentUserID) //we can't verify our own georeferences
  }

  if(startAtOrAfter && queuePosition) {
    query = query[startAtOrAfter](queuePosition)
  }

  query = query.limit(1)

  //run the query
  let querySnap
  try {
    querySnap = await query.get()
  }
  catch(err) {
    console.error('Error reading georefRecords:')
    console.error(err)
    return
  }

  if(querySnap.empty) { //there are no more georeferences to verify
    return null
  }
  else {
    const docSnap = querySnap.docs.pop() //only one remember!

    //now we need to try and lock it
    try {
      await Firestore.runTransaction(async transaction => {
        let snap = await transaction.get(docSnap.ref)
        if(snap.data().locked) { //it might have been locked between query time and now
          throw new Error('already locked')
        }
        else {
          await transaction.update(docSnap.ref, {locked: true})
        }
      })
    }
    catch(err) { //the transaction failed or it got locked!
      throw(err)
    }

    //get the georeference
    try {
      const georefSnap = await FirestoreGeorefs.doc(docSnap.id).get()
      return 
    }
    catch(err) {
      const msg = 'Error reading georefBackup: ' + err.message
      throw new Error(msg)
    }
  }
}

export {
  findNextGeorefToVerify as getNextGeorefToVerify
}