# Declarative Scene Engine for the forge-content Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the 5 bespoke forge-content verify handlers into one declarative `genericCheck` driven by expect.json v2, with a single unknown-key-rejecting assert layer.

**Architecture:** Three layers on `globalThis.__fcGate` (browser): builders (exist) → `runScene` (new, Foundry-touching) → `assertSnapshot` (new, PURE — shipped to the browser by `Function.toString()` so the identical function is unit-tested in node). A pure `schema.mjs` validates each expect.json node-side before the ~3.8-minute Foundry boot. Migration is gate-green per commit via **shape-dispatch coexistence**: while migrating, `content.spec.mjs` routes an item to `genericCheck` if its expect.json has an `actors` key, else to the old handler. When all 9 abilities are on v2, the old handlers and the dispatch fork are deleted.

**Tech Stack:** Node 25 (`node --test` for pure-logic unit tests), Playwright (the gate, headed under xvfb), Foundry VTT 13.351 + dnd5e 5.2.5 + midi-qol 13.0.63.

**Deviation from spec (deliberate):** the spec's increment 1 was a "behavior-identical extract" keeping old expect.json keys. That forces `assertSnapshot` to speak the old vocabulary then re-rename it later. Instead this plan ports one ability at a time directly to v2 (Tasks 4–12), with the old handlers kept alive only via shape-dispatch until the last ability flips (Task 13). End-state is identical; every commit stays gate-green and bisectable. The spec's count of "7" expect.json is wrong — there are **9** (searing-bolt, squires-mark, radiant-rebuke, example-strike, bracers-of-defense, example-blast, example-rally, rending-pounce, example-boon).

---

## File Structure

- `forge-content/verify/assert.mjs` — NEW. Pure `assertSnapshot(asserts, snapshots, knownKeys)`. The ONE assert vocabulary. Self-contained (inlines its own `getPath`) so `assertSnapshot.toString()` ships cleanly to the browser. Node-unit-tested.
- `forge-content/verify/schema.mjs` — NEW. Pure `KNOWN_KEYS` (array) + `validate(expectation, identifiers)` → `string[]` errors. Node-unit-tested.
- `forge-content/verify/assert.test.mjs` — NEW. `node --test` unit tests for `assertSnapshot`.
- `forge-content/verify/schema.test.mjs` — NEW. `node --test` unit tests for `validate`.
- `forge-content/verify/checks.mjs` — MODIFY. Add `runScene` + `genericCheck` to `installGateHelpers`/exports; delete the 5 bespoke handler bodies in the final task.
- `forge-content/verify/content.spec.mjs` — MODIFY. Ship `assertSnapshot` via `toString`; pre-boot `validate()`; shape-dispatch then (final task) always-`genericCheck`.
- `forge-content/src/packs/forge-abilities/*.expect.json` — REWRITE all 9 to v2 (one per task).
- `package.json` — MODIFY. Add `"content:unit": "node --test forge-content/verify/"`.

**Snapshot object shape** (produced by `runScene`, consumed by `assertSnapshot`) — fixed contract used by every task:

```js
// snapshots = { "<label>": { __run: { targetedCount }, "<actorName>": ActorSnap, ... } }
// ActorSnap = {
//   hp, hpDelta, tempHp, acDelta, abilityDelta: { str:0, dex:0, ... },
//   statuses: [..], effects: [..names..], flags: {..deepClone..}, ticks,
//   lastWorkflow: { advantage:false, disadvantage:false, hit:false, crit:false, total:null }
// }
```

---

## Task 1: Pure assert layer (`assert.mjs`) — TDD

**Files:**
- Create: `forge-content/verify/assert.mjs`
- Create: `forge-content/verify/assert.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the unit-test npm script**

In `package.json` `"scripts"`, add after `"content:verify"`:

```json
    "content:unit": "node --test forge-content/verify/"
```

- [ ] **Step 2: Write the failing test**

Create `forge-content/verify/assert.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSnapshot } from './assert.mjs';

const KEYS = ['hpDelta','hpDeltaMin','hpDeltaMax','tempHp','acDelta','abilityDelta',
  'conditionApplied','effectApplied','effectAbsent','flagPresent','ticks',
  'lastWorkflow.advantage','lastWorkflow.disadvantage','lastWorkflow.hit','lastWorkflow.crit','targetedCount'];

const actorSnap = (over = {}) => ({
  hp: 100, hpDelta: 0, tempHp: 0, acDelta: 0, abilityDelta: {}, statuses: [],
  effects: [], flags: {}, ticks: 0,
  lastWorkflow: { advantage: false, disadvantage: false, hit: false, crit: false, total: null },
  ...over,
});

test('passing hpDelta yields no fails', () => {
  const snaps = { main: { def: actorSnap({ hpDelta: -10 }) } };
  assert.deepEqual(assertSnapshot([{ at: 'main', actor: 'def', hpDelta: -10 }], snaps, KEYS), []);
});

test('failing hpDelta reports got vs expected', () => {
  const snaps = { main: { def: actorSnap({ hpDelta: -6 }) } };
  const f = assertSnapshot([{ at: 'main', actor: 'def', hpDelta: -10 }], snaps, KEYS);
  assert.equal(f.length, 1);
  assert.match(f[0], /hpDelta expected -10, got -6/);
});

test('unknown assert key is a hard fail (problem #2)', () => {
  const snaps = { main: { def: actorSnap() } };
  const f = assertSnapshot([{ at: 'main', actor: 'def', defenderHPDelta: -10 }], snaps, KEYS);
  assert.equal(f.length, 1);
  assert.match(f[0], /unknown assert key "defenderHPDelta"/);
});

test('missing snapshot label is a hard fail', () => {
  const f = assertSnapshot([{ at: 'nope', actor: 'def', hpDelta: 0 }], {}, KEYS);
  assert.match(f[0], /no such snapshot/);
});

test('missing actor in snapshot is a hard fail', () => {
  const snaps = { main: { other: actorSnap() } };
  const f = assertSnapshot([{ at: 'main', actor: 'def', hpDelta: 0 }], snaps, KEYS);
  assert.match(f[0], /actor "def": not in snapshot/);
});

test('flagPresent uses dotted path', () => {
  const snaps = { main: { def: actorSnap({ flags: { world: { squiresMark: true } } }) } };
  assert.deepEqual(assertSnapshot([{ at: 'main', actor: 'def', flagPresent: 'flags.world.squiresMark' }], snaps, KEYS), []);
  const f = assertSnapshot([{ at: 'main', actor: 'def', flagPresent: 'flags.world.absent' }], snaps, KEYS);
  assert.match(f[0], /flag "flags.world.absent" not present/);
});

test('effectAbsent fails when effect present', () => {
  const snaps = { main: { def: actorSnap({ effects: ['Example Boon'] }) } };
  const f = assertSnapshot([{ at: 'main', actor: 'def', effectAbsent: 'Example Boon' }], snaps, KEYS);
  assert.match(f[0], /should be absent/);
});

test('hpDeltaMin / hpDeltaMax range', () => {
  const snaps = { main: { def: actorSnap({ hpDelta: -20 }) } };
  assert.deepEqual(assertSnapshot([{ at: 'main', actor: 'def', hpDeltaMin: -36, hpDeltaMax: -6 }], snaps, KEYS), []);
  const f = assertSnapshot([{ at: 'main', actor: 'def', hpDeltaMin: -10 }], snaps, KEYS);
  assert.match(f[0], /below min/);
});

test('abilityDelta checks named ability', () => {
  const snaps = { main: { d: actorSnap({ abilityDelta: { str: 2 } }) } };
  assert.deepEqual(assertSnapshot([{ at: 'main', actor: 'd', abilityDelta: { ability: 'str', delta: 2 } }], snaps, KEYS), []);
});

test('targetedCount is run-scoped (no actor)', () => {
  const snaps = { main: { __run: { targetedCount: 3 }, d: actorSnap() } };
  assert.deepEqual(assertSnapshot([{ at: 'main', targetedCount: 3 }], snaps, KEYS), []);
  const f = assertSnapshot([{ at: 'main', targetedCount: 2 }], snaps, KEYS);
  assert.match(f[0], /targetedCount expected 2, got 3/);
});

