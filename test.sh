#!/bin/bash

# Start Foundry server in the background
echo "Starting Foundry VTT Server..."
node FoundryVTT-Linux-13.351/resources/app/main.js --dataPath=$PWD/FoundryData &
SERVER_PID=$!

# Cleanup function to strictly kill the server when the script exits (on success or failure)
cleanup() {
  echo "Stopping Foundry VTT Server (PID: $SERVER_PID)..."
  kill $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

# Wait for the server to boot up
echo "Waiting 10 seconds for server to initialize..."
sleep 10

# Run tests and capture exit code
echo "Running Playwright Tests..."
npx playwright test
TEST_EXIT_CODE=$?

# Exit with the test's exit code
exit $TEST_EXIT_CODE
