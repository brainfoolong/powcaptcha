del "..\tmp\*.pow"

docker compose run --remove-orphans php php /powcaptcha/tests/tests.php
docker compose run --remove-orphans nodejs node /powcaptcha/tests/tests-server-node.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-server-node.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-server-ts.ts

docker compose run --remove-orphans php php /powcaptcha/tests/tests-cross.php
docker compose run --remove-orphans nodejs node /powcaptcha/tests/tests-server-node-cross.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-server-node-cross.js
docker compose run --remove-orphans bun bun /powcaptcha/tests/tests-server-ts-cross.ts