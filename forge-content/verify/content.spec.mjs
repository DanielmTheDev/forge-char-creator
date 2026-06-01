// forge-content functional gate (Tier T1/T2). Runs in real Foundry via
// content-verify.sh. For each authored ability it reads the source JSON +
// its co-located <name>.expect.json, instantiates the item on a throwaway
// actor, and asserts the declared effect actually happens. Untested
// abilities (no .expect.json) fail the gate. T3 combat scenarios: future.
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

    // Gate: no untested content.
    const untested = ITEMS.filter(i => !i.expectation).map(i => i.doc.name);
    expect(untested, `Abilities missing <name>.expect.json: ${untested.join(', ')}`).toEqual([]);

    await page.goto('http://localhost:30000');
    if (page.url().includes('/setup')) {
      await page.evaluate(async () => {
        await fetch('/setup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'launchWorld', world: 'ishait' })
        });
      });
      await page.waitForTimeout(2000);
      await page.goto('http://localhost:30000/join');
    }
    await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
    await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
    await page.click('button[name="join"]');
    await page.waitForNavigation({ timeout: 15000 });
    await page.waitForSelector('#ui-middle', { timeout: 30000 });
    await page.waitForTimeout(5000);
    page.on('console', m => console.log(`[Foundry] ${m.text()}`));

    const results = [];
    for (const item of ITEMS) {
      const r = await page.evaluate(async ({ doc, expectation }) => {
        const data = JSON.parse(JSON.stringify(doc));
        delete data._id; delete data._key;
        for (const e of data.effects ?? []) { delete e._id; delete e._key; }

        const get = (obj, path) => foundry.utils.getProperty(obj, path);
        let actor;
        try {
          actor = await Actor.create({ name: 'Verify Dummy', type: expectation.actor?.type ?? 'npc' });
          const a = expectation.assert ?? {};
          const before = {
            ac: get(actor, 'system.attributes.ac.value'),
            ability: a.abilityDelta ? get(actor, `system.abilities.${a.abilityDelta.ability}.value`) : null,
          };
          const [it] = await actor.createEmbeddedDocuments('Item', [data]);
          await new Promise(res => setTimeout(res, 400));
          const after = {
            ac: get(actor, 'system.attributes.ac.value'),
            ability: a.abilityDelta ? get(actor, `system.abilities.${a.abilityDelta.ability}.value`) : null,
          };

          const fails = [];
          if (!it?.id) fails.push('Item.create returned no document (T1 load failed)');
          if (a.acDelta !== undefined && (after.ac - before.ac) !== a.acDelta)
            fails.push(`acDelta expected ${a.acDelta}, got ${after.ac - before.ac}`);
          if (a.abilityDelta && (after.ability - before.ability) !== a.abilityDelta.delta)
            fails.push(`${a.abilityDelta.ability} delta expected ${a.abilityDelta.delta}, got ${after.ability - before.ability}`);
          if (a.effectApplied && !actor.appliedEffects?.some(e => e.name === a.effectApplied))
            fails.push(`effect "${a.effectApplied}" not applied to actor`);

          return { ok: fails.length === 0, fails };
        } catch (err) {
          return { ok: false, fails: [err.message] };
        } finally {
          if (actor) await actor.delete().catch(() => {});
        }
      }, { doc: item.doc, expectation: item.expectation });

      results.push({ name: item.doc.name, tier: item.expectation.tier, ...r });
      console.log(`${r.ok ? '✓' : '✘'} [${item.expectation.tier}] ${item.doc.name}${r.ok ? '' : ' — ' + r.fails.join('; ')}`);
    }

    const failed = results.filter(r => !r.ok);
    expect(failed, `Failed checks:\n${JSON.stringify(failed, null, 2)}`).toEqual([]);
  });
});
