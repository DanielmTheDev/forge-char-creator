# Actor Creation — Iter 1 (Actor Spine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author a dnd5e NPC as JSON, compile it into a new `forge-npcs` actors compendium pack, and prove via the functional gate that it loads (T1) with correct derived stats and the reused ability present (T2).

**Architecture:** Extend the existing content-as-code pipeline to a second document collection (`actors`). The hard infra is teaching `keys.mjs` to inject foundryvtt-cli `_key` strings at every embedded level of an actor (actor → items → item-effects → activities, plus actor-own effects). A hand-authored `test-goblin.json` (npc reusing the already-tested `searing-bolt`) is the first fixture. The functional dispatcher (`content.spec.mjs`) gets a collection split: ability packs keep running `genericCheck`; actor packs run a new minimal `actorLoadCheck` against an actor-shaped `expect.json`. The reused ability is NOT re-proven — that is the test-explosion guard.

**Tech Stack:** Node ESM tooling (`scripts/pack-tools/`), `@foundryvtt/foundryvtt-cli` (`fvtt package pack/unpack`), `node --test` unit tests, Playwright + real Foundry V13 / dnd5e 5.2.5 / midi 13.0.63 gate (`content:verify`, xvfb-headed).

**Spec:** `docs/superpowers/specs/2026-06-05-actor-creation-iter1-design.md`

---

## File Structure

- `scripts/pack-tools/keys.mjs` — MODIFY. Add an `actors` branch to `injectKeys` (deep `_key` walk + id checks) and to `stripKeys` (mirror removal). Factor a shared per-item embed helper so item-pack and actor-embedded items share the effect/activity logic.
- `scripts/pack-tools/keys.test.mjs` — CREATE. Node unit tests for the actor branch (correct `_key` strings, id-length enforcement, strip round-trip).
- `scripts/pack-tools/modules.mjs` — MODIFY. Register `COLLECTIONS["forge-npcs"] = "actors"`.
- `forge-content/module.json` — MODIFY. Add the `forge-npcs` Actor pack entry.
- `forge-content/src/packs/forge-npcs/test-goblin.json` — CREATE. The hand-authored npc fixture (inlines a re-keyed `searing-bolt`).
- `forge-content/src/packs/forge-npcs/test-goblin.expect.json` — CREATE. Actor-shaped functional check.
- `forge-content/verify/schema.mjs` — MODIFY. Add `validateActor()` (actor expect schema, pre-boot).
- `forge-content/verify/schema.test.mjs` — MODIFY. Add `validateActor` unit tests.
- `forge-content/verify/checks.mjs` — MODIFY. Add + export `actorLoadCheck` (browser-side handler).
- `forge-content/verify/content.spec.mjs` — MODIFY. Collection split: route actor docs to `actorLoadCheck`.
- `TODO.md` — MODIFY. Mark Iter-1 progress.

---

## Task 1: Spike — confirm the nested `_key` format empirically

No code change. This de-risks every later task: a wrong `_key` silently drops embeds at Foundry-load (same failure class as the 15-char activity-id bug). We read the format from dnd5e's own shipped packs rather than trusting this plan.

**Files:** none (investigation only).

- [ ] **Step 1: Unpack a dnd5e actor pack to a scratch dir and inspect the `_key` strings**

dnd5e ships compiled LevelDB actor packs. Unpack one to JSON and look at the keys on the actor, its embedded items, and those items' effects. Adjust the pack path if the installed layout differs (find it under the Foundry data systems dir).

Run:
```bash
cd /home/muckelbauer@sinc-intern.de/git/forge-char-creator
DND=$(find ~ -type d -path '*systems/dnd5e/packs/monsters' 2>/dev/null | head -1)
echo "pack: $DND"
mkdir -p /tmp/dnd5e-keyspike
npx fvtt package unpack monsters --in "$(dirname "$DND")" --out /tmp/dnd5e-keyspike 2>/dev/null || \
  npx fvtt package unpack monsters --in "$DND" --out /tmp/dnd5e-keyspike
grep -rho '"_key": "[^"]*"' /tmp/dnd5e-keyspike | sort -u | head -40
```

