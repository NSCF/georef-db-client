import validate from '../src/dwcUtilities/validateAdminDivisions'

let a = {
  name: 'South Africa',
  children: [
    {
      name: 'Gauteng'
    }, 
    {
      name: 'Limpopo'
    },
    {
      name: 'LimPOMPo'
    }
  ]
}

let b = {
  name: 'Amerincanos Amigos',
  children: {}
}

validate([a, b])