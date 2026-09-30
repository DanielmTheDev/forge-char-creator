// Shared Playwright helpers for the forge-char-creator suite.
export const BASE = `http://localhost:${process.env.FOUNDRY_PORT ?? 30000}`;

export async function makeNotificationsClickThrough(page) {
  // Headless has no GPU: Foundry pins permanent warnings over the top of the screen
  // (and may add more later) — make them click-through instead of removing them once.
  await page.addStyleTag({ content: "#notifications, #notifications * { pointer-events: none !important; }" });
}

export async function bootFoundry(page) {
  await page.goto(BASE);
  if (page.url().includes('/setup')) {
    await page.evaluate(async () => {
      await fetch('/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launchWorld', world: 'ishait' }) });
    });
    await page.waitForTimeout(2000);
    await page.goto(`${BASE}/join`);
  }
  await page.waitForSelector('select[name="userid"]', { timeout: 15000 });
  await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
  await page.click('button[name="join"]');
  await page.waitForNavigation({ timeout: 20000 });
  await page.waitForSelector('#ui-middle', { timeout: 30000 });
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60000 });
  await makeNotificationsClickThrough(page);
  await page.waitForTimeout(2000); // module/midi hooks attach
}

export async function closeForgeApps(page) {
  await page.evaluate(() => {
    for (const a of [...foundry.applications.instances.values()]) if (a.id?.startsWith("forge-")) a.close();
  }).catch(() => {});
}

export async function openBuilder(page, initialState = {}) {
  await page.evaluate(async (s) => {
    const { EffectCreatorApp } = await import("./modules/forge-char-creator/scripts/effect-creator.js");
    await new EffectCreatorApp({}, s).render(true);
  }, initialState);
  await page.waitForSelector('.forge-effect-creator .fc-step.active');
  return page.locator('.forge-effect-creator');
}

export async function openWizard(page) {
  await page.evaluate(async () => {
    const { CharCreatorApp } = await import("./modules/forge-char-creator/scripts/app.js");
    await new CharCreatorApp().render({ force: true });
  });
  await page.waitForSelector('#forge-char-creator-app .fc-step.active');
  return page.locator('#forge-char-creator-app');
}

export function pipeConsole(page, re = /SMOKE/) {
  const fn = m => { const t = m.text(); if (re.test(t)) console.log(`[Foundry] ${t}`); };
  page.on('console', fn);
  return () => page.off('console', fn);
}
