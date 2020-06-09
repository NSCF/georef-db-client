import Papa from 'papaparse'

let readHeadersAndValidate = async (targetFile, Realtime) => {

  let p = new Promise((resolve, reject) => {
    console.log('reading csv headers')
    Papa.parse(targetFile, {
      header: true,
      preview: 1,
      complete: async results => {
        try{
          let fields = Object.keys(results.data[0])
          let validationResults = await validateFields(fields, Realtime)
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

let validateFields = async (fields, Realtime) =>  {
  
  if (fields.length > 0) {
    
    let uniqueFields = fields.filter(onlyUnique)
    let duplicatedFields
    let darwinCoreFields
    let dublinCoreFields
    let almostDarwinCore = []
    let almostDublinCore = []
    let notDarwinCore //namespaced fields that are not in that namespace
    let notDublinCore //namespaced fields that are not in that namespace
    let dwcNameSpaced 
    let dcNameSpaced
    let notNamespaced
    let notDarwinCoreButClose = [] //based on notDarwinCore
    let notDublinCoreButClose = [] //based on notDublinCore
    let otherFields
    let someFieldsNamespaced = false

    //any duplicated fields
    if(fields.length > uniqueFields.length) {
      duplicatedFields = findDuplicates(fields) 
      duplicatedFields = duplicatedFields.filter(onlyUnique)
    }
    
    console.log('fetching Darwin Core terms')
    let [dwcTerms, dcTerms] = await getDWCTerms(Realtime)
    
    dwcTerms = dwcTerms.filter(t => t) //clean up
    dcTerms = dcTerms.filter(t => t) //clean up

    let alldwcNameSpaced = dwcTerms.map(term => `dwc:${term}`)
    let alldcNameSpaced = dcTerms.map(term => `dc:${term}`)

    let alldwcLower = dwcTerms.map(term => term.toLowerCase())
    let alldcLower = dcTerms.map(term => term.toLowerCase())

    //first namespaced terms
    dwcNameSpaced = uniqueFields.filter(field => field.startsWith('dwc:'))
    dcNameSpaced = uniqueFields.filter(field => field.startsWith('dc:'))

    notDarwinCore = dwcNameSpaced.filter(x => !alldwcNameSpaced.includes(x))
    notDublinCore = dcNameSpaced.filter(x => !alldcNameSpaced.includes(x))

    let ndwcTrimmedAndSanitized = notDarwinCore.map(field => field.substring(4).replace(/\s*/g,'').toLowerCase().replace(/[^a-z0-9]/gmi, ""))
    ndwcTrimmedAndSanitized.forEach((item, index) => {
      if(alldwcLower.includes(item)){
        notDarwinCoreButClose.push(notDarwinCore[index])
      }
    })
    notDarwinCore = notDarwinCore.filter(x => !notDarwinCoreButClose.includes(x))

    let ndcTrimmedAndSanitized = notDublinCore.map(field => field.substring(4).replace(/\s*/g,'').toLowerCase().replace(/[^a-z0-9]/gmi, ""))
    ndcTrimmedAndSanitized.forEach((item, index) => {
      if(alldcLower.includes(item)){
        notDublinCoreButClose.push(notDublinCore[index])
      }
    })
    notDublinCore = notDublinCore.filter(x => !notDublinCoreButClose.includes(x))

    //now terms not namespaced
    notNamespaced = uniqueFields.filter(field => !field.startsWith('dwc:') && !field.startsWith('dc:'))
    let nnsTrimmedAndSanitized = notNamespaced.map(field => field.substring(4).replace(/\s*/g,'').toLowerCase().replace(/[^a-z0-9]/gmi, ""))
    nnsTrimmedAndSanitized.forEach((item, index) => {
      if(alldwcLower.includes(item)){
        almostDarwinCore.push(notNamespaced[index])
      }
      else if(alldcLower.includes(item)) {
        almostDublinCore.push(notNamespaced[index])
      }
    })

    darwinCoreFields = notNamespaced.filter(x => dwcTerms.includes(x))
    dublinCoreFields = notNamespaced.filter(x => dcTerms.includes(x))

    otherFields = notNamespaced.filter(x => !almostDarwinCore.includes(x))
    otherFields = otherFields.filter(x => !almostDublinCore.includes(x))
    otherFields = otherFields.filter(x => !darwinCoreFields.includes(x))
    otherFields = otherFields.filter(x => !dublinCoreFields.includes(x))

    if ((dwcNameSpaced.length || dcNameSpaced.length) && 
    (darwinCoreFields.length || dublinCoreFields.length || almostDarwinCore.length || almostDublinCore.length)){
      someFieldsNamespaced = true
    }

    let validDWCFields = [...dwcNameSpaced, ...darwinCoreFields, ...dcNameSpaced, ...dublinCoreFields]

    return {
      validDWCFields,
      duplicatedFields,
      notDarwinCore, //namespaced but don't exist in that namespace
      notDarwinCoreButClose, //from notDarwinCore
      notDublinCore,//namespaced but don't exist in that namespace
      notDublinCoreButClose, //from notDublinCore
      almostDarwinCore,
      almostDublinCore,
      otherFields,
      someFieldsNamespaced
    }

  }
  else {
    throw new Error('no data in file')
  }

}

let getDWCTerms = async Realtime => {
  const [dwcSnap, dcSnap] = await Promise.all([Realtime.ref('settings/dwcTerms').once('value'),
  Realtime.ref('settings/dcTerms').once('value')])

  let dwcTerms = dwcSnap.val().split(',')
  let dcTerms = dcSnap.val().split(',')

  return [dwcTerms, dcTerms]
}

let onlyUnique = (value, index, self) => { 
    return self.indexOf(value) === index;
}

let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)

export default readHeadersAndValidate