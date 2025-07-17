cd /powcaptcha
npm install -y
npx --yes playwright install
cd tests
node http-server-for-tests.js &
cd ..
npx playwright test