Expected: lines confirming the embed pattern, e.g.
```
"_key": "!actors!<16id>"
"_key": "!actors.items!<actorId>.<itemId>"
"_key": "!actors.items.effects!<actorId>.<itemId>.<effId>"
"_key": "!actors.effects!<actorId>.<effId>"
```

- [ ] **Step 2: Record the confirmed format**

Write the exact observed key templates into the Task 2 test below if they differ from the templates assumed here (`!actors.items!A.I`, `!actors.items.effects!A.I.E`, `!actors.effects!A.E`). If a dnd5e monster has no embedded-item effects to confirm the deepest level, the pattern is recursive (`!<coll>.<embedded>!<parents...>`) and matches the existing item-pack `!items.effects!doc.eff` — proceed with the assumed template.

No commit (investigation only).

---

## Task 2: `keys.mjs` — nested-embed `_key` injection for actor packs (TDD)

**Files:**
- Modify: `scripts/pack-tools/keys.mjs`
- Test: `scripts/pack-tools/keys.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/pack-tools/keys.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectKeys, stripKeys } from './keys.mjs';

const actorDoc = () => ({
  _id: 'goblinactor00001',
  name: 'Test Goblin',
  type: 'npc',
  effects: [{ _id: 'goblinaeffect001', name: 'Mark', changes: [] }],
  items: [{
    _id: 'gobitem000000001',
    name: 'Bite',
    system: { activities: { gobact0000000001: { _id: 'gobact0000000001', type: 'attack' } } },
    effects: [{ _id: 'gobitemeffect001', name: 'Bleed', changes: [] }],
  }],
});

test('injectKeys(actors) sets actor _key', () => {
  const d = injectKeys(actorDoc(), 'actors', 'test-goblin.json');
  assert.equal(d._key, '!actors!goblinactor00001');
});

test('injectKeys(actors) sets actor-own effect _key', () => {
  const d = injectKeys(actorDoc(), 'actors', 'test-goblin.json');
  assert.equal(d.effects[0]._key, '!actors.effects!goblinactor00001.goblinaeffect001');
});

test('injectKeys(actors) sets embedded item _key', () => {
  const d = injectKeys(actorDoc(), 'actors', 'test-goblin.json');
  assert.equal(d.items[0]._key, '!actors.items!goblinactor00001.gobitem000000001');
});

test('injectKeys(actors) sets embedded item-effect _key', () => {
  const d = injectKeys(actorDoc(), 'actors', 'test-goblin.json');
  assert.equal(d.items[0].effects[0]._key, '!actors.items.effects!goblinactor00001.gobitem000000001.gobitemeffect001');
});

test('injectKeys(actors) rejects a wrong-length item id', () => {
  const d = actorDoc();
  d.items[0]._id = 'tooShort';
  assert.throws(() => injectKeys(d, 'actors', 'test-goblin.json'), /16 alphanumeric/);
});

test('injectKeys(actors) rejects a wrong-length embedded activity id', () => {
  const d = actorDoc();
  d.items[0].system.activities = { short: { _id: 'short', type: 'attack' } };
  assert.throws(() => injectKeys(d, 'actors', 'test-goblin.json'), /16 alphanumeric/);
});

test('injectKeys(items) still sets item-pack effect _key (unchanged)', () => {
  const d = injectKeys({ _id: 'abilitydoc000001', name: 'Bolt', effects: [{ _id: 'abilityeff000001', name: 'E' }] }, 'items', 'bolt.json');
  assert.equal(d._key, '!items!abilitydoc000001');
  assert.equal(d.effects[0]._key, '!items.effects!abilitydoc000001.abilityeff000001');
});

test('stripKeys removes _key at every actor level', () => {
  const d = injectKeys(actorDoc(), 'actors', 'test-goblin.json');
  stripKeys(d);
  assert.equal(d._key, undefined);
  assert.equal(d.effects[0]._key, undefined);
  assert.equal(d.items[0]._key, undefined);
  assert.equal(d.items[0].effects[0]._key, undefined);
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `node --test scripts/pack-tools/keys.test.mjs`
Expected: FAIL — the `actors` branch does not exist yet, so embedded `_key`s are `undefined` (e.g. `expected '!actors.items!...' got undefined`); `stripKeys` test for `items[0]` also fails.

- [ ] **Step 3: Implement the actor branch**

Replace the body of `injectKeys` and `stripKeys` in `scripts/pack-tools/keys.mjs` with the following (keep the file's top comment block + `ID16`/`checkId` + `VOLATILE`). Factor a shared per-item helper so item-pack and actor-embedded items reuse effect/activity logic:

```js
// Inject _key onto an item's embedded effects + validate its activity ids.
// effectColl is the LevelDB collection segment for that item's effects:
//   item pack          -> "items.effects",      keyed by <itemId>
//   actor-embedded item-> "actors.items.effects", keyed by <actorId>.<itemId>
function injectItemEmbeds(item, effectColl, keyPath, file) {
  for (const eff of item.effects ?? []) {
    checkId(eff._id, `effect "${eff.name}" in "${item.name}"`, file);
    eff._key = `!${effectColl}!${keyPath}.${eff._id}`;
  }
  for (const [aid, act] of Object.entries(item.system?.activities ?? {})) {
    checkId(aid, `activity in "${item.name}"`, file);
    if (act?._id && act._id !== aid) throw new Error(`${file}: activity key "${aid}" != _id "${act._id}" in "${item.name}"`);
  }
}