test('lastWorkflow.advantage', () => {
  const snaps = { buffed: { ally: actorSnap({ lastWorkflow: { advantage: true, disadvantage: false, hit: true, crit: false, total: 18 } }) } };
  assert.deepEqual(assertSnapshot([{ at: 'buffed', actor: 'ally', 'lastWorkflow.advantage': true }], snaps, KEYS), []);
});
```

- [ ] **Step 3: Run the test, verify it FAILS**

Run: `npm run content:unit`
Expected: FAIL — `Cannot find module './assert.mjs'` / `assertSnapshot is not a function`.

- [ ] **Step 4: Implement `assert.mjs`**

Create `forge-content/verify/assert.mjs`:

```js
// PURE assert layer for the forge-content gate. No Foundry/browser globals — so the
// identical function is unit-tested in node (assert.test.mjs) AND shipped to the
// Foundry browser context via assertSnapshot.toString() (see content.spec.mjs).
// Self-contained: inlines its own getPath so toString() carries no dependencies.
//
// asserts: [{ at, actor?, <key>: <value>, ... }]  (one entry may carry several keys)
// snapshots: { "<label>": { __run?: { targetedCount }, "<actorName>": ActorSnap } }
// knownKeys: string[]  (array, not Set — crosses the page.evaluate boundary as JSON)
// returns: string[] failure messages (empty array = pass)
export function assertSnapshot(asserts, snapshots, knownKeys) {
  const getPath = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const RUN_KEYS = ['targetedCount'];
  const fails = [];
  for (const entry of asserts) {
    const { at, actor, ...keys } = entry;
    const snap = snapshots[at];
    if (!snap) { fails.push(`assert at "${at}": no such snapshot`); continue; }
    for (const [k, want] of Object.entries(keys)) {
      if (!knownKeys.includes(k)) { fails.push(`unknown assert key "${k}"`); continue; }
      if (RUN_KEYS.includes(k)) {
        const got = snap.__run ? snap.__run[k] : undefined;
        if (got !== want) fails.push(`${at}: ${k} expected ${want}, got ${got}`);
        continue;
      }
      const a = snap[actor];
      if (!a) { fails.push(`assert at "${at}" actor "${actor}": not in snapshot`); continue; }
      const L = `${at}/${actor}`;
      switch (k) {
        case 'hpDelta': if (a.hpDelta !== want) fails.push(`${L}: hpDelta expected ${want}, got ${a.hpDelta}`); break;
        case 'hpDeltaMin': if (a.hpDelta < want) fails.push(`${L}: hpDelta ${a.hpDelta} below min ${want}`); break;
        case 'hpDeltaMax': if (a.hpDelta > want) fails.push(`${L}: hpDelta ${a.hpDelta} above max ${want}`); break;
        case 'tempHp': if (a.tempHp !== want) fails.push(`${L}: tempHp expected ${want}, got ${a.tempHp}`); break;
        case 'acDelta': if (a.acDelta !== want) fails.push(`${L}: acDelta expected ${want}, got ${a.acDelta}`); break;
        case 'abilityDelta': {
          const got = a.abilityDelta ? a.abilityDelta[want.ability] : undefined;
          if (got !== want.delta) fails.push(`${L}: ${want.ability} delta expected ${want.delta}, got ${got}`);
          break;
        }
        case 'conditionApplied': if (!a.statuses.includes(want)) fails.push(`${L}: condition "${want}" not applied`); break;
        case 'effectApplied': if (!a.effects.includes(want)) fails.push(`${L}: effect "${want}" not applied`); break;
        case 'effectAbsent': if (a.effects.includes(want)) fails.push(`${L}: effect "${want}" should be absent`); break;
        case 'flagPresent': if (!getPath({ flags: a.flags }, want)) fails.push(`${L}: flag "${want}" not present`); break;
        case 'ticks': if (a.ticks !== want) fails.push(`${L}: ticks expected ${want}, got ${a.ticks}`); break;
        case 'lastWorkflow.advantage': if (a.lastWorkflow.advantage !== want) fails.push(`${L}: lastWorkflow.advantage expected ${want}, got ${a.lastWorkflow.advantage}`); break;
        case 'lastWorkflow.disadvantage': if (a.lastWorkflow.disadvantage !== want) fails.push(`${L}: lastWorkflow.disadvantage expected ${want}, got ${a.lastWorkflow.disadvantage}`); break;
        case 'lastWorkflow.hit': if (a.lastWorkflow.hit !== want) fails.push(`${L}: lastWorkflow.hit expected ${want}, got ${a.lastWorkflow.hit}`); break;
        case 'lastWorkflow.crit': if (a.lastWorkflow.crit !== want) fails.push(`${L}: lastWorkflow.crit expected ${want}, got ${a.lastWorkflow.crit}`); break;
        default: fails.push(`unhandled assert key "${k}"`);
      }
    }
  }
  return fails;
}
```

- [ ] **Step 5: Run the test, verify it PASSES**

Run: `npm run content:unit`
Expected: PASS — all `assert.test.mjs` tests pass; `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add forge-content/verify/assert.mjs forge-content/verify/assert.test.mjs package.json
git commit -m "feat(forge-content): pure assertSnapshot + node unit tests (rejects unknown keys)"
```

---

## Task 2: Pure validation layer (`schema.mjs`) — TDD

**Files:**
- Create: `forge-content/verify/schema.mjs`
- Create: `forge-content/verify/schema.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `forge-content/verify/schema.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, KNOWN_KEYS } from './schema.mjs';

const ids = ['example-strike']; // known abilities in the suite (besides "main")

const base = () => ({
  tier: 'T3', combat: true,
  actors: { att: { disposition: 1 }, def: { disposition: -1 } },
  steps: [{ cast: 'att', ability: 'main', targets: ['def'] }, { snapshot: 'main' }],
  assert: [{ at: 'main', actor: 'def', hpDelta: -10 }],
});

test('valid v2 expectation has no errors', () => {
  assert.deepEqual(validate(base(), ids), []);
});

test('unknown top-level key rejected as legacy', () => {
  const e = base(); e.defender = { hp: 100 };
  assert.match(validate(e, ids)[0], /unknown top-level key "defender"/);
});

test('step casting an undefined actor rejected', () => {
  const e = base(); e.steps[0].cast = 'ghost';
  assert.match(validate(e, ids).join(), /step cast actor "ghost" not in roster/);
});

test('step target not in roster rejected', () => {
  const e = base(); e.steps[0].targets = ['ghost'];
  assert.match(validate(e, ids).join(), /step target "ghost" not in roster/);
});

test('assert at a label no snapshot produces rejected', () => {
  const e = base(); e.assert[0].at = 'nope';
  assert.match(validate(e, ids).join(), /assert at "nope" has no snapshot step/);
});

test('assert actor not in roster rejected', () => {
  const e = base(); e.assert[0].actor = 'ghost';
  assert.match(validate(e, ids).join(), /assert actor "ghost" not in roster/);
});

test('unknown assert key rejected pre-boot', () => {
  const e = base(); e.assert[0] = { at: 'main', actor: 'def', defenderHpDelta: -10 };
  assert.match(validate(e, ids).join(), /unknown assert key "defenderHpDelta"/);
});

test('ability identifier must exist (or be "main")', () => {
  const e = base(); e.steps[0].ability = 'no-such';
  assert.match(validate(e, ids).join(), /ability "no-such" not found/);
});

test('scenarios: forces actor + assert validated, unique names', () => {
  const e = base(); delete e.assert;
  e.scenarios = [
    { name: 'fail', forces: { def: { save: 'fail' } }, assert: [{ at: 'main', actor: 'def', hpDelta: -12 }] },
    { name: 'fail', forces: { ghost: {} }, assert: [{ at: 'main', actor: 'def', hpDelta: -6 }] },
  ];
  const errs = validate(e, ids).join();
  assert.match(errs, /duplicate scenario name "fail"/);
  assert.match(errs, /scenario "fail" forces actor "ghost" not in roster/);
});

test('combat:false allows a target-less cast', () => {
  const e = { tier: 'T2', combat: false, actors: { d: {} },
    steps: [{ cast: 'd', ability: 'main' }, { snapshot: 'm' }],
    assert: [{ at: 'm', actor: 'd', acDelta: 2 }] };
  assert.deepEqual(validate(e, ids), []);
});

test('KNOWN_KEYS includes the migrated apply keys', () => {
  assert.ok(KNOWN_KEYS.includes('acDelta'));
  assert.ok(KNOWN_KEYS.includes('abilityDelta'));
});
```

