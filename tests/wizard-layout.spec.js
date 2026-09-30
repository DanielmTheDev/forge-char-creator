import { test, expect } from './helpers/fixtures.js';
import { openBuilder, openWizard, closeForgeApps } from './helpers/foundry.js';

// Screen rows: every box in the list sits on the same line (vertical centres within 2px).
async function sameRow(locator) {
  const tops = await locator.evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; }));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
}

test.describe('Wizard layout + defaults', () => {
  test.setTimeout(120000);

  test('char wizard: archetype on Stats, grids stay aligned at wide and narrow widths', async ({ gmPage: page }) => {
    const root = await openWizard(page);
    await expect(root.locator(".fc-step[data-step='stats'] #charArchetype")).toHaveCount(1);
    for (const width of [960, 700]) {
      await page.evaluate(w => foundry.applications.instances.get("forge-char-creator-app").setPosition({ width: w }), width);
      await page.keyboard.press("Alt+Shift+1");
      // Radio and its text centred on one line, never wrapped under each other.
      for (const lbl of await root.locator(".fc-radios label").all()) {
        const [r, l] = await Promise.all([lbl.locator("input").boundingBox(), lbl.boundingBox()]);
        expect(Math.abs((r.y + r.height / 2) - (l.y + l.height / 2))).toBeLessThanOrEqual(2);
        expect(l.height).toBeLessThan(30);
      }
      await page.keyboard.press("Alt+Shift+2");
      await sameRow(root.locator(".fc-abilities label"));
      await sameRow(root.locator(".fc-abilities input"));
    }
  });

  test('char wizard: actor goes into the chosen folder', async ({ gmPage: page }) => {
    const folderId = await page.evaluate(async () => (await Folder.create({ name: "E2E Folder", type: "Actor" })).id);
    try {
      const root = await openWizard(page);
      await root.locator("#charName").fill("E2E Folder Actor");
      await root.locator("#actorFolder").selectOption(folderId);
      await root.locator("[data-action='createNPC']").click();
      await expect.poll(() => page.evaluate(() => game.actors.getName("E2E Folder Actor")?.folder?.id ?? null)).toBe(folderId);
    } finally {
      await page.evaluate(async (id) => {
        await game.actors.getName("E2E Folder Actor")?.delete();
        await game.folders.get(id)?.delete();
        localStorage.removeItem("forge-char-creator.lastActorFolder");
      }, folderId);
      await closeForgeApps(page);
    }
  });

  test('builder: per-turn save prefills from the Saving Throw step until edited', async ({ gmPage: page }) => {
    const root = await openBuilder(page, { kind: "attack", onHitSave: true });
    await root.locator(".fc-nav-btn", { hasText: "Saving Throw" }).click();
    await root.locator("[data-ef='wrapSaveAbility']").selectOption("wis");
    await root.locator("[data-ef='wrapSaveDC']").fill("16");
    await root.locator("[data-ef='wrapSaveDC']").blur();
    await root.locator(".fc-nav-btn", { hasText: "Effects" }).click();
    await root.locator("[data-ef='durationType'][value='overtime']").check();
    await root.locator("[data-ef='otSave']").check();
    await expect(root.locator("[data-ef='otSaveAbility']")).toHaveValue("wis");
    await expect(root.locator("[data-ef='otSaveDC']")).toHaveValue("16");
    // Trigger label and select share a row.
    await sameRow(root.locator("#otSection > label:first-child, [data-ef='otTrigger'], [data-ef='otWhose']"));

    await root.locator("[data-ef='otSaveDC']").fill("12");
    await root.locator("[data-ef='otSaveDC']").blur();
    await root.locator(".fc-nav-btn", { hasText: "Saving Throw" }).click();
    await root.locator("[data-ef='wrapSaveDC']").fill("18");
    await root.locator("[data-ef='wrapSaveDC']").blur();
    await expect(root.locator("[data-ef='otSaveDC']")).toHaveValue("12");
    await closeForgeApps(page);
  });
});
