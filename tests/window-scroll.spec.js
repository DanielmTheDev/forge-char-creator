import { test, expect } from '@playwright/test';
import { bootFoundry } from './helpers/foundry.js';

/**
 * Regression guard: the wizard windows must scroll their body and keep the
 * create button reachable. Core Foundry `.window-content` is `overflow: hidden`
 * and `.application` is capped by `max-height`, so a non-shrinking part root
 * silently clips its bottom (including the Create button).
 */
test.describe('Window scrolling', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await bootFoundry(page);

    // Short viewport so the form definitely overflows the window
    await page.setViewportSize({ width: 1280, height: 600 });
  });

  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} appClass  Exported app class name in scripts/app.js / effect-creator.js
   * @param {string} module    Module file exporting it
   * @param {string} rootSel   Window root selector
   */
  async function assertScrolls(page, appClass, module, rootSel, prep = null) {
    await page.evaluate(async ([appClass, module]) => {
      const mod = await import(`./modules/forge-char-creator/scripts/${module}`);
      new mod[appClass]().render({ force: true });
    }, [appClass, module]);

    await page.waitForSelector(rootSel, { timeout: 10000 });
    await page.waitForTimeout(500); // let position/layout settle

    const body = page.locator(`${rootSel} .forge-form-body`);
    const button = page.locator(`${rootSel} .form-footer button`);

    // Footer button visible before scrolling — i.e. not clipped off the bottom
    await expect(button).toBeInViewport();

    if (prep) await prep();
    // The form is split into steps; scroll-test the tallest one.
    const navs = page.locator(`${rootSel} .fc-nav-btn`);
    let best = -1, bestH = 0;
    for (let i = 0; i < await navs.count(); i++) {
      await navs.nth(i).click();
      const h = await body.evaluate(el => el.scrollHeight);
      if (h > bestH) { bestH = h; best = i; }
    }
    if (best >= 0) await navs.nth(best).click();

    // Body actually overflows and is scrollable
    const metrics = await body.evaluate(el => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY
    }));
    console.log(`${rootSel} body metrics:`, metrics);
    expect(metrics.overflowY).toBe('auto');
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

    // Scrolling moves the body, not the window
    const scrollTop = await body.evaluate(el => {
      el.scrollTop = el.scrollHeight;
      return el.scrollTop;
    });
    expect(scrollTop).toBeGreaterThan(0);

    // Footer stays put after scrolling
    await expect(button).toBeInViewport();
  }

  test('Character Creator body scrolls and Create button stays visible', async ({ page }) => {
    // Steps keep each page short; a small screen still has to scroll the body, not clip it.
    await page.setViewportSize({ width: 1280, height: 420 });
    await assertScrolls(page, 'CharCreatorApp', 'app.js', '.forge-char-creator');
  });

  test('Effect Creator body scrolls and Create button stays visible', async ({ page }) => {
    await assertScrolls(page, 'EffectCreatorApp', 'effect-creator.js', '.forge-effect-creator');
  });

  // `min-height: 0` on a `flex-basis: 0%` child collapses auto-height windows to
  // nothing. Guard both the tall-viewport wizard and the (auto-height) hub.
  test('Windows do not collapse in a tall viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });

    await page.evaluate(async () => {
      const mod = await import('./modules/forge-char-creator/scripts/forge-hub.js');
      await new mod.ForgeHubApp().render({ force: true });
    });
    await page.waitForSelector('.forge-hub-app', { timeout: 10000 });
    const hub = page.locator('.forge-hub-app .forge-hub-container');
    await expect(hub).toBeVisible();
    expect(await hub.evaluate(el => el.clientHeight)).toBeGreaterThan(100);

    await page.click('.forge-hub-app [data-action="launchCharCreator"]');
    await page.waitForSelector('.forge-char-creator', { timeout: 10000 });
    await page.waitForTimeout(500);

    const body = page.locator('.forge-char-creator .forge-form-body');
    await expect(body).toBeVisible();
    expect(await body.evaluate(el => el.clientHeight)).toBeGreaterThan(300);
    await expect(page.locator('.forge-char-creator .form-footer button')).toBeInViewport();
  });
});