export function injectKeys(doc, coll, file) {
  checkId(doc._id, `doc "${doc.name}"`, file);
  doc._key = `!${coll}!${doc._id}`;

  if (coll === "actors") {
    for (const eff of doc.effects ?? []) {
      checkId(eff._id, `effect "${eff.name}" on actor "${doc.name}"`, file);
      eff._key = `!actors.effects!${doc._id}.${eff._id}`;
    }
    for (const item of doc.items ?? []) {
      checkId(item._id, `item "${item.name}" in actor "${doc.name}"`, file);
      item._key = `!actors.items!${doc._id}.${item._id}`;
      injectItemEmbeds(item, "actors.items.effects", `${doc._id}.${item._id}`, file);
    }
    return doc;
  }

  // item pack (default)
  injectItemEmbeds(doc, `${coll}.effects`, doc._id, file);
  return doc;
}
```

And update `stripKeys` to walk the actor depth too:

```js
export function stripKeys(doc) {
  delete doc._key;
  if (doc._stats) for (const k of VOLATILE) delete doc._stats[k];
  const stripEffects = (host) => {
    for (const eff of host.effects ?? []) {
      delete eff._key;
      if (eff._stats) for (const k of VOLATILE) delete eff._stats[k];
    }
  };
  stripEffects(doc);
  for (const item of doc.items ?? []) {
    delete item._key;
    if (item._stats) for (const k of VOLATILE) delete item._stats[k];
    stripEffects(item);
  }
  return doc;
}
```

Note: the item-pack `injectItemEmbeds(doc, ...)` call reproduces the previous behaviour exactly (`!items.effects!<docId>.<effId>` + the activity checks). The actor-own effect key uses `!actors.effects!...`. If Task 1 found different literal templates, substitute them here and in the Task 2 test.

- [ ] **Step 4: Run the test, verify it passes**

Run: `node --test scripts/pack-tools/keys.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the existing unit suite to confirm no regression**

Run: `npm run content:unit`
Expected: PASS — existing `assert.test.mjs` + `schema.test.mjs` unaffected; `keys.test.mjs` green.

- [ ] **Step 6: Commit**

```bash
git add scripts/pack-tools/keys.mjs scripts/pack-tools/keys.test.mjs
git commit -m "feat(pack-tools): keys.mjs nested-embed _key walk for actor packs

actor->items->item-effects->activities + actor-own effects, 16-char id
checks at every level; stripKeys mirror. Shared injectItemEmbeds helper
keeps item-pack behavior unchanged. Unit-tested.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Register the `forge-npcs` actors pack

**Files:**
- Modify: `scripts/pack-tools/modules.mjs`
- Modify: `forge-content/module.json`

- [ ] **Step 1: Register the collection override**

In `scripts/pack-tools/modules.mjs`, set the `COLLECTIONS` map (replace the commented placeholder):

```js
// pack name -> primary document collection (default "items" if absent).
export const COLLECTIONS = {
  "forge-npcs": "actors",
};
```

- [ ] **Step 2: Add the pack to `forge-content/module.json`**

In `forge-content/module.json`, add a second entry to the `"packs"` array (after `forge-abilities`):

```json
    {
      "name": "forge-npcs",
      "label": "Forge NPCs",
      "path": "packs/forge-npcs",
      "type": "Actor",
      "system": "dnd5e",
      "ownership": { "PLAYER": "OBSERVER", "ASSISTANT": "OWNER" }
    }