- [ ] **Step 2: Run the test, verify it FAILS**

Run: `npm run content:unit`
Expected: FAIL — `Cannot find module './schema.mjs'`.

- [ ] **Step 3: Implement `schema.mjs`**

Create `forge-content/verify/schema.mjs`:

```js
// PURE node-side validation for expect.json v2. Runs BEFORE the ~3.8m Foundry boot
// (content.spec.mjs) so authoring typos fail in <1s with a precise message. KNOWN_KEYS
// is the single source of the assert vocabulary, also passed into the browser-side
// assertSnapshot via the page.evaluate arg. No Foundry globals here.

export const KNOWN_KEYS = [
  'hpDelta', 'hpDeltaMin', 'hpDeltaMax', 'tempHp', 'acDelta', 'abilityDelta',
  'conditionApplied', 'effectApplied', 'effectAbsent', 'flagPresent', 'ticks',
  'lastWorkflow.advantage', 'lastWorkflow.disadvantage', 'lastWorkflow.hit', 'lastWorkflow.crit',
  'targetedCount',
];

const TOP_KEYS = ['tier', 'combat', 'actors', 'steps', 'scenarios', 'assert', 'setup'];
const RUN_KEYS = ['targetedCount'];

// expectation: a parsed expect.json. identifiers: string[] of ability identifiers in
// the suite (the dispatcher's byId keys). Returns string[] of errors (empty = valid).
export function validate(expectation, identifiers) {
  const e = expectation;
  const errs = [];
  for (const k of Object.keys(e)) if (!TOP_KEYS.includes(k)) errs.push(`unknown top-level key "${k}" (legacy? migrate to v2)`);

  const roster = new Set(Object.keys(e.actors ?? {}));
  if (!roster.size) errs.push('no actors defined');

  const steps = e.steps ?? [];
  const labels = new Set();
  for (const s of steps) {
    if ('snapshot' in s) { labels.add(s.snapshot); continue; }
    if ('cast' in s) {
      if (!roster.has(s.cast)) errs.push(`step cast actor "${s.cast}" not in roster`);
      for (const t of s.targets ?? []) if (!roster.has(t)) errs.push(`step target "${t}" not in roster`);
      if (s.ability !== 'main' && !identifiers.includes(s.ability)) errs.push(`ability "${s.ability}" not found in suite`);
    }
    if ('countDamageTo' in s && !roster.has(s.countDamageTo)) errs.push(`countDamageTo "${s.countDamageTo}" not in roster`);
    if ('advanceUntil' in s && !roster.has(s.advanceUntil.actor)) errs.push(`advanceUntil actor "${s.advanceUntil.actor}" not in roster`);
  }

  const checkAsserts = (asserts, where) => {
    for (const a of asserts ?? []) {
      if (!labels.has(a.at)) errs.push(`${where}assert at "${a.at}" has no snapshot step`);
      const keys = Object.keys(a).filter(k => k !== 'at' && k !== 'actor');
      const needsActor = keys.some(k => !RUN_KEYS.includes(k));
      if (needsActor && !roster.has(a.actor)) errs.push(`${where}assert actor "${a.actor}" not in roster`);
      for (const k of keys) if (!KNOWN_KEYS.includes(k)) errs.push(`${where}unknown assert key "${k}"`);
    }
  };

  if (e.scenarios) {
    const names = new Set();
    for (const sc of e.scenarios) {
      if (names.has(sc.name)) errs.push(`duplicate scenario name "${sc.name}"`);
      names.add(sc.name);
      for (const an of Object.keys(sc.forces ?? {})) if (!roster.has(an)) errs.push(`scenario "${sc.name}" forces actor "${an}" not in roster`);
      checkAsserts(sc.assert, `scenario "${sc.name}": `);
    }
  } else {
    checkAsserts(e.assert, '');
  }
  return errs;
}
```

- [ ] **Step 4: Run the test, verify it PASSES**

