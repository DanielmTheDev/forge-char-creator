import { test, expect } from './helpers/fixtures.js';

// Review focus: a test that reloads the shared page must not hand the next test a page
// without bootFoundry's state (canvas ticker stopped, notifications click-through).
test.describe.serial('gmPage fixture recovers a reloaded page', () => {
  test('a test reloads the page', async ({ gmPage: page }) => {
    await page.reload();
    await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60000 });
  });

  test('the next test gets a fully booted page again', async ({ gmPage: page }) => {
    const state = await page.evaluate(() => ({
      tickerStopped: canvas.app.ticker.started === false,
      clickThrough: [...document.querySelectorAll('style')].some(el => el.textContent.includes('#notifications, #notifications *')),
    }));
    expect(state).toEqual({ tickerStopped: true, clickThrough: true });
  });
});
