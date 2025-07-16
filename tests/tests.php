<?php

require_once __DIR__ . "/../php/Powcaptcha.php";
use BrainFooLong\Powcaptcha\Powcaptcha;

$now = microtime(true);

function logTime($msg): void
{
    global $now;
    $diff = microtime(true) - $now;
    $now = microtime(true);
    printf("%s (Took %.2fms)\n", $msg, $diff * 1000);
}


$puzzles = 50;
$difficulty = 4;

Powcaptcha::$tmpFolder = __DIR__ . '/../tmp';

// Read and decode the JSON file
$fixedChallenges = json_decode(file_get_contents(__DIR__ . '/challenges.json'), true);

foreach ($fixedChallenges['challenges'] as $i => $challengeString) {
    $solutionExpected = $fixedChallenges['solutions'][$i];
    $solution = Powcaptcha::solveChallenge($challengeString, $solutionExpected['difficulty']);
    if ($solution !== $solutionExpected['solution']) {
        throw new Exception('Solution for fixed challenge ' . $i . ' not correct');
    }
}
logTime('Fixed challenges solved and verified');

$challenge = Powcaptcha::createChallenge($puzzles);
logTime('Challenge created');

$solution = Powcaptcha::solveChallenge($challenge, $difficulty);

logTime('Challenge solved');

$verification = Powcaptcha::verifySolution($challenge, $solution, $difficulty);
if (!$verification) {
    throw new Exception('Cannot verify solution');
}
logTime('Solution verified');

$verification = Powcaptcha::verifySolution($challenge, $solution, $difficulty);
if ($verification) {
    throw new Exception('Solution already verified but still, verifySolution() returns true');
}
logTime('Verifying same challenge again is invalid, this is correct');

$challenge = Powcaptcha::createChallenge($puzzles);
file_put_contents(__DIR__ . "/../tmp/cross-challenge/php", $challenge);