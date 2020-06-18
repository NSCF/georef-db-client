import Papa from 'papaparse'
import validateFields from './validateDarwinCoreFields.js'
import getDWCTerms from './parseDWCReference.js'

let readHeadersAndValidate = async (targetFile) => {

  let p = new Promise((resolve, reject) => {
    console.log('reading csv headers')
    Papa.parse(targetFile, {
      header: true,
      preview: 1,
      complete: async results => {
        try{
          let fields = Object.keys(results.data[0])

          console.log('fetching Darwin Core terms')
          let dwcFields = await getDWCTerms()

          let validationResults = validateFields(fields, dwcFields)
          resolve(validationResults)
        }
        catch(err) {
          reject(new Error('error reading headers:',err.message))
        }
      }, 
      error: err => reject(new Error('error reading headers:', err.message))
    })
  })
  
  let validation
  try {
    validation = await p
  }
  catch(err) {
    throw err
  }
  
  return validation

}

export default readHeadersAndValidate