const convert = require('geo-coordinates-parser')
const shortid = require('shortid')

//function for mapping Brahms records to Darwin Core

const brahmsToGeoref = (record, originalGeorefSource, protocol) => {
  let georef = {}

  georef['georefID'] = shortid.generate()

  //we prefer coordinates from the locstring for verbatimCoordinates
  let coords = getVerbatimCoordinates(record)
  
  georef['locality'] = getVerbatimLocality(record, coords)
  
  if(!coords){
    try {
      coords = getBrahmsCoords(record) //TODO add try catch
    }
    catch (err) {
      //nothing, it's still null
      let i = 0
    }
    
  }

  let uncertainty = null
  try {
    uncertainty = getUncertainty(record)
  } 
  catch(err){
    //do nothing
  }
  
  //start building
  for (let key of Object.keys(brahmsDwCMap)){
    let val = record[brahmsDwCMap[key]]
    if (val && val.trim()){
      georef[key] = val.trim()
    }
    else {
      georef[key] = null
    }
  }

  if(coords){
    georef['verbatimCoordinates'] = coords.verbatimCoordinates
    georef['decimalLatitude'] = coords.decimalLatitude
    georef['decimalLongitude'] = coords.decimalLongitude
    if(uncertainty) {
      georef.uncertainty = uncertainty.uncertainty
      georef.uncertaintyUnit = uncertainty.uncertaintyUnit
    }
    else {
      georef.uncertainty = null
      georef.uncertaintyUnit = null
    }

    georef['georefBy'] = null
    georef['georefDate'] = null

    if(coords){
      georef['protocol'] = protocol
    }
    else {
      georef['protocol'] = null
    }

    georef['sources'] = null

    let brahmsQCED = record['QCED']
    if(brahmsQCED && brahmsQCED.trim() && brahmsQCED.trim().toUpperCase() =='Y'){
      georef['verified'] = true
      georef['verifiedByRole'] = 'quality controller'
    }
    else {
      georef['verified'] = false
      georef['verifiedByRole'] = null
    }
    georef['verifiedBy'] = null
    georef['verifiedDate'] = null
    
  }
  else {
    georef['verbatimCoordinates'] = null
    georef['decimalLatitude'] = null
    georef['decimalLongitude'] = null
    georef.uncertainty = null
    georef.uncertaintyUnit = null
  }

  georef['originalGeorefSource'] = originalGeorefSource

  georef['dateCreated'] = Date.now()
  georef['createdBy'] = 'admin'
  
  //TODO include a check for LATDEC and LONGDEC close enough to converted values -- this is error checking, not object mapping

  return georef

}

const brahmsDwCMap = {
  country: 'COUNTRY',
  stateProvince: 'MAJORAREA'
}

function getVerbatimCoordinates(record) {
  try{
    let locstring = record['LOCNOTES']
    let coords = convert(locstring)
    return coords
  }
  catch (err) {
    return null
  }
}

function getVerbatimLocality(record, coords) {

  let locstring = record['LOCNOTES']

  if(locstring && locstring.trim()){
    locstring = locstring.trim()
  }
  else {
    return null
  }
  
  if(coords && coords.verbatimCoordinates){
    locstring = locstring.replace(coords.verbatimCoordinates, '') //remove from string
  }

  locstring = locstring.replace(/\s+/g, ' ')

  //sort out parentheses
  if(locstring.startsWith('[') || locstring.startsWith('(')) {
    let bracketted = /[\(\[]+(.*?)[\)\]]+[\.:]*/
    let matches = locstring.match(bracketted) 
    if(matches && matches.length) {
      let replacement = matches[1]
      if(!locstring.toLowerCase().replace(replacement.toLowerCase(), '').includes(replacement.toLowerCase())){
        replacement = replacement.replace(/[\s\.,]+$/, '') + ', '
        locstring = locstring.replace(matches[0], replacement)
      }
    }
  }

  locstring = locstring.replace(/\s+/g, ' ')
  locstring = locstring.replace(/[\.,:;-\s]+$/, '')
  locstring = locstring.replace(/\s,/g, ', ')

  if (locstring && locstring.trim()){
    return locstring.trim()
  }
  else {
    return null
  }

}

const getUncertainty = record => {
  let llres = record['LLRES']
  if(llres && llres.trim()){
    llres = llres.trim()
    let unit = llres[llres.length - 1]
    let val = llres.substring(0, llres.length - 1)
    if(isNaN(val)){
      throw new Error('invalid llres value')
    }
    else {
      val = Number(val)
    }

    if(unit == 'k'){
      if(val < 1){
        unit = 'm'
        val = val * 100
      }
    }
    if(unit == 'm'){
      if(val >= 1000){
        val = val/1000
        unit = 'k'
      }
    }
    if(unit == 'k'){
      unit = 'km'
    }
    return {
      uncertainty: val,
      uncertaintyUnit: unit
    }
  }
  else {
    return null
  }
}


