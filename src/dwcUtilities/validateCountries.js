
//uses REST Countries (https://restcountries.eu) as the standard for country names, just because it's accessible and relatively good
//makes a few changes, eg where country name has brackets

/**
 * 
 * @param {*} datasetCountries - the list of countries from the dataset to validate
 * @param {*} restCountries - the results of a call to getCountries
 * @param {*} regionCountries - the list of countries for a particular region
 * @returns list of invalid countries which will be removed from the dataset before grouping
 */
const validateCountries = (datasetCountries, restCountries, regionCountries) => {
  console.log('datasetcountries is', datasetCountries)
  console.log('region countries is', regionCountries)
  regionCountries = regionCountries.split(',').filter(x=>x).map(x=>x.trim()).filter(x=>x)
  //assumes a uniqe list of country names, but just in case not...
  datasetCountries = datasetCountries.filter(onlyUnique)

  let invalid = []
  let datasetCountryWithCodes = []
  let regionCountryCodes = new Set()

  let searchResults
  for (let country of datasetCountries) {
    searchResults = findMatchingCountries(country, restCountries)
    if(searchResults.length){
      if(searchResults.length > 1){
        invalid.push({
          country,
          ambiguous: true
        })
      }
      else {
        datasetCountryWithCodes.push({country, countryCode: searchResults[0].alpha3Code})
      }
    }
    else {
      invalid.push({
        country,
        ambiguous: false
      })
    }
  }

  for (let regionCountry of regionCountries){
    searchResults = findMatchingCountries(regionCountry, restCountries)
    if(searchResults.length){
      if(searchResults.length > 1){
        alert('there is a problem with the list of region countries:', regionCountry, 'is ambiguous! Any records for this country will be removed from the dataset')
      }
      else {
        regionCountryCodes.add(searchResults[0].alpha3Code)
      }
    }
    else {
      alert('there is a problem with the list of region countries:', regionCountry, 'could not be verified! Any records for this country will be removed from the dataset')
    }
  }


  //now check if any more are problematic
  for (let countryWithCode of datasetCountryWithCodes){
    if(!regionCountryCodes.has(countryWithCode.countryCode)) {
      invalid.push({
        country: countryWithCode.country, 
        ambiguous: false
      })
    }
  }

  return invalid

}

const getCountries = async () => {
  let restcountriesresponse = await fetch('https://restcountries.eu/rest/v2/all')
  if(restcountriesresponse.status == 200){
    
    let restcountries = await restcountriesresponse.json()
    
    let re = /\(.*\)/gi //for testing if a string includes something in parentheses

    //some preprocessing
    let match
    let newAlt
    for (let restcountry of restcountries) {
      if (re.test(restcountry.name)){
        match = restcountry.name.match(re)[0] //we assume only one match
        if(match.includes('Republic') || match.includes('State')) {
          restcountry.name = restcountry.name.replace(match, '').trim()
          match = match.replace(/[\(\)]/g, '').trim()
          newAlt = [match, restcountry.name].join(' ')
          if(!restcountry.altSpellings.includes(newAlt)){
            restcountry.altSpellings.push(newAlt)
          }
          match = null
          newAlt = null
        }
        else {
          if(restcountry.name.startsWith('Falkland Islands')){
            if(!restcountry.altSpellings.includes('Falkland Islands')){
              restcountry.altSpellings.push('Falkland Islands')
            }
          }
          if(restcountry.name.startsWith('Saint Martin')){
            restcountry.name = 'Saint Martin'
          }
          if(restcountry.name.startsWith('Sint Maarten')){
            restcountry.name = 'Sint Maarten'
          }
        }
      }
      else {
        if (restcountry.name.startsWith('Palestine')) {
          restcountry.name = 'Palestine'
        }
        else if (restcountry.name.startsWith('Republic of Kosovo')) {
          restcountry.name = 'Kosovo'
          if(!restcountry.altSpellings.includes('Republic of Kosovo')){
            restcountry.altSpellings.push('Republic of Kosovo')
          }
        }
        else if (restcountry.name == 'Russian Federation') {
          restcountry.name = 'Russia'
        }
        else if (restcountry.name.startsWith('Syrian Arab')) {
          restcountry.name = 'Syria'
        }
        else if (restcountry.name.startsWith('Tanzania')) {
          restcountry.name = 'Tanzania'
        }
        else if (restcountry.name.includes('Great Britain')) {
          ['Great Britain',
          'Britain', 
          'England', 
          'Wales', 
          'Scotland', 
          'Northern Ireland'].forEach(item => {
            if(!restcountry.altSpellings.includes(item)){
              restcountry.altSpellings.push(item)
            }
          })
        }
        else if(restcountry.name == 'Viet Nam'){
          if(!restcountry.altSpellings.includes('Vietnam')){
            restcountry.altSpellings.push('Vietnam')
          }
        }
      }
    }
    return restcountries
  }
  else{
    throw new Error('unable to fetch countries:', restcountriesresponse.statusText)
  }
}

const findMatchingCountries = (search, referenceCountries) => {
  let searchResult = referenceCountries.filter(rc => rc.name == search || rc.nativeName == search)
  if (!searchResult.length){
    searchResult = referenceCountries.filter(rc => rc.altSpellings.includes(search))
  }
  return searchResult
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

const onlyUnique = (value, index, self) => { 
  return self.indexOf(value) === index;
}

export {validateCountries, getCountries}