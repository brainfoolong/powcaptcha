<?php

namespace BrainFooLong\Powcaptcha;

use Exception;

class Powcaptcha
{

    public static string $verifiedSolutionsFolder = '';
    public static string $challengeSalt = '';
    private static array $byteMap = [];

    /**
     * Create a challenge to solve
     * @param int $puzzles How many puzzles should be generated, default = 50 and generates a string with 1600 chars (1.6kB)
     *  Each puzzle is 32 chars long
     * @param int $difficulty A number between 1 and 7 - Higher takes longer, 7 probably take several minutes
     * @return string
     */
    public static function createChallenge(int $puzzles = 50, int $difficulty = 4): string
    {
        if (!self::$challengeSalt) {
            throw new Exception('Powcaptcha::challengeSalt required, should be a random value not exposed to solver clients');
        }
        $challenge = (string)$difficulty;
        for ($i = 0; $i < $puzzles; $i++) {
            $challenge .= bin2hex(random_bytes(16));
        }
        return $challenge . self::hash($challenge . self::$challengeSalt);
    }

    /**
     * Verify the given solution
     * @param string $challengeData
     * @param string $solution
     * @return bool
     */
    public static function verifySolution(string $challengeData, string $solution): bool
    {
        $challengeMeta = self::parseChallengeData($challengeData, true);

        if (!$solution || strlen($solution) !== $challengeMeta['solutionLengthRequired']) {
            throw new Exception('Invalid solution');
        }

        // check if challenge already has been tested
        $hashFile = self::$verifiedSolutionsFolder . '/' . self::hash($challengeData) . '.pow';
        if (file_exists($hashFile)) {
            return false;
        }

        for ($i = 0; $i < $challengeMeta['numberPuzzles']; $i++) {
            $iteration = substr($solution, $i * $challengeMeta['lengthPerSolution'], $challengeMeta['lengthPerSolution']);
            $challenge = substr($challengeMeta['puzzlesString'], $i * 32, 32);
            if (self::hashInt($challenge . $iteration) <= $challengeMeta['threshold']) {
                continue;
            }
            return false;
        }

        if (!self::$verifiedSolutionsFolder || !is_dir(self::$verifiedSolutionsFolder)) {
            throw new Exception('Cannot find tmpFolder for Powcaptcha');
        }

        // delete files older than 5 minutes
        $timeThreshold = time() - 300;
        foreach (scandir(self::$verifiedSolutionsFolder) as $file) {
            if (str_ends_with($file, '.pow')) {
                $path = self::$verifiedSolutionsFolder . '/' . $file;
                if (filemtime($path) < $timeThreshold) {
                    unlink($path);
                }
            }
        }
        file_put_contents($hashFile, '');
        return true;
    }

    /**
     * Solves this given challenge
     * @param string $challengeData
     * @return string
     */
    public static function solveChallenge(string $challengeData): string
    {
        $challengeMeta = self::parseChallengeData($challengeData, false);

        $solutions = '';
        $maxIterations = 10 ** ($challengeMeta['difficulty'] + 2);
        for ($i = 0; $i < $challengeMeta['numberPuzzles']; $i++) {
            $iteration = 10 ** ($challengeMeta['difficulty'] + 1);
            $challenge = substr($challengeMeta['puzzlesString'], $i * 32, 32);
            while ($iteration <= $maxIterations) {
                if (self::hashInt($challenge . $iteration) <= $challengeMeta['threshold']) {
                    $solutions .= $iteration;
                    continue 2;
                }
                $iteration++;
            }
        }
        return $solutions;
    }

    /**
     * Generate a compute intensive but non cryptographic purpose fixed length hash
     * @param string $data
     * @return string|int
     */
    public static function hash(string $data): string|int
    {
        if (!self::$byteMap) {
            self::fillByteMap();
        }
        $h1 = 0x811c9dc5;
        $h2 = 0x8b8d2a97;
        $h3 = 0xc9dc5118;
        $h4 = 0x7b9d8b8d;
        $prime = 0x01000193;

        $len = strlen($data);
        for ($i = 0; $i < $len; $i++) {
            $b = self::$byteMap[$data[$i]];

            $h1 = ($h1 ^ $b);
            $h1 = ($h1 * $prime) & 0xFFFFFFFF;

            $h2 = ($h2 ^ (($b << 1) & 0xFF));
            $h2 = ($h2 * $prime) & 0xFFFFFFFF;

            $h3 = ($h3 ^ (($b << 2) & 0xFF));
            $h3 = ($h3 * $prime) & 0xFFFFFFFF;

            $h4 = ($h4 ^ (($b << 3) & 0xFF));
            $h4 = ($h4 * $prime) & 0xFFFFFFFF;
        }
        return self::fmix($h1) . self::fmix($h2) . self::fmix($h3) . self::fmix($h4);
    }