```

- [ ] **Step 3: Commit**

```bash
git add scripts/pack-tools/modules.mjs forge-content/module.json
git commit -m "feat(forge-content): register forge-npcs actors pack

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Author `test-goblin.json` and prove the build round-trip

**Files:**
- Create: `forge-content/src/packs/forge-npcs/test-goblin.json`

- [ ] **Step 1: Author the fixture**

Create `forge-content/src/packs/forge-npcs/test-goblin.json`. dnd5e `npc` type, minimal valid statblock, with one inlined `searing-bolt` copy carrying **fresh** 16-char ids (item `tgsearingbolt001`, activity `tgdmgfire0000001`) so it can never collide with the source ability. Authored WITHOUT `_key` — `injectKeys` adds them at build.

```json
{
  "_id": "testgoblin000001",
  "name": "Test Goblin",
  "type": "npc",
  "img": "icons/creatures/mammals/humanoid-goblin-green.webp",
  "system": {
    "abilities": {
      "str": { "value": 8 },
      "dex": { "value": 14 },
      "con": { "value": 10 },
      "int": { "value": 10 },
      "wis": { "value": 8 },
      "cha": { "value": 8 }
    },
    "attributes": {
      "hp": { "value": 20, "max": 20, "formula": "" },
      "ac": { "calc": "flat", "flat": 13 }
    },
    "details": {
      "cr": 1,
      "type": { "value": "humanoid" }
    }
  },
  "items": [
    {
      "_id": "tgsearingbolt001",
      "name": "Searing Bolt",
      "type": "feat",
      "img": "icons/magic/fire/projectile-fireball-orange.webp",
      "system": {
        "description": { "value": "<p>You hurl a mote of fire at a creature within range, dealing 10 fire damage.</p>", "chat": "" },
        "activities": {
          "tgdmgfire0000001": {
            "_id": "tgdmgfire0000001",
            "type": "damage",
            "activation": { "type": "action", "value": 1 },
            "range": { "value": 60, "units": "ft" },
            "target": { "affects": { "type": "creature", "count": "1" } },
            "damage": { "parts": [ { "types": ["fire"], "custom": { "enabled": true, "formula": "10" }, "scaling": { "mode": "", "number": null, "formula": "" } } ] }
          }
        },
        "identifier": "searing-bolt",
        "source": { "revision": 1, "rules": "2024" },
        "properties": [],
        "requirements": "",
        "type": { "value": "", "subtype": "" }
      },
      "effects": [],
      "flags": {}
    }
  ],
  "effects": [],
  "flags": {},
  "folder": null
}
```

- [ ] **Step 2: Build the pack**

Run: `npm run packs:build forge-content`
Expected: console shows `[forge-content] packing "forge-npcs" (1 docs, 0 folders, coll=actors)...` then `✅ Packs built.` and NO `16 alphanumeric` / `[object Object]` throw. (If it throws on an id length, fix the offending id to 16 alphanumeric chars.)

- [ ] **Step 3: Prove the round-trip is byte-stable**

Unpack what was just built into a scratch dir and diff the embedded structure. `packs:unpack` rewrites into `src/` with `<Name>_<id>.json` names (it is import-mode), so unpack to a temp location and compare the document body instead of letting it clobber the hand-named source.

Run:
```bash
cd /home/muckelbauer@sinc-intern.de/git/forge-char-creator
rm -rf /tmp/fc-npc-rt && mkdir -p /tmp/fc-npc-rt
npx fvtt package unpack forge-npcs --in forge-content/packs --out /tmp/fc-npc-rt
# show the embed keys the CLI round-tripped (sanity on Task 1's format)
grep -rho '"_key": "[^"]*"' /tmp/fc-npc-rt | sort -u
# confirm the inlined ability + its activity survived (not silently dropped)
grep -c '"identifier": "searing-bolt"' /tmp/fc-npc-rt/*.json
grep -c 'tgdmgfire0000001' /tmp/fc-npc-rt/*.json
```
Expected: the `_key` lines match Task 1's confirmed templates; both `grep -c` print `1` (item + activity preserved). If either is `0`, the `_key` format is wrong — return to Task 1/2.

