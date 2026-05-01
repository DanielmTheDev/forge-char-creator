import { test, expect } from '@playwright/test';

test.describe('Aura Ring Configuration Test Suite', () => {
  test.setTimeout(120000);

  test('Should open char creator, enable aura ring, configure options, and apply to token flags', async ({ page }) => {
    
    // 1. Navigate to local Foundry instance
    await page.goto('http://localhost:30000');
    
    // 2. Handle optional Setup screen (if world isn't booted)
    if (page.url().includes('/setup')) {
      console.log('On setup page. Launching world...');
      await page.evaluate(async () => {
         await fetch('/setup', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ action: 'launchWorld', world: 'ishait' }) // defaults to dev world
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
    await page.waitForTimeout(5000); // Wait for modules

    // 5. Open Forge Hub and Character Creator
    console.log('Opening Forge Hub...');
    await page.click('#forge-hub-fab');
    await page.waitForSelector('.forge-hub-app', { timeout: 10000 });
    
    // Click on the Character Creator button in the Hub
    // Let's check how the Hub renders buttons. Or just instantiate the app via evaluate.
    await page.evaluate(async () => {
       const hub = Object.values(ui.windows).find(w => w.title.includes("Forge Hub") || w.id === "forge-hub");
       if (hub) hub.close();
       
       // Force open char creator directly to be safe
       const { CharCreatorApp } = await import("./modules/forge-char-creator/scripts/app.js");
       new CharCreatorApp().render({ force: true });
    });

    await page.waitForSelector('.forge-char-creator', { timeout: 10000 });

    // 6. Fill out the form
    await page.fill('#charName', 'Aura Test Bot');

    // 7. Enable Aura Ring
    const enableAuraCheckbox = await page.locator('#enableAura');
    await enableAuraCheckbox.check();

    // The options should be visible now
    const optionsVisible = await page.evaluate(() => {
      return document.getElementById('auraOptions').style.display !== 'none';
    });
    expect(optionsVisible).toBeTruthy();

    // 8. Configure Aura Options
    await page.fill('#auraRadius', '30');
    // For color, fill the text input which updates the color input
    await page.fill('#auraColorText', '#00ff00');
    await page.dispatchEvent('#auraColorText', 'input');
    
    await page.selectOption('#auraVisibility', 'GAMEMASTER');
    await page.check('#auraGrid');

    // 9. Click Create
    await page.click('button[data-action="createNPC"]');

    // Wait for the actor to be created.
    // The macro notifies via ui.notifications.info(`Successfully created ${actorName}!`);
    await page.waitForTimeout(3000);

    // 10. Verify Actor Flags
    const tokenFlags = await page.evaluate(async () => {
      const actor = game.actors.find(a => a.name === "Aura Test Bot");
      if (!actor) return null;
      return actor.prototypeToken.flags["token-aura-ring"];
    });

    expect(tokenFlags).not.toBeNull();
    const auras = tokenFlags["aura-rings"];
    expect(auras.length).toBe(1);
    
    const aura = auras[0];
    expect(aura.radius).toBe(30);
    expect(aura.stroke_colour).toBe('#00ff00');
    expect(aura.visibility).toBe('GAMEMASTER');
    expect(aura.use_grid_shapes).toBe(true);
    
    console.log("Successfully validated token aura flags.");
  });
});
