import convert from 'xml-js'

//we use Getty Thesaurus of Geographic Names
//currently only supports first level admin within a country
//treeArray is an array of trees with country as the root of each, each country with children, etc. 
//countryProgress and stateProvProgress must be progress objects with a tick() method.
//TGNHasAdmin2 is in anticipation of admin2 level country subdivisions in TGN. Default is false as these are not available at time of writing
const validateAdminDivisions = async (treeArray, countryProgress, stateProvProgress, TGNHasAdmin2 = false) => {
  
  

  let invalid = []

  for (let country of treeArray) {
    
    console.log('validating', country.name)

    
    validCountry = clean(validCountry)

    if (country.name != validCountry){
      let inv = {
        country: country.name,
        stateProvince: null,
        county: null,
        error: 'country'
      }
      invalid.push(inv)
    }

    if(country.children && Array.isArray(country.children) && country.children.length){
      console.log('checking stateProvinces')
      let countrySubjectID = get(countryData, 'Vocabulary.Subject.Subject_ID._text')
      let stateProvRes = await fetch(TGNChildrenURL, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }, 
          body: `subjectID=${countrySubjectID}`
        }
      )

      let countryChildrenData = convert(stateProvRes.text(), {compact:true})
      
      //extract all the names into an array
      let TGNCountryChildren = get(countryChildrenData, 'Vocabulary.Subject.Child_Relationships.Preferred_Child')
      let TGNStateProvs = []
      let isLeaf, TGNStateProv
      for (let TGNCountryChild of TGNCountryChildren){
        isLeaf = get(TGNCountryChild, 'Is_Leaf._text')
        if(isLeaf && isLeaf.toLowerCase() == 'yes') {
          TGNStateProv = get(TGNCountryChild, 'Preferred_Term._text')
          if(TGNStateProv && TGNStateProv.trim()) {
            TGNStateProvs.push(TGNStateProv)
          }
        }
        isLeaf = null
        TGNStateProv = null
      }

      for (let stateProv of country.children) {
        let matching = TGNStateProvs.find(TGNStateProv => stateProv.name == TGNStateProv)
        if (!matching){
          let inv = {
            country: country.name,
            stateProvince: stateProv,
            county: null,
            error: 'stateProvince'
          }
          invalid.push(inv)
        }
        else {
          if(TGNHasAdmin2 && stateProv.children && Array.isArray(stateProv.children) && stateProv.children.length){
            let stateProvSubjectID = get()
            let countyRes = await fetch(TGNChildrenURL, 
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                }, 
                body: `subjectID=${stateProvSubjectID}`
              }
            )

            let countyData = convert(countyRes.text(), {compact:true})
            
            let TGNStateProvChildren = get(countyData, 'Vocabulary.Subject.Child_Relationships.Preferred_Child')
            let TGNCounties = []
            let isLeaf, TGNCounty
            for (let TGNStateProvChild of TGNStateProvChildren){
              isLeaf = get(TGNStateProvChild, 'Is_Leaf._text')
              if(isLeaf && isLeaf.toLowerCase() == 'yes') {
                TGNCounty = get(TGNStateProvChild, 'Preferred_Term._text')
                if(TGNCounty && TGNCounty.trim()) {
                  TGNCounties.push(TGNCounty)
                }
              }
              isLeaf = null
              TGNCounty = null
            }

            for (let county of stateProv.children) {
              let matching = TGNCounties.find(TGNCounty => county.name == TGNCounty)
              if (!matching){
                let inv = {
                  country: country.name,
                  stateProvince: stateProv,
                  county: county,
                  error: 'county'
                }
                invalid.push(inv)
              }
            }
          }
        }
      }
    }
  }
}


//from https://stackoverflow.com/questions/23808928/javascript-elegant-way-to-check-nested-object-properties-for-null-undefined
const get = (obj, key) => {
  return key.split(".").reduce(function(o, x) {
      return (typeof o == "undefined" || o === null) ? o : o[x];
  }, obj);
}

const clean = text => {
  return text.replace(/\([a-z]*\)/g,"").trim() //to get rid of the stuff in brackets
}

const getGeographyItem = async (name, placetypeid = 81010) =>{
  let TGNNamesURL ='http://vocabsservices.getty.edu/TGNService.asmx/TGNGetTermMatch'
  
  if(!placetypeid || !placetypeid.trim()){
    throw new Error ()
  }
  
  let response = await fetch(TGNNamesURL, 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }, 
      body: `name=${name}&placetypeid=${placetypeid}&nationid=`
    }
  )

  if(response.status == 200) {
    let xml = response.text()
    if(xml && xml.trim()){
      let data = convert.xml2js(xml, {compact:true})
      let geographyItem = {}
      let result = get(data, 'Vocabulary.Subject')
      if(Array.isArray(result)) { //because this can be an array or an object from xml

      }
      else {
        geographyItem.name = get(data, 'Vocabulary.Subject.Preferred_Term._text')
        geographyItem.subjectID = Number(get(data, 'Vocabulary.Subject.Subject_ID._text'))
      }

    }
  }

  
  
}

const getChildren = async (subjectID) => {
  if(!subjectID  || isNaN(subjectID)) {
    throw new Error('subjectID is required for getChildren')
  }

  let TGNChildrenURL = 'http://vocabsservices.getty.edu/TGNService.asmx/TGNGetChildren'
  let response = await fetch(TGNChildrenURL, 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }, 
      body: `subjectID=${subjectID}`
    }
  )

  if(response.status == 200) {
    let xml = response.text()
    if(xml && xml.trim()) {
      let data = convert.xml2js(xml, {compact:true})
      let responseChildren = get(data, 'Vocabulary.Subject.Child_Relationships.Preferred_Child')
      let toReturn = []
      let mappedChild = {}
      let isLeafVal, subjectID
      if(responseChildren && Array.isArray(responseChildren) && responseChildren.length) {
        responseChildren.forEach(child => {
          
          subjectID = get(child, 'Child_Subject_ID._text')
          if(subjectID && subjectID.trim()) {
            mappedChild.subjectID = Number(subjectID)
          }
          else {
            mappedChild.subjectID = null
          }
          
          mappedChild.name = get(child, 'Preferred_Term._text')
          mappedChild.status = get(child, 'Historic_Flag._text')
          
          isLeafVal = get(child, 'Is_Leaf._text')
          mappedChild.isLeaf = isLeafVal === "YES"

          toReturn.push(mappedChild)
          mappedChild = {}

        })
      }
      return toReturn
    }
    else return []
  }
  else throw new Error('response status', response.status)
}

export const validateAdminDivisions