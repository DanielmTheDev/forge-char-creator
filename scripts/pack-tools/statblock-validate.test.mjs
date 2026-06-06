import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStatblock } from './statblock-validate.mjs';
import { genId } from './keys.mjs';

const SLUG = 'goblin-boss';
const CATALOG = ['searing-bolt', 'example-strike'];
const ALWAYS = () => true; // iconExists stub

// A known-good statblock; tests mutate clones of it.
const good = () => ({
  _id: genId(SLUG),
  name: 'Goblin Boss',
  type: 'npc',
  img: 'icons/creatures/mammals/humanoid-goblin-green.webp',
  system: {
    abilities: { str: { value: 10 }, dex: { value: 14 }, con: { value: 10 }, int: { value: 10 }, wis: { value: 8 }, cha: { value: 10 } },
    attributes: { hp: { value: 21, max: 21, formula: '' }, ac: { calc: 'flat', flat: 17 } },
    details: { cr: 1, type: { value: 'humanoid' } },
  },
  items: [],
  abilities: ['searing-bolt', { ability: 'example-strike', name: 'Cleave', set: { dmg: '12' } }],
  effects: [],
  flags: {},
  folder: null,
});

const v = (doc) => validateStatblock(doc, CATALOG, ALWAYS, SLUG);

test('a well-formed statblock passes clean', () => {
  assert.deepEqual(v(good()), []);
});

test('SECURITY: ability ref not in catalog is a hard error', () => {
  const d = good(); d.abilities = ['fireball-of-doom'];
  assert.ok(v(d).some(e => /unknown ability "fireball-of-doom"/.test(e)));
});

test('SECURITY: shape knob rejected (only dmg/dc/range)', () => {
  const d = good(); d.abilities = [{ ability: 'searing-bolt', set: { target: '5' } }];
  assert.ok(v(d).some(e => /unknown knob "target"/.test(e)));
});

test('_id must equal genId(slug)', () => {
  const d = good(); d._id = 'AAAAAAAAAAAAAAAA';
  assert.ok(v(d).some(e => /_id" must be genId/.test(e)));
});

test('ability score out of 3–20 range fails', () => {
  const d = good(); d.system.abilities.str.value = 25;
  assert.ok(v(d).some(e => /ability "str".value must be an integer 3–20/.test(e)));
});

test('hp.value must equal hp.max', () => {
  const d = good(); d.system.attributes.hp.max = 30;
  assert.ok(v(d).some(e => /hp.value \(21\) must equal hp.max \(30\)/.test(e)));
});

test('ac must be flat + positive', () => {
  const d = good(); d.system.attributes.ac = { calc: 'flat', flat: 0 };
  assert.ok(v(d).some(e => /ac.flat must be a positive integer/.test(e)));
});

test('missing creature type fails', () => {
  const d = good(); d.system.details.type = { value: '' };
  assert.ok(v(d).some(e => /type.value must be a non-empty string/.test(e)));
});

test('non-existent icon path fails (iconExists=false)', () => {
  assert.ok(validateStatblock(good(), CATALOG, () => false, SLUG).some(e => /does not exist under the Foundry core icons/.test(e)));
});

test('items must be empty (build inlines abilities)', () => {
  const d = good(); d.items = [{ name: 'x' }];
  assert.ok(v(d).some(e => /"items" must be \[\]/.test(e)));
});

test('empty abilities array fails', () => {
  const d = good(); d.abilities = [];
  assert.ok(v(d).some(e => /"abilities" must be a non-empty array/.test(e)));
});

test('folder must be null', () => {
  const d = good(); d.folder = 'somefolder000001';
  assert.ok(v(d).some(e => /"folder" must be null/.test(e)));
});
