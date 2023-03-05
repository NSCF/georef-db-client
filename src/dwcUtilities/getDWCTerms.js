async function getDWCTerms() {
  let response = await fetch('https://dwc.tdwg.org/terms')
  if (response.status >= 400){
    throw new Error(response.statusText)
  }
  else {
    const text = await response.text()
    const matches = text.match(/"#.+:.+"/g).map(x => x.replace(/[#"]/g, ''))

    const namespaceTerms = {}
    for (const match of matches){
      const namespace = match.split(':')[0]
      if(namespaceTerms.hasOwnProperty(namespace)) {
        namespaceTerms[namespace].push(match)
      }
      else {
        namespaceTerms[namespace] = [match]
      }
    }

    const dwcTerms = namespaceTerms['dwc']
    const dcTerms = [...namespaceTerms['dcterms'], ...namespaceTerms['dc']].map(x => x.replace('dcterms', 'dc')) //this is not technically correct, because we change namespace identifiers, but simplifies things later

    return {dwcTerms, dcTerms}
  }
}

export default getDWCTerms