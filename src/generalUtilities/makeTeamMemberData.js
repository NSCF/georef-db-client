import { getLastDates, convertToNiceDates } from "./dateTimeUtilities.js"

/**
 * 
 * @param {Object} userStats A user stats object with daily, weekly, and monthly keys
 * @param {*} size The number of dates we want to show data for, default 6, minimum 3
 * @returns daily, weekly, and monthly chart stats
 */
export default function(userStats, size) {

  if (!userStats) {
    throw new Error('userStats cannot be empy')
  }

  if (!size || isNaN(size) || size < 3) {
    size = 6
  }

  const userData = {}

  for (const type of ['daily', 'weekly', 'monthly']) {

    let lastDates = getLastDates(type, size)
    let georefs = []
    let records = []

    for (const date of lastDates) { 
      if(date in userStats[type]) { //there may not be stats yet, if there are they will have all three types
        georefs.push(userStats[type][date].georefsAdded)
        records.push(userStats[type][date].recordsGeoreferenced)
      }
      else {
        georefs.push(0)
        records.push(0)
      }

    }

    lastDates = convertToNiceDates(lastDates, type)
    
    userData[type] = {
      dates: lastDates,
      georefs,
      records
    }
  }

  return userData

}



