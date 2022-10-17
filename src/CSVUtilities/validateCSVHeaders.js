

import Papa from 'papaparse'
import validateFields from '../dwcUtilities/validateDarwinCoreTerms.js'
import getDWCTerms from '../dwcUtilities/getDWCTerms.js'


let readHeadersAndValidate = async (targetFile) => {

  let p = new Promise((resolve, reject) => {
    Papa.parse(targetFile, {
      header: true,
      preview: 1,
      complete: async results => {
        try{
          let fields = Object.keys(results.data[0])

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