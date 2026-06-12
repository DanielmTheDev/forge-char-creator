// forge-content functional gate. Boots real Foundry, then for each authored
// ability reads its source JSON + co-located <name>.expect.json and runs
// genericCheck (declarative v2 engine). Untested abilities fail the gate.
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootFoundry } from './boot.mjs';
import { installGateHelpers, genericCheck, actorLoadCheck, actorCombatCheck } from './checks.mjs';
import { assertSnapshot } from './assert.mjs';
import { validate, validateActor, validateActorRefs, KNOWN_KEYS } from './schema.mjs';
import { COLLECTIONS } from '../../scripts/pack-tools/modules.mjs';
import { resolveActorAbilities } from '../../scripts/pack-tools/resolve-abilities.mjs';
import { resolveActorSpells, loadSpellCache } from '../../scripts/pack-tools/resolve-spells.mjs';
import { computeAllHashes, readMarkers, writeMarkers } from './stale.mjs';

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
        key: `${pack.name}/${f}`,
        coll: COLLECTIONS[pack.name] ?? 'items',
        doc: JSON.parse(readFileSync(join(dir, f), 'utf8')),
        expectation: existsSync(expectFile) ? JSON.parse(readFileSync(expectFile, 'utf8')) : null,
      });
    }
  }
  return out;
}

