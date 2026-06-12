import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, KNOWN_KEYS, validateActor, validateActorRefs } from './schema.mjs';

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

const actorIds = ['searing-bolt', 'radiant-rebuke'];

test('validateActorRefs accepts an actor with no abilities field', () => {
  assert.deepEqual(validateActorRefs({ name: 'Plain', type: 'npc' }, actorIds), []);
});

test('validateActorRefs accepts known ability refs', () => {
  assert.deepEqual(validateActorRefs({ name: 'Goblin', abilities: ['searing-bolt'] }, actorIds), []);
});

test('validateActorRefs rejects a non-array abilities field', () => {
  const errs = validateActorRefs({ name: 'Goblin', abilities: 'searing-bolt' }, actorIds);
  assert.ok(errs.some(e => e.includes('abilities')));
});

test('validateActorRefs rejects a non-string ref entry', () => {
  const errs = validateActorRefs({ name: 'Goblin', abilities: [{ id: 'searing-bolt' }] }, actorIds);
  assert.ok(errs.some(e => /must be.*string|string/i.test(e)));
});

test('validateActorRefs rejects an unknown identifier naming actor + ref', () => {
  const errs = validateActorRefs({ name: 'Goblin', abilities: ['no-such'] }, actorIds);
  assert.match(errs.join(), /Goblin.*no-such|no-such.*Goblin/);
});

// --- Iter 3: knob object refs ---
test('validateActorRefs accepts a knob object ref', () => {
  const ref = { ability: 'searing-bolt', name: 'Greater Bolt', set: { dmg: '20', range: 90 } };
  assert.deepEqual(validateActorRefs({ name: 'Ogre', abilities: [ref] }, actorIds), []);
});

test('validateActorRefs accepts mixed string + object refs', () => {
  const abilities = ['searing-bolt', { ability: 'radiant-rebuke', set: { dc: 16 } }];
  assert.deepEqual(validateActorRefs({ name: 'Ogre', abilities }, actorIds), []);
});

test('validateActorRefs accepts an img ref override', () => {
  const ref = { ability: 'searing-bolt', name: 'Tentacle Lash', img: 'icons/creatures/tentacles/tentacle-earth-green.webp' };
  assert.deepEqual(validateActorRefs({ name: 'Wretch', abilities: [ref] }, actorIds), []);
});

test('validateActorRefs rejects a non-string img ref', () => {
  const errs = validateActorRefs({ name: 'Wretch', abilities: [{ ability: 'searing-bolt', img: 5 }] }, actorIds);
  assert.ok(errs.some(e => /"img" must be a string/.test(e)));
});

test('validateActorRefs rejects an unknown ref key (never-shape guard)', () => {
  const errs = validateActorRefs({ name: 'Ogre', abilities: [{ ability: 'searing-bolt', activities: {} }] }, actorIds);
  assert.ok(errs.some(e => /unknown ref key "activities"/.test(e)));
});

test('validateActorRefs rejects an unknown knob', () => {
  const errs = validateActorRefs({ name: 'Ogre', abilities: [{ ability: 'searing-bolt', set: { shape: 1 } }] }, actorIds);
  assert.ok(errs.some(e => /unknown knob "shape"/.test(e)));
});

test('validateActorRefs rejects a non-string ability in an object ref', () => {
  const errs = validateActorRefs({ name: 'Ogre', abilities: [{ ability: 5 }] }, actorIds);
  assert.ok(errs.some(e => /"ability" must be a string/.test(e)));
});

test('validateActorRefs rejects a non-number range knob', () => {
  const errs = validateActorRefs({ name: 'Ogre', abilities: [{ ability: 'searing-bolt', set: { range: '90' } }] }, actorIds);
  assert.ok(errs.some(e => /"range" must be a number/.test(e)));
});

test('validateActorRefs rejects an unknown identifier in an object ref', () => {
  const errs = validateActorRefs({ name: 'Ogre', abilities: [{ ability: 'no-such' }] }, actorIds);
  assert.match(errs.join(), /Ogre.*no-such|no-such.*Ogre/);
});

