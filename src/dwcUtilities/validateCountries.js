
//uses REST Countries (https://restcountries.eu) as the standard for country names, just because it's accessible and relatively good
// makes a few changes, eg where country name has brackets

const validateCountries = async (countriesArray) => {
  //assumes a uniqe list of country names, but just in case not...
  countriesArray = countriesArray.filter(onlyUnique)

  let invalid = []
  let countryCodes = {}

  let restCountries = await getCountries()
  console.log('restcountries fetched with', restCountries.length, 'entries')

  let searchResults
  for (let country of countriesArray) {
    searchResults = findMatchingCountries(country, restCountries)
    if(searchResults.length){
      if(searchResults.length > 1){
        invalid.push({
          searchName: country,
          message: 'Ambiguous country name'
        })
      }
      else {
        countryCodes[country] = searchResults[0].alpha3Code
      }
    }
    else {
      invalid.push({
        searchName: country,
        message: 'No matching names found'
      })
    }
  }
  console.log('returning country check results here')
  console.log('invalid: ', invalid.length)
  console.log('valid:', Object.keys(countryCodes).length)
  return {invalid, countryCodes}
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

export default validateCountries