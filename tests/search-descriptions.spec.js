import { test, expect } from '@playwright/test';

test.describe('Item Search Descriptions', () => {
  test.setTimeout(120000);

  test('Should show compendium descriptions in the search picker and cache them', async ({ page }) => {

    // 1. Navigate to local Foundry instance
    await page.goto('http://localhost:30000');

    // 2. Handle optional Setup screen (if world isn't booted)
    if (page.url().includes('/setup')) {
      console.log('On setup page. Launching world...');
      await page.evaluate(async () => {
         await fetch('/setup', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ action: 'launchWorld', world: 'ishait' })
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
    await page.waitForTimeout(5000);

    // 5. Open Character Creator directly
    await page.evaluate(async () => {
       const { CharCreatorApp } = await import("./modules/forge-char-creator/scripts/app.js");
       new CharCreatorApp().render({ force: true });
    });
    await page.waitForSelector('.forge-char-creator', { timeout: 10000 });

    // 6. Search for a spell that definitely has description text in the SRD packs
    const searchInput = page.locator('#itemSearchQuery');
    await searchInput.click();
    await searchInput.fill('guiding bolt');
    await page.waitForSelector('#itemSearchResults li[data-uuid]', { timeout: 15000 });

    // 7. The first rows are filled eagerly — description text must appear
    const firstRow = page.locator('#itemSearchResults li[data-uuid]').first();
    await expect(firstRow.locator('.item-desc')).not.toBeEmpty({ timeout: 15000 });
    const descText = (await firstRow.locator('.item-desc').textContent()).trim();
    expect(descText).not.toBe('Loading…');
    expect(descText).not.toBe('(no description)');
    expect(descText.length).toBeGreaterThan(20);

    // Item type badge comes from the index (free) — spell rows must be labelled
    const badge = await firstRow.locator('.item-type').textContent();
    expect(badge.trim()).toBe('spell');

    // 8. The description matches the source document, not some generated summary
    const uuid = await firstRow.getAttribute('data-uuid');
    const sourceText = await page.evaluate(async (u) => {
      const doc = await fromUuid(u);
      const raw = doc?.system?.description?.value ?? "";
      return new DOMParser().parseFromString(raw, "text/html").body.textContent
        .replace(/\s+/g, " ").trim();
    }, uuid);
    expect(sourceText.length).toBeGreaterThan(20);
    // The row clamps visually via CSS, not by truncating the string.
    expect(sourceText.startsWith(descText.slice(0, 40))).toBeTruthy();

    // 9. Re-running the same search must not re-fetch — cache is per app instance
    const loads = await page.evaluate(() => {
      window.__forgeUuidLoads = 0;
      const orig = window.fromUuid;
      window.fromUuid = async (...args) => { window.__forgeUuidLoads++; return orig(...args); };
      return true;
    });
    expect(loads).toBeTruthy();

    await searchInput.fill('');
    await searchInput.fill('guiding bolt');
    await page.waitForSelector('#itemSearchResults li[data-uuid]', { timeout: 15000 });
    await expect(firstRow.locator('.item-desc')).not.toBeEmpty({ timeout: 15000 });
    await page.waitForTimeout(1000);
    const refetches = await page.evaluate(() => window.__forgeUuidLoads);
    expect(refetches).toBe(0);

    // 10. Selecting the item carries the description into the bin tooltip
    await firstRow.click();
    const tooltip = await page.evaluate(() =>
      document.querySelector('#selectedItemsBin .item-pill')?.getAttribute('title') ?? "");
    expect(tooltip.length).toBeGreaterThan(20);

    console.log('Search description assertions complete.');
  });
});
