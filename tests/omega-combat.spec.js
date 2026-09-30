import { test, expect } from './helpers/fixtures.js';
import { pipeConsole } from './helpers/foundry.js';
import { TEST_NAME_RE } from './helpers/sweep.js';

// Omega Combat Simulator: builder feature → combat → restrained + OverTime → OT tick → advantage.
// Lives outside ForgeTestingSuite.runAll() so a hang here can't sink the payload suite.
async function runOmega(page, opts) {
  pipeConsole(page, /Omega|Error|SMOKE/);
  try {
    return await page.evaluate(async (opts) => {
      const guard = new Promise(r => setTimeout(() => r({ ok: false, error: 'timeout after 120 s' }), 120000));
      const run = ForgeTestingSuite.testCombatEngineIntegration(opts)
        .then(() => ({ ok: true }), e => ({ ok: false, error: e?.message ?? String(e) }));
      return Promise.race([run, guard]);
    }, opts);
  } finally {
    // Only exact test names, and a combat only when every combatant is ours (real campaign content lives here).
    await page.evaluate(async (src) => {
      const re = new RegExp(src);
      for (const c of [...game.combats]) if (c.combatants.size && c.combatants.every(x => re.test(x.name ?? ''))) await c.delete();
      for (const s of game.scenes) {
        const ids = s.tokens.filter(t => re.test(t.name)).map(t => t.id);
        if (ids.length) await s.deleteEmbeddedDocuments('Token', ids);
      }
      const ids = game.actors.filter(a => re.test(a.name)).map(a => a.id);
      if (ids.length) await Actor.deleteDocuments(ids);
    }, TEST_NAME_RE.source).catch(() => {});
  }
}

test('Omega combat: feature → combat → restrained + OverTime → OT tick @combat', async ({ gmPage: page }) => {
  test.setTimeout(150000);
  const res = await runOmega(page, { skipAdvantage: true });
  expect(res.ok, res.error).toBe(true);
});

test('Omega combat: attacker gains advantage vs restrained @combat', async ({ gmPage: page }) => {
  // Fails in this stack (dnd5e 5.2.5, midi 13.0.63, test-world settings): nothing grants attackers
  // advantage vs a restrained target (the status carries no changes). See TODO.md OMEGA-ADV.
  test.fixme(true, 'attacker advantage vs restrained is not automated in this stack — TODO.md OMEGA-ADV');
  test.setTimeout(150000);
  const res = await runOmega(page, {});
  expect(res.ok, res.error).toBe(true);
});
