module.exports = async (Powcaptcha) => {

  const fs = require('fs')
  const types = JSON.parse(fs.readFileSync(__dirname + '/types.json').toString())

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

  const puzzles = 50

  for (const type of types) {
    const challenge = fs.readFileSync(Powcaptcha.verifiedSolutionsFolder + '/cross-challenge/' + type).toString()
    const hashFile = Powcaptcha.verifiedSolutionsFolder + '/' + (Powcaptcha.hash(challenge)) + '.pow'
    if (fs.existsSync(hashFile)) {
      fs.unlinkSync(hashFile)
    }
    let count = 0
    const solution = await Powcaptcha.solveChallenge(challenge, (progress) => {
      count++
    })
    if (count !== puzzles) {
      throw new Error('Cannot solve challenges with ' + puzzles + ' progress callbacks (' + count + ' given)')
    }
    logTime('Challenge from ' + type + ' solved')
    let verification = Powcaptcha.verifySolution(challenge, solution)
    if (fs.existsSync(hashFile)) {
      fs.unlinkSync(hashFile)
    }
    if (!verification) {
      throw new Error('Cannot verify solution for ' + type)
    }
    logTime('Solution for ' + type + ' verified')
  }
}