import main from '../src/svelte/validateCSVHeaders'
import fs from 'fs-extra'
import {Realtime} from '../src/firebase.js'


let testFile = String.raw`C:\Users\engelbrechti\Google Drive\SANBI NSCF\NSCF Data WG\Current projects\Georeferencing tool\Georeferencing tool\Test datasets\McGregor herps 20200528.csv`

fs.readFile(testFile, 'utf8').then(fileString=> {
  validateDWC(fileString, Realtime).then(_ => console.log('all done')).catch(err => console.log(err))
}).catch(err => console.log(err))


