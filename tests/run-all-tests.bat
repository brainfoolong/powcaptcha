del "..\tmp\*.pow"

docker compose run --remove-orphans php php /powcaptcha/tests/tests.php
docker compose run --remove-orphans nodejs node /powcaptcha/tests/tests-server-node.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-server-node.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-server-ts.ts
docker compose run --remove-orphans -w /powcaptcha/tests golang /usr/local/go/bin/go run tests.go

docker compose run --remove-orphans php php /powcaptcha/tests/tests-cross.php
docker compose run --remove-orphans nodejs node /powcaptcha/tests/tests-server-node-cross.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-server-node-cross.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-server-ts-cross.ts
docker compose run --remove-orphans -w /powcaptcha/tests golang /usr/local/go/bin/go run tests-cross.go