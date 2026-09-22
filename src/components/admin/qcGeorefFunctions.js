import { Firestore, FieldPath } from '../../firebase'

const FirestoreGeorefRecords = Firestore.collection('georefRecords')
const FirestoreGeorefs = Firestore.collection('georefBackup')

/**
 * Finds the next georeference to verify, locks it, and returns its DocumentSnapshot.
 * @param {string} datasetID 
 * @param {string} currentUserID 
 * @param {string|null} georeferencerID 
 * @param {string} startAtOrAfter 
 * @param {string|DocumentSnapshot} queuePosition 
 * @returns {Promise<DocumentSnapshot|null>} DocSnapshot for a georeference or null if there are no more georeferences 
 */
const findNextGeorefToVerify = async (datasetID, currentUserID, georeferencerID, startAtOrAfter, queuePosition) => {

  if(!datasetID){
    throw new Error('no datasetID provided to findNextGeorefToVerify')
  }

  if(!currentUserID){
    throw new Error('no currentUserID provided to findNextGeorefToVerify')
  }

  let currentCursor = queuePosition
  let currentAtOrAfter = startAtOrAfter || 'startAt'

  while(true) {
    //build the query
    let query = FirestoreGeorefRecords
      .where('datasetIDs', 'array-contains', datasetID)
      .where('verified', '==', false)
      .where('locked', '==', false)
      .orderBy(FieldPath.documentId())

    if(georeferencerID) {
      query = query.where('createdByID', '==', georeferencerID)
    }

    if(currentAtOrAfter && currentCursor) {
      query = query[currentAtOrAfter](currentCursor)
    }

    query = query.limit(1)

    //run the query
    let querySnap
    try {
      querySnap = await query.get()
    }
    catch(err) {
      console.error('Error reading georefRecords:', err)
      throw err
    }

    if(querySnap.empty) { //there are no more georeferences to verify
      return null
    }

    const docSnap = querySnap.docs[0]
    const docData = docSnap.data()

    // If reviewing "all", skip records created by current user (can't verify own georeferences)
    if(!georeferencerID && docData.createdByID === currentUserID) {
      currentCursor = docSnap.id
      currentAtOrAfter = 'startAfter'
      continue
    }

    // Try to lock it
    let lockedSuccessfully = false
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
      lockedSuccessfully = true
    }
    catch(err) {
      if(err.message === 'already locked') {
        // Locked by another reviewer, advance cursor and try the next record
        currentCursor = docSnap.id
        currentAtOrAfter = 'startAfter'
        continue
      }
      throw err
    }

    if(lockedSuccessfully) {
      // Get the georeference
      try {
        const georefSnap = await FirestoreGeorefs.doc(docSnap.id).get()
        return georefSnap
      }
      catch(err) {
        // Revert lock if reading backup fails
        try {
          await docSnap.ref.update({locked: false})
        } catch(e) {}
        const msg = 'Error reading georefBackup: ' + err.message
        throw new Error(msg)
      }
    }
  }
}

export {
  findNextGeorefToVerify as getNextGeorefToVerify
}