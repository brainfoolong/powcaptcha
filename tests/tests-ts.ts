import Powcaptcha from '../ts/powcaptcha'

(async () => {
  // @ts-ignore
  require(__dirname + '/tests-js.js')(Powcaptcha, "ts")
})()