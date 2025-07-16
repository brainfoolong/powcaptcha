import Powcaptcha from '../ts/powcaptcha'

(async () => {
  // @ts-ignore
  require(__dirname + '/tests-server-base-cross.js')(Powcaptcha)
})()