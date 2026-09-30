import { test, expect } from './helpers/fixtures.js';

test('Icon picker: name-based suggestions, search, keyboard pick, cached reopen, Esc cancels', async ({ gmPage: page }) => {
  test.setTimeout(180000);

  await page.evaluate(async () => {
    const { EffectCreatorApp } = await import("./modules/forge-char-creator/scripts/effect-creator.js");
    await new EffectCreatorApp().render(true);
  });
  const b = page.locator('.forge-effect-creator');
  const name = b.locator("[data-ef='name']");
  await name.fill("Venom Bite");
  await name.dispatchEvent("change");

  await b.locator("[data-action='pickIcon']").click();
  const p = page.locator('#forge-icon-picker');
  const t0 = Date.now();
  await expect(p.locator('.ip-cell').first()).toBeVisible({ timeout: 90000 });
  console.log(`icon index first open: ${Date.now() - t0}ms`);
  await expect(p.locator('.ip-search')).toBeFocused();
  // Empty query → suggestions from the name ("venom", "bite" → fang/bite)
  expect(await p.locator('.ip-cell').first().getAttribute('data-path')).toMatch(/bite|fang|venom/i);

  await p.locator('.ip-search').fill('flame');
  await expect(p.locator('.ip-status')).toContainText('matches');
  const first = await p.locator('.ip-cell').first().getAttribute('data-path');
  expect(first).toMatch(/flame/i);
  await page.keyboard.press('ArrowDown');
  await expect(p.locator('.ip-cell').first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(p.locator('.ip-cell').nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(p).toBeHidden();
  await expect(b.locator("[data-ef='img']")).toHaveValue(first);
  expect(await b.locator('#efImgPreview').getAttribute('src')).toBe(first);

  // Reopen: index cached → grid appears fast. Esc closes without changing the icon.
  const t1 = Date.now();
  await b.locator("[data-action='pickIcon']").click();
  await expect(p.locator('.ip-cell').first()).toBeVisible({ timeout: 5000 });
  console.log(`icon index reopen: ${Date.now() - t1}ms`);
  await page.keyboard.press('Escape');
  await expect(p).toBeHidden();
  await expect(b.locator("[data-ef='img']")).toHaveValue(first);
  // Focus returns to the builder, so step keys keep working.
  await expect(b.locator("[data-action='pickIcon']")).toBeFocused();
  await page.keyboard.press('Alt+Shift+ArrowRight');
  await expect(b.locator('.fc-step.active')).not.toHaveAttribute('data-step', 'basics');

  await page.evaluate(() => { for (const a of [...foundry.applications.instances.values()]) if (a.id?.startsWith("forge-")) a.close(); });
});
