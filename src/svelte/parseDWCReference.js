import 'isomorphic-fetch'

async function getDWCTerms() {
  let response = await fetch('https://dwc.tdwg.org/terms')
  if (response.status >= 400){
    throw new Error(response.statusText)
  }
  else {
    let text = await response.text()
    let matches = text.match(/(<\s*a[^>]*>(.*?)<\s*\/\s*a>)/g)
    let dwc = matches.filter(match => match.startsWith('<a id="dwc:'))
    let start, end, term
    let dwcTerms = dwc.map(tag => {
      start = tag.indexOf('dwc:')
      end = tag.indexOf('"', start)
      term = tag.substring(start, end)
      return term
    })
    
    let dc = matches.filter(match => match.startsWith('<a id="dcterms:'))
    let dcTerms = dc.map(tag => {
      start = tag.indexOf('dcterms:')
      end = tag.indexOf('"', start)
      term = tag.substring(start, end)
      return term
    })
    
    dcTerms = dcTerms.map(term => term.replace('dcterms:', 'dc:'))

    return {dwcTerms, dcTerms}
  }
}

export default getDWCTerms