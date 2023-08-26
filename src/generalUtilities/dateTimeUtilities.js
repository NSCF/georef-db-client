const weekDays = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat']
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

const getYearMonth = d => {
  let y = d.getUTCFullYear()
  let m = d.getMonth() + 1
  return `${y} ${m.toString().padStart(2, '0')}`
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
  let now 
  if (timestamp){
    now = new Date(timestamp)
  }
  else {
    now = new Date()
  }
  
  let today = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0] //we need this horrible thing to adjust for time zone differences as getTime gives a utc time
  return today
}

const getLastDays = size => {
  
  let days = []
  let today = getToday()
  days.push(today)
  
  let d = new Date(today)
  for (let i = 1; i < size; i++) {
    d.setDate(d.getDate() - 1)
    let day = d.toISOString().split('T')[0]
    days.push(day)
  }
  days.reverse()
  return days

}

const getLastWeeks = size => {
  let weeks = []
  let thisWeek = getYearWeek(new Date())
  weeks.push(thisWeek)
  while(weeks.length < size) {
    thisWeek = decrementYearWeek(thisWeek)
    weeks.push(thisWeek)
  }

  weeks.reverse()

  return weeks

}

const getLastMonths = size => {
  let months = []
  let thisMonth = getYearMonth(new Date())
  months.push(thisMonth)

  while(months.length < size) {
    thisMonth = decrementYearMonth(thisMonth)
    months.push(thisMonth)
  }

  months.reverse()
  return months
}

const getLastDates = (type, size) => {

  if (size && size > 0) {
    if (type == 'daily') return getLastDays(size)
    if (type == 'weekly') return getLastWeeks(size)
    if (type == 'monthly') return getLastMonths(size)
  }
  throw new Error('invalid input')
}

/**
 * Takes an array of dates and makes them nice to read
 * @param {string[]} dates 
 * @param {'daily|weekly|monthly'} type 
 */
const convertToNiceDates = (dates, type) => {

  if(type == 'daily'){
    dates = dates.map(x => {
      let d = new Date(x)
      let ind = d.getDay()
      return weekDays[ind]
    })
  }

  if(type == 'weekly'){
    dates = dates.map(x => {
      let parts = x.split(' ')
      return getDateOfISOWeek(parts[1], parts[0])
    })
  }

  if(type == 'monthly') {
    dates = dates.map(x => {
      let parts = x.split(' ')
      let ind = Number(parts[1]) - 1
      parts[1] = monthNames[ind]
      parts.reverse()
      return parts.join(' ')
    })
  }

  return dates

}

export {
  getDateOfISOWeek,
  getYearWeek,
  getYearMonth,
  decrementDate, 
  decrementYearMonth, 
  decrementYearWeek,
  getToday, 
  getLastDates,
  convertToNiceDates,
}