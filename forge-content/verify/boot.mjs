// Shared Foundry boot+login for verify specs. Mirrors the sequence in
// tests/module.spec.js; centralized here so the gate and any future combat
// spec don't each re-implement it.
export async function bootFoundry(page) {
  await page.goto('http://localhost:30000');

  if (page.url().includes('/setup')) {
    await page.evaluate(async () => {
      await fetch('/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launchWorld', world: 'ishait' }),
      });
    });
    await page.waitForTimeout(2000);
    await page.goto('http://localhost:30000/join');
  }

  await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
  await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
  await page.click('button[name="join"]');
  await page.waitForNavigation({ timeout: 15000 });
  await page.waitForSelector('#ui-middle', { timeout: 30000 });
  await page.waitForTimeout(5000); // let module/midi hooks attach
  page.on('console', m => console.log(`[Foundry] ${m.text()}`));
}
