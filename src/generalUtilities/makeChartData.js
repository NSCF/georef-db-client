//Takes the output from makeTeamMemberData or totalsData and returns the format needed
//by the chart library

export default function(userData, georefsBorderColor, georefsBackgroundColor, recordsBorderColor, recordsBackgroundColor) {

  const chartData = {
    labels: userData.dates, 
    datasets: [
      {
        label: 'georefs',
        data: userData.georefs,
        borderColor: georefsBorderColor,
        backgroundColor: georefsBackgroundColor
      }, 
      {
        label: 'records',
        data: userData.records,
        borderColor: recordsBorderColor,
        backgroundColor: recordsBackgroundColor
      }
    ]
  }

  return chartData

}