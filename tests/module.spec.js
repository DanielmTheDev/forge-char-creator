import { test, expect } from './helpers/fixtures.js';

test.describe('Forge Character Creator Test Suite', () => {
  // Give Foundry time to boot, load canvas, and run long combat sequences.
  // The native suite is ~20 tests, several of which import into a compendium and
  // one of which runs a full midi combat, so this needs a lot of headroom.
  test.setTimeout(300000);

  test('Execute Native Foundry Suite', async ({ gmPage: page }) => {
    

    // Forward browser console to terminal for visibility
    page.on('console', msg => {
      const txt = msg.text();
      if (!txt.includes('Retrieved and compiled template') && !txt.includes('GL Driver Message')) {
        console.log(`[Foundry] ${txt}`);
      }
    });

    // 5. Execute the internal test suite
    console.log('Triggering internal module suite...');
    const result = await page.evaluate(async () => {
      if (typeof ForgeTestingSuite === 'undefined') {
        return { success: false, error: "ForgeTestingSuite not found. Is the module active?" };
      }
      
      try {
        console.group = console.log;
        console.groupEnd = () => {};
        
        await ForgeTestingSuite.runAll();
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }).catch(e => {
        // Handle navigation resets from the Omega combat simulator pushing new scenes/combats
        if (e.message.includes('Execution context was destroyed')) {
           return { success: false, error: 'Context destroyed. (Likely an async issue in #testCombatEngineIntegration)' };
        }
        return { success: false, error: e.message };
    });

    // 6. Assert success
    expect(result.success, `Foundry test suite failed: ${result.error}`).toBeTruthy();
  });
});
