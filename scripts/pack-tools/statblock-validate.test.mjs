import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStatblock, validateInlinedIcons } from './statblock-validate.mjs';
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
    attributes: { hp: { value: 21, max: 21, formula: '' }, ac: { calc: 'natural', flat: 17 } },
    details: { cr: 1, type: { value: 'humanoid' } },
  },
  items: [],
  abilities: ['searing-bolt', { ability: 'example-strike', name: 'Cleave', desc: '<p>Cleave: 12 slashing on a hit.</p>', set: { dmg: '12' } }],
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

test('ac must be natural + positive', () => {
  const d = good(); d.system.attributes.ac = { calc: 'natural', flat: 0 };
  assert.ok(v(d).some(e => /ac.flat must be a positive integer/.test(e)));
});

test('ac.calc flat rejected (skips +AC effects)', () => {
  const d = good(); d.system.attributes.ac = { calc: 'flat', flat: 17 };
  assert.ok(v(d).some(e => /ac.calc must be "natural"/.test(e)));
});

test('reskin without desc fails (refs delegated to schema.mjs)', () => {
  const d = good(); d.abilities = ['searing-bolt', { ability: 'example-strike', name: 'Cleave', set: { dmg: '12' } }];
  assert.ok(v(d).some(e => /requires "desc"/.test(e)));
});

test('missing creature type fails', () => {
  const d = good(); d.system.details.type = { value: '' };
  assert.ok(v(d).some(e => /type.value must be a non-empty string/.test(e)));
});

test('non-existent icon path fails (iconExists=false)', () => {
  assert.ok(validateStatblock(good(), CATALOG, () => false, SLUG).some(e => /does not exist/.test(e)));
});

test('items must be empty (build inlines abilities)', () => {
  const d = good(); d.items = [{ name: 'x' }];
  assert.ok(v(d).some(e => /"items" must be \[\]/.test(e)));
});

test('empty abilities array fails', () => {
  const d = good(); d.abilities = [];
  assert.ok(v(d).some(e => /"abilities" must be a non-empty array/.test(e)));
});

test('folder must be null when the pack declares no folders', () => {
  const d = good(); d.folder = 'somefolder000001';
  assert.ok(v(d).some(e => /"folder" must be null/.test(e)));
});

test('folder id declared in _folders.json is accepted', () => {
  const d = good(); d.folder = 'folderdhulmaldur';
  assert.deepEqual(validateStatblock(d, CATALOG, ALWAYS, SLUG, [], ['folderdhulmaldur']), []);
});

test('folder id not in _folders.json is rejected', () => {
  const d = good(); d.folder = 'folderunknown001';
  const errs = validateStatblock(d, CATALOG, ALWAYS, SLUG, [], ['folderdhulmaldur']);
  assert.ok(errs.some(e => /must be null or a 16-alnum id from _folders\.json/.test(e)));
});

test('malformed folder id is rejected even with folders declared', () => {
  const d = good(); d.folder = 'nope';
  const errs = validateStatblock(d, CATALOG, ALWAYS, SLUG, [], ['nope']);
  assert.ok(errs.some(e => /must be null or a 16-alnum id/.test(e)));
});

test('img ref override is accepted', () => {
  const d = good(); d.abilities = [{ ability: 'searing-bolt', img: 'icons/creatures/tentacles/tentacle-earth-green.webp' }];
  assert.deepEqual(v(d), []);
});

test('module-asset portrait + prototypeToken path validated via imgExists', () => {
  const d = good();
  d.img = 'modules/forge-content/assets/tokens/x.png';
  d.prototypeToken = { texture: { src: 'modules/forge-content/assets/tokens/x.png' } };
  assert.deepEqual(validateStatblock(d, CATALOG, ALWAYS, SLUG), []);          // resolver says exists
  assert.ok(validateStatblock(d, CATALOG, () => false, SLUG).some(e => /does not exist/.test(e))); // resolver says missing
});

test('validateInlinedIcons flags a dead inlined ability icon', () => {
  const items = [{ name: 'Lash', img: 'icons/weapons/swords/dead.webp' }];
  assert.ok(validateInlinedIcons(items, () => false).some(e => /dead icon/.test(e)));
  assert.deepEqual(validateInlinedIcons(items, () => true), []);
});

test('validateInlinedIcons flags a missing img', () => {
  assert.ok(validateInlinedIcons([{ name: 'Lash' }], () => true).some(e => /missing img/.test(e)));
});
