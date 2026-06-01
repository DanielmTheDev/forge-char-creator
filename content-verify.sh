#!/bin/bash
# Boot local Foundry, run the forge-content functional gate, kill server.
# Run before pushing content. Non-zero exit = do not publish.
echo "Starting Foundry VTT Server..."
node FoundryVTT-Linux-13.351/resources/app/main.js --dataPath=$PWD/FoundryData > /tmp/foundry-content-verify.log 2>&1 &
SERVER_PID=$!
cleanup() { echo "Stopping Foundry (PID $SERVER_PID)..."; kill $SERVER_PID 2>/dev/null || true; }
trap cleanup EXIT

echo "Waiting 12s for server to initialize..."
sleep 12

echo "Running forge-content verify..."
npx playwright test --config playwright.content.config.js
exit $?
