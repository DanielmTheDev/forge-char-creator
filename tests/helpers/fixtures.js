import { test as base, expect } from '@playwright/test';
import { applyTestPageState, bootFoundry, closeForgeApps } from './foundry.js';
import { TEST_NAME_RE } from './sweep.js';

const VIEWPORT = { width: 1440, height: 900 };

// One logged-in GM page per worker (workers: 1 → one login per run).
export const test = base.extend({
  gmPageHolder: [async ({ browser }, use) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const holder = { page: await context.newPage() };
    await bootFoundry(holder.page);
    await use(holder);
    await context.close();
  }, { scope: 'worker' }],

  // Per test: hand out the shared page; re-login if a previous test killed or reloaded it; clean up after.
  gmPage: async ({ gmPageHolder }, use) => {
    const state = gmPageHolder.page.isClosed() ? null : await gmPageHolder.page.evaluate(() =>
      ({ ready: globalThis.game?.ready === true, prepared: window.__forgeTestPage === true })).catch(() => null);
    if (!state?.ready) {
      if (gmPageHolder.page.isClosed()) gmPageHolder.page = await gmPageHolder.page.context().newPage();
      await bootFoundry(gmPageHolder.page);
    } else if (!state.prepared) {
      await applyTestPageState(gmPageHolder.page); // a previous test reloaded the page
    }
    const page = gmPageHolder.page;
    await use(page);
    // Listeners a test added (pipeConsole etc.) must not pile up on the shared page.
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    if (page.isClosed()) return;
    await page.setViewportSize(VIEWPORT).catch(() => {});
    await closeForgeApps(page);
    await page.evaluate(async (src) => {
      const re = new RegExp(src);
      for (const t of [...(game.user.targets ?? [])]) t.setTarget(false, { releaseOthers: false });
      for (const c of [...game.combats])
        if (c.combatants.size && c.combatants.every(x => re.test(x.name ?? ''))) await c.delete();
    }, TEST_NAME_RE.source).catch(() => {});
  },
});
export { expect };
