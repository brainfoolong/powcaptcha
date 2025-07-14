<?php

namespace BrainFooLong\Powcaptcha;

use Exception;

class Powcaptcha
{

    public static string $tmpFolder = '';

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

        $threshold = pow(10, 10 - $difficulty);
        for ($i = 0; $i < $challenges; $i++) {
            $iteration = substr($solution, $i * $lengthPerSolution, $lengthPerSolution);
            $challenge = substr($challengeString, $i * 32, 32);
            $hash = self::hash($challenge . $iteration);
            $value = unpack('N', hex2bin(substr($hash, 0, 8)))[1];
            if ($value <= $threshold) {
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
        $threshold = pow(10, 10 - $difficulty);
        for ($i = 0; $i < $challenges; $i++) {
            $iteration = pow(10, $difficulty + 1);
            $challenge = substr($challengeString, $i * 32, 32);
            while (true) {
                $hash = self::hash($challenge . $iteration);
                $value = unpack('N', substr(hex2bin(substr($hash, 0, 8)), 0, 4))[1];
                if ($value <= $threshold) {
                    $solutions[] = $iteration;
                    break;
                }
                $iteration++;
            }
        }
        return implode('', $solutions);
    }

    /**
     * Generate a sha-256 hash
     * @param string $data
     * @return string
     */
    private static function hash(string $data): string
    {
        return hash('sha256', $data);
    }

}