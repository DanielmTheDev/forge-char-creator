import { test, expect } from '@playwright/test';

// E2E for forge-content runtime sync against the LOCAL dist export (no GitHub):
// manifestUrl override points at modules/forge-content/dist/index.json, which
// Foundry serves from the symlinked repo. Run `npm run content:dist` first.
test.describe('forge-content runtime sync', () => {
  test.setTimeout(240000);

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
      // join + drain any auto-sync still running from world-ready before
      // resetting state (concurrent runs are guarded, but the reset must not
      // land mid-run)
      await game.modules.get('forge-content').api.syncContent().catch(() => {});
      await game.settings.set('forge-content', 'manifestUrl', 'modules/forge-content/dist/index.json');
      await game.settings.set('forge-content', 'assetState', {}); // force asset re-upload path
      return game.modules.get('forge-content').api.syncContent();
    });
    console.log('First sync:', JSON.stringify(first));
    expect(first.failed ?? 0).toBe(0);
    expect(first.assetsFailed ?? 0).toBe(0);
    expect(first.assetsUploaded).toBeGreaterThanOrEqual(2); // thrall portrait + token crop

    // Second run must be a no-op (hash stamps now present in packs + assetState).
    const second = await page.evaluate(() => game.modules.get('forge-content').api.syncContent());
    console.log('Second sync:', JSON.stringify(second));
    expect(second.upserts).toBe(0);
    expect(second.deletes ?? 0).toBe(0);
    expect(second.assetsUploaded ?? 0).toBe(0);
    expect(second.unchanged).toBeGreaterThan(0);

    // Synced docs must point at the UPLOADED asset copies, and those files must
    // exist server-side (FilePicker browse) — this is the Forge-image story.
    const thrall = await page.evaluate(async () => {
      const pack = game.packs.get('forge-content.forge-npcs');
      const docs = await pack.getDocuments();
      const t = docs.find(d => d.name === 'Unchained Thrall');
      const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
      const dir = await FP.browse('data', 'forge-content/assets/tokens');
      return { img: t?.img, token: t?.prototypeToken?.texture?.src, files: dir.files };
    });
    console.log('Thrall after sync:', JSON.stringify(thrall));
    // Content-addressed upload names: <name>.<hash8>.<ext> (cache busting)
    const imgRe = /^forge-content\/assets\/tokens\/unchained-thrall\.[0-9a-f]{8}\.png$/;
    const tokenRe = /^forge-content\/assets\/tokens\/unchained-thrall-token\.[0-9a-f]{8}\.png$/;
    expect(thrall.img).toMatch(imgRe);
    expect(thrall.token).toMatch(tokenRe);
    expect(thrall.files.some(f => imgRe.test(f))).toBeTruthy();
    expect(thrall.files.some(f => tokenRe.test(f))).toBeTruthy();

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
