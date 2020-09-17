const keys = require('../keys.js')
const csv = require('fast-csv')
const MeiliSearch = require('meilisearch')
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite')

const brahmsToGeoref = require('./brahmsToGeoref.js');
const { join } = require('geo-coordinates-parser/testformats');


const meiliURL = 'http://134.122.111.44/'

const csvDir = String.raw`C:\Users\engelbrechti\Google Drive\SANBI NSCF\NSCF Data WG\Current projects\Georeferencing tool\Existing georeferences and gazetteers\BODATSA georeferences`
const csvFile = String.raw`NorthWest_distinct.csv`
const meiliIndex = 'ZAF-TER'

const originalGeorefSource = 'SANBI BODATSA'
const protocol = 'SANBI Protocol'

//TODO upload these to Firestore first

const meiliClient = new MeiliSearch({
  host: meiliURL,
  apiKey: keys.meili,
})

let index = meiliClient.getIndex(meiliIndex)

let csvRecords = []
let addedRecordCount = 0
let recordLocStrings = new Map()
let georefsToAdd = []
let meiliResponses = []
fs.createReadStream(path.join(csvDir, csvFile))
    .pipe(iconv.decodeStream('win1251'))
    .pipe(iconv.encodeStream('utf-8'))
    .pipe(csv.parse({ headers: true }))
    .on('error', error => console.error(error))
    .on('data', record => {
      csvRecords.push(record)
    })
    .on('end', async _ => {

      for (let csvRecord of csvRecords) {
        let georef = brahmsToGeoref(csvRecord, originalGeorefSource, protocol)
        if(!recordLocStrings.has(georef.locality)){
          georefsToAdd.push(georef)
          recordLocStrings.set(georef.locality, true)
        }
      }
      
      let firstInd = 0, lastInd = 100, step = 100
      while (firstInd < georefsToAdd.length) {
        let response = await index.addDocuments(georefsToAdd.slice(firstInd, lastInd))
        meiliResponses.push(response)
        addedRecordCount += 100
        firstInd += step
        lastInd += step
      }


      

      //we need to send the last batch if not sent already
      if(georefsToAdd.length){
        let response = await index.addDocuments(georefsToAdd)
        meiliResponses.push(response)
        addedRecordCount += georefsToAdd.length
      }

      console.log(`Sent ${addedRecordCount} georefs to meili from ${csvFile}`)
      let length = meiliResponses.length //look at meiliResponses
      let i = 0
    });

const getSearchWords = text => {
  let words = text.replace(/\s+/g, ' ').replace(/[\.,;]/g, '').split(' ')
  words = words.map(x=>x.toLowerCase())

  words.sort((a, b) => {
    return b.length - a.length
  })

  let remove = ['the', 'on', 'in', 'at', 'along', 'a', 'by']

  let words = words.filter(x => !remove.includes(x))

  let joinbackwords = ['dist','distr', 'district', 'distrik', 'national', 'nature', 'park', 'reserve']

  for (let backword of joinbackwords){
    if(words.includes(backword)){
      let index = words.indexOf[backword]
      if(index > 0){
        words[index] = words[index - 1] + ' ' + backword
        words.splice(index - 1,1)
      }
    }
  }

  let joinforwardwords = ['farm']

  for (let forwardword of joinbackwords){
    if(words.includes(backword)){
      let index = words.indexOf[backword]
      if(index > 0){
        words[index] = words[index - 1] + ' ' + backword
        words.splice(index - 1,1)
      }
    }
  }

  words = words.filter(onlyUnique)

  let prop = Math.pow(0.92, words.length) + 0.1

  words = words.slice(0, Math.ceil(prop * words.length))

  return words
}

const onlyUnique = (value, index, self) => { 
  return self.indexOf(value) === index;
}
