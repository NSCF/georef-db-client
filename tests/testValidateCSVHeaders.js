import readHeadersAndValidate from '../src/CSVUtilities/validateCSVHeaders.js'
import fs from 'fs-extra'
import path from 'path'

let testFileName = String.raw`Bees_Georef_29082022_OpenRefine.csv`
let testFilePath = String.raw`D:\NSCF Data WG\Georeferencing projects\South African Red List for Bees`
let fullPath = path.join(testFilePath, testFileName)

fs.readFile(fullPath, 'utf8').then(fileString => {
  readHeadersAndValidate(fileString).then(result => {
    console.log('all done')
  }).catch(err => console.log(err))
}).catch(err => console.log(err))