    /**
     * Generate a compute intensive but non cryptographic purpose fixed length hash
     * @param string $data
     * @return int
     */
    public static function hashInt(string $data): int
    {
        if (!self::$byteMap) {
            self::fillByteMap();
        }
        $h1 = 0x811c9dc5;
        $prime = 0x01000193;

        $len = strlen($data);
        for ($i = 0; $i < $len; $i++) {
            $h1 = (($h1 ^ self::$byteMap[$data[$i]]) * $prime) & 0xFFFFFFFF;
        }
        return self::fmix($h1, false);
    }

    /**
     * Internal hash helper
     * @param int $h
     * @param bool $returnAsHex If false, return integer instead of hex string
     * @return string|int
     */
    private static function fmix(int $h, bool $returnAsHex = true): string|int
    {
        $h = $h & 0xFFFFFFFF;
        $h ^= ($h >> 16);

        $b_low1 = 0xCA6B;
        $b_low2 = 0xAE35;

        $a_low1 = $h & 0xFFFF;
        $a_high1 = ($h >> 16) & 0xFFFF;
        $h = ($a_low1 * $b_low1 +
                ((($a_high1 * $b_low1 + $a_low1 * 0x85EB) << 16) & 0xFFFFFFFF)) & 0xFFFFFFFF;

        $h ^= ($h >> 13);

        $a_low2 = $h & 0xFFFF;
        $a_high2 = ($h >> 16) & 0xFFFF;
        $h = ($a_low2 * $b_low2 +
                ((($a_high2 * $b_low2 + $a_low2 * 0xC2B2) << 16) & 0xFFFFFFFF)) & 0xFFFFFFFF;

        $h ^= ($h >> 16);
        if ($returnAsHex) {
            return str_pad(dechex($h), 8, '0', STR_PAD_LEFT);
        }
        return $h;
    }

    private static function fillByteMap(): void
    {
        for ($i = 0; $i <= 255; $i++) {
            self::$byteMap[chr($i)] = $i;
        }
    }

    /**
     * @return array{difficulty: int, puzzlesString: string, numberPuzzles: int, lengthPerSolution: int, solutionLengthRequired: int, threshold: int}
     */
    private static function parseChallengeData(string $challengeData, bool $validateChallenge): array
    {
        $clength = strlen($challengeData);
        if ($clength < 33 || (($clength - 1) % 32)) {
            throw new Exception('Invalid challenge data');
        }
        if ($validateChallenge && !self::$challengeSalt) {
            throw new Exception('Powcaptcha::challengeSalt required, should be a random value not exposed to solver clients');
        }
        $difficulty = (int)substr($challengeData, 0, 1);
        if ($difficulty < 1 || $difficulty > 7) {
            throw new Exception('Invalid difficulty, need to be between 1 and 7');
        }
        $puzzlesString = substr($challengeData, 1, $clength - 33);

        if ($validateChallenge) {
            $challengeHashCalculated = self::hash(substr($challengeData, 0, $clength - 32) . self::$challengeSalt);
            $challengeHashGiven = substr($challengeData, $clength - 32);

            if ($challengeHashCalculated !== $challengeHashGiven) {
                throw new Exception('Invalid challenge hash');
            }
        }

        $numberPuzzles = strlen($puzzlesString) / 32;
        $lengthPerSolution = $difficulty + 2;
        $solutionLengthRequired = $numberPuzzles * $lengthPerSolution;
        $threshold = 10 ** (10 - $difficulty);

        return [
            'difficulty' => $difficulty,
            'puzzlesString' => $puzzlesString,
            'numberPuzzles' => $numberPuzzles,
            'lengthPerSolution' => $lengthPerSolution,
            'solutionLengthRequired' => $solutionLengthRequired,
            'threshold' => $threshold,
        ];
    }

}