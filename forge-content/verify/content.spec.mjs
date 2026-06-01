// forge-content functional gate. Boots real Foundry, then for each authored
// ability reads its source JSON + co-located <name>.expect.json and runs the
// handler for its tier (see checks.mjs). Untested abilities fail the gate.
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootFoundry } from './boot.mjs';
import { CHECKS } from './checks.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'packs');

function gather() {
  const out = [];
  for (const pack of readdirSync(SRC, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const dir = join(SRC, pack.name);
    for (const f of readdirSync(dir).filter(f => f.endsWith('.json') && !f.endsWith('.expect.json'))) {
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
  test.setTimeout(120000);

  test('every ability passes its declared functional check', async ({ page }) => {
    expect(ITEMS.length, 'No abilities found under src/packs/').toBeGreaterThan(0);

    const untested = ITEMS.filter(i => !i.expectation).map(i => i.doc.name);
    expect(untested, `Abilities missing <name>.expect.json: ${untested.join(', ')}`).toEqual([]);

    const unknownTier = ITEMS.filter(i => !CHECKS[i.expectation.tier]).map(i => `${i.doc.name} (tier=${i.expectation.tier})`);
    expect(unknownTier, `Unknown tier(s): ${unknownTier.join(', ')}`).toEqual([]);

    await bootFoundry(page);

    const results = [];
    for (const item of ITEMS) {
      const handler = CHECKS[item.expectation.tier];
      const r = await page.evaluate(handler, { doc: item.doc, expectation: item.expectation });
      results.push({ name: item.doc.name, tier: item.expectation.tier, ...r });
      console.log(`${r.ok ? '✓' : '✘'} [${item.expectation.tier}] ${item.doc.name}${r.ok ? '' : ' — ' + r.fails.join('; ')}`);
    }

    const failed = results.filter(r => !r.ok);
    expect(failed, `Failed checks:\n${JSON.stringify(failed, null, 2)}`).toEqual([]);
  });
});
