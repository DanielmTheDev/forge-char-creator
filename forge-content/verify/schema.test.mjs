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

test('usesSpent is a known assert key (recharge gate)', () => {
  assert.ok(KNOWN_KEYS.includes('usesSpent'));
  const e = base(); delete e.assert;
  e.scenarios = [{ name: 'success', forces: { att: { recharge: 'success' } },
    assert: [{ at: 'main', actor: 'att', usesSpent: 0 }] }];
  assert.deepEqual(validate(e, ids), []);
});

test('null expectation returns an error, does not throw', () => {
  assert.deepEqual(validate(null, ids), ['expectation must be a non-null object']);
});

test('unknown setup ability rejected', () => {
  const e = base(); e.setup = ['typo-ability'];
  assert.match(validate(e, ids).join(), /setup ability "typo-ability" not found in suite/);
});

test('known setup ability accepted', () => {
  const e = base(); e.setup = ['example-strike'];
  assert.deepEqual(validate(e, ids), []);
});

test('duplicate snapshot label rejected', () => {
  const e = base(); e.steps = [{ cast: 'att', ability: 'main', targets: ['def'] }, { snapshot: 'main' }, { snapshot: 'main' }];
  assert.match(validate(e, ids).join(), /duplicate snapshot label "main"/);
});

test('assert requiring actor but omitting it gives a clear message', () => {
  const e = base(); e.assert = [{ at: 'main', hpDelta: -10 }];
  assert.match(validate(e, ids).join(), /assert missing required "actor" field/);
});

test('advanceTurns/advanceUntil rejected when combat:false', () => {
  const e = { tier: 'T2', combat: false, actors: { d: {} },
    steps: [{ cast: 'd', ability: 'main' }, { advanceTurns: 1 }, { snapshot: 'm' }],
    assert: [{ at: 'm', actor: 'd', acDelta: 2 }] };
  assert.match(validate(e, ids).join(), /requires combat but combat:false is set/);
});

test('step onlyScenarios must name real scenarios', () => {
  const e = base(); delete e.assert;
  e.scenarios = [{ name: 'main', assert: [{ at: 'main', actor: 'def', hpDelta: -1 }] }];
  e.steps = [{ cast: 'att', ability: 'main', targets: ['def'], onlyScenarios: ['ghost'] }, { snapshot: 'main' }];
  assert.match(validate(e, ids).join(), /onlyScenarios references unknown scenario "ghost"/);
});
