//just for testing small things
import { getSafeTime } from '../src/utilities.js'
import 'isomorphic-fetch'

//Should output a timestamp
getSafeTime().then(time => console.log('time is', time)).catch(err => console.error(err.message))