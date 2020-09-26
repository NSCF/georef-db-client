const {Client} = require('@elastic/elasticsearch')
const csv = require('fast-csv')
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite')

const keys = require('../keys.js')
const brahmsToGeoref = require('./brahmsToGeoref.js');

const csvDir = String.raw`C:\Users\engelbrechti\Google Drive\SANBI NSCF\NSCF Data WG\Current projects\Georeferencing tool\Existing georeferences and gazetteers\BODATSA georeferences`
const csvFile = String.raw`Swaziland_distinct.csv`
const domain = 'SWZ-TER'

const originalGeorefSource = 'SANBI BODATSA'
const protocol = 'SANBI Protocol'

//TODO upload these to Firestore first

const client = new Client({
  cloud: {
    id: keys.elastic.cloudid,
  },
  auth: {
    username: keys.elastic.user,
    password: keys.elastic.password
  }
})

let csvRecords = []
let addedRecordCount = 0
let recordLocStrings = new Map()
let georefsToAdd = []

fs.createReadStream(path.join(csvDir, csvFile))
    .pipe(iconv.decodeStream('win1251'))
    .pipe(iconv.encodeStream('utf-8'))
    .pipe(csv.parse({ headers: true }))
    .on('error', error => console.error(error))
    .on('data', record => {
      csvRecords.push(record)
    })
    .on('end', async _ => {
      console.log('finished reading file, uploading records')
      for (let csvRecord of csvRecords) {
        let georef = brahmsToGeoref(csvRecord, originalGeorefSource, protocol)
        if(!recordLocStrings.has(georef.locality)){
          georef['domain'] = domain
          georefsToAdd.push(georef)
          recordLocStrings.set(georef.locality, true)
        }
      }
      
      let firstInd = 0, step = 100
      let lastInd = firstInd + step
      while (firstInd < georefsToAdd.length) {
        let records = georefsToAdd.slice(firstInd, lastInd)
        let upload = records.flatMap(doc => [{ index: { _index: 'georefs' } }, doc]) //who knows, but see https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/7.x/bulk_examples.html
        try {
          await client.bulk({
            index: 'georefs',
            refresh: true,
            body: upload
          })
        }
        catch(err) {
          console.log('error uploading records', firstInd, 'to', lastInd)
        }
        addedRecordCount += records.length
        console.log('records', firstInd, 'to', addedRecordCount, 'uploaded')
        firstInd += step
        lastInd += step
      }

      console.log(`Sent ${addedRecordCount} georefs to ElasticSearch from ${csvFile}`)

    });
