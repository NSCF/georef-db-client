import {Realtime, Firestore} from '../../firebase.js'
import getProgressChartData from "../getProgressChartData.js";

const chartTypes = ['daily', 'weekly', 'monthly']

//get all the firestore datasets
const datasetsSnap = await Firestore.collection('datasets').get()
const datasets = datasetsSnap.docs.forEach(async docSnap => {

  const dataset = docSnap.data()
  for (const type of chartTypes) {
    const progressChartData = await getProgressChartData(Realtime, dataset.datasetID, dataset.recordCount, type)
    const i = 1
  }
})