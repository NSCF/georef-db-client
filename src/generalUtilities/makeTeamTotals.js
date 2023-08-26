/**
 * Takes chart data for all team members and returns totals
 * Note that this is the data before converted to the format needed for the chart library
 * @param {Object} teamChartData Keys are uids, values are {daily, weekly monthly objects}, each with {dates, georefs, records} objects
 */
export default function(teamChartData) {

  //note that each user array has the same structure as this
  const totals = {
    daily: {
      dates: null,
      georefs: null,
      records: null
    }, 
    weekly: {
      dates: null,
      georefs: null,
      records: null
    },
    monthly: {
      dates: null,
      georefs: null,
      records: null
    }
  }

  //first set the dates for the totals object, and zeros for all counts
  //they are all the same for all users
  const firstUID = Object.keys(teamChartData)[0]
  for (const type of Object.keys(totals)) {
    totals[type].dates = teamChartData[firstUID][type].dates
    const arrayLength = totals[type].dates.length
    totals[type].georefs = []
    totals[type].records = []
    for(let i = 0; i < arrayLength; i++) {
      totals[type].georefs.push(0)
      totals[type].records.push(0)
    }
  }

  //add everything up
  for (const type of Object.keys(totals)) {
    for (const uid of Object.keys(teamChartData)) {
      for (let i = 0; i < totals[type].georefs.length; i++) {
        totals[type].georefs[i] = totals[type].georefs[i] + teamChartData[uid][type].georefs[i]
        totals[type].records[i] = totals[type].records[i] + teamChartData[uid][type].records[i]
      }
    }
  }

  return totals
}