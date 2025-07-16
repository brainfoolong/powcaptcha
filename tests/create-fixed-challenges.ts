// @ts-ignore
import fs from 'fs'
import Powcaptcha from '../ts/powcaptcha'

(async () => {

  // create fixed challenges and solutions
  const challenges = { 'challenges': [] as any, 'solutions': [] as any }
  for (let i = 0; i < 10; i++) {
    const challenge = Powcaptcha.createChallenge(50)
    challenges.challenges.push(challenge)
    challenges.solutions.push({ 'difficulty': 4, solution: await Powcaptcha.solveChallenge(challenge, 4) })
  }
  fs.writeFileSync(__dirname + '/challenges.json', JSON.stringify(challenges))
})()