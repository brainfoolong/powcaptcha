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
        const totalWorkers = (challengeString.length / 32) - 1;
        if (typeof window !== 'undefined' && typeof Worker === 'function') {
            let workerContentsBase = Powcaptcha.toString() + ';\n';
            const promises = [];
            let doneWorkers = 0;
            for (let i = 0; i < totalWorkers; i++) {
                let workerContents = workerContentsBase;
                const challenge = challengeString.substring(i * 32, i * 32 + 32);
                workerContents += '(async()=>{self.postMessage(Powcaptcha.solverWorker(' + JSON.stringify(challenge) + ', ' + JSON.stringify(difficulty) + '))})()';
                const blob = new Blob([workerContents], { type: 'text/javascript' });
                const worker = new Worker(URL.createObjectURL(blob));
                promises.push(new Promise(resolve => {
                    worker.onmessage = (event) => {
                        if (typeof event.data === 'string') {
                            doneWorkers++;
                            if (progressHandler) {
                                progressHandler(1 / totalWorkers * doneWorkers);
                            }
                            resolve(event.data);
                        }
                    };
                }));
            }
            return (await Promise.all(promises)).join('');
        }
        else {
            let solutions = '';
            for (let i = 0; i < totalWorkers; i++) {
                solutions += Powcaptcha.solverWorker(challengeString.substring(i * 32, i * 32 + 32), difficulty);
                if (progressHandler) {
                    progressHandler(1 / totalWorkers * i);
                }
            }
            return solutions;
        }
    }
    /**
     * Generate a compute intensive but non cryptographic purpose fixed length hash
     * @param {BufferSource|Uint8Array|string} data
     * @return {string}
     */
    static hash(data) {
        data = Powcaptcha.toUint8Array(data);
        let h1 = 0x811c9dc5;
        let h2 = 0x8b8d2a97;
        let h3 = 0xc9dc5118;
        let h4 = 0x7b9d8b8d;
        const FNV_PRIME = 0x01000193;
        for (let i = 0; i < data.byteLength; i++) {
            const b = data[i];
            h1 = (h1 ^ b) >>> 0;
            h1 = Math.imul(h1, FNV_PRIME) >>> 0;
            h2 = (h2 ^ ((b << 1) & 0xFF)) >>> 0;
            h2 = Math.imul(h2, FNV_PRIME) >>> 0;
            h3 = (h3 ^ ((b << 2) & 0xFF)) >>> 0;
            h3 = Math.imul(h3, FNV_PRIME) >>> 0;
            h4 = (h4 ^ ((b << 3) & 0xFF)) >>> 0;
            h4 = Math.imul(h4, FNV_PRIME) >>> 0;
        }
        return Powcaptcha.fmix(h1) + Powcaptcha.fmix(h2) + Powcaptcha.fmix(h3) + Powcaptcha.fmix(h4);
    }
    /**
     * Generate a compute intensive but non cryptographic purpose fixed length hash
     * @param {BufferSource|Uint8Array|string} data
     * @return {number}
     */
    static hashInt(data) {
        data = Powcaptcha.toUint8Array(data);
        let h1 = 0x811c9dc5;
        const FNV_PRIME = 0x01000193;
        for (let i = 0; i < data.byteLength; i++) {
            const b = data[i];
            h1 = (h1 ^ b) >>> 0;
            h1 = Math.imul(h1, FNV_PRIME) >>> 0;
        }
        return Powcaptcha.fmix(h1, false);
    }
    /**
     * Internal solver worker
     * @param {string} challenge
     * @param {number} difficulty Higher numbers increase difficulty, highest value may need several minutes per puzzle
     * @return {string}
     */
    static solverWorker(challenge, difficulty = 4) {
        const threshold = Math.pow(10, 10 - difficulty);
        const maxIterations = Math.pow(10, difficulty + 2);
        let iteration = Math.pow(10, difficulty + 1);
        while (iteration <= maxIterations) {
            if (Powcaptcha.hashInt(challenge + iteration) <= threshold) {
                return iteration.toString();
            }
            iteration++;
        }
        return '';
    }
    /**
     * Internal hash helper
     * @param {number} h
     * @param {boolean} returnAsHex If false, return number instead of hex string
     * @returns {string|number}
     */
    static fmix(h, returnAsHex = true) {
        h = h >>> 0;
        h ^= h >>> 16;
        h = h >>> 0;
        const b_low1 = 0xCA6B;
        const b_low2 = 0xAE35;
        const a_low1 = h & 0xFFFF;
        const a_high1 = (h >>> 16) & 0xFFFF;
        h = ((a_low1 * b_low1 +
            (((a_high1 * b_low1 + a_low1 * 0x85EB) << 16) >>> 0)) >>> 0) & 0xFFFFFFFF;
        h ^= h >>> 13;
        const a_low2 = h & 0xFFFF;
        const a_high2 = (h >>> 16) & 0xFFFF;
        h = ((a_low2 * b_low2 +
            (((a_high2 * b_low2 + a_low2 * 0xC2B2) << 16) >>> 0)) >>> 0) & 0xFFFFFFFF;
        h ^= h >>> 16;
        h = h >>> 0;
        if (returnAsHex) {
            return h.toString(16).padStart(8, '0');
        }
        return (h >>> 0);
    }
    /**
     * Convert to uint8array
     * @param {any} data
     * @returns {Uint8Array}
     * @private
     */
    static toUint8Array(data) {
        if (!Powcaptcha.encoder) {
            const encoder = new TextEncoder();
            Powcaptcha.encoder = (data) => {
                if (typeof data === 'string' || typeof data === 'number') {
                    return encoder.encode(data + '');
                }
                return data;
            };
        }
        return Powcaptcha.encoder(data);
    }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Powcaptcha
}
