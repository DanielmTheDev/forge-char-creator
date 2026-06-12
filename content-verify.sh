#!/bin/bash
# Boot local Foundry, run the forge-content functional gate, kill server.
# Run before pushing content. Non-zero exit = do not publish.
# Optional arg: doc-name filter -> only matching docs run (fast iteration).
# Comma-separate to scope a SET (matches ANY part, case-insensitive substring):
#   npm run content:verify -- emberlight
#   npm run content:verify -- caelnor,nine,thord
# FULL run (no arg) stays the pre-push discipline — cross-doc state leaks are
# real (active-scene bug, stale-combat leak) and only the full sweep finds them.
if [ -n "$1" ]; then export FC_ONLY="$1"; echo "Scoped gate: FC_ONLY=$1"; fi
echo "Starting Foundry VTT Server..."
node FoundryVTT-Linux-13.351/resources/app/main.js --dataPath=$PWD/FoundryData > /tmp/foundry-content-verify.log 2>&1 &
SERVER_PID=$!
cleanup() { echo "Stopping Foundry (PID $SERVER_PID)..."; kill $SERVER_PID 2>/dev/null || true; }
trap cleanup EXIT

echo "Waiting 12s for server to initialize..."
sleep 12

echo "Running forge-content verify (headed under virtual display)..."
# Headed Chromium needs a display; xvfb-run provides a virtual one so Foundry's
# canvas fully initializes (required for token targeting in real midi workflows).
if command -v xvfb-run >/dev/null 2>&1; then
  xvfb-run -a --server-args="-screen 0 1440x900x24" npx playwright test --config playwright.content.config.js
else
  echo "WARNING: xvfb-run not found — running without virtual display (T3 combat will fail)."
  echo "Install with: sudo apt-get install -y xvfb"
  npx playwright test --config playwright.content.config.js
fi
exit $?
