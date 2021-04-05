
const isEmpty = val => {
  if(typeof val == 'string') {
    return !Boolean(val.trim())
  }
  else {
    return val === null || val === undefined
  }
}

const georefsEqual = (georef1, georef2) => {

  if(georef1 && georef2){
    //convert to plain objects
    let obj1 = JSON.parse(JSON.stringify(georef1))
    let obj2 = JSON.parse(JSON.stringify(georef2))
    
    let keys = new Set()
    for (let key of Object.keys(obj1)){
      keys.add(key)
    }
    for (let key of Object.keys(obj2)){
      keys.add(key)
    }

    for (let key of Array.from(keys)){
      
      //ignore these
      if (['ambiguous', 'flagged', 'selected', 'used'].includes(key)) {
        continue
      }

      if(obj1.hasOwnProperty(key)){
        if(obj2.hasOwnProperty(key)){
          //if empty on one it must be empty on the other
          if(isEmpty(obj1[key]) && !isEmpty(obj2[key])){

            console.log(key, 'has changed')
            console.log(key, 'has changed. Old = ', obj1[key], ', new =', obj2[key])
            return false
          }

          if(!isEmpty(obj1[key]) && isEmpty(obj2[key])){
            console.log(key, 'has changed')
            console.log(key, 'has changed. Old = ', obj1[key], ', new =', obj2[key])
            return false
          }

          //they both have a value
          if(obj1[key] != obj2[key]) {
            return false
          }

        }
        else {
          //they key is on 1 but not 2 so it must be empty
          if(!isEmpty(obj1[key], true)) {
            return false
          }
        }
      }
      else { //it must have been on 2 so it must be null or empty there
        if(!isEmpty(obj2[key], true)) {
          return false
        }
      }
    }

    //we got through it all, they must be equal
    return true
  }
  else {
    return false
  }
}

export { georefsEqual }