// create all required dist files
const fs = require('fs')

const packageJson = require('../package.json')
const serverFile = __dirname + '/../js/powcaptcha-server.js'
const serverFileModule = __dirname + '/../js/powcaptcha-server.module.js'
const browserFile = __dirname + '/../js/powcaptcha-browser.js'
let contents = fs.readFileSync(serverFile).toString().replace('export default class Powcaptcha', 'class Powcaptcha')
contents = '// Powcaptcha v' + packageJson.version + ' @ ' + packageJson.homepage + '\n' + contents
contents += `
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Powcaptcha
}
`
let contentsCommonJs = contents
fs.writeFileSync(serverFile, contentsCommonJs)

let contentsModule = contents.replace(/^class Powcaptcha/m, 'export default class Powcaptcha')
fs.writeFileSync(serverFileModule, contentsModule)

let contentsBrowser = contents.replaceAll(/\s*\/\/\s*browser-strip-start.*?\/\/\s*browser-strip-end */gis, '')
fs.writeFileSync(browserFile, contentsBrowser)