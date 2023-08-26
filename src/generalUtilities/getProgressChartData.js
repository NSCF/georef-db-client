import {
  getDateOfISOWeek,
  decrementDate, 
  decrementYearMonth, 
  decrementYearWeek
} from './dateTimeUtilities'

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

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