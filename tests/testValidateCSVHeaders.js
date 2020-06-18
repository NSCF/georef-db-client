import readHeadersAndValidate from '../src/svelte/validateCSVHeaders'
import fs from 'fs-extra'
import path from 'path'

let testFileName = String.raw`Digital_Accession_Book_McGregor_Museum_Herpetofauna_Manual_Clean - Herpetological_Accessions_Datab.csv`
let testFilePath = String.raw`C:\Users\engelbrechti\Google Drive\SANBI NSCF\NSCF Data WG\Current projects\Georeferencing tool\Georeferencing tool\Test datasets`
let fullPath = path.join(testFilePath, testFileName)

fs.readFile(fullPath, 'utf8').then(fileString=> {
  readHeadersAndValidate(fileString).then(_ => console.log('all done')).catch(err => console.log(err))
}).catch(err => console.log(err))


