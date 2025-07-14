# POWCAPTCHA

`Proof of Work Captcha/Challenge/Brute Force protection` for your browser and server, without any required user interaction. As of todays technology and
capability of AI that can solve any "i am human" captcha faster than any human on earth, protecting backends is now different from what we are all used to from
the past.

Having a captcha that need to be solved by hand has absolutely no advantage today nor it can proove the existence of humans in the progress. Instead, if you
wish to protect your backend from to much requests in a short period (brute force), you need something that is hard to compute, but easy to verify.

POWCAPTCHA has a simply approach, it creates invisible puzzles that the client must solve. This can be as expensive as you want. Verifying the solved puzzle is
cheap on server side, so you don't waste server resources. It can even be used for machine-to-machine interactions, for example to protect your API.
Technically, POWCAPTCHA is no captcha per-se, it's just a way to slow down attempts that can be made in a certain amount of time (Just a brute force
protection). But we still use the word captcha as almost everyone is used to it.

### Features

- Cross-Browser [(Check Support)](https://caniuse.com/mdn-api_subtlecrypto_digest)
- Multiple programming languages supported (As of now PHP, TS and JS)
- Invisible by default, but you can implement your own progress bar or solving strategy
- Fast Server-Side verification and variable challenge difficulty for the client
- Super slim browser library
- No external dependencies, not in the browser, not on the server
- No tracking, no ads, just open-source
- Self hosted
