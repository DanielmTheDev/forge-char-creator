import { test, expect } from '@playwright/test';

test.describe('Forge Character Creator Test Suite', () => {
  // Give Foundry time to boot, load canvas, and run long combat sequences
  test.setTimeout(120000); 

  test('Execute Native Foundry Suite', async ({ page }) => {
    
    // 1. Navigate to local Foundry instance
    await page.goto('http://localhost:30000');
    
    // 2. Handle optional Setup screen (if world isn't booted)
    if (page.url().includes('/setup')) {
      console.log('On setup page. Launching world...');
      await page.evaluate(async () => {
         await fetch('/setup', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ action: 'launchWorld', world: 'ishait' }) // defaults to your dev world
         });
      });
      await page.waitForTimeout(2000);
      await page.goto('http://localhost:30000/join');
    }

    // 3. Log in as Gamemaster
    console.log('Logging in...');
    await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
    await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
    await page.click('button[name="join"]');
    await page.waitForNavigation({ timeout: 15000 });

    // 4. Wait for the Foundry Canvas and Modules to load
    console.log('Waiting for Foundry UI...');
    await page.waitForSelector('#ui-middle', { timeout: 30000 });
    await page.waitForTimeout(5000); // Give macro/Midi hooks time to attach

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
