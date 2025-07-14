<?php

require_once __DIR__ . "/../php/Powcaptcha.php";
use BrainFooLong\Powcaptcha\Powcaptcha;

function logTime($msg, &$now): void
{
    $diff = microtime(true) - $now;
    $now = microtime(true);
    printf("%s (Took %.2fms)\n", $msg, $diff * 1000);
}

$puzzles = 50;
$difficulty = 4;

Powcaptcha::$tmpFolder = __DIR__ . '/../tmp';
$now = microtime(true);

$challenge = Powcaptcha::createChallenge($puzzles);
logTime('Challenge created', $now);

$solution = Powcaptcha::solveChallenge($challenge, $difficulty);

logTime('Challenge solved', $now);

$verification = Powcaptcha::verifySolution($challenge, $solution, $difficulty);
if (!$verification) {
    throw new Exception('Cannot verify solution');
}
logTime('Solution verified', $now);

$verification = Powcaptcha::verifySolution($challenge, $solution, $difficulty);
if ($verification) {
    throw new Exception('Solution already verified but still, verifySolution() returns true');
}
logTime('Verifying same challenge again is invalid, this is correct', $now);

$challenge = Powcaptcha::createChallenge($puzzles);
file_put_contents(__DIR__ . "/../tmp/cross-challenge/php", $challenge);