- [ ] **Step 4: Commit**

```bash
git add forge-content/src/packs/forge-npcs/test-goblin.json
git commit -m "feat(forge-content): test-goblin npc fixture (inlines re-keyed searing-bolt)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `validateActor()` — pre-boot actor expect schema (TDD)

**Files:**
- Modify: `forge-content/verify/schema.mjs`
- Test: `forge-content/verify/schema.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `forge-content/verify/schema.test.mjs`:

```js
import { validateActor } from './schema.mjs';

test('validateActor accepts a well-formed actor expectation', () => {
  const errs = validateActor({ tier: 'T2', assert: { hpMax: 20, ac: 13, abilities: { dex: 14 }, hasItems: ['Searing Bolt'] } });
  assert.deepEqual(errs, []);
});

test('validateActor rejects an unknown assert key', () => {
  const errs = validateActor({ tier: 'T2', assert: { hitPoints: 20 } });
  assert.ok(errs.some(e => e.includes('hitPoints')));
});

test('validateActor rejects an unknown top-level key', () => {
  const errs = validateActor({ tier: 'T2', steps: [], assert: { hpMax: 20 } });
  assert.ok(errs.some(e => e.includes('steps')));
});

test('validateActor requires an assert object', () => {
  const errs = validateActor({ tier: 'T2' });
  assert.ok(errs.some(e => e.includes('assert')));
});

test('validateActor rejects non-array hasItems', () => {
  const errs = validateActor({ tier: 'T2', assert: { hasItems: 'Searing Bolt' } });
  assert.ok(errs.some(e => e.includes('hasItems')));
});
```

(`test` and `assert` are already imported at the top of `schema.test.mjs` — do not re-import them.)

- [ ] **Step 2: Run the test, verify it fails**

Run: `node --test forge-content/verify/schema.test.mjs`
Expected: FAIL — `validateActor` is not exported (`SyntaxError`/`undefined is not a function`).

- [ ] **Step 3: Implement `validateActor`**

Append to `forge-content/verify/schema.mjs`:

```js
// --- Actor pack expectations (Iter 1: load + derived-stat asserts only) ---
// Distinct shape from ability expects: no scaffold actors/steps, just stat asserts
// against the single authored actor under test.
const ACTOR_TOP_KEYS = ['tier', 'assert'];
export const ACTOR_ASSERT_KEYS = ['hpMax', 'ac', 'abilities', 'hasItems'];

export function validateActor(expectation) {
  if (!expectation || typeof expectation !== 'object') return ['actor expectation must be a non-null object'];
  const errs = [];
  for (const k of Object.keys(expectation)) if (!ACTOR_TOP_KEYS.includes(k)) errs.push(`unknown top-level key "${k}" (actor expect)`);
  const a = expectation.assert;
  if (!a || typeof a !== 'object' || Array.isArray(a)) { errs.push('actor expect missing "assert" object'); return errs; }
  for (const k of Object.keys(a)) if (!ACTOR_ASSERT_KEYS.includes(k)) errs.push(`unknown actor assert key "${k}"`);
  if ('abilities' in a && (typeof a.abilities !== 'object' || Array.isArray(a.abilities))) errs.push('"abilities" must be an object map');
  if ('hasItems' in a && !Array.isArray(a.hasItems)) errs.push('"hasItems" must be an array');
  return errs;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `node --test forge-content/verify/schema.test.mjs`
Expected: PASS (existing schema tests + the 5 new `validateActor` tests).

- [ ] **Step 5: Commit**

```bash
git add forge-content/verify/schema.mjs forge-content/verify/schema.test.mjs
git commit -m "feat(verify): validateActor pre-boot actor expect schema

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `actorLoadCheck` — browser-side T1/T2 handler

**Files:**
- Modify: `forge-content/verify/checks.mjs`

