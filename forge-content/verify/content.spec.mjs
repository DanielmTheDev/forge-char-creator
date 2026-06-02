// forge-content functional gate. Boots real Foundry, then for each authored
// ability reads its source JSON + co-located <name>.expect.json and runs the
// handler for its tier (see checks.mjs). Untested abilities fail the gate.
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootFoundry } from './boot.mjs';
import { CHECKS, installGateHelpers } from './checks.mjs';

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

const ITEMS = gather();

test.describe('forge-content verify', () => {
  test.setTimeout(360000);

  test('every ability passes its declared functional check', async ({ page }) => {
    expect(ITEMS.length, 'No abilities found under src/packs/').toBeGreaterThan(0);

    const untested = ITEMS.filter(i => !i.expectation).map(i => i.doc.name);
    expect(untested, `Abilities missing <name>.expect.json: ${untested.join(', ')}`).toEqual([]);

    const unknownTier = ITEMS.filter(i => !CHECKS[i.expectation.tier]).map(i => `${i.doc.name} (tier=${i.expectation.tier})`);
    expect(unknownTier, `Unknown tier(s): ${unknownTier.join(', ')}`).toEqual([]);

    // Lookup by identifier (or name) so expect.json `setup` can reference other abilities.
    const byId = new Map(ITEMS.map(i => [i.doc.system?.identifier ?? i.doc.name, i.doc]));
    const missingSetup = ITEMS.flatMap(i => (i.expectation.setup ?? []).filter(s => !byId.has(s)).map(s => `${i.doc.name} -> ${s}`));
    expect(missingSetup, `expect.json setup references unknown abilities: ${missingSetup.join(', ')}`).toEqual([]);

    await bootFoundry(page);

    // Install shared T3 scaffolding on globalThis.__fcGate once (persists across
    // the per-handler page.evaluate calls). See checks.mjs installGateHelpers.
    await page.evaluate(installGateHelpers);

    // Test isolation between handlers. A handler that runs combat can leave a stale
    // ACTIVE combat behind (its scene already deleted). The next handler's granted
    // effects then get stamped with that stale combat's round (DAE reads
    // game.combat.current.round), so a turnEndSource buff expires a turn early — which
    // made T3-grant pass or fail purely on suite ORDER. Purge ONLY combats the gate
    // itself created (flagged forge-content.test at Combat.create) — NEVER campaign
    // combats. The gate boots the real world, which holds real combats (some with
    // orphaned scenes), so a scene-based guard is unsafe; the flag is the only safe
    // marker. Also bounds combat accumulation across the run.
    const isolate = async () => {
      for (const c of [...game.combats]) {
        if (c.getFlag('forge-content', 'test')) await c.delete().catch(() => {});
      }
    };

    const results = [];
    for (const item of ITEMS) {
      const handler = CHECKS[item.expectation.tier];
      const setupDocs = (item.expectation.setup ?? []).map(s => byId.get(s));
      await page.evaluate(isolate);
      const r = await page.evaluate(handler, { doc: item.doc, expectation: item.expectation, setupDocs });
      results.push({ name: item.doc.name, tier: item.expectation.tier, ...r });
      console.log(`${r.ok ? '✓' : '✘'} [${item.expectation.tier}] ${item.doc.name}${r.ok ? '' : ' — ' + r.fails.join('; ')}`);
    }

    const failed = results.filter(r => !r.ok);
    expect(failed, `Failed checks:\n${JSON.stringify(failed, null, 2)}`).toEqual([]);
  });
});
