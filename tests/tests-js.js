module.exports = async (Powcaptcha, crossChallengePath) => {
  // @ts-ignore
  const fs = require('fs')

  function getTime () {
    if (typeof performance !== 'undefined') {
      return performance.now()
    }
    return new Date().getTime()
  }

  function logTime (msg) {
    const t = getTime()
    const diff = t - now
    now = t
    console.log(msg + ' (Took ' + diff.toFixed(2) + 'ms)')
  }

  Powcaptcha.verifiedSolutionsFolder = __dirname + '/../tmp'
  Powcaptcha.challengeSalt = 'randomtestsalt'
  let now = getTime()

  // solve and verify fixed challenges
  const fixedChallenges = JSON.parse(fs.readFileSync(__dirname + '/challenges.json').toString())

  for (let i = 0; i < fixedChallenges.challenges.length; i++) {
    const challengeString = fixedChallenges.challenges[i]
    const solutionExpected = fixedChallenges.solutions[i]
    const solution = await Powcaptcha.solveChallenge(challengeString, solutionExpected.difficulty)
    if (solution !== solutionExpected.solution) {
      throw new Error('Solution for fixed challenge ' + i + ' not correct')
    }
  }
  logTime(fixedChallenges.challenges.length + ' fixed challenges correctly solved')

  const puzzles = 50
  const difficulty = 4

  const challenge = Powcaptcha.createChallenge(puzzles)
  logTime('Challenge created')
  let count = 0
  const solution = await Powcaptcha.solveChallenge(challenge, difficulty, (progress) => {
    count++
  })
  if (count !== puzzles) {
    throw new Error('Cannot solve challenges with ' + puzzles + ' progress callbacks (' + count + ' given)')
  }
  logTime('Challenge solved')
  let verification = Powcaptcha.verifySolution(challenge, solution, difficulty)
  if (!verification) {
    throw new Error('Cannot verify solution')
  }
  logTime('Solution verified')
  verification = Powcaptcha.verifySolution(challenge, solution, difficulty)
  if (verification) {
    throw new Error('Solution already verified but still, verifySolution() returns true')
  }
  logTime('Verifying same challenge again is invalid, this is correct')

  fs.writeFileSync(__dirname + '/../tmp/cross-challenge/' + crossChallengePath, challenge)
}