This handler runs inside Foundry (shipped via `page.evaluate`, like `genericCheck`). It is a self-contained function: imports the authored actor into the test world (flagged so `isolate()` sweeps it), reads derived data, asserts, deletes in `finally`. No unit test — its proof is the green gate in Task 8 (the repo pattern: browser-side handlers are proven by `content:verify`, not node units).

- [ ] **Step 1: Add and export `actorLoadCheck`**

Append to `forge-content/verify/checks.mjs`:

```js
// Iter 1 actor gate. Imports an authored NPC into the world (forge-content.test
// flagged -> isolate() cleans it), then asserts T1 (loads, items present) + T2
// (derived stats). Self-contained: shipped to the browser via page.evaluate.
// arg = { doc, expectation }. Returns { ok, fails:[] }.
export async function actorLoadCheck({ doc, expectation }) {
  const fails = [];
  let actor;
  try {
    const data = foundry.utils.deepClone(doc);
    delete data._key;
    foundry.utils.setProperty(data, 'flags.forge-content.test', true);
    actor = await Actor.create(data);
    if (!actor) return { ok: false, fails: ['Actor.create returned null — doc failed to load (T1)'] };

    const a = expectation.assert ?? {};
    if ('hpMax' in a) {
      const got = actor.system.attributes?.hp?.max;
      if (got !== a.hpMax) fails.push(`hpMax expected ${a.hpMax}, got ${got}`);
    }
    if ('ac' in a) {
      const got = actor.system.attributes?.ac?.value;
      if (got !== a.ac) fails.push(`ac expected ${a.ac}, got ${got}`);
    }
    if (a.abilities) {
      for (const [k, v] of Object.entries(a.abilities)) {
        const got = actor.system.abilities?.[k]?.value;
        if (got !== v) fails.push(`ability ${k} expected ${v}, got ${got}`);
      }
    }
    for (const name of a.hasItems ?? []) {
      if (!actor.items.find(i => i.name === name)) fails.push(`missing item "${name}"`);
    }
  } catch (e) {
    fails.push(`exception: ${e.message}`);
  } finally {
    if (actor) await actor.delete().catch(() => {});
  }
  return { ok: fails.length === 0, fails };
}
```

- [ ] **Step 2: Sanity-check the file parses**

Run: `node --check forge-content/verify/checks.mjs`
Expected: no output (exit 0) — no syntax error.

- [ ] **Step 3: Commit**

```bash
git add forge-content/verify/checks.mjs
git commit -m "feat(verify): actorLoadCheck T1/T2 handler (import + derived-stat asserts)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Dispatcher collection split in `content.spec.mjs`

**Files:**
- Modify: `forge-content/verify/content.spec.mjs`

`gather()` currently treats every pack doc as an ability and runs `genericCheck`. Actors need their own route. Tag each gathered doc with its collection (from `COLLECTIONS`), split into `ITEMS` (abilities) and `ACTORS`, validate actors with `validateActor` pre-boot, and run them through `actorLoadCheck` after boot.

- [ ] **Step 1: Import the registry and `actorLoadCheck`/`validateActor`**

In `forge-content/verify/content.spec.mjs`, extend the existing imports:

```js
import { installGateHelpers, genericCheck, actorLoadCheck } from './checks.mjs';
import { validate, validateActor, KNOWN_KEYS } from './schema.mjs';
import { COLLECTIONS } from '../../scripts/pack-tools/modules.mjs';
```

- [ ] **Step 2: Tag gathered docs with their collection**

In `gather()`, add the pack's collection to each pushed record. Change the `out.push({...})` block to include `coll`:

```js
      out.push({
        pack: pack.name,
        coll: COLLECTIONS[pack.name] ?? 'items',
        doc: JSON.parse(readFileSync(join(dir, f), 'utf8')),
        expectation: existsSync(expectFile) ? JSON.parse(readFileSync(expectFile, 'utf8')) : null,
      });
