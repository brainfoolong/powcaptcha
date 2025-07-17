<?php

require_once __DIR__ . "/../php/Powcaptcha.php";
use BrainFooLong\Powcaptcha\Powcaptcha;

$types = json_decode(file_get_contents(__DIR__ . "/types.json"), true);
function logTime($msg, &$now): void
{
    $diff = microtime(true) - $now;
    $now = microtime(true);
    printf("%s (Took %.2fms)\n", $msg, $diff * 1000);
}

$difficulty = 4;

Powcaptcha::$verifiedSolutionsFolder = __DIR__ . '/../tmp';
Powcaptcha::$challengeSalt = 'randomtestsalt';
$now = microtime(true);

foreach ($types as $type) {
    $challengeFile = __DIR__ . "/../tmp/cross-challenge/$type";
    $challenge = file_get_contents($challengeFile);
    $hashFile = __DIR__ . "/../tmp/" . Powcaptcha::hash($challenge) . ".pow";
    if (file_exists($hashFile)) {
        unlink($hashFile);
    }
    $solution = Powcaptcha::solveChallenge($challenge, $difficulty);
    logTime('Challenge from ' . $type . ' solved', $now);

    $verification = Powcaptcha::verifySolution($challenge, $solution);
    if (file_exists($hashFile)) {
        unlink($hashFile);
    }
    if (!$verification) {
        throw new Exception('Cannot verify solution for ' . $type);
    }
    logTime('Solution for ' . $type . ' verified', $now);
}
