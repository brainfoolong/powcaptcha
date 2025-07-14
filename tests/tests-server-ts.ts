import Powcaptcha from '../ts/powcaptcha-server'

(async () => {
  require(__dirname + '/tests-server-base.js')(Powcaptcha, "ts")
})()