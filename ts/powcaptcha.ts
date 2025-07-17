export default class Powcaptcha {

  // browser-strip-start
  // @ts-ignore
  public static verifiedSolutionsFolder: string = process?.env?.POWCAPTCHA_VERIFIED_SOLUTIONS_FOLDER
  // browser-strip-end

  // browserslim-strip-start
  public static challengeSalt: string

  private static encoder: (data: any) => Uint8Array

  /**
   * Create a challenge to solve
   * @param {number} puzzles How many puzzles should be included, default = 50 and generates a string with 1600 chars (1.6kB)
   *  Each puzzle is 32 chars long
   * @return {string}
   */
  public static createChallenge (puzzles: number = 50): string {
    if (!Powcaptcha.challengeSalt) {
      throw new Error('Powcaptcha.challengeSalt required, should be a random value not exposed to solver clients')
    }
    let randomHash: any
    if (typeof window !== 'undefined' || typeof self !== 'undefined') {
      const crypto = (self || window).crypto
      if (typeof crypto !== 'undefined') {
        randomHash = (size: number): string => {
          const v = crypto.getRandomValues(new Uint8Array(size))
          let s = ''
          for (const vElement of v) {
            s += vElement.toString(16).padStart(2, '0')
          }
          return s
        }
      }
    }
    // browser-strip-start
    if (typeof window === 'undefined') {
      // using node:crypto and not webcrypto as webcrypto performance is 10x worse for sha256
      randomHash = (size: number): string => {
        const { randomBytes } = require('node:crypto')
        return randomBytes(size).toString('hex')
      }
    }
    // browser-strip-end
    let challenge: string = ''
    for (let i = 0; i < puzzles; i++) {
      challenge += randomHash(16)
    }
    return challenge + Powcaptcha.hash(challenge + Powcaptcha.challengeSalt)
  }

  /**
   * Verify the given solution
   * @param {string} challengeData
   * @param {string} solution
   * @param {number} difficulty Must be the same number as with solveChallenge()
   * @return {boolean}
   */
  public static verifySolution (
    challengeData: string,
    solution: string,
    difficulty: number = 4,
  ): boolean {
    if (!challengeData || challengeData.length < 32 || (challengeData.length % 32)) {
      throw new Error('Invalid challenge string')
    }
    if (!Powcaptcha.challengeSalt) {
      throw new Error('Powcaptcha.challengeSalt required, should be a random value not exposed to solver clients')
    }
    const challengeString = challengeData.substring(0, challengeData.length - 32)
    const challenges = challengeString.length / 32
    const lengthPerSolution = difficulty + 2
    const solutionLengthRequired = challenges * lengthPerSolution
    if (!solution || solution.length !== solutionLengthRequired) {
      throw new Error('Invalid solution')
    }

    const challengeHashCalculated = Powcaptcha.hash(challengeString + Powcaptcha.challengeSalt)
    const challengeHashGiven = challengeData.substring(challengeData.length - 32)

    if (challengeHashCalculated !== challengeHashGiven) {
      throw new Error('Invalid challenge hash')
    }

    // browser-strip-start
    // @ts-ignore
    const fs = require('fs')

    // check if challenge already has been tested
    // do this before calculating solution will save server performance
    const hashFile = Powcaptcha.verifiedSolutionsFolder + '/' + Powcaptcha.hash(challengeData) + '.pow'
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
    if (!Powcaptcha.verifiedSolutionsFolder || !fs.existsSync(Powcaptcha.verifiedSolutionsFolder) || !fs.lstatSync(Powcaptcha.verifiedSolutionsFolder).isDirectory()) {
      throw new Error('Cannot write to verifiedSolutionsFolder for Powcaptcha')
    }
    // delete files older than 5 minutes
    const timeThreshold = new Date().getTime() - (300 * 1000)
    for (const file of fs.readdirSync(Powcaptcha.verifiedSolutionsFolder)) {
      const path = Powcaptcha.verifiedSolutionsFolder + '/' + file
      if (file.endsWith('.pow') && fs.lstatSync(path).mtime.getTime() < timeThreshold) {
        fs.unlinkSync(path)
      }
    }
    fs.writeFileSync(hashFile, '')
    // browser-strip-end
    return true
  }

  // browserslim-strip-end

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
    if (difficulty < 1 || difficulty > 7) {
      throw new Error('Difficulty need to be between 1-7')
    }
    if (!challengeString || challengeString.length < 32 || (challengeString.length % 32)) {
      throw new Error('Invalid challenge string')
    }
    const totalWorkers = (challengeString.length / 32) - 1
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      let workerContentsBase = Powcaptcha.toString() + ';\n'
      const promises = [] as any
      let doneWorkers = 0
      for (let i = 0; i < totalWorkers; i++) {
        let workerContents = workerContentsBase
        const challenge = challengeString.substring(i * 32, i * 32 + 32)
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
    } else {
      let solutions = ''
      for (let i = 0; i < totalWorkers; i++) {
        solutions += Powcaptcha.solverWorker(challengeString.substring(i * 32, i * 32 + 32), difficulty)
        if (progressHandler) {
          progressHandler(1 / totalWorkers * i)
        }
      }
      return solutions
    }
  }

  /**
   * Generate a compute intensive but non cryptographic purpose fixed length hash
   * @param {BufferSource|Uint8Array|string} data
   * @return {string}
   */
  public static hash (data: BufferSource | Uint8Array | string): string {
    data = Powcaptcha.toUint8Array(data)

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
    return Powcaptcha.fmix<string>(h1) + Powcaptcha.fmix<string>(h2) + Powcaptcha.fmix<string>(h3) + Powcaptcha.fmix<string>(h4)
  }

  /**
   * Generate a compute intensive but non cryptographic purpose fixed length hash
   * @param {BufferSource|Uint8Array|string} data
   * @return {number}
   */
  public static hashInt (data: BufferSource | Uint8Array | string): number {
    data = Powcaptcha.toUint8Array(data)

    let h1 = 0x811c9dc5
    const FNV_PRIME = 0x01000193

    for (let i = 0; i < data.byteLength; i++) {
      const b = data[i]
      h1 = (h1 ^ b) >>> 0
      h1 = Math.imul(h1, FNV_PRIME) >>> 0
    }
    return Powcaptcha.fmix<number>(h1, false)
  }

  /**
   * Internal solver worker
   * @param {string} challenge
   * @param {number} difficulty Higher numbers increase difficulty, highest value may need several minutes per puzzle
   * @return {string}
   */
  private static solverWorker (
    challenge: string,
    difficulty: number = 4,
  ): string {
    const threshold = Math.pow(10, 10 - difficulty)
    const maxIterations = Math.pow(10, difficulty + 2)
    let iteration = Math.pow(10, difficulty + 1)
    while (iteration <= maxIterations) {
      if (Powcaptcha.hashInt(challenge + iteration) <= threshold) {
        return iteration.toString()
      }
      iteration++
    }
    return ''
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
   * Convert to uint8array
   * @param {any} data
   * @returns {Uint8Array}
   * @private
   */
  private static toUint8Array (data: any): Uint8Array {
    if (!Powcaptcha.encoder) {
      const encoder = new TextEncoder()
      Powcaptcha.encoder = (data: any) => {
        if (typeof data === 'string' || typeof data === 'number') {
          return encoder.encode(data + '')
        }
        return data
      }
    }
    return Powcaptcha.encoder(data)
  }
}