function getBrahmsCoords(record) {
  let brahmsLat = record['LAT']
  let brahmsLatDir = record['NS']
  let brahmsLong = record['LONG']
  let brahmsLongDir = record['EW']
  let format = record['LLUNIT']

  //cleaning....
  if (brahmsLatDir && brahmsLatDir.trim()){
    brahmsLatDir = brahmsLatDir.trim()
  }

  if(brahmsLongDir && brahmsLongDir.trim()){
    brahmsLongDir = brahmsLongDir.trim()
  }

  if(format && format.trim()){
    format = format.trim()
  }

  if(['S', 's', 'N', 'n'].includes(brahmsLatDir)){
    brahmsLatDir =  brahmsLatDir.toUpperCase()
  }
  else {
    throw new Error('invalid value for NS')
  }

  if(['E', 'e', 'W', 'w'].includes(brahmsLongDir)){
    brahmsLongDir = brahmsLongDir.toUpperCase()
  }
  else {
    throw new Error('invalid value for EW')
  }

  if(!['DD', 'DM', 'DMS'].includes(format)){
    throw new Error('invalid LLUNIT')
  }

  let verbatimLatitude 
  let verbatimLongtitude
  if(format == 'DMS'){
    try{
      verbatimLatitude = brahmsDMSToSanity(brahmsLat, brahmsLatDir, false)
      verbatimLongtitude = brahmsDMSToSanity(brahmsLong, brahmsLongDir, false)
    }
    catch(err){
      throw err
    }
  }
  else if(format == 'DM'){
    try{
      verbatimLatitude = brahmsDMToSanity(brahmsLat, brahmsLatDir, false)
      verbatimLongtitude = brahmsDMToSanity(brahmsLong, brahmsLongDir, false)
    }
    catch(err){
      throw err
    }
  }
  else { //it has to be DD
    verbatimLatitude = brahmsLat + brahmsLatDir
    verbatimLongtitude = brahmsLong + brahmsLongDir
  }

  try{
    return convert(verbatimLatitude + ', ' + verbatimLongtitude)
  }
  catch(err){
    throw err
  }
  
}

function brahmsDMSToSanity(coord, dir, addSymbols) {
  let parts = coord.split('.')
  let deg
  if(['S', 'N'].includes(dir)){
    if(parts[0] >= 0 && parts[0] < 90){
      deg = parts[0].padStart(2,'0')
    }
    else {
      throw new Error('invalid degrees')
    }
  }
  else if(['E', 'W'].includes(dir)) {
    if(parts[0] >= 0 && parts[0] < 180){
      deg = parts[0].padStart(2,'0')
    }
    else {
      throw new Error('invalid degrees')
    }
  }
  else {
    throw new Error('invalid direction value')
  }
    
  let mins = parts[1].substr(0,2)
  if(mins < 0 || mins > 60) {
    throw new Error('invalid minutes')
  }

  let secs = parts[1].substr(2)
  if(secs == 0){
    secs = '00'
  }
  else {

    if(secs.length > 2){
      let first = secs.substr(0,2)
      let rest = secs.substr(2)
      if(rest == 0){
        secs = first
      }
      else {
        secs = [first, '.', rest].join('')
      }
    }

    if(secs < 0 || secs > 60) {
      throw new Error('invalid seconds')
    }
  }

  let back
  if(addSymbols){
    back = [deg, '°', mins, '\''].join('')
    if(sec){
      back = [back, secs, '"'].join('')
    }
    return back + dir
  }
  else {
    back = [deg, mins, secs].join(' ').trim()
    return back + dir
  }
  
}

function brahmsDMToSanity(coord, dir, addSymbols) {
  let parts = coord.split('.')
  let deg
  if(['S', 'N'].includes(dir)){
    if(parts[0] >= 0 && parts[0] < 90){
      deg = parts[0].padStart(2,'0')
    }
    else {
      throw new Error('invalid degrees')
    }
  }
  else if(['E', 'W'].includes(dir)) {
    if(parts[0] >= 0 && parts[0] < 180){
      deg = parts[0].padStart(2,'0')
    }
    else {
      throw new Error('invalid degrees')
    }
  }
  else {
    throw new Error('invalid direction value')
  }
    
  let mins = parts[1].substr(0,2)
  if(mins < 0 || mins > 60) {
    throw new Error('invalid minutes')
  }

  if(mins.length > 2){
    let first = mins.substr(0,2)
    let rest = mins.substr(2)
    if(rest == 0){
      mins = first
    }
    else {
      mins = [first, '.', rest].join('')
    }
    
  }

  let back
  if(addSymbols){
    back = [deg, '°', mins, '\''].join('')
    return back + dir
  }
  else {
    back = [deg, mins].join(' ').trim()
    return back + dir
  }
  
}

module.exports = brahmsToGeoref