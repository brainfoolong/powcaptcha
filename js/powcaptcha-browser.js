// Powcaptcha v0.1.0 @ https://github.com/brainfoolong/powcaptcha
class Powcaptcha {
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