Run: `npm run content:unit`
Expected: PASS — `schema.test.mjs` + `assert.test.mjs` all pass, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add forge-content/verify/schema.mjs forge-content/verify/schema.test.mjs
git commit -m "feat(forge-content): pure expect.json v2 validator + node unit tests"
```

---

## Task 3: `runScene` + `genericCheck` + coexistence wiring; port searing-bolt (first live green)

This is the heavyweight task: it introduces the browser engine (verified only by the real gate) and proves it end-to-end on the simplest ability. `runScene` here handles the MINIMUM: roster, scene, combat, per-actor forces, a single `cast` step, `advanceTurns`+`countDamageTo`, `advanceUntil`, and `snapshot`. Later tasks add `combat:false` and multi-target.

**Files:**
- Modify: `forge-content/verify/checks.mjs` (add `runScene` + `genericCheck` to `installGateHelpers`/exports)
- Modify: `forge-content/verify/content.spec.mjs` (ship `assertSnapshot`, shape-dispatch, pre-boot validate)
- Modify: `forge-content/src/packs/forge-abilities/searing-bolt.expect.json` (→ v2)

- [ ] **Step 1: Add `runScene` to `installGateHelpers`**

In `forge-content/verify/checks.mjs`, inside `installGateHelpers`, BEFORE the final `globalThis.__fcGate = {...}` line, add `runScene`:

```js
  // Declarative scene runner. spec = { combat, actors, steps }. Builds the roster,
  // applies per-actor forces, runs steps in order, returns { snapshots, error }.
  // Self-contained (browser globals + the other __fcGate builders only).
  const runScene = async (spec) => {
    const created = []; // every doc we make, for creation-tracked cleanup (finally)
    const track = (d) => { if (d) created.push(d); return d; };
    const A = {};       // name -> actor doc
    const T = {};       // name -> token doc
    const baseHp = {};  // name -> hp at scene build (hpDelta baseline)
    const baseAc = {};  // name -> ac at scene build (acDelta baseline)
    const baseAbil = {};// name -> { abil: score } at scene build
    const lastWf = {};  // name -> last workflow this actor cast
    const tickCount = {}; // name -> DoT tick count (from advanceTurns)
    let runTargeted = 0;  // last cast's wf.targets.size (targetedCount)
    const snapshots = {};
    const combatOn = spec.combat !== false;
    const names = Object.keys(spec.actors);
    const FORCE = {
      save:    { fail: 'flags.midi-qol.fail.ability.save.all', success: 'flags.midi-qol.success.ability.save.all' },
      attack:  { hit: 'flags.midi-qol.grants.attack.success.all', miss: 'flags.midi-qol.grants.attack.fail.all' },
    };
    try {
      const scene = combatOn ? track(await makeScene('T3 Verify Scene')) : null;
      // Build actors + tokens.
      const defaultPos = (i) => [100 + i * 100, 100];
      for (let i = 0; i < names.length; i++) {
        const n = names[i];
        const cfg = spec.actors[n];
        const actor = track(await makeActor(`T3 ${n}`, { hp: cfg.hp ?? 100, ac: cfg.ac, temp: cfg.temp }));
        A[n] = actor;
        // Per-actor forced determinism.
        const fr = cfg.forces ?? {};
        if (fr.save) await actor.update({ [FORCE.save[fr.save]]: 1 });
        if (fr.attack) await actor.update({ [FORCE.attack[fr.attack]]: 1 });
        if (fr.advantage) await actor.update({ 'flags.midi-qol.advantage.attack.all': 1 });
        if (fr.disadvantage) await actor.update({ 'flags.midi-qol.disadvantage.attack.all': 1 });
        if (fr.grantAdvantage) await actor.update({ 'flags.midi-qol.grants.advantage.attack.all': 1 });
        if (fr.grantDisadvantage) await actor.update({ 'flags.midi-qol.grants.disadvantage.attack.all': 1 });
        baseHp[n] = actor.system.attributes.hp.value;
        baseAc[n] = actor.system.attributes.ac.value;
        baseAbil[n] = Object.fromEntries(Object.entries(actor.system.abilities ?? {}).map(([k, v]) => [k, v.value]));
        if (combatOn) {
          const [x, y] = cfg.pos ?? defaultPos(i);
          T[n] = track(await makeToken(actor, scene, { x, y, disposition: cfg.disposition ?? (i === 0 ? 1 : -1) }));
        }
      }
      let combat = null;
      if (combatOn) {
        combat = track(await makeCombat(scene, names.map((n, i) => ({ tokenId: T[n].id, actorId: A[n].id, initiative: 30 - i }))));
        await drawAndWait(scene);
      }
      // Resolve an ability identifier to its source doc. spec.__docs is injected by genericCheck.
      const resolveDoc = (ability) => ability === 'main' ? spec.__docs.main : spec.__docs.setup[ability];

      const snapActor = (n) => {
        const a = A[n];
        const abilNow = Object.fromEntries(Object.entries(a.system.abilities ?? {}).map(([k, v]) => [k, v.value]));
        const abilityDelta = {};
        for (const k of Object.keys(baseAbil[n])) abilityDelta[k] = (abilNow[k] ?? 0) - baseAbil[n][k];
        return {
          hp: a.system.attributes.hp.value,
          hpDelta: a.system.attributes.hp.value - baseHp[n],
          tempHp: a.system.attributes.hp.temp ?? 0,
          acDelta: a.system.attributes.ac.value - baseAc[n],
          abilityDelta,
          statuses: [...a.effects].flatMap(ef => [...(ef.statuses ?? [])]),
          effects: [...a.effects].map(ef => ef.name),
          flags: foundry.utils.deepClone(a.flags ?? {}),
          ticks: tickCount[n] ?? 0,
          lastWorkflow: lastWf[n] ?? { advantage: false, disadvantage: false, hit: false, crit: false, total: null },
        };
      };

      for (const step of spec.steps) {
        if ('cast' in step) {
          const caster = A[step.cast];
          const docData = resolveDoc(step.ability);
          if (!combatOn) {
            // Static apply: just create the item + let AE transfer/derive.
            await caster.createEmbeddedDocuments('Item', [strip(docData)]);
            await new Promise(r => setTimeout(r, 400));
          } else {
            const targetUuids = (step.targets ?? []).map(t => T[t].uuid);
            for (const t of step.targets ?? []) targetToken(T[t]);
            const wf = await useActivity(caster, docData, targetUuids, { settle: 2500 });
            if (!wf) return { error: `midi workflow did not run (cast ${step.cast} ${step.ability})` };
            runTargeted = wf.targets?.size ?? 0;
            lastWf[step.cast] = {
              advantage: !!wf.advantage, disadvantage: !!wf.disadvantage,
              hit: (wf.hitTargets?.size ?? 0) > 0, crit: !!wf.isCritical, total: wf.attackRoll?.total ?? null,
            };
            if (step.expectTargets !== undefined && runTargeted !== step.expectTargets)
              return { error: `targeted ${runTargeted} tokens, expected ${step.expectTargets}` };
            clearTargets();
          }
        } else if ('advanceTurns' in step) {
          for (let t = 0; t < step.advanceTurns; t++) {
            const who = step.countDamageTo;
            const before = who ? A[who].system.attributes.hp.value : 0;
            await combat.nextTurn();
            await new Promise(r => setTimeout(r, 2000));
            if (who && A[who].system.attributes.hp.value < before) tickCount[who] = (tickCount[who] ?? 0) + 1;
          }
        } else if ('advanceUntil' in step) {
          const { round, actor } = step.advanceUntil;
          for (let i = 0; i < 12; i++) {
            if (combat.round === round && combat.combatant?.tokenId === T[actor].id) break;
            await combat.nextTurn();
            await new Promise(r => setTimeout(r, 1500));
          }
        } else if ('snapshot' in step) {
          const snap = { __run: { targetedCount: runTargeted } };
          for (const n of names) snap[n] = snapActor(n);
          snapshots[step.snapshot] = snap;
        }
      }
      return { snapshots };
    } catch (err) {
      return { error: err.message };
    } finally {
      clearTargets();
      // Creation-tracked cleanup: delete combats first, then scenes, then actors.
      const order = (d) => d?.documentName === 'Combat' ? 0 : d?.documentName === 'Scene' ? 1 : 2;
      for (const d of [...created].sort((a, b) => order(a) - order(b))) await d.delete().catch(() => {});
    }
  };
```

- [ ] **Step 2: Register `runScene` on `__fcGate`**

In `forge-content/verify/checks.mjs`, change the `globalThis.__fcGate = { ... }` assignment at the end of `installGateHelpers` to include `runScene`:

```js
  globalThis.__fcGate = { strip, makeScene, makeActor, makeToken, makeCombat, drawAndWait, targetToken, clearTargets, useActivity, cleanup, runScene };
