import makeChartData from '../makeTeamMemberData.js'
import makeTeamTotals from '../makeTeamTotals.js'

import teams from './teams.json' assert { type: 'json'}
import allUserStats from './statsPerUser20230826.json' assert { type: 'json'}

const team = teams[0]
const teamChartStats = {}

for (const uid of team.teamMemberUIDs) {
  const userStats = allUserStats[uid]
  const userChartData = makeChartData(userStats)
  teamChartStats[uid] = userChartData
}

const teamTotals = makeTeamTotals(teamChartStats)

teamChartStats['all'] = teamTotals

