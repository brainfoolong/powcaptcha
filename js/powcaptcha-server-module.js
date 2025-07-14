// Powcaptcha v0.1.0 @ https://github.com/brainfoolong/powcaptcha
export default class Powcaptcha {
    // browser-strip-start
    // @ts-ignore
    static tmpFolder = process?.env?.POWCAPTCHA_TMPFOLDER;
    static crypto;
    /**
     * Create a challenge to solve
     * @param {number} puzzles How many puzzles should be included, default = 50 and generates a string with 1600 chars (1.6kB)
     *  Each puzzle is 32 chars long
     * @return {Promise<string>}
     */
    static async createChallenge(puzzles = 50) {
        const crypto = this.getCrypto();
        const arr = [];
        for (let i = 0; i < puzzles; i++) {
            arr.push(this.byteArrayToHex(crypto.getRandomValues(new Uint8Array(16))));
        }
        return arr.join('');
    }
    /**
     * Verify the given solution
     * @param {string} challengeString
     * @param {string} solution
     * @param {number} difficulty Must be the same number as with solveChallenge()
     * @return {Promise<boolean>}
     */
    static async verifySolution(challengeString, solution, difficulty = 4) {
        if (!challengeString || challengeString.length < 32 || (challengeString.length % 32)) {
            throw new Error('Invalid challenge string');
        }
        const challenges = challengeString.length / 32;
        const lengthPerSolution = difficulty + 2;
        const solutionLengthRequired = challenges * lengthPerSolution;
        if (!solution || solution.length !== solutionLengthRequired) {
            throw new Error('Invalid solution');
        }
        const enc = new TextEncoder();
        // @ts-ignore
        const fs = require('fs');
        // check if challenge already has been tested
        // do this before calculating solution will save server performance
        const challengeHash = await this.hash(enc.encode(challengeString));
        const hashFile = this.tmpFolder + '/' + challengeHash + '.pow';
        if (fs.existsSync(hashFile)) {
            return false;
        }
        const threshold = Math.pow(10, 10 - difficulty);
        for (let i = 0; i < challenges; i++) {
            const iteration = solution.substring(i * lengthPerSolution, i * lengthPerSolution + lengthPerSolution);
            const challenge = challengeString.substring(i * 32, i * 32 + 32);
            const hash = await this.hash(enc.encode(challenge + iteration));
            const value = (new Uint32Array(this.hexToByteArray(hash.substring(0, 8)).buffer))[0];
            if (value <= threshold) {
                continue;
            }
            return false;
        }
        if (!this.tmpFolder || !fs.existsSync(this.tmpFolder) || !fs.lstatSync(this.tmpFolder).isDirectory()) {
            throw new Error('Cannot find tmpFolder for Powcaptcha');
        }
        // delete files older than 5 minutes
        const timeThreshold = new Date().getTime() - (300 * 1000);
        for (const file of fs.readdirSync(this.tmpFolder)) {
            const path = this.tmpFolder + '/' + file;
            if (file.endsWith('.pow') && fs.lstatSync(path).mtime.getTime() < timeThreshold) {
                fs.unlinkSync(path);
            }
        }
        fs.writeFileSync(hashFile, '');
        return true;
    }
    // browser-strip-end
    /**
     * Solves this given challenge
     * @param {string} challengeString
     * @param {number} difficulty Higher numbers increase difficulty, highest value may need several minutes per puzzle
     * @param {Function|null} progressHandler If set, called for each puzzle with the total progress being passed as 0-1
     * @return {Promise<string>}
     */
    static async solveChallenge(challengeString, difficulty = 4, progressHandler = null) {
        if (difficulty < 1 || difficulty > 7) {
            throw new Error('Difficulty need to be between 1-7');
        }
        if (!challengeString || challengeString.length < 32 || (challengeString.length % 32)) {
            throw new Error('Invalid challenge string');
        }
        const challenges = challengeString.length / 32;
        const enc = new TextEncoder();
        const solutions = [];
        const threshold = Math.pow(10, 10 - difficulty);
        for (let i = 0; i < challenges; i++) {
            let iteration = Math.pow(10, difficulty + 1);
            const challenge = challengeString.substring(i * 32, i * 32 + 32);
            while (true) {
                const hashPart = await this.getCrypto().subtle.digest('SHA-256', enc.encode(challenge + iteration));
                const value = (new Uint32Array(hashPart))[0];
                if (value <= threshold) {
                    if (progressHandler) {
                        progressHandler(1 / challenges * (i + 1));
                    }
                    solutions.push(iteration);
                    break;
                }
                iteration++;
            }
        }
        return solutions.join('');
    }
    /**
     * Get crypto instance depending on the environment
     * @return {Crypto}
     * @private
     */
    static getCrypto() {
        if (typeof this.crypto !== 'undefined') {
            return this.crypto;
        }
        if (typeof Uint8Array === 'undefined') {
            throw new Error('Unsupported environment, Uint8Array missing');
        }
        if (typeof TextEncoder === 'undefined') {
            throw new Error('Unsupported environment, TextEncoder missing');
        }
        // browser-strip-start
        if (typeof window === 'undefined') {
            // @ts-ignore
            if (typeof module !== 'undefined' && module.exports) {
                // @ts-ignore
                this.crypto = require('crypto').webcrypto;
                return this.crypto;
            }
            // web worker support
            if (typeof self !== 'undefined' && self.crypto) {
                // @ts-ignore
                this.crypto = self.crypto;
                return this.crypto;
            }
        }
        // browser-strip-end
        if (!window.crypto) {
            throw new Error('Unsupported environment, crypto missing');
        }
        this.crypto = window.crypto;
        return this.crypto;
    }
    /**
     * Generate a sha-256 hash
     * @param {BufferSource} data
     * @return {Promise<string>}
     * @private
     */
    static async hash(data) {
        return this.byteArrayToHex(new Uint8Array(await this.getCrypto().subtle.digest('SHA-256', data)));
    }
    /**
     * Convert given byte array to visual hex representation with leading 0x
     * @param {Uint8Array} byteArray
     * @return {string}
     * @private
     */
    static byteArrayToHex(byteArray) {
        return Array.from(byteArray).map(x => x.toString(16).padStart(2, '0')).join('');
    }
    /**
     * Convert a hex string into given byte array to visual hex representation
     * @param {str} str
     * @return {string}
     * @private
     */
    static hexToByteArray(str) {
        return Uint8Array.from((str.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16)));
    }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Powcaptcha
}
