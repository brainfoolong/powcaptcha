// @ts-ignore
import fs from 'fs'
import Powcaptcha from '../ts/powcaptcha'

(async () => {

  Powcaptcha.challengeSalt = 'randomtestsalt'
  const puzzles = 50
  const difficulty = 4
  // create fixed challenges and solutions
  const challenges = { 'challenges': [] as any, 'solutions': [] as any }
  for (let i = 0; i < 10; i++) {
    const challenge = Powcaptcha.createChallenge(puzzles, difficulty)
    challenges.challenges.push(challenge)
    challenges.solutions.push({ solution: await Powcaptcha.solveChallenge(challenge) })
  }
  fs.writeFileSync(__dirname + '/challenges.json', JSON.stringify(challenges))
})()