import { nanoid } from "nanoid/nanoid.js" //see https://github.com/ai/nanoid/issues/237
import { v4 as uuid } from 'uuid'; //because we need uuid guids as well...
import { Firestore, Auth } from '../../firebase';

export default class Georef {
  constructor() {
    this.georefID = nanoid()
    this.guid = uuid()
    this.country = null
    this.stateProvince = null
    this.locality = null
    this.verbatimCoordinates = null
    this.decimalLatitude = null
    this.decimalLongitude = null
    this.uncertainty = null
    this.uncertaintyUnit = null
    this.datum = null
    this.by = null
    this.byORCID = null
    this.date = null
    this.sources = null
    this.originalGeorefSource = null
    this.protocol = null
    this.remarks = null
    this.verified = false
    this.verifiedBy = null
    this.verifiedByORCID = null
    this.verifiedDate = null
    this.verifiedByRole = null
    this.verificationRemarks = null
    this.createdBy = null
    this.createdByID = null
    this.dateCreated = Date.now()
    this.lastEdited = null
    this.lastEditedBy = null
    this.lastEditdByID = null
    this.lastEditRemarks = null
    this.region = null
    this.domain = null
    this.used = false
    this.flagged = false
    this.ambiguous = false

    Object.defineProperties(this, {
      protocolObject: {
        enumerable: false,
        get() {
          if(this.protocol && this.protocol.trim()){
            let r = {value: this.protocol, label: this.protocol}
            return r
          }
          else {
            return undefined
          }
        },
        set(obj) {
          if(obj){
            this.protocol = obj.value
          }
          else {
            this.protocol = null
          }
        }
      }, 
      sourcesArray: {
        enumerable: false,
        get() {
          if(this.sources && this.sources.trim()){
            let sourceItems = this.sources.split('|').filter(x=>x).map(x=>x.trim()).filter(x=>x)
            if(sourceItems.length) {
              let selectedSources = []
              for (let item of sourceItems){
                selectedSources.push({value: item, label:item})
              }
              return selectedSources
            }
            else {
              return null
            }
          }
          else {
            return null
          }
        },
        set(selectedSources){ //for taking an array of {value, label} objects used for a <select>, throws if any problems
          if(Array.isArray(selectedSources)) {
            this.sources = selectedSources.map(x=>x.value).join(' | ')
          }
          else {
            this.sources = null
          }
        }
      }, 
      dateOkay: {
        value:true,
        writable: true,
        enumerable: false
      }, 
      verifiedDateOkay: {
        value:true,
        writable: true,
        enumerable: false
      }, 
      uncertaintyUnitOkay: {
        value:true,
        writable: true,
        enumerable: false
      }
    }) 
  }

  ////////METHODS/////////////

  //deep copy
  copy() {
    let copy = new Georef()
    for (let [key, val] of Object.entries(this)){
      
      if(key == 'protocolObject'){
        copy[key] = Object.assign({}, val)
        continue
      }

      if(key == 'sourcesArray'){
        copy[key] = val.map(x=>Object.assign({}, x)) //sourcesArray is an array of objects
        continue
      }

      copy[key] = val
    }
    return copy
  }

  //empty everything
  clear(){
    for (let key of Object.keys(this)){
      this[key] = null
    }
    this.protocolObject = null
    this.sourcesArray = undefined
    this.dateCreated = Date.now()
  }

  //indicate whether this is different to another georef, eg for checking changes
  differentTo(other) {
    if(!other || Object.keys(other).length == 0) {
      return true
    }
    //we specify the fields that need to be checked to see if we can consider this a different georef
    let fieldsToCheck = ['locality','verbatimCoordinates','decimalLatitude','decimalLongitude','uncertainty','uncertaintyUnit','datum','by','byORCID','date','sources','protocol','remarks']
    for (let field of fieldsToCheck) {
      if(field == 'decimalLatitude' || field == 'decimalLongitude'){
        //we only consider differences more less than a certain number of decimals as different
        if(Math.abs(this[field] - other[field]) > 0.000000001) {
          return true
        }
      }
      else {
        if(this[field] != other[field]){
          return true
        }
      }
    }
    return false
  }

  resetFieldsIfDifferent() {
    this.georefID = nanoid()
    this.guid = uuid()
    this.country = null
    this.stateProvince = null
    this.originalGeorefSource = null
    this.verified = false
    this.verifiedBy = null
    this.verifiedByORCID = null
    this.verifiedDate = null
    this.verifiedByRole = null
    this.verificationRemarks = null
    this.createdBy = null
    this.createdByID = null
    this.dateCreated = Date.now()
    this.lastEdited = null
    this.lastEditedBy = null
    this.lastEditdByID = null
    this.lastEditRemarks = null
    this.region = null
    this.domain = null
    this.used = false
    this.flagged = false
    this.ambiguous = false
    this.selected = false //just in case
  }