// --- Iter 4: actor T3 combat expect ---
const t3Doc = { name: 'Bruiser', type: 'npc', abilities: ['searing-bolt'] };
const t3Expect = () => ({
  tier: 'T3',
  actors: { bruiser: { authored: true, disposition: 1 }, dummy: { hp: 100, disposition: -1 } },
  steps: [{ castOwn: 'bruiser', ability: 'searing-bolt', targets: ['dummy'] }, { snapshot: 'hit' }],
  assert: [{ at: 'hit', actor: 'dummy', hpDelta: -10 }],
});

test('validateActor accepts a well-formed T3 actor-combat expect', () => {
  assert.deepEqual(validateActor(t3Expect(), t3Doc, actorIds), []);
});

test('validateActor T3 requires exactly one authored actor', () => {
  const e = t3Expect(); delete e.actors.bruiser.authored;
  assert.match(validateActor(e, t3Doc, actorIds).join(), /exactly one actor with "authored:true" \(got 0\)/);
});

test('validateActor T3 rejects two authored actors', () => {
  const e = t3Expect(); e.actors.dummy.authored = true;
  assert.match(validateActor(e, t3Doc, actorIds).join(), /authored:true" \(got 2\)/);
});

test('validateActor T3 rejects castOwn of an ability the actor does not hold', () => {
  const e = t3Expect(); e.steps[0].ability = 'radiant-rebuke';
  assert.match(validateActor(e, t3Doc, actorIds).join(), /castOwn ability "radiant-rebuke" not held by actor/);
});

test('validateActor T3 rejects castOwn by a non-authored actor', () => {
  const e = t3Expect(); e.steps[0].castOwn = 'dummy';
  assert.match(validateActor(e, t3Doc, actorIds).join(), /castOwn actor "dummy" is not the authored actor "bruiser"/);
});

test('validateActor T3 rejects an unknown top-level key', () => {
  const e = t3Expect(); e.combat = true;
  assert.match(validateActor(e, t3Doc, actorIds).join(), /unknown top-level key "combat" \(actor T3 expect\)/);
});

test('validateActor T3 still validates the shared assert vocab', () => {
  const e = t3Expect(); e.assert[0] = { at: 'hit', actor: 'dummy', bogusKey: 1 };
  assert.match(validateActor(e, t3Doc, actorIds).join(), /unknown assert key "bogusKey"/);
});

test('validateActor T2 path unchanged when extra args passed', () => {
  const errs = validateActor({ tier: 'T2', assert: { hpMax: 20 } }, t3Doc, actorIds);
  assert.deepEqual(errs, []);
});

// --- Vanilla spells: castOwn by spell identifier + T3 `load` block ---
const spellIdByName = new Map([['guiding bolt', 'guiding-bolt'], ['light', 'light']]);
const spellDoc = { name: 'Caster', type: 'npc', abilities: ['searing-bolt'], spells: ['Guiding Bolt', 'Light'] };

test('validateActor T3 accepts castOwn of a held vanilla spell (via spellIdByName)', () => {
  const e = t3Expect();
  e.actors = { caster: { authored: true }, dummy: { hp: 100 } };
  e.steps = [{ castOwn: 'caster', ability: 'guiding-bolt', targets: ['dummy'] }, { snapshot: 'hit' }];
  assert.deepEqual(validateActor(e, spellDoc, actorIds, spellIdByName), []);
});

test('validateActor T3 rejects castOwn of a spell the actor does not list', () => {
  const e = t3Expect();
  e.actors = { caster: { authored: true }, dummy: { hp: 100 } };
  e.steps = [{ castOwn: 'caster', ability: 'fireball', targets: ['dummy'] }, { snapshot: 'hit' }];
  const errs = validateActor(e, spellDoc, actorIds, spellIdByName).join();
  assert.match(errs, /castOwn ability "fireball" not held by actor/);
});

test('validateActor T3 accepts a load block and validates its keys', () => {
  const ok = t3Expect();
  ok.load = { hpMax: 22, ac: 14, hasItems: ['Guiding Bolt'] };
  assert.deepEqual(validateActor(ok, t3Doc, actorIds), []);
  const bad = t3Expect();
  bad.load = { hpMax: 22, bogus: 1 };
  assert.match(validateActor(bad, t3Doc, actorIds).join(), /load: unknown actor assert key "bogus"/);
});
