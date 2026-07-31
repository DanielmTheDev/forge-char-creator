#!/bin/bash
# Boot local Foundry, run the forge-content functional gate, kill server.
# Run before pushing content. Non-zero exit = do not publish.
# DEFAULT (no arg) is CHANGED-ONLY: only docs whose gate hash moved since their
# last green run re-test (markers in gitignored .gate-green.json; see
# forge-content/verify/stale.mjs). Engine/resolver code or dnd5e/midi/dae/
# times-up version changes mark EVERYTHING stale. Nothing stale = exit 0
# without booting Foundry.
#   npm run content:verify              # changed-only (default)
#   npm run content:verify -- --full    # force the full sweep (FC_FULL=1)
#   npm run content:verify -- emberlight          # scoped filter (always runs)
#   npm run content:verify -- caelnor,nine,thord  # comma = match ANY part
if [ "$1" = "--full" ]; then
  export FC_FULL=1; echo "FULL gate: FC_FULL=1"
elif [ -n "$1" ]; then
  export FC_ONLY="$1"; echo "Scoped gate: FC_ONLY=$1"
elif [ -z "$FC_FULL" ]; then
  STALE=$(node forge-content/verify/stale.mjs --list) || exit 1
  if [ -z "$STALE" ]; then
    echo "✅ gate: nothing stale (.gate-green.json current) — use -- --full to force"
    exit 0
  fi
  echo "Stale docs:"; echo "$STALE"
fi
# Port 30000 is Foundry's default but not always free — a running JetBrains IDE's
# cef_server grabs it too, and Foundry then dies with EADDRINUSE. Override with
# FOUNDRY_PORT=NNNN (boot.mjs reads the same var for the Playwright URL).
FOUNDRY_PORT="${FOUNDRY_PORT:-30000}"
export FOUNDRY_PORT
if ss -ltn 2>/dev/null | grep -q ":${FOUNDRY_PORT} "; then
  echo "ERROR: port ${FOUNDRY_PORT} is already in use — free it or run with FOUNDRY_PORT=<other port>" >&2
  ss -ltnp 2>/dev/null | grep ":${FOUNDRY_PORT} " >&2
  exit 1
fi

echo "Starting Foundry VTT Server on port ${FOUNDRY_PORT}..."
node FoundryVTT-Linux-13.351/resources/app/main.js --dataPath=$PWD/FoundryData --port=$FOUNDRY_PORT > /tmp/foundry-content-verify.log 2>&1 &
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
