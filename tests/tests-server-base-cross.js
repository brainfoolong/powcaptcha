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

  Powcaptcha.tmpFolder = __dirname + '/../tmp'
  let now = getTime()

  const difficulty = 4

  const enc = new TextEncoder()
  for (const type of types) {
    const challenge = fs.readFileSync(Powcaptcha.tmpFolder + '/cross-challenge/' + type).toString()
    const hashFile = Powcaptcha.tmpFolder + '/' + (Powcaptcha.hash(challenge)) + '.pow'
    if (fs.existsSync(hashFile)) {
      fs.unlinkSync(hashFile)
    }
    let count = 0
    const solution = await Powcaptcha.solveChallenge(challenge, difficulty, (progress) => {
      count++
    })
    if (count !== 50) {
      throw new Error('Cannot solve challenges with progress callback')
    }
    logTime('Challenge from ' + type + ' solved')
    let verification = Powcaptcha.verifySolution(challenge, solution, difficulty)
    if (fs.existsSync(hashFile)) {
      fs.unlinkSync(hashFile)
    }
    if (!verification) {
      throw new Error('Cannot verify solution for ' + type)
    }
    logTime('Solution for ' + type + ' verified')
  }
}