```

- [ ] **Step 3: Add `genericCheck` (exported, shipped per-item via page.evaluate)**

In `forge-content/verify/checks.mjs`, add this exported function (top-level, alongside the other handlers). It reads `__fcGate.runScene` + `__fcGate.assertSnapshot` (the latter installed by content.spec, Step 5):

```js
// Declarative handler. Replaces all bespoke handlers. arg:
//   { doc, expectation, setupDocs, knownKeys }
//   setupDocs: array aligned to expectation.setup (identifiers) -> source docs.
// Builds a per-scenario spec, runs __fcGate.runScene, asserts via __fcGate.assertSnapshot.
// Self-contained (browser globals + __fcGate only) — shipped via page.evaluate.
export async function genericCheck({ doc, expectation, setupDocs = [], knownKeys }) {
  if (expectation.combat !== false && typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  const { runScene, assertSnapshot } = globalThis.__fcGate;
  // Map setup identifiers -> docs (the ability "main" plus any setup abilities by identifier).
  const setupMap = {};
  (expectation.setup ?? []).forEach((id, i) => { if (setupDocs[i]) setupMap[id] = setupDocs[i]; });
  const docs = { main: doc, setup: setupMap };

  // Deep-merge scenario forces over the base roster.
  const mergeForces = (forces) => {
    const actors = JSON.parse(JSON.stringify(expectation.actors));
    for (const [name, f] of Object.entries(forces ?? {})) {
      actors[name] = actors[name] ?? {};
      actors[name].forces = { ...(actors[name].forces ?? {}), ...f };
    }
    return actors;
  };

  const runs = expectation.scenarios
    ? expectation.scenarios.map(sc => ({ label: sc.name, actors: mergeForces(sc.forces), assert: sc.assert ?? [] }))
    : [{ label: 'main', actors: expectation.actors, assert: expectation.assert ?? [] }];

  const fails = [];
  for (const run of runs) {
    const spec = { combat: expectation.combat, actors: run.actors, steps: expectation.steps, __docs: docs };
    const r = await runScene(spec);
    if (r.error) { fails.push(`${run.label}: ${r.error}`); continue; }
    for (const msg of assertSnapshot(run.assert, r.snapshots, knownKeys)) fails.push(`${run.label}: ${msg}`);
  }
  return { ok: fails.length === 0, fails };
}
```

- [ ] **Step 4: Import + ship `assertSnapshot`; shape-dispatch; pre-boot validate in content.spec**

In `forge-content/verify/content.spec.mjs`, update the imports:

```js
import { CHECKS, installGateHelpers, genericCheck } from './checks.mjs';
import { assertSnapshot } from './assert.mjs';
import { validate, KNOWN_KEYS } from './schema.mjs';
```

After the existing `const byId = new Map(...)` line (currently `content.spec.mjs:45`), add a pre-boot validation pass for v2 items (those with an `actors` key):

```js
    // Pre-boot static validation of v2 expectations (fast; no Foundry needed).
    const idList = [...byId.keys()];
    const v2errors = ITEMS.filter(i => i.expectation.actors)
      .flatMap(i => validate(i.expectation, idList).map(e => `${i.doc.name}: ${e}`));
    expect(v2errors, `expect.json v2 validation errors:\n${v2errors.join('\n')}`).toEqual([]);
```

After `await page.evaluate(installGateHelpers);` (currently `content.spec.mjs:53`), ship the pure `assertSnapshot` onto `__fcGate`:

```js
    // Ship the PURE assertSnapshot (unit-tested in node) into the browser by source,
    // so genericCheck can call __fcGate.assertSnapshot. Self-contained fn — safe to eval.
    await page.evaluate((src) => { globalThis.__fcGate.assertSnapshot = (0, eval)(`(${src})`); }, assertSnapshot.toString());
```

Replace the per-item dispatch loop body (currently `content.spec.mjs:82-89`) with shape-dispatch:

```js
    for (const item of ITEMS) {
      const useV2 = !!item.expectation.actors;
      const setupDocs = (item.expectation.setup ?? []).map(s => byId.get(s));
      await page.evaluate(isolate);
      let r;
      if (useV2) {
        r = await page.evaluate(genericCheck, { doc: item.doc, expectation: item.expectation, setupDocs, knownKeys: KNOWN_KEYS });
      } else {
        const handler = CHECKS[item.expectation.tier];
        r = await page.evaluate(handler, { doc: item.doc, expectation: item.expectation, setupDocs });
      }
      results.push({ name: item.doc.name, tier: item.expectation.tier, ...r });
      console.log(`${r.ok ? '✓' : '✘'} [${useV2 ? 'v2' : item.expectation.tier}] ${item.doc.name}${r.ok ? '' : ' — ' + r.fails.join('; ')}`);
    }
```

Note: the existing `unknownTier` guard (`content.spec.mjs:41`) must skip v2 items (their `tier` is a label, not a CHECKS key). Change it to:

```js
    const unknownTier = ITEMS.filter(i => !i.expectation.actors && !CHECKS[i.expectation.tier]).map(i => `${i.doc.name} (tier=${i.expectation.tier})`);
```

- [ ] **Step 5: Rewrite `searing-bolt.expect.json` to v2**

Overwrite `forge-content/src/packs/forge-abilities/searing-bolt.expect.json`:

```json
{
  "tier": "T3",
  "actors": {
    "attacker": { "disposition": 1, "pos": [100, 100] },
    "defender": { "hp": 100, "ac": 1, "disposition": -1, "pos": [200, 100] }
  },
  "steps": [
    { "cast": "attacker", "ability": "main", "targets": ["defender"] },
    { "snapshot": "main" }
  ],
  "assert": [
    { "at": "main", "actor": "defender", "hpDelta": -10 }
  ]
}
```

- [ ] **Step 6: Run the gate, verify GREEN**

Run: `npm run content:verify`
Expected: `1 passed` (~3.8m). Console shows `✓ [v2] Searing Bolt` and `✓ [T3-combat] …` for the still-old abilities. If red, the engine is wrong — fix before proceeding (do NOT move on with a red gate).

- [ ] **Step 7: Mutation test (prove teeth)**

Temporarily change `searing-bolt.expect.json` assert `hpDelta` from `-10` to `-99`, run `npm run content:verify`, confirm it FAILS with `main: main/defender: hpDelta expected -99, got -10`, then revert to `-10`.

- [ ] **Step 8: Commit**

```bash
git add forge-content/verify/checks.mjs forge-content/verify/content.spec.mjs forge-content/src/packs/forge-abilities/searing-bolt.expect.json
git commit -m "feat(forge-content): declarative runScene+genericCheck; port searing-bolt to v2 (coexists with old handlers)"
```

---

## Task 4: Port squires-mark (effect + flag asserts)

No engine change — exercises `effectApplied`/`flagPresent`, already supported. Squire's Mark applies an effect via a 0-damage damage activity carrying the effect, so the cast must target the defender.

**Files:**
- Modify: `forge-content/src/packs/forge-abilities/squires-mark.expect.json`

- [ ] **Step 1: Rewrite to v2**

Overwrite `forge-content/src/packs/forge-abilities/squires-mark.expect.json`:

```json
{
  "tier": "T3",
  "actors": {
    "attacker": { "disposition": 1, "pos": [100, 100] },
    "defender": { "hp": 100, "ac": 1, "disposition": -1, "pos": [200, 100] }
  },
  "steps": [
    { "cast": "attacker", "ability": "main", "targets": ["defender"] },
    { "snapshot": "main" }
  ],
  "assert": [
    { "at": "main", "actor": "defender", "effectApplied": "Squire's Mark" },
    { "at": "main", "actor": "defender", "flagPresent": "flags.world.squiresMark" }
  ]
}
```

- [ ] **Step 2: Run the gate, verify GREEN**

Run: `npm run content:verify`
Expected: `1 passed`; console `✓ [v2] Squire's Mark`.

- [ ] **Step 3: Commit**

```bash
git add forge-content/src/packs/forge-abilities/squires-mark.expect.json
git commit -m "test(forge-content): port squires-mark to v2 expect.json"
```

---

## Task 5: Port radiant-rebuke (`scenarios` + `forces.save`)

No engine change — `scenarios` + per-actor `forces.save` are handled by `genericCheck.mergeForces` + `runScene` FORCE map.

**Files:**
- Modify: `forge-content/src/packs/forge-abilities/radiant-rebuke.expect.json`

- [ ] **Step 1: Rewrite to v2**

Overwrite `forge-content/src/packs/forge-abilities/radiant-rebuke.expect.json`:

```json
{
  "tier": "T3",
  "actors": {
    "attacker": { "disposition": 1, "pos": [100, 100] },
    "defender": { "hp": 100, "ac": 1, "disposition": -1, "pos": [200, 100] }
  },
  "steps": [
    { "cast": "attacker", "ability": "main", "targets": ["defender"] },
    { "snapshot": "main" }
  ],
  "scenarios": [
    { "name": "fail",    "forces": { "defender": { "save": "fail" } },    "assert": [{ "at": "main", "actor": "defender", "hpDelta": -12 }] },
    { "name": "success", "forces": { "defender": { "save": "success" } }, "assert": [{ "at": "main", "actor": "defender", "hpDelta": -6 }] }
  ]
}
```

- [ ] **Step 2: Run the gate, verify GREEN**

Run: `npm run content:verify`
Expected: `1 passed`; console `✓ [v2] Radiant Rebuke`.

- [ ] **Step 3: Commit**

```bash
git add forge-content/src/packs/forge-abilities/radiant-rebuke.expect.json
git commit -m "test(forge-content): port radiant-rebuke to v2 (scenarios + forces.save)"
```

---

## Task 6: Port example-strike (`forces.attack` / advantage / grant)

No engine change — all six force flags are in the `runScene` per-actor force block. Each scenario keeps `force:"hit"` so the HP delta stays deterministic while the roll-mode is asserted.

**Files:**
- Modify: `forge-content/src/packs/forge-abilities/example-strike.expect.json`

- [ ] **Step 1: Rewrite to v2**

Overwrite `forge-content/src/packs/forge-abilities/example-strike.expect.json`:

```json
{
  "tier": "T3",
  "actors": {
    "attacker": { "disposition": 1, "pos": [100, 100] },
    "defender": { "hp": 100, "ac": 15, "disposition": -1, "pos": [200, 100] }
  },
  "steps": [
    { "cast": "attacker", "ability": "main", "targets": ["defender"] },
    { "snapshot": "main" }
  ],
  "scenarios": [
    { "name": "hit",  "forces": { "defender": { "attack": "hit" } },
      "assert": [{ "at": "main", "actor": "defender", "lastWorkflow.hit": true,  "hpDelta": -10 }] },
    { "name": "miss", "forces": { "defender": { "attack": "miss" } },
      "assert": [{ "at": "main", "actor": "defender", "lastWorkflow.hit": false, "hpDelta": 0 }] },
    { "name": "adv",  "forces": { "defender": { "attack": "hit" }, "attacker": { "advantage": true } },
      "assert": [{ "at": "main", "actor": "defender", "lastWorkflow.hit": true, "lastWorkflow.advantage": true,    "lastWorkflow.disadvantage": false, "hpDelta": -10 }] },
    { "name": "dis",  "forces": { "defender": { "attack": "hit" }, "attacker": { "disadvantage": true } },
      "assert": [{ "at": "main", "actor": "defender", "lastWorkflow.hit": true, "lastWorkflow.disadvantage": true, "lastWorkflow.advantage": false,    "hpDelta": -10 }] },
    { "name": "grantAdv", "forces": { "defender": { "attack": "hit", "grantAdvantage": true } },
      "assert": [{ "at": "main", "actor": "defender", "lastWorkflow.hit": true, "lastWorkflow.advantage": true,    "lastWorkflow.disadvantage": false, "hpDelta": -10 }] },
    { "name": "grantDis", "forces": { "defender": { "attack": "hit", "grantDisadvantage": true } },
      "assert": [{ "at": "main", "actor": "defender", "lastWorkflow.hit": true, "lastWorkflow.disadvantage": true, "lastWorkflow.advantage": false,    "hpDelta": -10 }] }
  ]
}
```

Note: `lastWorkflow.advantage`/`disadvantage` is read off the ATTACKER's cast, but the snapshot stores `lastWorkflow` per casting actor — the attacker. Assert addresses `actor:"defender"` only because that's where hpDelta lives; for roll-mode we need the attacker's workflow. **Therefore assert the roll-mode on `actor:"attacker"`** — correct the adv/dis/grant entries to split:

```json
    { "name": "adv",  "forces": { "defender": { "attack": "hit" }, "attacker": { "advantage": true } },
      "assert": [
        { "at": "main", "actor": "defender", "lastWorkflow.hit": true, "hpDelta": -10 },
        { "at": "main", "actor": "attacker", "lastWorkflow.advantage": true, "lastWorkflow.disadvantage": false }
      ] }
```

Apply the same split (roll-mode on `attacker`, hp/hit on `defender`) to `dis`, `grantAdv`, `grantDis`. `lastWorkflow.hit` belongs to the attacker's workflow too, but midi sets `hitTargets` on the attacker's workflow — assert `lastWorkflow.hit` on `attacker`. Final per-scenario asserts: hpDelta on defender; hit/advantage/disadvantage on attacker.

- [ ] **Step 2: Run the gate, verify GREEN**

Run: `npm run content:verify`
Expected: `1 passed`; console `✓ [v2] Example Strike`. If the `hit`/`miss` scenarios fail because `lastWorkflow.hit` was asserted on the wrong actor, move it to `attacker` (see note).

- [ ] **Step 3: Commit**

```bash
git add forge-content/src/packs/forge-abilities/example-strike.expect.json
git commit -m "test(forge-content): port example-strike to v2 (attack/adv/dis/grant scenarios)"
```

---

## Task 7: `combat:false` support already in engine; port bracers-of-defense (T2 apply)

`runScene` already handles `combat:false` (Task 3 Step 1 — static create+derive, no scene/combat). Bracers is a passive +2 AC item applied to a dummy.

**Files:**
- Modify: `forge-content/src/packs/forge-abilities/bracers-of-defense.expect.json`

- [ ] **Step 1: Rewrite to v2**

Overwrite `forge-content/src/packs/forge-abilities/bracers-of-defense.expect.json`:

```json
{
  "tier": "T2",
  "combat": false,
  "actors": {
    "dummy": { "hp": 100 }
  },
  "steps": [
    { "cast": "dummy", "ability": "main" },
    { "snapshot": "applied" }
  ],
  "assert": [
    { "at": "applied", "actor": "dummy", "acDelta": 2 }
  ]
}
```

- [ ] **Step 2: Run the gate, verify GREEN**

Run: `npm run content:verify`
Expected: `1 passed`; console `✓ [v2] Bracers of Defense`. (No scene/combat is built; the AC delta is read after AE transfer.)

- [ ] **Step 3: Mutation test**

Change `acDelta` to `99`, run gate, confirm FAIL `applied/dummy: acDelta expected 99, got 2`, revert.

- [ ] **Step 4: Commit**

```bash
git add forge-content/src/packs/forge-abilities/bracers-of-defense.expect.json
git commit -m "test(forge-content): port bracers-of-defense to v2 (combat:false apply)"
```

---

## Task 8: Multi-target in `runScene`; port example-blast (AoE, `expectTargets` + `targetedCount`)

The Task-3 `runScene` already maps `step.targets` to multiple uuids and supports `step.expectTargets` + `runTargeted`. AoE just supplies N targets. Verify it works with N=3; no engine change expected. If `useActivity` needs the no-template multi-target path it already uses `targetUuids` + `ignoreUserTargets` (existing `useActivity`).

**Files:**
- Modify: `forge-content/src/packs/forge-abilities/example-blast.expect.json`

- [ ] **Step 1: Rewrite to v2**

Overwrite `forge-content/src/packs/forge-abilities/example-blast.expect.json`:

```json
{
  "tier": "T3",
  "actors": {
    "caster": { "disposition": 1, "pos": [300, 300] },
    "def0": { "hp": 100, "ac": 1, "disposition": -1, "pos": [150, 150], "forces": { "save": "fail" } },
    "def1": { "hp": 100, "ac": 1, "disposition": -1, "pos": [300, 150], "forces": { "save": "fail" } },
    "def2": { "hp": 100, "ac": 1, "disposition": -1, "pos": [450, 150], "forces": { "save": "success" } }
  },
  "steps": [
    { "cast": "caster", "ability": "main", "targets": ["def0", "def1", "def2"], "expectTargets": 3 },
    { "snapshot": "blast" }
  ],
  "assert": [
    { "at": "blast", "targetedCount": 3 },
    { "at": "blast", "actor": "def0", "hpDelta": -12 },
    { "at": "blast", "actor": "def1", "hpDelta": -12 },
    { "at": "blast", "actor": "def2", "hpDelta": -6 }
  ]
}
```

- [ ] **Step 2: Run the gate, verify GREEN**

Run: `npm run content:verify`
Expected: `1 passed`; console `✓ [v2] Example Blast` and the engine `[T3-aoe]`-style log is gone (old aoeCheck no longer used for this item). If `expectTargets` mismatch surfaces (`targeted N`), the `clearTargets()` before the multi-cast in `runScene` may need to run before `targetToken` — it already does per step order; confirm `wf.targets.size === 3`.

- [ ] **Step 3: Commit**

```bash
git add forge-content/src/packs/forge-abilities/example-blast.expect.json
git commit -m "test(forge-content): port example-blast to v2 (multi-target AoE, expectTargets)"
```

---

## Task 9: Port example-rally (many actors + `tempHp`, in/out-of-range allies)

No engine change — many roster actors + `tempHp` assert + `scenarios`. The macro's RADIUS/TEMP are baked in the inline macro on the doc (unchanged); the expect.json mirrors them. Out-of-range ally placed far (x=800) must keep `tempHp:0`.

**Files:**
- Modify: `forge-content/src/packs/forge-abilities/example-rally.expect.json`

- [ ] **Step 1: Rewrite to v2**

Overwrite `forge-content/src/packs/forge-abilities/example-rally.expect.json`:

```json
{
  "tier": "T3",
  "actors": {
    "caster":  { "disposition": 1, "pos": [100, 100] },
    "defender": { "hp": 100, "ac": 1, "disposition": -1, "pos": [200, 100] },
    "ally0": { "temp": 0, "disposition": 1, "pos": [100, 200] },
    "ally1": { "temp": 0, "disposition": 1, "pos": [100, 300] },
    "out0":  { "temp": 0, "disposition": 1, "pos": [800, 100] }
  },
  "steps": [
    { "cast": "caster", "ability": "main", "targets": ["defender"] },
    { "snapshot": "cast" }
  ],
  "scenarios": [
    { "name": "fail", "forces": { "defender": { "save": "fail" } }, "assert": [
      { "at": "cast", "actor": "defender", "hpDelta": -10 },
      { "at": "cast", "actor": "ally0", "tempHp": 5 },
      { "at": "cast", "actor": "ally1", "tempHp": 5 },
      { "at": "cast", "actor": "out0", "tempHp": 0 }
    ] },
    { "name": "success", "forces": { "defender": { "save": "success" } }, "assert": [
      { "at": "cast", "actor": "defender", "hpDelta": 0 },
      { "at": "cast", "actor": "ally0", "tempHp": 0 },
      { "at": "cast", "actor": "ally1", "tempHp": 0 },
      { "at": "cast", "actor": "out0", "tempHp": 0 }
    ] }
  ]
}
```

- [ ] **Step 2: Run the gate, verify GREEN**

Run: `npm run content:verify`
Expected: `1 passed`; console `✓ [v2] Example Rally`.

- [ ] **Step 3: Mutation test (the G2 radius proof)**

In the Example Rally doc (`example-rally.json`), find the inline macro `RADIUS` constant and change `30` to `100`, run `npm run content:verify`, confirm FAIL on `out0: tempHp expected 0, got 5`, then revert RADIUS to `30`.

- [ ] **Step 4: Commit**

```bash
git add forge-content/src/packs/forge-abilities/example-rally.expect.json
git commit -m "test(forge-content): port example-rally to v2 (multi-actor tempHp + radius filter)"
```

---

## Task 10: Port rending-pounce (`setup` combo + `advanceTurns`/`ticks` + negative)

No engine change — uses the `setup` cast step, `advanceTurns`+`countDamageTo`, `ticks`, `hpDeltaMin`/`hpDeltaMax`, and a `negative` re-run expressed as a second scenario WITHOUT the setup cast. Because the negative run must omit the Squire's Mark setup cast, the two runs need different `steps`. The engine runs ONE `steps` list per scenario — so express the negative branch as a scenario whose forces leave the defender unmarked AND whose steps skip setup. Since `steps` is shared, model both as scenarios and gate the setup cast on a `when` no — simpler: keep ONE steps list with the setup cast, and for the negative run, point the setup cast at a DIFFERENT (unmarked) target is not available. **Decision:** add a minimal engine feature — a step may carry `"scenarios": ["main"]` to restrict it to named scenarios. Implement below.

**Files:**
- Modify: `forge-content/verify/checks.mjs` (`runScene`: honor per-step scenario gating)
- Modify: `forge-content/verify/content.spec.mjs` (pass scenario label into spec)
- Modify: `forge-content/verify/schema.mjs` (allow `scenarios` key on a step)
- Modify: `forge-content/src/packs/forge-abilities/rending-pounce.expect.json`

- [ ] **Step 1: Engine — per-step scenario gating**

In `runScene` (checks.mjs), at the top of the `for (const step of spec.steps)` loop, add a skip guard:

```js
      for (const step of spec.steps) {
        if (step.onlyScenarios && !step.onlyScenarios.includes(spec.__scenario)) continue;
```

And in `genericCheck` (checks.mjs), pass the scenario label into the spec:

```js
    const spec = { combat: expectation.combat, actors: run.actors, steps: expectation.steps, __docs: docs, __scenario: run.label };
```

- [ ] **Step 2: schema — allow `onlyScenarios` on a step, validate names**

In `schema.mjs` `validate`, inside the `for (const s of steps)` loop, add:

```js
    if (s.onlyScenarios) {
      const scNames = new Set((e.scenarios ?? []).map(x => x.name));
      for (const n of s.onlyScenarios) if (!scNames.has(n)) errs.push(`step onlyScenarios references unknown scenario "${n}"`);
    }
```

- [ ] **Step 3: schema test for the new gate**

Add to `forge-content/verify/schema.test.mjs`:

```js
test('step onlyScenarios must name real scenarios', () => {
  const e = base(); delete e.assert;
  e.scenarios = [{ name: 'main', assert: [{ at: 'main', actor: 'def', hpDelta: -1 }] }];
  e.steps = [{ cast: 'att', ability: 'main', targets: ['def'], onlyScenarios: ['ghost'] }, { snapshot: 'main' }];
  assert.match(validate(e, ids).join(), /onlyScenarios references unknown scenario "ghost"/);
});
```

Run: `npm run content:unit` → PASS.

- [ ] **Step 4: Rewrite rending-pounce.expect.json to v2**

Overwrite `forge-content/src/packs/forge-abilities/rending-pounce.expect.json` (the `main` scenario marks then pounces and counts ticks; `negative` skips the mark setup so the hard-gate yields 0 damage):

```json
{
  "tier": "T3",
  "setup": ["squires-mark"],
  "actors": {
    "attacker": { "disposition": 1, "pos": [100, 100] },
    "defender": { "hp": 100, "ac": 1, "disposition": -1, "pos": [200, 100] }
  },
  "steps": [
    { "cast": "attacker", "ability": "squires-mark", "targets": ["defender"], "onlyScenarios": ["main"] },
    { "cast": "attacker", "ability": "main", "targets": ["defender"] },
    { "advanceTurns": 6, "countDamageTo": "defender" },
    { "snapshot": "after" }
  ],
  "scenarios": [
    { "name": "main", "assert": [
      { "at": "after", "actor": "defender", "hpDeltaMin": -36, "hpDeltaMax": -6, "ticks": 2 }
    ] },
    { "name": "negative", "assert": [
      { "at": "after", "actor": "defender", "hpDeltaMin": 0 }
    ] }
  ]
}
```

- [ ] **Step 5: Run the gate, verify GREEN**

Run: `npm run content:verify`
Expected: `1 passed`; console `✓ [v2] Rending Pounce`. The `main` run marks → pounces → bleeds exactly 2 ticks; `negative` skips the mark so the hard-gated bleed deals 0 (hpDelta ≥ 0).

- [ ] **Step 6: Commit**

```bash
git add forge-content/verify/checks.mjs forge-content/verify/content.spec.mjs forge-content/verify/schema.mjs forge-content/verify/schema.test.mjs forge-content/src/packs/forge-abilities/rending-pounce.expect.json
git commit -m "feat(forge-content): per-step scenario gating; port rending-pounce to v2 (combo+ticks+negative)"
```

---

## Task 11: Port example-boon (grant — `advanceUntil` + per-actor `lastWorkflow`, RISKIEST)

No new engine feature expected — `advanceUntil` + per-actor `lastWorkflow` already exist. This is the integration risk flagged in the spec: three forced advantage reads off the ALLY's own attacks at distinct turn points. If it cannot be reproduced declaratively, FALL BACK (Step 4).

**Files:**
- Modify: `forge-content/src/packs/forge-abilities/example-boon.expect.json`

- [ ] **Step 1: Rewrite to v2**

Overwrite `forge-content/src/packs/forge-abilities/example-boon.expect.json` (caster buffs ally; ally attacks dummy at three points; `dummy.forces.attack:hit` so each ally attack resolves cleanly):

```json
{
  "tier": "T3",
  "setup": ["example-strike"],
  "actors": {
    "caster": { "disposition": 1, "pos": [100, 100] },
    "ally":   { "disposition": 1, "pos": [200, 100] },
    "dummy":  { "hp": 100, "ac": 5, "disposition": -1, "pos": [300, 100], "forces": { "attack": "hit" } }
  },
  "steps": [
    { "cast": "caster", "ability": "main", "targets": ["ally"] },
    { "snapshot": "granted" },
    { "cast": "ally", "ability": "example-strike", "targets": ["dummy"] },
    { "snapshot": "buffed" },
    { "advanceUntil": { "round": 1, "actor": "ally" } },
    { "cast": "ally", "ability": "example-strike", "targets": ["dummy"] },
    { "snapshot": "mid" },
    { "advanceUntil": { "round": 2, "actor": "ally" } },
    { "cast": "ally", "ability": "example-strike", "targets": ["dummy"] },
    { "snapshot": "expired" }
  ],
  "assert": [
    { "at": "granted", "actor": "ally", "effectApplied": "Example Boon" },
    { "at": "granted", "actor": "ally", "flagPresent": "flags.midi-qol.advantage.attack.all" },
    { "at": "buffed",  "actor": "ally", "lastWorkflow.advantage": true },
    { "at": "mid",     "actor": "ally", "lastWorkflow.advantage": true },
    { "at": "expired", "actor": "ally", "effectAbsent": "Example Boon" },
    { "at": "expired", "actor": "ally", "lastWorkflow.advantage": false }
  ]
}
```

Note: the original `advanceUntil` start-round was the combat's start round. Here `runScene` builds combat starting at round 1 (Foundry's `startCombat`), so `round:1` = caster's first turn-end reached at the ally's turn, `round:2` = after the caster's second turn-end. If the buff expires a turn early/late, adjust the two `advanceUntil.round` values by the observed offset (the original `grantCheck` used `startRound` + 0/1; confirm the engine's round numbering against the console).