  /**
   * 
   * @param {object} profile a user profile object
   * @param {object} dataset a dataset object
   * @param {string} index a flag for whether to update or save/create
   * @param {boolean} update a flag for whether to update or save/create
   * @returns null
   */
  async persist(profile, dataset, index, update){
    if(!profile || !dataset || !index || !index.trim()) {
      throw new Error('valid profile and dataset objects and an index are required to persist a georef')
    }

    if(update) {
      this.lastEdited = Date.now()
      this.lastEditedB = profile.formattedName
      this.lastEditdByID = profile.uid
    }
    else {
      this.dateCreated = Date.now()
      this.createdBy = profile.formattedName
      this.createdByID = profile.uid
  
      this.region = dataset.region
      this.domain = dataset.domain
  
      if(!this.originalGeorefSource || !this.originalGeorefSource.trim()) {
        this.originalGeorefSource = 'NSCF georeference database'
      }
    }
    
    //save to elastic via our API
    let url
    if(update) {
      url = 'https://us-central1-georef-745b9.cloudfunctions.net/updategeoref'
    }
    else {
      url = 'https://us-central1-georef-745b9.cloudfunctions.net/addgeoref'
    } 

    let token = await Auth.currentUser.getIdToken();

    let res
    try {
      res = await fetch(url, {
        method: 'POST', 
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: (JSON.stringify({georef: this, index}))
      })
    }
    catch(err) {
      this.saveError = err.message
      console.error(`error ${update? 'updating' : 'saving'} this georef:`)
      console.log(this)
      try {
        let target = update? 'updateGeorefErrors' : 'saveGeorefErrors'
        await Firestore.collection(target).doc(this.georefID).set(this)
      }
      catch(err) {
        alert('Failed to store failed georef on Firebase:', err.message)
        return
      }
    }

    if(res.status != 200) {
      //we need to try save it elsewhere so the system admin can fix these
      let body = await res.json()
      if(body.validation) {
        this.validationErrors = body.validation
        console.log(this)
        try {
          let target = update? 'updateGeorefErrors' : 'saveGeorefErrors'
          await Firestore.collection(target).doc(this.georefID).set(this) //async
        }
        catch(err) {
          alert('Unable to store failed georef on Firebase:', err.message)
          return
        }
        
        let message = `There was an error ${update? 'updating' : 'saving'} the georeference with id ${this.georefID}.\r\n\r\n`
        message += 'There were validation errors with these fields:' + body.validation + '\r\n\r\n'
        message += 'Please take a screenshot and alert the NSCF on data@nscf.org.za'
        alert(message)
      }
      else {
        this.saveErrors = body
        console.error("Error saving this georef:")
        console.log(this)
        try {
          let target = update? 'updateGeorefErrors' : 'saveGeorefErrors'
          await Firestore.collection(target).doc(this.georefID).set(this) //async
        }
        catch(err) {
          alert('Unable to store failed georef on Firebase:', err.message)
          return
        }
        
        let message = `There was an error ${update? 'updating' : 'saving'} the georeference with id ${this.georefID}.\r\n\r\n`
        message += 'Error message:' + body + '\r\n\r\n'
        message += 'Please take a screenshot and alert the NSCF on data@nscf.org.za'
        alert(message)
        return
      }
    }
    else {
      if(window.pushToast) {
        let message = update? 'georef updated' : 'new georef saved'
        window.pushToast(message)
      } 
    }
  }

  ///////COMPUTED PROPERTIES///////////////
  get decimalCoordinates() {
    if(this.decimalLatitude && this.decimalLongitude) {
      return this.decimalLatitude  + ',' + this.decimalLongitude
    }
    else {
      return null
    }
  }

  //assumed already validated
  set decimalCoordinates(coordsString){
    if(coordsString && coordsString.trim()) {
      let parts = coordsString.split(',')
      this.decimalLatitude = Number(parts[0])
      this.decimalLongitude = Number(parts[1])
    }
    
  }

  //this is validation
  get decimalCoordinatesOkay() {
    if(this.decimalLatitude && this.decimalLongitude){
      if (isNaN(this.decimalLatitude) || isNaN(this.decimalLongitude)) {
        return false
      }

      if(this.decimalLatitude > 90 || this.decimalLongitude < -90) {
        return false
      }

      if(this.decimalLongitude > 180 || this.decimalLongitude < -180){
        return false
      }

      //Check they are actually decimals
      let re = /^-?\d{1,2}\.\d+,\s*-?\d{1,3}\.\d+$/
      if (!re.test(this.decimalCoordinates)) {
        return false
      }
      
      //else
      return true
    }
    else {
      return true
    }

  }

  //this just to show warnings for those with too few or too many decimals
  get decimalCoordinatesWarning() {
    let re = /^-?\d{1,2}\.\d{4,8},\s*-?\d{1,3}\.\d{4,8}$/
    if (!re.test(this.decimalCoordinates)) {
      return true
    }
    else {
      return false
    }
  }

  get dateOkay() {
    if(this.date && this.date.trim()) {
      return /^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(this.date) && new Date(this.date) < Date.now()
    }
    else {
      return true //we dont' test for it being required here
    }
    
  }

  get verifiedDateOkay() {
    if(this.verifiedDate && this.verifiedDate.trim()){
      return /^(19|20)\d\d-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(this.verifiedDate) && new Date(this.verifiedDate) < Date.now()
    }
    else {
      return true //we dont' test if its required here
    }
  }

  get uncertaintyUnitOkay() {
    if(this.uncertainty) {
      if(!this.uncertaintyUnit || !this.uncertaintyUnit.trim() || !['m','km'].contains(this.uncertaintyUnit.trim())){
        return false
      }
    }
    //else
    return true
  }
}

