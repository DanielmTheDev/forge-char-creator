// Separate playwright config for the forge-content functional gate, so it
// runs independently of the forge-char-creator module suite (./tests).
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './forge-content/verify',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    viewport: { width: 1440, height: 900 },
    // Headed so Foundry's canvas fully initializes (canvas.ready + interactive
    // layers) — required for token targeting that real midi-qol workflows need.
    // Runs under a virtual display via xvfb-run (see content-verify.sh).
    headless: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
