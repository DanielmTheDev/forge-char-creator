// Shared Foundry boot+login for verify specs. Mirrors the sequence in
// tests/module.spec.js; centralized here so the gate and any future combat
// spec don't each re-implement it.
// FOUNDRY_PORT overrides the default 30000 (content-verify.sh passes the same value
// to Foundry's --port). Needed when something else already holds 30000 — e.g. a
// running JetBrains IDE's cef_server picks that port and Foundry then dies with
// EADDRINUSE.
const BASE = `http://localhost:${process.env.FOUNDRY_PORT ?? 30000}`;

export async function bootFoundry(page) {
  await page.goto(BASE);

  if (page.url().includes('/setup')) {
    await page.evaluate(async () => {
      await fetch('/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launchWorld', world: 'ishait' }),
      });
    });
    await page.waitForTimeout(2000);
    await page.goto(`${BASE}/join`);
  }

  await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
  await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
  await page.click('button[name="join"]');
  await page.waitForNavigation({ timeout: 15000 });
  await page.waitForSelector('#ui-middle', { timeout: 30000 });
  // #ui-middle can render before game.ready — at which point game.combats/scenes/actors
  // are still undefined and any page.evaluate touching them throws "coll is not iterable".
  // Wait for the ready flag so every downstream evaluate sees populated collections.
  await page.waitForFunction(() => globalThis.game?.ready === true, { timeout: 60000 });
  await page.waitForTimeout(5000); // let module/midi hooks attach
  page.on('console', m => console.log(`[Foundry] ${m.text()}`));
}
