# Agent Instructions: Testing Infrastructure

## Overview
This project uses a hybrid testing architecture to test Foundry VTT module logic.
1. **Native Suite (`scripts/tests/index.js`)**: Contains the actual test assertions. It runs directly inside the Foundry browser client, allowing synchronous access to Foundry's DB, UI classes, and internal APIs (`Hooks`, `Item.create`, `MidiQOL`).
2. **Playwright Runner (`tests/module.spec.js`)**: An external test runner that boots a headless browser, launches the world, logs in as Gamemaster, waits for the canvas to load, and invokes `ForgeTestingSuite.runAll()` via `page.evaluate()`.

## How to Run Tests
The repository includes an automated script that handles the entire server lifecycle and test execution.

Run the following from the repository root:
```bash
./test.sh
```

**What this does:**
1. Starts the local Foundry VTT server in the background using `FoundryVTT-Linux-13.351/resources/app/main.js`.
2. Waits for the server to initialize.
3. Executes the Playwright test suite (`npx playwright test`).
4. Automatically catches exit codes and safely terminates the Foundry server background process upon completion.

*(Note: If you already have the server running manually, you can alternatively just run `npm run test`.)*

## Adding Tests
Add new test methods to `ForgeTestingSuite` in `scripts/tests/index.js` and call them sequentially inside `runAll()`.

## Known Issues & Caveats
- **Navigation Context Destruction**: Tests that heavily manipulate scenes or combat encounters (like the Omega Combat Simulator) may cause Foundry to perform a hard navigation/refresh. This destroys the Playwright `page.evaluate` execution context. If this happens, the runner catches the `Execution context was destroyed` error. 
- **Timeouts**: Foundry canvas/module initialization is slow. The Playwright runner has generous timeouts built in. Avoid shortening them.
