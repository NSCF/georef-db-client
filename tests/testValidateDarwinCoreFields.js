import validateFields from '../src/dwcUtilities/validateDarwinCoreTerms.js'
import getDWC from '../src/dwcUtilities/getDWCTerms.js'

getDWC().then(dwcterms => {
  try{
    let results = validateFields(testTerms, dwcterms)
    let i = 0
  }
  catch(err) {
    console.log('error validating dwc terms:', err.message)
  }

}).catch(err => console.log('error getting dwc terms:', err.message))

let testTerms = [
  'CcatalogNumber',
  'catalognumber',
  'CcatalogNumber',
  'catalognumber2',
  'dwc:catalogNumber',
  'otherCatalogNumbers',
  'someField',
  'dwc:sexx', 
  'typ',
  'dc:references', 
  'ID'
]