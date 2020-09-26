const {Client} = require('@elastic/elasticsearch')
const keys = require('../keys.js')

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


let search = '3219 Wupperthal, Kaap. Skoongesig, Ceres (Koue-Bokkeveld)'

client.search({
  index,
  body: {
    query: {
      match: { 
        locality: search
      }
    }
  }
}).then(results => {
  if(results.body.hits.hits.length){
    for (let res of results.body.hits.hits){
      let data = res['_source']
      console.log(data.locality)
    }
  }
  else {
    console.log('nothing returned')
  }
}).catch(err=> console.log('Error:', err.message))