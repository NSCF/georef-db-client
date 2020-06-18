import Fuse from 'fuse.js'

let validateFields = (fields, dwcFields, dwcns = 'dwc', dcns = 'dc') =>  {
  
  if (fields.length > 0) {
    
    
    let duplicatedFields = []
    let darwinCoreFields = []
    let dublinCoreFields = []
    let almostDarwinCore = []
    let almostDublinCore = []
    let notDarwinCore //namespaced fields that are not in that namespace
    let notDublinCore //namespaced fields that are not in that namespace
    let dwcNameSpaced = []
    let dcNameSpaced = []
    let notNamespaced = []
    let notDarwinCoreButClose = [] //based on notDarwinCore
    let notDublinCoreButClose = [] //based on notDublinCore
    let otherFields = []
    let someFieldsNamespaced = false

    fields = fields.filter(t => t).map(t => t.trim()).filter(t => t)//clean up

    let uniqueFields = fields.filter(onlyUnique)

    //any duplicated fields
    if(fields.length > uniqueFields.length) {
      duplicatedFields = findDuplicates(fields) 
    }
    
    let dwcTerms, dcTerms 
    ({dwcTerms, dcTerms} = dwcFields)
    
    dwcTerms = dwcTerms.filter(t => t).map(t => t.trim()).filter(t => t) //clean up
    dcTerms = dcTerms.filter(t => t).map(t => t.trim()).filter(t => t) //clean up

    let alldwcNameSpaced = dwcTerms.map(term => {
      if(term.startsWith(`${dwcns}:`)) {
        return term
      }
      else {
        return`${dwcns}:${term}`
      }
    })

    let alldcNameSpaced = dcTerms.map(term => {
      if(term.startsWith(dcns)){
        return term
      }
      else {
        return `${dcns}:${term}`
      }
    })

    let dwcnsRegex = new RegExp(`^${dwcns}:`)
    let dcnsRegex = new RegExp(`^${dcns}:`)
    let alldwcNotNameSpaced = alldwcNameSpaced.map(term => term.replace(dwcnsRegex, ''))
    let alldcNotNameSpaced = alldcNameSpaced.map(term => term.replace(dcnsRegex, ''))

    let dwcFuse = new Fuse(alldwcNotNameSpaced, {threshold: 0.3})
    let dcFuse = new Fuse (alldcNotNameSpaced, {threshold: 0.3})

    let alldwcLower = dwcTerms.map(term => term.toLowerCase())
    let alldcLower = dcTerms.map(term => term.toLowerCase())

    //first namespaced terms
    dwcNameSpaced = uniqueFields.filter(field => field.startsWith(`${dwcns}:`))
    dcNameSpaced = uniqueFields.filter(field => field.startsWith(`${dcns}:`))

    notDarwinCore = dwcNameSpaced.filter(term => !alldwcNameSpaced.includes(term))
    dwcNameSpaced = dwcNameSpaced.filter(term => !notDarwinCore.includes(term))
    
    notDublinCore = dcNameSpaced.filter(term => !alldcNameSpaced.includes(term))
    dcNameSpaced = dcNameSpaced.filter(term => !notDublinCore.includes(term))

    let notDarwinCoreSanitized = notDarwinCore.map(term => term.replace(dwcnsRegex, '').replace(/\s*/g,'').replace(/[^a-zA-Z0-9]/gmi, ""))
    notDarwinCoreSanitized.forEach((term, index) => {
      if(dwcFuse.search(term).length) {
        notDarwinCoreButClose.push(notDarwinCore[index])
      }
    })
    notDarwinCore = notDarwinCore.filter(x => !notDarwinCoreButClose.includes(x))

    let notDublinCoreSanitized = notDublinCore.map(term => term.replace(dcnsRegex, '').replace(/\s*/g,'').replace(/[^a-zA-Z0-9]/gmi, ""))
    notDublinCoreSanitized.forEach((term, index) => {
      if(dcFuse.search(term).length) {
        notDublinCoreButClose.push(notDublinCore[index])
      }
    })
    notDublinCore = notDublinCore.filter(x => !notDublinCoreButClose.includes(x))

    //now terms not namespaced
    notNamespaced = uniqueFields.filter(field => !field.startsWith(`${dwcns}:`) && !field.startsWith(`${dcns}:`))
    darwinCoreFields = notNamespaced.filter(x => alldwcNotNameSpaced.includes(x))
    dublinCoreFields = notNamespaced.filter(x => alldcNotNameSpaced.includes(x))

    notNamespaced = notNamespaced.filter(x => !darwinCoreFields.includes(x))
    notNamespaced = notNamespaced.filter(x => !dublinCoreFields.includes(x))
    let nnsSanitized = notNamespaced.map(field => field.replace(/\s*/g,'').replace(/[^a-zA-Z0-9]/gmi, ""))
    nnsSanitized.forEach((term, index) => {
      if(dwcFuse.search(term).length) {
        almostDarwinCore.push(notNamespaced[index])
      }
      if(dcFuse.search(term).length) {
        almostDublinCore.push(notNamespaced[index])
      }
    })
 
    otherFields = notNamespaced.filter(x => !almostDarwinCore.includes(x))
    otherFields = otherFields.filter(x => !almostDublinCore.includes(x))

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
    throw new Error('no fields provided')
  }

}

let onlyUnique = (value, index, self) => { 
  return self.indexOf(value) === index;
}

let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)

export default validateFields