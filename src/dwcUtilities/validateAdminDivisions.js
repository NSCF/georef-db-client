import convert from 'xml-js'

//we use Getty Thesaurus of Geographic Names
//currently only supports first level admin within a country
//treeArray is an array of trees with country as the root of each, each country with children, etc. 
//countryProgress and stateProvProgress must be progress objects with a tick() method.
//TGNHasAdmin2 is in anticipation of admin2 level country subdivisions in TGN. Default is false as these are not available at time of writing
const validateAdminDivisions = async (treeArray, countryProgress, stateProvProgress, TGNHasAdmin2 = false) => {
  let TGNNamesURL ='http://vocabsservices.getty.edu/TGNService.asmx/TGNGetTermMatch'
  let TGNChildrenURL = ''

  let invalid = []

  for (let country of treeArray) {
    let res = await fetch(TGNNamesURL, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }, 
        body: `name=${country.name}&placetypeid=81010&nationid=`
      }
    )

    let xml = res.text()
    let data = convert(xml, {compact:true})
    //TODO check it's a valid country, and if it is, check it's children

    let validCountry = 'path to the country name'

    if (country.name != validCountry){
      let inv = {
        country: country.name,
        stateProvince: null,
        county: null,
        error: 'country'
      }
      invalid.push(inv)
    }

    if(country.children && country.children.length){
      let subjectID = 'This whole long path to the subjectid'
      let res = await fetch(TGNChildrenURL, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }, 
          body: `subjectID=${subjectID}`
        }
      )

      let xml = res.text()
      let data = convert(xml, {compact:true})
      
      //TODO extract all the names into an array
      let validStateProvs = []

      for (let stateProv of country.children) {
        let matching = validStateProvs.find(v => v.name = stateProv)
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
          if(TGNHasAdmin2 && stateProv.children && stateProv.children.length){
            let subjectID = 'This whole long path to the subjectid for this stateprov'
            let res = await fetch(TGNChildrenURL, 
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                }, 
                body: `subjectID=${subjectID}`
              }
            )

            let xml = res.text()
            let data = convert(xml, {compact:true})
            
            //TODO extract all the names into an array
            let validCounties = []

            for (let county of stateProv.children) {
              let matching = validCounties.find(v => v.name = county)
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

export const validateAdminDivisions