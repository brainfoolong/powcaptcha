<?php

namespace BrainFooLong\Powcaptcha;

use Exception;

class Powcaptcha
{

    public static string $tmpFolder = '';
    private static array $byteMap = [];

    /**
     * Create a challenge to solve
     * @param int $puzzles How many puzzles should be included, default = 50 and generates a string with 1600 chars (1.6kB)
     *  Each puzzle is 32 chars long
     * @return string
     */
    public static function createChallenge(int $puzzles = 50): string
    {
        $arr = [];
        for ($i = 0; $i < $puzzles; $i++) {
            $arr[] = bin2hex(random_bytes(16));
        }
        return implode('', $arr);
    }

    /**
     * Verify the given solution
     * @param string $challengeString
     * @param string $solution
     * @param int $difficulty Must be the same number as with solveChallenge()
     * @return bool
     */
    public static function verifySolution(string $challengeString, string $solution, int $difficulty = 4): bool
    {
        if (
            !$challengeString ||
            strlen($challengeString) < 32 ||
            (strlen($challengeString) % 32) !== 0
        ) {
            throw new Exception('Invalid challenge string');
        }
        $challenges = strlen($challengeString) / 32;
        $lengthPerSolution = $difficulty + 2;
        $solutionLengthRequired = $challenges * $lengthPerSolution;
        if (!$solution || strlen($solution) !== $solutionLengthRequired) {
            throw new Exception('Invalid solution');
        }

        // Check if challenge already has been tested
        $challengeHash = self::hash($challengeString);
        $hashFile = self::$tmpFolder . '/' . $challengeHash . '.pow';
        if (file_exists($hashFile)) {
            return false;
        }

        $threshold = 10 ** (10 - $difficulty);
        for ($i = 0; $i < $challenges; $i++) {
            $iteration = substr($solution, $i * $lengthPerSolution, $lengthPerSolution);
            $challenge = substr($challengeString, $i * 32, 32);
            if (self::hashInt($challenge . $iteration) <= $threshold) {
                continue;
            }
            return false;
        }

        if (!self::$tmpFolder || !is_dir(self::$tmpFolder)) {
            throw new Exception('Cannot find tmpFolder for Powcaptcha');
        }

        // delete files older than 5 minutes
        $timeThreshold = time() - 300;
        foreach (scandir(self::$tmpFolder) as $file) {
            if (str_ends_with($file, '.pow')) {
                $path = self::$tmpFolder . '/' . $file;
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
     * @param string $challengeString
     * @param int $difficulty Higher numbers increase difficulty, highest value may need several minutes per puzzle
     * @return string
     */
    public static function solveChallenge(string $challengeString, int $difficulty = 4): string
    {
        if ($difficulty < 1 || $difficulty > 7) {
            throw new Exception('Difficulty need to be between 1-7');
        }
        if (
            !$challengeString ||
            strlen($challengeString) < 32 ||
            (strlen($challengeString) % 32) !== 0
        ) {
            throw new Exception('Invalid challenge string');
        }
        $challenges = strlen($challengeString) / 32;
        $solutions = [];
        $threshold = 10 ** (10 - $difficulty);
        $maxIterations = 10 ** ($difficulty + 2);
        $c = 0;
        for ($i = 0; $i < $challenges; $i++) {
            $iteration = 10 ** ($difficulty + 1);
            $challenge = substr($challengeString, $i * 32, 32);
            while ($iteration <= $maxIterations) {
                if (self::hashInt($challenge . $iteration) <= $threshold) {
                    $solutions[] = $iteration;
                    continue 2;
                }
                $iteration++;
            }
        }
        return implode('', $solutions);
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

}