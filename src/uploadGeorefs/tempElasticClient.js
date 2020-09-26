const {Client} = require('@elastic/elasticsearch')
const keys = require('../keys.js')
const fs = require('fs')
const path = require('path')

let index = 'georefs'

const client = new Client({
  cloud: {
    id: keys.elastic.cloudid,
  },
  auth: {
    username: keys.elastic.user,
    password: keys.elastic.password
  }
})

let records = [
  {
    "locality": "Borakalalo Nature Reserve, near Brits",
    "domain": "ZAF-TER",
    "date": "2010-12-24"
  },
  {
    "locality": "Boikarabelo, Steenbokpan",
    "domain": "ZAF-TER",
    "date": "2010-12-24" 
  },
  {
    "locality": "Borakalalo",
    "domain": "ZAF-TER",
    "date": "2010-12-24"
  },
  {
    "locality": "Borakolalo National Park",
    "domain": "ZAF-TER",
    "date": "2010-12-24"
  }
]

client.indices.exists({index: index}).then(res => {
  if(res.body){ //should be true if exists
    console.log('index exists')
    return
  }
  else {
    //create the index and load the records
    let settings = fs.readFileSync(path.join(__dirname, 'elasticCreateIndex.json'))
    settings = JSON.parse(settings)
    console.log('creating index')
    return client.indices.create({
      index,
      body: settings
    })
  }
}).then( _ =>{
  console.log('uploading records')
  let upload = records.flatMap(doc => [{ index: { _index: index } }, doc]) //who knows, but see https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/7.x/bulk_examples.html
  client.bulk({
    index,
    refresh: true,
    body: upload
  }).then(_ => {
    console.log('all done')
  })
  .catch(err =>{
    console.log('Error:', err.message)
  })
})
.catch(err => {
  console.log('Error in exists:', err.message)
})