```

- [ ] **Step 3: Split ALL into abilities vs actors**

Replace the `ITEMS` definition (the line `const ITEMS = ALL.filter(...)`) with a split. Actors honour the same `FC_ONLY` filter:

```js
const match = (i) => !process.env.FC_ONLY || i.doc.name.toLowerCase().includes(process.env.FC_ONLY.toLowerCase());
const ITEMS  = ALL.filter(i => i.coll === 'items').filter(match);
const ACTORS = ALL.filter(i => i.coll === 'actors').filter(match);
```

- [ ] **Step 4: Validate actor expectations pre-boot and run them after boot**

In the test body: (a) after the existing ability `untested`/`v2errors` checks, add the actor pre-boot validation; (b) after the ability loop, add the actor loop. Insert the actor pre-boot block right before `await bootFoundry(page);`:

```js
    // Actor packs (Iter 1): load + derived-stat checks. Distinct expect shape.
    const actorUntested = ACTORS.filter(a => !a.expectation).map(a => a.doc.name);
    expect(actorUntested, `Actors missing <name>.expect.json: ${actorUntested.join(', ')}`).toEqual([]);
    const actorErrors = ACTORS.flatMap(a => validateActor(a.expectation).map(e => `${a.doc.name}: ${e}`));
    expect(actorErrors, `actor expect.json validation errors:\n${actorErrors.join('\n')}`).toEqual([]);
```

Then ship `actorLoadCheck` into the browser alongside the other `page.evaluate` installs — add this right after the `assertSnapshot` install line (`await page.evaluate((src) => { ... assertSnapshot ... })`):

```js
    await page.evaluate((src) => { globalThis.__fcGate.actorLoadCheck = (0, eval)(`(${src})`); }, actorLoadCheck.toString());
```

Finally, after the ability `for (const item of ITEMS)` loop (after it pushes to `results`), add the actor loop before the `const failed = ...` line:

```js
    for (const actorItem of ACTORS) {
      await page.evaluate(isolate);
      const r = await page.evaluate((arg) => globalThis.__fcGate.actorLoadCheck(arg), { doc: actorItem.doc, expectation: actorItem.expectation });
      results.push({ name: actorItem.doc.name, tier: actorItem.expectation.tier, ...r });
      console.log(`${r.ok ? '✓' : '✘'} [${actorItem.expectation.tier}] ${actorItem.doc.name}${r.ok ? '' : ' — ' + r.fails.join('; ')}`);
    }
```

Note: `actorLoadCheck` is installed onto `__fcGate` and invoked by reference (not passed directly to `page.evaluate`) because it calls `Actor.create`/`foundry.*` — installing it the same way as `assertSnapshot` keeps the one-arg evaluate signature clean and consistent with the existing pattern.

- [ ] **Step 4b: Guard `ITEMS.length > 0` no longer over-asserts**

The existing `expect(ITEMS.length, 'No abilities found ...').toBeGreaterThan(0)` is still valid (abilities exist). Leave it. No change.

- [ ] **Step 5: Sanity-check the file parses**

Run: `node --check forge-content/verify/content.spec.mjs`
Expected: exit 0, no syntax error.

- [ ] **Step 6: Commit**

```bash
git add forge-content/verify/content.spec.mjs
git commit -m "feat(verify): dispatcher routes actor packs to actorLoadCheck

gather tags docs with collection; ITEMS (abilities) keep genericCheck,
ACTORS run actorLoadCheck w/ validateActor pre-boot. FC_ONLY honored for both.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Author the actor expect + run the full gate green

**Files:**
- Create: `forge-content/src/packs/forge-npcs/test-goblin.expect.json`

- [ ] **Step 1: Author the expect**

Create `forge-content/src/packs/forge-npcs/test-goblin.expect.json`:

```json
{
  "tier": "T2",
  "assert": {
    "hpMax": 20,
    "ac": 13,
    "abilities": { "str": 8, "dex": 14 },
    "hasItems": ["Searing Bolt"]
  }
}
```

- [ ] **Step 2: Run only the goblin through the gate first (fast iteration)**

Build is regenerated each run by `content:verify`? It is not — the gate reads `src/` JSON directly (see `gather()`), so no rebuild needed for the gate. Run the gate scoped to the goblin:

Run: `FC_ONLY=goblin npm run content:verify`
Expected (after the ~3-4m boot): `✓ [T2] Test Goblin` and the Playwright test passes (`1 passed`). If `ac` mismatches, dnd5e may derive npc flat AC elsewhere — inspect `actor.system.attributes.ac` in the failure and adjust the assert/field (`ac.calc:"flat"` + `ac.flat` is the expected source). If `hpMax` mismatches, confirm `attributes.hp.max` is set on the fixture.

