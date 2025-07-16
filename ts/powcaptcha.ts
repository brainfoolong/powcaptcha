export default class Powcaptcha {
  private static tmpHelpers: any = {}

  // browser-strip-start
  // @ts-ignore
  public static tmpFolder: string = process?.env?.POWCAPTCHA_TMPFOLDER

  // browser-strip-end

  /**
   * Create a challenge to solve
   * @param {number} puzzles How many puzzles should be included, default = 50 and generates a string with 1600 chars (1.6kB)
   *  Each puzzle is 32 chars long
   * @return {string}
   */
  public static createChallenge (puzzles: number = 50): string {
    Powcaptcha.init()
    if (!Powcaptcha.tmpHelpers.randomBytes) {
      throw new Error('This device cannot create a challenge as randomBytes function (Crypto module) is missing')
    }
    const arr: any = []
    for (let i = 0; i < puzzles; i++) {
      arr.push(Powcaptcha.byteArrayToHex(Powcaptcha.tmpHelpers.randomBytes(16)))
    }
    return arr.join('')
  }

  /**
   * Verify the given solution
   * @param {string} challengeString
   * @param {string} solution
   * @param {number} difficulty Must be the same number as with solveChallenge()
   * @return {boolean}
   */
  public static verifySolution (
    challengeString: string,
    solution: string,
    difficulty: number = 4,
  ): boolean {
    if (!challengeString || challengeString.length < 32 || (challengeString.length % 32)) {
      throw new Error('Invalid challenge string')
    }
    const challenges = challengeString.length / 32
    const lengthPerSolution = difficulty + 2
    const solutionLengthRequired = challenges * lengthPerSolution
    if (!solution || solution.length !== solutionLengthRequired) {
      throw new Error('Invalid solution')
    }
    Powcaptcha.init()
    // browser-strip-start
    // @ts-ignore
    const fs = require('fs')

    // check if challenge already has been tested
    // do this before calculating solution will save server performance
    const challengeHash = Powcaptcha.hash(challengeString)
    const hashFile = Powcaptcha.tmpFolder + '/' + challengeHash + '.pow'
    if (fs.existsSync(hashFile)) {
      return false
    }
    // browser-strip-end

    const threshold = Math.pow(10, 10 - difficulty)
    for (let i = 0; i < challenges; i++) {
      const iteration = solution.substring(i * lengthPerSolution, i * lengthPerSolution + lengthPerSolution)
      const challenge = challengeString.substring(i * 32, i * 32 + 32)
      if (Powcaptcha.hashInt(challenge + iteration) <= threshold) {
        continue
      }
      return false
    }
    // browser-strip-start
    if (!Powcaptcha.tmpFolder || !fs.existsSync(Powcaptcha.tmpFolder) || !fs.lstatSync(Powcaptcha.tmpFolder).isDirectory()) {
      throw new Error('Cannot find tmpFolder for Powcaptcha')
    }
    // delete files older than 5 minutes
    const timeThreshold = new Date().getTime() - (300 * 1000)
    for (const file of fs.readdirSync(Powcaptcha.tmpFolder)) {
      const path = Powcaptcha.tmpFolder + '/' + file
      if (file.endsWith('.pow') && fs.lstatSync(path).mtime.getTime() < timeThreshold) {
        fs.unlinkSync(path)
      }
    }
    fs.writeFileSync(hashFile, '')
    // browser-strip-end
    return true
  }

  /**
   * Solves this given challenge
   * @param {string} challengeString
   * @param {number} difficulty Higher numbers increase difficulty, highest value may need several minutes per puzzle
   * @param {Function|null} progressHandler If set, called for each puzzle with the total progress being passed as 0-1
   * @return {Promise<string>}
   */
  public static async solveChallenge (
    challengeString: string,
    difficulty: number = 4,
    progressHandler: ((progress: number) => void) | null = null,
  ): Promise<string> {
    Powcaptcha.init()
    if (difficulty < 1 || difficulty > 7) {
      throw new Error('Difficulty need to be between 1-7')
    }
    if (!challengeString || challengeString.length < 32 || (challengeString.length % 32)) {
      throw new Error('Invalid challenge string')
    }
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      let workerContentsBase = Powcaptcha.toString() + ';\n'
      workerContentsBase += 'Powcaptcha.init();'
      const promises = [] as any
      const totalWorkers = challengeString.length / 32
      let doneWorkers = 0
      for (let i = 0; i < challengeString.length; i += 32) {
        let workerContents = workerContentsBase
        const challenge = challengeString.substring(i, i + 32)
        workerContents += '(async()=>{self.postMessage(Powcaptcha.solverWorker(' + JSON.stringify(challenge) + ', ' + JSON.stringify(difficulty) + '))})()'
        const blob = new Blob([workerContents], { type: 'text/javascript' })
        const worker = new Worker(URL.createObjectURL(blob))
        promises.push(new Promise(resolve => {
          worker.onmessage = (event: any) => {
            if (typeof event.data === 'string') {
              doneWorkers++
              if (progressHandler) {
                progressHandler(1 / totalWorkers * doneWorkers)
              }
              resolve(event.data)
            }
          }
        }))
      }
      return (await Promise.all(promises)).join('')
    }
    return Powcaptcha.solverWorker(challengeString, difficulty, progressHandler)
  }

  /**
   * Generate a compute intensive but non cryptographic purpose fixed length hash
   * @param {BufferSource|Uint8Array|string} data
   * @return {string}
   */
  public static hash (data: BufferSource | Uint8Array | string): string {
    Powcaptcha.init()
    data = (typeof data === 'string' ? Powcaptcha.tmpHelpers.encode(data) : data) as BufferSource

    let h1 = 0x811c9dc5
    let h2 = 0x8b8d2a97
    let h3 = 0xc9dc5118
    let h4 = 0x7b9d8b8d
    const FNV_PRIME = 0x01000193

    for (let i = 0; i < data.byteLength; i++) {
      const b = data[i]

      h1 = (h1 ^ b) >>> 0
      h1 = Math.imul(h1, FNV_PRIME) >>> 0

      h2 = (h2 ^ ((b << 1) & 0xFF)) >>> 0
      h2 = Math.imul(h2, FNV_PRIME) >>> 0

      h3 = (h3 ^ ((b << 2) & 0xFF)) >>> 0
      h3 = Math.imul(h3, FNV_PRIME) >>> 0

      h4 = (h4 ^ ((b << 3) & 0xFF)) >>> 0
      h4 = Math.imul(h4, FNV_PRIME) >>> 0
    }
    return this.fmix<string>(h1) + this.fmix<string>(h2) + this.fmix<string>(h3) + this.fmix<string>(h4)
  }

  /**
   * Generate a compute intensive but non cryptographic purpose fixed length hash
   * @param {BufferSource|Uint8Array|string} data
   * @return {number}
   */
  public static hashInt (data: BufferSource | Uint8Array | string): number {
    Powcaptcha.init()
    data = (typeof data === 'string' ? Powcaptcha.tmpHelpers.encode(data) : data) as BufferSource

    let h1 = 0x811c9dc5
    const FNV_PRIME = 0x01000193

    for (let i = 0; i < data.byteLength; i++) {
      const b = data[i]
      h1 = (h1 ^ b) >>> 0
      h1 = Math.imul(h1, FNV_PRIME) >>> 0
    }
    return this.fmix<number>(h1, false)
  }

  /**
   * Internal solver worker
   * @param {string} challengeString
   * @param {number} difficulty Higher numbers increase difficulty, highest value may need several minutes per puzzle
   * @param {Function|null} progressHandler If set, called for each puzzle with the total progress being passed as 0-1
   * @return {string}
   */
  private static solverWorker (
    challengeString: string,
    difficulty: number = 4,
    progressHandler: ((progress: number) => void) | null = null,
  ): string {
    const challenges = challengeString.length / 32
    const threshold = Math.pow(10, 10 - difficulty)
    const maxIterations = Math.pow(10, difficulty + 2)
    let solutions = ''
    for (let i = 0; i < challenges; i++) {
      let iteration = Math.pow(10, difficulty + 1)
      const challenge = challengeString.substring(i * 32, i * 32 + 32)
      while (iteration <= maxIterations) {
        if (Powcaptcha.hashInt(challenge + iteration) <= threshold) {
          if (typeof progressHandler === 'function') {
            progressHandler(1 / challenges * (i + 1))
          }
          solutions += iteration
          break
        }
        iteration++
      }
    }
    return solutions
  }

  /**
   * Internal hash helper
   * @param {number} h
   * @param {boolean} returnAsHex If false, return number instead of hex string
   * @returns {string|number}
   */
  private static fmix<T> (h: number, returnAsHex: boolean = true): T {
    h = h >>> 0
    h ^= h >>> 16
    h = h >>> 0

    const b_low1 = 0xCA6B
    const b_low2 = 0xAE35

    const a_low1 = h & 0xFFFF
    const a_high1 = (h >>> 16) & 0xFFFF
    h = (
      (a_low1 * b_low1 +
        (((a_high1 * b_low1 + a_low1 * 0x85EB) << 16) >>> 0)) >>> 0
    ) & 0xFFFFFFFF

    h ^= h >>> 13

    const a_low2 = h & 0xFFFF
    const a_high2 = (h >>> 16) & 0xFFFF
    h = (
      (a_low2 * b_low2 +
        (((a_high2 * b_low2 + a_low2 * 0xC2B2) << 16) >>> 0)) >>> 0
    ) & 0xFFFFFFFF

    h ^= h >>> 16
    h = h >>> 0

    if (returnAsHex) {
      return h.toString(16).padStart(8, '0') as T
    }
    return (h >>> 0) as T
  }

  /**
   * Initialize powcaptcha
   * @private
   */
  private static init (): void {
    if (typeof Powcaptcha.tmpHelpers.encode !== 'undefined') {
      return
    }

    const encoder = new TextEncoder()
    Powcaptcha.tmpHelpers.encode = (data: any): Uint8Array => {
      return encoder.encode(data)
    }

    if (typeof window !== 'undefined' || typeof self !== 'undefined') {
      const crypto = (self || window).crypto
      if (typeof crypto !== 'undefined') {
        Powcaptcha.tmpHelpers.randomBytes = (size: number): Uint8Array => {
          return crypto.getRandomValues(new Uint8Array(size))
        }
      }
    }
    // browser-strip-start
    if (typeof window === 'undefined') {
      // using node:crypto and not webcrypto as webcrypto performance is 10x worse for sha256
      const { randomBytes } = require('node:crypto')
      Powcaptcha.tmpHelpers.randomBytes = (size: number): Uint8Array => {
        return Uint8Array.from(randomBytes(size))
      }
    }
    // browser-strip-end
  }

  /**
   * Convert given byte array to visual hex representation with leading 0x
   * @param {Uint8Array|ArrayBuffer} byteArray
   * @return {string}
   * @private
   */
  private static byteArrayToHex (byteArray: Uint8Array | ArrayBuffer): string {
    if (typeof Powcaptcha.tmpHelpers.hexMap === 'undefined') {
      Powcaptcha.tmpHelpers.hexMap = []
      for (let i = 0; i <= 0xff; i++) {
        Powcaptcha.tmpHelpers.hexMap.push(i.toString(16).padStart(2, '0'))
      }
    }
    if (!(byteArray instanceof Uint8Array)) {
      byteArray = new Uint8Array(byteArray)
    }
    let out = ''
    for (let i = 0; i < byteArray.byteLength; i++) {
      out += Powcaptcha.tmpHelpers.hexMap[byteArray[i]]
    }
    return out
  }
}