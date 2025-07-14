module.exports = async (Powcaptcha, crossChallengePath) => {
  function logTime (msg) {
    const diff = performance.now() - now
    now = performance.now()
    console.log(msg + ' (Took ' + diff.toFixed(2) + 'ms)')
  }

  Powcaptcha.tmpFolder = __dirname + '/../tmp'
  let now = performance.now()

  const puzzles = 50
  const difficulty = 4

  const challenge = await Powcaptcha.createChallenge(puzzles)
  logTime('Challenge created')
  let count = 0
  const solution = await Powcaptcha.solveChallenge(challenge, difficulty, (progress) => {
    count++
  })
  if (count !== 50) {
    throw new Error('Cannot solve challenges with progress callback')
  }
  logTime('Challenge solved')
  let verification = await Powcaptcha.verifySolution(challenge, solution, difficulty)
  if (!verification) {
    throw new Error('Cannot verify solution')
  }
  logTime('Solution verified')
  verification = await Powcaptcha.verifySolution(challenge, solution, difficulty)
  if (verification) {
    throw new Error('Solution already verified but still, verifySolution() returns true')
  }
  logTime('Verifying same challenge again is invalid, this is correct')

  // @ts-ignore
  const fs = require('fs')
  fs.writeFileSync(__dirname + '/../tmp/cross-challenge/' + crossChallengePath, challenge)
}