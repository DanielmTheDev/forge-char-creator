// forge-content functional gate. Boots real Foundry, then for each authored
// ability reads its source JSON + co-located <name>.expect.json and runs
// genericCheck (declarative v2 engine). Untested abilities fail the gate.
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootFoundry } from './boot.mjs';
import { installGateHelpers, genericCheck } from './checks.mjs';
import { assertSnapshot } from './assert.mjs';
import { validate, KNOWN_KEYS } from './schema.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'packs');

function gather() {
  const out = [];
  for (const pack of readdirSync(SRC, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const dir = join(SRC, pack.name);
    for (const f of readdirSync(dir).filter(f => f.endsWith('.json') && !f.endsWith('.expect.json') && !f.startsWith('_'))) {
      const base = f.replace(/\.json$/, '');
      const expectFile = join(dir, `${base}.expect.json`);
      out.push({
        pack: pack.name,
        doc: JSON.parse(readFileSync(join(dir, f), 'utf8')),
        expectation: existsSync(expectFile) ? JSON.parse(readFileSync(expectFile, 'utf8')) : null,
      });
    }
  }
  return out;
}

// FC_ONLY=<substring> limits the RUN to matching ability names (dev iteration).
// ALL is kept unfiltered so `setup` cross-references still resolve under FC_ONLY.
const ALL = gather();
const ITEMS = ALL.filter(i => !process.env.FC_ONLY || i.doc.name.toLowerCase().includes(process.env.FC_ONLY.toLowerCase()));

test.describe('forge-content verify', () => {
  test.setTimeout(600000);

  test('every ability passes its declared functional check', async ({ page }) => {
    expect(ITEMS.length, 'No abilities found under src/packs/').toBeGreaterThan(0);

    const untested = ITEMS.filter(i => !i.expectation).map(i => i.doc.name);
    expect(untested, `Abilities missing <name>.expect.json: ${untested.join(', ')}`).toEqual([]);

    // Lookup by identifier (or name) so expect.json `setup` can reference other abilities.
    const byId = new Map(ALL.map(i => [i.doc.system?.identifier ?? i.doc.name, i.doc]));
    // Pre-boot static validation of ALL expectations (fast; no Foundry needed).
    const idList = [...byId.keys()];
    const v2errors = ITEMS.flatMap(i => validate(i.expectation, idList).map(e => `${i.doc.name}: ${e}`));
    expect(v2errors, `expect.json v2 validation errors:\n${v2errors.join('\n')}`).toEqual([]);
    const missingSetup = ITEMS.flatMap(i => (i.expectation.setup ?? []).filter(s => !byId.has(s)).map(s => `${i.doc.name} -> ${s}`));
    expect(missingSetup, `expect.json setup references unknown abilities: ${missingSetup.join(', ')}`).toEqual([]);

    await bootFoundry(page);

    // Install shared T3 scaffolding on globalThis.__fcGate once (persists across
    // the per-handler page.evaluate calls). See checks.mjs installGateHelpers.
    await page.evaluate(installGateHelpers);

    // Ship the PURE assertSnapshot (unit-tested in node) into the browser by source,
    // so genericCheck can call __fcGate.assertSnapshot. Self-contained fn — safe to eval.
    await page.evaluate((src) => { globalThis.__fcGate.assertSnapshot = (0, eval)(`(${src})`); }, assertSnapshot.toString());

    // Test isolation. Sweeps ALL docs the gate itself created — Combats, Scenes,
    // Actors — identified ONLY by the forge-content.test flag (makeScene/makeActor/
    // makeCombat stamp it). Tokens/items are embedded → die with their scene/actor,
    // so the three top-level collections cover everything.
    //   Why a flag, never a name/scene guard: the gate boots the shared test world,
    // which may also hold non-gate docs; the flag is the only safe marker that can't
    // touch them.
    //   Why it must run: a handler's finally-cleanup is best-effort (delete().catch()),
    // so a skipped delete leaves an orphan. Orphans accumulate run-over-run and are the
    // root of the isolation bugs we patched piecemeal: a stale ACTIVE combat makes DAE
    // stamp a granted effect's startRound from game.combat.current.round, expiring a
    // turnEndSource buff a turn early (T3-grant passed/failed purely on suite ORDER);
    // an orphaned broken scene/actor aborts canvas.draw. Sweeping by flag at run-START
    // (clears last run's residue) AND between handlers (clears this run's) kills the
    // pileup at the source instead of patching each symptom. Delete order: combats →
    // scenes → actors (combats ref scenes; tokens die with their scene).
    const isolate = async () => {
      const flagged = (coll) => [...coll].filter(d => d.getFlag('forge-content', 'test'));
      for (const c of flagged(game.combats)) await c.delete().catch(() => {});
      for (const s of flagged(game.scenes))  await s.delete().catch(() => {});
      for (const a of flagged(game.actors))  await a.delete().catch(() => {});
    };

    // Clear any residue left by a prior (crashed/interrupted) run before starting.
    await page.evaluate(isolate);

    const results = [];
    for (const item of ITEMS) {
      const setupDocs = (item.expectation.setup ?? []).map(s => byId.get(s));
      await page.evaluate(isolate);
      const r = await page.evaluate(genericCheck, { doc: item.doc, expectation: item.expectation, setupDocs, knownKeys: KNOWN_KEYS });
      results.push({ name: item.doc.name, tier: item.expectation.tier, ...r });
      console.log(`${r.ok ? '✓' : '✘'} [${item.expectation.tier}] ${item.doc.name}${r.ok ? '' : ' — ' + r.fails.join('; ')}`);
    }

    const failed = results.filter(r => !r.ok);
    expect(failed, `Failed checks:\n${JSON.stringify(failed, null, 2)}`).toEqual([]);
  });
});
