# Agent Instructions: Testing Infrastructure

## Overview
This project uses a hybrid testing architecture to test Foundry VTT module logic.
1. **Native Suite (`scripts/tests/index.js`)**: Contains the actual test assertions. It runs directly inside the Foundry browser client, allowing synchronous access to Foundry's DB, UI classes, and internal APIs (`Hooks`, `Item.create`, `MidiQOL`).
2. **Playwright Runner (`tests/module.spec.js`)**: An external test runner that boots a headless browser, launches the world, logs in as Gamemaster, waits for the canvas to load, and invokes `ForgeTestingSuite.runAll()` via `page.evaluate()`.

## How to Run Tests
1. Ensure the local Foundry VTT server is running.
2. Run `npm run test` from the repository root.

## Adding Tests
Add new test methods to `ForgeTestingSuite` in `scripts/tests/index.js` and call them sequentially inside `runAll()`.

## Known Issues & Caveats
- **Navigation Context Destruction**: Tests that heavily manipulate scenes or combat encounters (like the Omega Combat Simulator) may cause Foundry to perform a hard navigation/refresh. This destroys the Playwright `page.evaluate` execution context. If this happens, the runner catches the `Execution context was destroyed` error. 
- **Timeouts**: Foundry canvas/module initialization is slow. The Playwright runner has generous timeouts built in. Avoid shortening them.