- [ ] **Step 2: Run the gate, verify GREEN**

Run: `npm run content:verify`
Expected: `1 passed`; console `✓ [v2] Example Boon`.

- [ ] **Step 3: If GREEN, mutation test**

Change the `mid` assert `lastWorkflow.advantage` to `false`, run gate, confirm FAIL (`mid: mid/ally: lastWorkflow.advantage expected false, got true`), revert.

- [ ] **Step 4: FALLBACK (only if Step 2 cannot be made green after adjusting `advanceUntil` rounds)**

If the three-phase timeline resists the declarative engine, keep `grantCheck` as a holdout: leave `example-boon.expect.json` in its ORIGINAL shape (revert this task), so shape-dispatch routes it to the old `grantCheck`. Document in TODO.md that grant is the one holdout. Do NOT delete `grantCheck` in Task 13 in that case. Proceed to Task 12 regardless.

- [ ] **Step 5: Commit**

```bash
git add forge-content/src/packs/forge-abilities/example-boon.expect.json
git commit -m "test(forge-content): port example-boon to v2 (grant timeline via advanceUntil)"
```

---

## Task 12: Final cleanup — delete old handlers, collapse dispatch, enforce v2-only

Now every ability (except possibly grant per Task 11 fallback) is v2. Remove the old handlers and the shape-dispatch fork; make validate() cover ALL items; `genericCheck` is the only path.

