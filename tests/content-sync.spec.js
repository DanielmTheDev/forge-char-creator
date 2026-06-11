import { test, expect } from '@playwright/test';

// E2E for forge-content runtime sync against the LOCAL dist export (no GitHub):
// manifestUrl override points at modules/forge-content/dist/index.json, which
// Foundry serves from the symlinked repo. Run `npm run content:dist` first.
test.describe('forge-content runtime sync', () => {
  test.setTimeout(120000);

  test('syncs dist docs into module packs, idempotent on second run', async ({ page }) => {

    await page.goto('http://localhost:30000');
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

    console.log('Logging in...');
    await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
    await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
    await page.click('button[name="join"]');
    await page.waitForNavigation({ timeout: 15000 });
    await page.waitForSelector('#ui-middle', { timeout: 30000 });
    await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 30000 });
    await page.waitForTimeout(3000);

    const first = await page.evaluate(async () => {
      await game.settings.set('forge-content', 'manifestUrl', 'modules/forge-content/dist/index.json');
      return game.modules.get('forge-content').api.syncContent();
    });
    console.log('First sync:', JSON.stringify(first));
    expect(first.failed ?? 0).toBe(0);

    // Second run must be a no-op (hash stamps now present in the packs).
    const second = await page.evaluate(() => game.modules.get('forge-content').api.syncContent());
    console.log('Second sync:', JSON.stringify(second));
    expect(second.upserts).toBe(0);
    expect(second.deletes ?? 0).toBe(0);
    expect(second.unchanged).toBeGreaterThan(0);

    // Spot-check a synced doc: recharge fix + hash stamp landed in the pack.
    const mark = await page.evaluate(async () => {
      const pack = game.packs.get('forge-content.forge-abilities');
      const docs = await pack.getDocuments();
      const item = docs.find(d => d.name === "Squire's Mark");
      const activity = item?.system.activities.contents[0];
      return {
        srcHash: item?.flags['forge-content']?.srcHash ?? null,
        consumesUses: activity?.consumption.targets.some(t => t.type === 'itemUses') ?? false,
      };
    });
    expect(mark.srcHash).toMatch(/^[0-9a-f]{64}$/);
    expect(mark.consumesUses).toBeTruthy();

    console.log('Sync e2e assertions complete.');
  });
});