// FC_ONLY=<substring>[,<substring>...] limits the RUN to docs whose name matches
// ANY comma-separated part (case-insensitive substring) — scope a fresh batch in
// one run: `npm run content:verify -- caelnor,nine,thord`. Default (no FC_ONLY/
// FC_FULL) is STALE-AWARE: only docs whose gate hash moved re-run (see stale.mjs);
// engine/module changes mark everything stale. ALL is kept unfiltered so `setup`
// cross-references still resolve under any filter.
const ALL = gather();
const FC_PARTS = (process.env.FC_ONLY ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const match = (i) => !FC_PARTS.length || FC_PARTS.some(p => i.doc.name.toLowerCase().includes(p));
let ITEMS  = ALL.filter(i => i.coll === 'items').filter(match);
let ACTORS = ALL.filter(i => i.coll === 'actors').filter(match);

// Stale-aware default: drop docs whose gate hash matches their green marker
// (.gate-green.json — written per-doc on PASS below). FC_FULL=1 forces the
// sweep; explicit FC_ONLY selections always run (but still record markers).
// HASHES is computed for ALL runs so the marker write always has current hashes.
const FC_FULL = process.env.FC_FULL === '1';
const HASHES = computeAllHashes();
let GREEN_SKIPPED = 0;
if (!FC_FULL && !FC_PARTS.length) {
  const markers = readMarkers();
  const stale = (i) => HASHES.get(i.key) !== markers[i.key];
  const before = ITEMS.length + ACTORS.length;
  ITEMS = ITEMS.filter(stale);
  ACTORS = ACTORS.filter(stale);
  GREEN_SKIPPED = before - ITEMS.length - ACTORS.length;
  if (GREEN_SKIPPED) console.log(`(${GREEN_SKIPPED} docs green-skipped — FC_FULL=1 for full sweep)`);
}

test.describe('forge-content verify', () => {
  test.setTimeout(600000);

  test('every ability passes its declared functional check', async ({ page }) => {
    // Everything green-skipped: pass without booting Foundry (content-verify.sh
    // normally short-circuits earlier; this keeps the spec self-consistent).
    if (!ITEMS.length && !ACTORS.length && GREEN_SKIPPED) {
      console.log(`✅ nothing stale (${GREEN_SKIPPED} docs green) — FC_FULL=1 for full sweep`);
      return;
    }
    expect(ITEMS.length + ACTORS.length, 'No docs found under src/packs/').toBeGreaterThan(0);

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

    // Actor packs (Iter 1): load + derived-stat checks. Distinct expect shape.
    const actorUntested = ACTORS.filter(a => !a.expectation).map(a => a.doc.name);
    expect(actorUntested, `Actors missing <name>.expect.json: ${actorUntested.join(', ')}`).toEqual([]);
    // Vanilla spell cache (committed; `npm run spells:resolve`). Name -> dnd5e
    // identifier map lets actor T3 castOwn steps reference an inlined spell.
    const spellMap = loadSpellCache();
    const spellIdByName = new Map([...spellMap.values()].map(d => [d.name.toLowerCase(), d.system?.identifier ?? d.name]));
    const actorErrors = ACTORS.flatMap(a => validateActor(a.expectation, a.doc, idList, spellIdByName).map(e => `${a.doc.name}: ${e}`));
    expect(actorErrors, `actor expect.json validation errors:\n${actorErrors.join('\n')}`).toEqual([]);
    // Iter 2: actor source carries `abilities: [<identifier>]` refs. Validate them
    // pre-boot, then resolve+inline (re-keyed embedded items) so actorLoadCheck —
    // which reads SOURCE json, not the built pack — sees the items. byId is the
    // ability map (identifier -> doc). Resolve mutates a copy; ALL stays raw.
    // Vanilla `spells`/`spellcasting` resolve through the same path (resolver
    // throws on a cache miss — same trio as build.mjs / export-dist.mjs).
    const actorRefErrors = ACTORS.flatMap(a => validateActorRefs(a.doc, idList));
    expect(actorRefErrors, `actor ability-ref errors:\n${actorRefErrors.join('\n')}`).toEqual([]);
    for (const a of ACTORS) a.doc = resolveActorSpells(resolveActorAbilities(a.doc, byId), spellMap);

    await bootFoundry(page);

    // Install shared T3 scaffolding on globalThis.__fcGate once (persists across
    // the per-handler page.evaluate calls). See checks.mjs installGateHelpers.
    await page.evaluate(installGateHelpers);

    // Ship the PURE assertSnapshot (unit-tested in node) into the browser by source,
    // so genericCheck can call __fcGate.assertSnapshot. Self-contained fn — safe to eval.
    await page.evaluate((src) => { globalThis.__fcGate.assertSnapshot = (0, eval)(`(${src})`); }, assertSnapshot.toString());
    await page.evaluate((src) => { globalThis.__fcGate.actorLoadCheck = (0, eval)(`(${src})`); }, actorLoadCheck.toString());

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

    // An ACTIVE world scene breaks T3 determinism (observed 2026-06-11: Example
    // Boon's advantage grant + Rending Pounce's DoT ticked one turn short with a
    // campaign scene active; both green with none). Gate scenes only VIEW
    // themselves, so a world-active scene keeps owning game.combat turn order.
    // Deactivate for the run, restore afterwards — the shared test world is also
    // a play world, so leave it as found.
    const activeSceneId = await page.evaluate(async () => {
      const a = game.scenes.active;
      if (a) await a.update({ active: false });
      return a?.id ?? null;
    });

    const results = [];
    for (const item of ITEMS) {
      const setupDocs = (item.expectation.setup ?? []).map(s => byId.get(s));
      await page.evaluate(isolate);
      const r = await page.evaluate(genericCheck, { doc: item.doc, expectation: item.expectation, setupDocs, knownKeys: KNOWN_KEYS });
      results.push({ name: item.doc.name, key: item.key, tier: item.expectation.tier, ...r });
      console.log(`${r.ok ? '✓' : '✘'} [${item.expectation.tier}] ${item.doc.name}${r.ok ? '' : ' — ' + r.fails.join('; ')}`);
    }

    for (const actorItem of ACTORS) {
      await page.evaluate(isolate);
      const exp = actorItem.expectation;
      let r;
      if (exp.tier === 'T3') {
        // Iter 4: authored NPC fights in real combat with its own inlined abilities.
        // Optional `load` block keeps T2 stat coverage on a T3 actor (runs first).
        const setupDocs = (exp.setup ?? []).map(s => byId.get(s));
        r = await page.evaluate(actorCombatCheck, { doc: actorItem.doc, expectation: exp, setupDocs, knownKeys: KNOWN_KEYS });
        if (exp.load) {
          const lr = await page.evaluate((arg) => globalThis.__fcGate.actorLoadCheck(arg), { doc: actorItem.doc, expectation: { assert: exp.load } });
          r = { ok: r.ok && lr.ok, fails: [...lr.fails.map(f => `load: ${f}`), ...r.fails] };
        }
      } else {
        r = await page.evaluate((arg) => globalThis.__fcGate.actorLoadCheck(arg), { doc: actorItem.doc, expectation: exp });
      }
      results.push({ name: actorItem.doc.name, key: actorItem.key, tier: exp.tier, ...r });
      console.log(`${r.ok ? '✓' : '✘'} [${exp.tier}] ${actorItem.doc.name}${r.ok ? '' : ' — ' + r.fails.join('; ')}`);
    }

    // Restore the world's active scene before asserting (runs on pass or fail
    // of the results check; an earlier crash skips it — next run re-deactivates).
    await page.evaluate(async (id) => {
      if (id) await game.scenes.get(id)?.update({ active: true });
    }, activeSceneId);

    // Record green markers for every passing doc (merge — failed docs keep
    // their old marker, i.e. stay stale). Runs before the gate assert so a
    // partially-red run still banks its greens.
    const green = Object.fromEntries(results.filter(r => r.ok).map(r => [r.key, HASHES.get(r.key)]));
    if (Object.keys(green).length) writeMarkers(green);

    const failed = results.filter(r => !r.ok);
    expect(failed, `Failed checks:\n${JSON.stringify(failed, null, 2)}`).toEqual([]);
  });
});