**Files:**
- Modify: `forge-content/verify/checks.mjs` (delete `applyCheck`/`combatCheck`/`grantCheck`/`macroCheck`/`aoeCheck` + the old `assertResult`; keep `installGateHelpers` (now with `runScene`) + `genericCheck`; reduce `CHECKS`)
- Modify: `forge-content/verify/content.spec.mjs` (drop shape-dispatch; always `genericCheck`; validate ALL items)

- [ ] **Step 1: Delete the bespoke handlers**

In `forge-content/verify/checks.mjs`, delete the function bodies of `applyCheck`, `combatCheck`, `grantCheck`, `macroCheck`, `aoeCheck` and their header comments. (If grant is a holdout per Task 11 Step 4, KEEP `grantCheck` and its `CHECKS['T3-grant']` entry, and skip the grant-specific lines below.) Replace the `CHECKS` export with:

```js
// Single declarative handler. expectation.tier is a doc-classification label only.
export const CHECKS = { default: genericCheck };
```

- [ ] **Step 2: content.spec — always genericCheck, validate everything**

In `forge-content/verify/content.spec.mjs`:

Change the v2-validation filter to validate ALL items (remove the `.filter(i => i.expectation.actors)`):

```js
    const v2errors = ITEMS.flatMap(i => validate(i.expectation, idList).map(e => `${i.doc.name}: ${e}`));
    expect(v2errors, `expect.json v2 validation errors:\n${v2errors.join('\n')}`).toEqual([]);
```

