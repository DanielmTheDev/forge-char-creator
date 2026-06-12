import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t2ExpectFor, t3ScaffoldFor } from './gen-expect.mjs';

// A resolved actor (post resolveActorAbilities): abilities inlined into items.
const resolved = () => ({
  _id: 'gobbossXXXXXXXXX',
  name: 'Goblin Boss',
  system: {
    abilities: { str: { value: 10 }, dex: { value: 14 }, con: { value: 10 }, int: { value: 10 }, wis: { value: 8 }, cha: { value: 10 } },
    attributes: { hp: { value: 21, max: 21, formula: '' }, ac: { calc: 'natural', flat: 17 } },
    details: { cr: 1, type: { value: 'humanoid' } },
  },
  items: [
    { name: 'Searing Bolt', system: { identifier: 'searing-bolt' } },
    { name: 'Cleave', system: { identifier: 'example-strike' } },
  ],
});

test('t2ExpectFor derives hpMax/ac/abilities/hasItems', () => {
  const e = t2ExpectFor(resolved());
  assert.equal(e.tier, 'T2');
  assert.equal(e.assert.hpMax, 21);
  assert.equal(e.assert.ac, 17);            // natural AC -> derived AC === flat base (no gear/bonuses)
  assert.equal(e.assert.abilities.str, 10);
  assert.equal(e.assert.abilities.dex, 14);
  assert.deepEqual(e.assert.hasItems, ['Searing Bolt', 'Cleave']);
});

test('t2ExpectFor includes all six ability scores', () => {
  const e = t2ExpectFor(resolved());
  assert.deepEqual(Object.keys(e.assert.abilities).sort(), ['cha', 'con', 'dex', 'int', 'str', 'wis']);
});

test('t3ScaffoldFor builds an authored roster + castOwn step + TODO damage', () => {
  const s = t3ScaffoldFor(resolved());
  assert.equal(s.tier, 'T3');
  assert.equal(s.actors['Goblin Boss'].authored, true);
  assert.ok(s.actors.dummy);
  assert.equal(s.steps[0].castOwn, 'Goblin Boss');
  assert.equal(s.steps[0].ability, 'searing-bolt'); // first inlined item's identifier
  assert.match(String(s.assert[0].hpDelta), /TODO/);
});
