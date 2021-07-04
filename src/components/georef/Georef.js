export default class Georef {
  constructor() {
    this.georefID = null
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
    this.dateCreated = Date.now()
    this.createdBy = null
    this.createdByORCID = null
    this.lastEdited = null
    this.lastEditedBy = null
    this.lastEditRemarks = null

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