Delete the `unknownTier` guard block entirely (tier is no longer a selector).

Replace the dispatch loop with the v2-only form:

```js
    for (const item of ITEMS) {
      const setupDocs = (item.expectation.setup ?? []).map(s => byId.get(s));
      await page.evaluate(isolate);
      const r = await page.evaluate(genericCheck, { doc: item.doc, expectation: item.expectation, setupDocs, knownKeys: KNOWN_KEYS });
      results.push({ name: item.doc.name, tier: item.expectation.tier, ...r });
      console.log(`${r.ok ? '✓' : '✘'} [${item.expectation.tier}] ${item.doc.name}${r.ok ? '' : ' — ' + r.fails.join('; ')}`);
    }
```

Remove the now-unused `CHECKS` import if `genericCheck` is imported directly (keep `installGateHelpers`, `genericCheck`).

(If grant is a holdout: keep the shape-dispatch fork and the `grantCheck`/`CHECKS` import instead of the above.)

- [ ] **Step 3: Run the gate, verify GREEN (full v2 suite)**

Run: `npm run content:verify`
Expected: `1 passed`; console shows `✓ [v2 …]` for all 9 abilities; no `[T3-combat]`/`[T3-aoe]`/etc. old-handler logs.

- [ ] **Step 4: Run node unit tests once more**

Run: `npm run content:unit`
Expected: PASS, `# fail 0`.

- [ ] **Step 5: Final anti-false-GREEN mutation matrix (manual, one revert each)**

Run each, confirm RED, revert:
1. searing-bolt `hpDelta -10`→`-99` (combat).
2. example-blast `def2 hpDelta -6`→`-99` (aoe per-target) AND `expectTargets 3`→`2` (invariant).
3. example-rally doc macro `RADIUS 30`→`100` (radius filter).
4. example-boon `mid` advantage `true`→`false` (grant expiry) — skip if holdout.
Also confirm an unknown key fails: temporarily set a searing-bolt assert key to `hpDeltaX` and confirm pre-boot `validate` reports `unknown assert key "hpDeltaX"` WITHOUT booting Foundry, then revert.

- [ ] **Step 6: Update TODO.md**

In `TODO.md`, under "Gate hardening", add a DONE entry:

```markdown
### G4. Declarative scene engine — DONE ✅
Collapsed the 5 bespoke verify handlers into one `genericCheck` driven by declarative
expect.json v2 (`actors`/`steps`/`scenarios`/`assert`). Pure `assertSnapshot` (assert.mjs,
node-unit-tested) shipped to the browser by toString; pure `validate` (schema.mjs) runs
pre-boot. Problem #2 fixed: unknown/misspelled assert keys are HARD failures (node-side +
browser-side). `runScene` on `__fcGate` is the single create path → creation-tracked cleanup.
All 9 abilities on v2; gate green; mutation matrix flips red per mechanic. Spec/plan:
docs/superpowers/{specs,plans}/2026-06-03-declarative-gate-engine*.
```

(If grant is a holdout, note it: "grantCheck retained as the one timeline holdout — see Task 11.")

- [ ] **Step 7: Commit**

```bash
git add forge-content/verify/checks.mjs forge-content/verify/content.spec.mjs TODO.md
git commit -m "refactor(forge-content): collapse 5 handlers into genericCheck; v2-only dispatch + validation"
```

---

## Self-Review (completed)

**Spec coverage:** 3-layer architecture → Tasks 1 (assert), 2 (schema), 3 (runScene/genericCheck/wiring). expect.json v2 data model → Task 3 Step 5 onward; every assert key exercised across Tasks 4–11. Static pre-validation → Task 3 Step 4 + Task 12 Step 2. Single vocabulary source → `KNOWN_KEYS` in schema.mjs (Task 2), passed to browser (Task 3). Coverage proof (all 5 handlers) → combat (3,4,5,6), aoe (8), macro (9), grant (11), apply (7). Creation-tracked cleanup → Task 3 Step 1 `finally`. Unknown-key rejection (#2) → node (Task 2) + browser (Task 1). Incremental gate-green migration → Tasks 3–12, one ability per commit via shape-dispatch. grant-timeline risk + fallback → Task 11 Step 4. DSL-creep guard → only one new step feature added (`onlyScenarios`, Task 10) and only because a real ability (rending-pounce negative) required it.

**Placeholder scan:** no TBD/TODO/"handle edge cases"; every code step shows real code; every gate/unit step shows the command + expected output.

**Type consistency:** snapshot shape (Task 3 `snapActor`) matches `assertSnapshot`'s reads (Task 1) — `hpDelta`, `tempHp`, `acDelta`, `abilityDelta{}`, `statuses[]`, `effects[]`, `flags{}`, `ticks`, `lastWorkflow{advantage,disadvantage,hit,crit,total}`, `__run.targetedCount`. `KNOWN_KEYS` (Task 2) lists exactly the keys `assertSnapshot`'s switch handles (Task 1) plus `targetedCount`. `genericCheck` passes `__docs`/`__scenario` that `runScene` reads (Tasks 3, 10). `validate` top-level keys include `setup` (used by rending-pounce/example-boon).

**Known consistency caveat to watch during execution:** Task 6's first JSON draft asserts roll-mode on `defender`; the corrective note moves roll-mode asserts to `attacker` (where `lastWorkflow` is stored). Execute the corrected (split) form. Task 11's `advanceUntil.round` numbering must be confirmed against the engine's `startCombat` round at runtime (note in Task 11 Step 1).
