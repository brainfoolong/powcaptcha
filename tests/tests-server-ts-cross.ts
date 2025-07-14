import Powcaptcha from '../ts/powcaptcha-server'

(async () => {
  // @ts-ignore
  require(__dirname + '/tests-server-base-cross.js')(Powcaptcha)
})()