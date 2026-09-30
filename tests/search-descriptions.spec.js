import { test, expect } from './helpers/fixtures.js';
import { openWizard } from './helpers/foundry.js';

test.describe('Item Search Descriptions', () => {
  test.setTimeout(120000);

  test('Should show compendium descriptions in the search picker and cache them', async ({ gmPage: page }) => {


    // 5. Open Character Creator directly
    await openWizard(page); // first render can take >10 s (compendium indexes)
    await page.locator('.forge-char-creator .fc-nav-btn', { hasText: 'Features' }).click();

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
      // Count only our module's loads: dnd5e (spell-list registry) and DAE also call
      // fromUuid in the background right after boot, which made this count flaky.
      window.fromUuid = async (...args) => {
        if (new Error().stack.includes("/modules/forge-char-creator/")) window.__forgeUuidLoads++;
        return orig(...args);
      };
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