- [ ] **Step 3: Run the FULL gate (no filter) to confirm no regression to the ability suite**

Run: `npm run content:verify`
Expected: every ability check still `✓` AND `✓ [T2] Test Goblin`; `1 passed`. This is the integration proof for Tasks 6–7 (browser-side handler + dispatcher split).

- [ ] **Step 4: Commit**

```bash
git add forge-content/src/packs/forge-npcs/test-goblin.expect.json
git commit -m "test(forge-content): test-goblin T2 actor-load gate (hp/ac/abilities/item)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Update TODO / decisions log

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Record Iter-1 completion**

Add to `TODO.md` (under a new `## Actor creation` section near the roadmap):

```markdown
## Actor creation (NEW pipeline) — Iter 1 DONE ✅
4-iter split (spec docs/superpowers/specs/2026-06-05-actor-creation-iter1-design.md):
1 actor spine (THIS) · 2 compose+catalog · 3 knobs · 4 actor-T3-combat+reactions.
- Iter 1: `forge-npcs` actors pack + `COLLECTIONS["forge-npcs"]="actors"`.
  `keys.mjs` extended to inject nested `_key`s (actor->items->item-effects->activities
  + actor-own effects), 16-char ids enforced at every level, unit-tested
  (`keys.test.mjs`). Hand-authored `test-goblin` npc inlines a re-keyed `searing-bolt`.
  New `actorLoadCheck` (T1 loads + T2 derived hp/ac/abilities/item present) +
  `validateActor` pre-boot schema; dispatcher splits ability vs actor packs by
  collection. Reused ability NOT re-proven (test-explosion guard). Gate green.
- Confirmed nested `_key` format empirically off dnd5e `monsters` pack (Task 1).
- NEXT: Iter 2 — actor source = stats + [ability ids], build inlines from
  forge-abilities (auto re-key); ability metadata -> generated CATALOG.md.
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs(todo): actor creation Iter 1 done; Iter 2 next

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (completed during plan authoring)

**Spec coverage:**
- Pack + registry wiring → Task 3. ✅
- `keys.mjs` nested-embed walk + id checks + `stripKeys` mirror → Task 2. ✅
- Empirical `_key` format verification → Task 1 + Task 4 Step 3 round-trip. ✅
- Authored `test-goblin` fixture (npc + re-keyed searing-bolt) → Task 4. ✅
- Actor gate path `actorLoadCheck` (T1+T2, world-import + flag cleanup) → Task 6. ✅
- Actor expect schema validated pre-boot → Task 5 (`validateActor`). ✅
- Dispatcher must distinguish actor packs from ability packs (spec's under-stated gap) → Task 7. ✅
- "Reused ability not re-proven" guard → no combat task authored; expect is load-only. ✅
- Keep fixture committed → Task 4/8 commit it; not deleted. ✅
- Derived-data source open question (temp-doc vs world-import) → resolved to world-import in Task 6, with Task 8 Step 2 inspection fallback if a field derives elsewhere. ✅

**Placeholder scan:** No TBD/"handle edge cases"/uncoded steps. Every code step shows full code; every run step shows command + expected output. The only conditional is "if Task 1's literal templates differ, substitute" — that is the de-risk design, not a placeholder (the assumed templates are written out in full and used).

**Type/name consistency:** `injectKeys(doc, coll, file)` / `stripKeys(doc)` / `injectItemEmbeds(item, effectColl, keyPath, file)` consistent across Task 2. `validateActor(expectation)` defined Task 5, imported + called Task 7. `actorLoadCheck({doc, expectation})` defined Task 6, installed on `__fcGate` + invoked Task 7. `COLLECTIONS` key `"forge-npcs"` consistent (Task 3 ↔ Task 7). Fixture ids (`testgoblin000001`, `tgsearingbolt001`, `tgdmgfire0000001`) all 16 alphanumeric; assert values (hpMax 20, ac 13, str 8, dex 14, "Searing Bolt") match the fixture in Task 4 ↔ Task 8.
