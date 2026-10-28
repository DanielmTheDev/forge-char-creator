import { test, expect } from './helpers/fixtures.js';
import { openWizard, closeForgeApps } from './helpers/foundry.js';

test.describe('Wizard challenge + movement', () => {
  test.setTimeout(120000);

  test('party prefills from player characters: count + highest level', async ({ gmPage: page }) => {
    const ids = await page.evaluate(async () => {
      const player = game.users.find(u => !u.isGM) ?? await User.create({ name: "E2E Player", role: CONST.USER_ROLES.PLAYER });
      const own = { default: 0, [player.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER };
      const made = await Actor.createDocuments([3, 9].map(l => ({ name: `E2E PC ${l}`, type: "character", ownership: own })));
      for (const [a, l] of made.map((a, i) => [a, [3, 9][i]]))
        await a.createEmbeddedDocuments("Item", [{ name: "E2E Class", type: "class", system: { levels: l } }]);
      // Same rule as the wizard: assigned characters, else owned ones.
      const assigned = [...new Set(game.users.filter(u => !u.isGM && u.character).map(u => u.character))];
      const pcs = assigned.length ? assigned : game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
      return { actors: made.map(a => a.id), pcs: pcs.map(a => a.system.details.level) };
    });
    try {
      const root = await openWizard(page);
      await expect(root.locator("#partyLevel")).toHaveValue(String(Math.max(...ids.pcs)));
      await expect(root.locator("#partySize")).toHaveValue(String(ids.pcs.length));
    } finally {
      await page.evaluate(async (a) => {
        await Actor.deleteDocuments(a);
        await game.users.getName("E2E Player")?.delete();
      }, ids.actors);
      await closeForgeApps(page);
    }
  });

  test('difficulty fills stats, stat edits relabel, actor gets CR + movement', async ({ gmPage: page }) => {
    try {
      const root = await openWizard(page);
      await page.keyboard.press("Alt+Shift+2");
      await root.locator("#partySize").fill("4");
      await root.locator("#partyLevel").selectOption("5");
      await root.locator("#monsterCopies").fill("1");

      // Forward: High for 4×L5 → CR 8 (3 900 XP ≤ 4 400), table AC 16 / HP 183.
      await root.locator("#difficulty").selectOption("high");
      await expect(root.locator("#cr")).toHaveValue("8");
      await expect(root.locator("#ac")).toHaveValue("16");
      await expect(root.locator("#hp")).toHaveValue("183");
      await expect(root.locator("#difficulty")).toHaveValue("high");

      // Archetype keeps the CR: warrior AC +1 stays inside the same band.
      await root.locator("#charArchetype").selectOption("warrior");
      await expect(root.locator("#cr")).toHaveValue("8");
      await expect(root.locator("#ac")).toHaveValue("17");

      // Reverse: tankier stats → higher CR → deadly.
      await root.locator("#hp").fill("300");
      await expect(root.locator("#difficulty")).toHaveValue("deadly");
      await expect(root.locator("#encounterHint")).toContainText("XP");
      // More copies of a weak creature also escalate.
      await root.locator("#cr").selectOption("2");
      await expect(root.locator("#difficulty")).toHaveValue("trivial");
      await root.locator("#monsterCopies").fill("6");
      await expect(root.locator("#difficulty")).toHaveValue("moderate"); // 2 700 XP

      await root.locator("#move-walk").fill("40");
      await root.locator("#move-fly").fill("60");
      await root.locator("#move-hover").check();
      await page.keyboard.press("Alt+Shift+1");
      await root.locator("#charName").fill("E2E Challenge Actor");
      await root.locator("[data-action='createNPC']").click();
      await expect.poll(() => page.evaluate(() => {
        const a = game.actors.getName("E2E Challenge Actor");
        if (!a) return null;
        const m = a.system.attributes.movement;
        return { cr: a.system.details.cr, walk: m.walk, fly: m.fly, hover: m.hover };
      })).toEqual({ cr: 2, walk: 40, fly: 60, hover: true });
    } finally {
      await page.evaluate(() => game.actors.getName("E2E Challenge Actor")?.delete());
      await closeForgeApps(page);
    }
  });
});
