import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSnapshot } from './assert.mjs';

const KEYS = ['hpDelta','hpDeltaMin','hpDeltaMax','tempHp','acDelta','abilityDelta',
  'conditionApplied','effectApplied','effectAbsent','flagPresent','ticks',
  'lastWorkflow.advantage','lastWorkflow.disadvantage','lastWorkflow.hit','lastWorkflow.crit','targetedCount','usesSpent'];

const actorSnap = (over = {}) => ({
  hp: 100, hpDelta: 0, tempHp: 0, acDelta: 0, abilityDelta: {}, statuses: [],
  effects: [], flags: {}, ticks: 0, usesSpent: null,
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

test('usesSpent: pass + got-vs-expected on mismatch', () => {
  const snaps = { cast: { att: actorSnap({ usesSpent: 1 }) }, after: { att: actorSnap({ usesSpent: 0 }) } };
  assert.deepEqual(assertSnapshot([{ at: 'cast', actor: 'att', usesSpent: 1 }], snaps, KEYS), []);
  assert.deepEqual(assertSnapshot([{ at: 'after', actor: 'att', usesSpent: 0 }], snaps, KEYS), []);
  const f = assertSnapshot([{ at: 'after', actor: 'att', usesSpent: 1 }], snaps, KEYS);
  assert.match(f[0], /usesSpent expected 1, got 0/);
});

test('lastWorkflow.advantage', () => {
  const snaps = { buffed: { ally: actorSnap({ lastWorkflow: { advantage: true, disadvantage: false, hit: true, crit: false, total: 18 } }) } };
  assert.deepEqual(assertSnapshot([{ at: 'buffed', actor: 'ally', 'lastWorkflow.advantage': true }], snaps, KEYS), []);
});

test('flagPresent treats a false-valued flag as present (existence, not truthiness)', () => {
  const snaps = { main: { def: actorSnap({ flags: { midi: { disabledMarker: false } } }) } };
  assert.deepEqual(assertSnapshot([{ at: 'main', actor: 'def', flagPresent: 'flags.midi.disabledMarker' }], snaps, KEYS), []);
});

test('lastWorkflow assert does not throw when lastWorkflow is null', () => {
  const snaps = { main: { def: actorSnap({ lastWorkflow: null }) } };
  const f = assertSnapshot([{ at: 'main', actor: 'def', 'lastWorkflow.hit': true }], snaps, KEYS);
  assert.equal(f.length, 1);
  assert.match(f[0], /lastWorkflow.hit expected true, got undefined/);
});
