![Logo](docs/img/logo.svg)

[![Powcaptcha Tests](https://github.com/brainfoolong/powcaptcha/actions/workflows/tests.yml/badge.svg)](https://github.com/brainfoolong/powcaptcha/actions/workflows/tests.yml)

**Powcaptcha** - Proof Of Work Captcha/Challenge/Brute Force protection, without any required user interaction. As of todays technology and
capability of AI that can solve any "I am human" captcha faster than any human on earth, protecting backends is now different from what we are all used to from
the past.

Having a captcha that need to be solved by hand has absolutely no advantage today nor it can proove the existence of humans in the progress. Instead, if you
wish to protect your backend from to much requests in a short period (brute force), you need something that is hard to calculate, but easy to verify.

Powcaptcha has a simply approach, it creates invisible puzzles that the client must solve. This can be as expensive as you want. Verifying the solved puzzle is
cheap on server side, so you don't waste server resources. It can even be used for machine-to-machine interactions, for example to protect your API.
Technically, Powcaptcha is not a captcha per-se, it's just a way to slow down attempts that can be made in a certain amount of time (Just a brute force
protection). But we still use the word captcha as almost everyone is used to it.

### Features

- Multiple architectures, cross-browser
    - Cross-Browser, no IE
    - PHP 8+
    - NodeJS 16+
    - Bun
    - Typescript
    - Javascript
    - GoLang
    - Help implement more...

- Blazing fast server-side verification, don't waste any server resources to verify the clients solution
- Variable challenge/puzzle difficulty for the client (up to multiple minutes challenge calculation if required)
- Super slim browser library (~3kB unzipped, ~2 kB zipped)
- No external dependencies, neither in the browser nor on the server
- No tracking, no ads, just open-source
- Self hosted

### Install

```
PHP: composer require brainfoolong/powcaptcha
NPM: npm install @brainfoolong/powcaptcha
BUN: bun install @brainfoolong/powcaptcha
Or download a release and use the required distribution file
```

### Live example

https://brainfoolong.github.io/powcaptcha/

### Usage

#### PHP Backend

```php
use BrainFooLong\Powcaptcha\Powcaptcha;
Powcaptcha::$verifiedSolutionsFolder = 'path-to-a-local-new-empty-temporary-directory';
Powcaptcha::$challengeSalt = 'yourrandomsecretsalt';
$puzzles = 50;
$difficulty = 4;
$challenge = Powcaptcha::createChallenge($puzzles, $difficulty); // send this to client
$solution = "comes from the client"; // to test, $solution = Powcaptcha::solveChallenge($challenge);
$verification = Powcaptcha::verifySolution($challenge, $solution); // 
if ($verification){
    // success
}
```

#### JS/TS Backend

```javascript
import Powcaptcha from 'powcaptcha'
// or const Powcaptcha = require('powcaptcha')
Powcaptcha.verifiedSolutionsFolder = 'path-to-a-local-new-empty-temporary-directory';
Powcaptcha.challengeSalt = 'yourrandomsecretsalt';
const puzzles = 50
const difficulty = 4
const challenge = Powcaptcha.createChallenge(puzzles, difficulty); // send this to client
const solution = "comes from the client"; // to test, const solution = await Powcaptcha.solveChallenge(challenge);
const verification = Powcaptcha.verifySolution(challenge, solution); // 
if (verification) {
  // success
}
```

#### Browser
> Browsers are only intended to use as a solver with the "-slim" library. If you need to create challenges in the browser, use the non slim browser library.
```html

<script src="powcaptcha-browser-slim.min.js"></script>
<progress max="100" value="0" id="powcaptcha_progress"></progress>
<input type="hidden" name="powcaptcha_solution" id="powcaptcha_solution">
<script>
    (async () => {
        const p = document.getElementById('powcaptcha_progress')
        const s = document.getElementById('powcaptcha_solution')
        const challenge = 'must come from backend -> Powcaptcha.createChallenge()'
        const solution = await Powcaptcha.solveChallenge(challenge, (progress) => {
            p.value = progress * 100
        })
        s.value = solution
    })()
</script>
```

#### Go Backend

```go
package main

import (
  "encoding/json"
  "fmt"
  "os"
  "path/filepath"
  "runtime"
  "time"
  "brainfoolong/powcaptcha"
)

func main() {
  pc := powcaptcha.Powcaptcha{
    VerifiedSolutionsFolder: "path-to-a-local-new-empty-temporary-directory",
    ChallengeSalt: "yourrandomsecretsalt",
  }
  puzzles := 50
  difficulty := 4    
  var challenge = pc.CreateChallenge(puzzles, difficulty) // send this to client
  var solution = "comes from the client"; // to test, var solution = pc.SolveChallenge(challenge)
  var verification = pc.VerifySolution(challenge, solution)
  if (verification){
    // success
  }
}
```

### In-Depth: How it works and how is the performance

Powcaptcha uses an own compute intensive but memory efficient hashing algorithm that is standalone and suitable for both servers and clients to try to provide a
good balance of performance on all devices. Slower devices such as old mobile phones are many times slower than newer devices or servers, so we had to use an
algorithm that also this devices can solve in a reasonable amount of time. Here are some timing tests we have done in mid 2025 with different devices.

The algorithm can be ported to any programming language, as it just do some basic math and bitshift operations and only requires 32bit integers to work with.

An already verified challenge cannot be verified again, it will be invalid.

All tests uses 1 challenge with 50 puzzles and a difficulty of 4. Times stated here can vary a lot, depending on the hardware. It's just to have some basic
numbers to see how it generally performs.

| Device                            | Solve Time | Verify Time |
|:----------------------------------|:-----------|:------------|
| PHP 8.4 i9-14900                  | ~260ms     | ~2ms        |
| Bun i9-14900                      | ~40ms      | ~2ms        |
| Node i9-14900                     | ~70ms      | ~2ms        |
| Golang i9-14900                   | ~30ms      | ~2ms        |
| Google Chrome i9-14900            | ~280ms     | -           |
| Samsung Galaxy A52s Google Chrome | ~800ms     | -           |
| Samsung S22 Google Chrome         | ~720ms     | -           |
| Samsung S22 Samsung Browser       | ~1100ms    | -           |
| Pixel 6 Google Chrome             | ~680ms     | -           |
| Pixel 9 Google Chrome             | ~680ms     | -           |
| iPhone XR Safari                  | ~450ms     | -           |
| iPhone 15 Safari                  | ~220ms     | -           |
