del "..\tmp\*.pow"


docker compose run --remove-orphans php php /powcaptcha/tests/tests-php.php
docker compose run --remove-orphans nodejs node /powcaptcha/tests/tests-node.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-node.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-ts.ts
docker compose run --remove-orphans -w /powcaptcha/tests golang /usr/local/go/bin/go run tests-go.go

docker compose run --remove-orphans php php /powcaptcha/tests/tests-php-cross.php
docker compose run --remove-orphans nodejs node /powcaptcha/tests/tests-node-cross.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-node-cross.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-ts-cross.ts
docker compose run --remove-orphans -w /powcaptcha/tests golang /usr/local/go/bin/go run tests-go-cross.go

docker compose run --remove-orphans playwright bash /powcaptcha/tests/playwright-tests.sh