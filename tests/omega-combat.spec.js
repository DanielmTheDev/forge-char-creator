import { test, expect } from '@playwright/test';
import { bootFoundry, pipeConsole } from './helpers/foundry.js';

// Omega Combat Simulator: builder feature → combat → restrained + OverTime → advantage.
// Lives outside ForgeTestingSuite.runAll() so a hang here can't sink the payload suite.
test('Omega combat: feature → combat → OverTime tick → advantage vs restrained @combat', async ({ page }) => {
  // Legs 1–2 pass since 2026-09-30 (restrained + OverTime applied, OT tick lands). Leg 3 fails: in this
  // stack (dnd5e 5.2.5, midi 13.0.63, test-world settings) nothing grants attackers advantage vs a
  // restrained target (the status carries no changes), so swordWorkflow.advantage is false. See TODO.md OMEGA-ADV.
  test.fixme(true, 'attacker advantage vs restrained is not automated in this stack — TODO.md OMEGA-ADV');
  test.setTimeout(150000);
  await bootFoundry(page);
  pipeConsole(page, /Omega|Error|SMOKE/);
  try {
    const res = await page.evaluate(async () => {
      const guard = new Promise(r => setTimeout(() => r({ ok: false, error: 'timeout after 120 s' }), 120000));
      const run = ForgeTestingSuite.testCombatEngineIntegration()
        .then(() => ({ ok: true }), e => ({ ok: false, error: e?.message ?? String(e) }));
      return Promise.race([run, guard]);
    });
    expect(res.ok, res.error).toBe(true);
  } finally {
    await page.evaluate(async () => {
      const re = /Omega|E2E/;
      for (const c of [...game.combats]) if (c.combatants.some(x => re.test(x.name ?? ''))) await c.delete();
      for (const s of game.scenes) {
        const ids = s.tokens.filter(t => re.test(t.name)).map(t => t.id);
        if (ids.length) await s.deleteEmbeddedDocuments('Token', ids);
      }
      const ids = game.actors.filter(a => re.test(a.name)).map(a => a.id);
      if (ids.length) await Actor.deleteDocuments(ids);
    }).catch(() => {});
  }
});
