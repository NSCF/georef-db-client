const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];


/**
 * Get the ISO date string for a given week in the year and year
 * @param {number} w The integer week for the year, 1- 52
 * @param {number} y The full year, e.g. 2023
 * @returns ISO date string
 */
function getDateOfISOWeek(w, y) {

  if (w < 1 || w > 52) {
    throw new Error('invalid week')
  }

  var simple = new Date(y, 0, 1 + (w - 1) * 7); 
  var dow = simple.getDay();
  var ISOweekStart = simple;
  if (dow <= 4){
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } 
  else{
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }

  //note we need to increment to get Monday instead of Sunday
  ISOweekStart.setDate(ISOweekStart.getDate() + 1)
      
  let ISODate = ISOweekStart.toISOString().split('T')[0];
  return ISODate
}

/**
 * Gets a string with the year and week of the year from a date
 * @param {Date} date 
 */
function getYearWeek(date) {

  if (!date) {
    throw new Error('invalid date')
  }
  
  // Copy date so don't modify original
  date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
  
  // Get first day of year
  var yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (date - yearStart) / 86400000) + 1)/7);
  
  // Return string of year and week number
  return `${date.getUTCFullYear()} ${weekNo.toString().padStart(2, '0')}`
}

/**
 * Given a date, returns the date for the previous day
 * @param {Date} d 
 */
function decrementDate(d) {
  let today = new Date(d)
  //https://stackoverflow.com/a/24774070/3210158
  let yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000)); //(hours * minutes * seconds * milliseconds)
  yesterday = yesterday.toISOString().split('T')[0]
  return yesterday
}

/**
 * Take a year week string and returns the year week string for the previous week
 * @param {string} yw 
 */
function decrementYearWeek(yw) {
  let parts = yw.split(' ')
  let d = getDateOfISOWeek(parts[1], parts[0])
  d = new Date(d)
  d.setDate(d.getDate()-7);
  return getYearWeek(d)
}

/**
 * Takes a year month string and returns the previous year month string
 * @param {string} ym 
 */
function decrementYearMonth(ym) {
  let parts = ym.split(' ')
  if(Number(parts[1]) == 1){
    parts[0] = Number(parts[0]) - 1
    parts[1] = 12
  }
  else {
    parts[1] = Number(parts[1]) - 1 
    parts[1] = parts[1].toString().padStart(2, '0')
  }

  return parts.join(' ')
  
}

//Gets the timezone corrected ISO date...
function getToday(timestamp) {
  let now = new Date(timestamp)
  let today = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
  return today
}

/**
 * converts results from a call to Firebase to the structure needed for linechart
 * @param {Object} firebase The Firebase realtime database reference
 * @param {string} datasetID 
 * @param {number} recordCount The total number of records in the dataset
 * @param {(daily|weekly|monthly)} type 
 */
async function getProgressChartData(firebase, datasetID, recordCount, type) {

  let snap = await firebase.ref('stats/perDataset/' + datasetID + '/' + type).once('value')
  
  if(snap.exists) {
    let data = snap.val()

    if (!data) { //apparently this is possible
      return null
    }
    
    let labels = []
    let recordsPerPeriod = []

    let dataKeys = Object.keys(data)
    dataKeys.sort()
    
    let startPeriod = dataKeys[0]
    let endPeriod = dataKeys[dataKeys.length - 1]

    while (endPeriod >= startPeriod) {
      if(type == 'daily') {
        labels.push(endPeriod)
      }
      else if(type == 'weekly') {
        let parts = endPeriod.split(' ')
        labels.push(getDateOfISOWeek(parts[1], parts[0]))
      }
      else {
        let parts = endPeriod.split(' ')
        let mon = monthNames[Number(parts[1]) - 1]
        let label = mon + ' ' + parts[0]
        labels.push(label)
      }
      
      if(data[endPeriod]) {
        recordsPerPeriod.push(Number(data[endPeriod].recordsGeoreferenced))
      }
      else {
        recordsPerPeriod.push(0)
      }

      if (type =='daily') {
        endPeriod = decrementDate(endPeriod)
      }
      else if(type == 'weekly'){
        endPeriod = decrementYearWeek(endPeriod)
      }
      else {
        endPeriod = decrementYearMonth(endPeriod)
      }
    }

    //we need to reverse the order
    labels.reverse()
    recordsPerPeriod.reverse()

    //from https://stackoverflow.com/questions/20477177/creating-an-array-of-cumulative-sum-in-javascript/20477613
    // see comments there that this cannot be reused, so we have to declare it here and use it here
    const cumSum = (sum => value => sum += value)(0);

    let recordsPerPeriodPerc = recordsPerPeriod.map(x => Math.round((x / recordCount) * 100))

    let recordsCumSum = recordsPerPeriodPerc.map(cumSum)

    let chartData = {
      labels, 
      datasets: [
        {
          label: '% records complete',
          data: recordsCumSum,
          borderColor: '#606060',
          backgroundColor: '#A9A9A9'
        }
      ]
    }

    return chartData

  }
  else {
    return null
  }
}

export default getProgressChartData