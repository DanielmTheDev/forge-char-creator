import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveActorAbilities } from './resolve-abilities.mjs';
import { injectKeys } from './keys.mjs';

const ID16 = /^[A-Za-z0-9]{16}$/;

// Minimal ability fixtures mirroring forge-abilities source shape.
const searingBolt = () => ({
  name: 'Searing Bolt',
  img: 'icons/magic/fire/projectile-fireball-orange.webp',
  type: 'feat',
  _id: 'searingbolt00001',
  system: {
    description: { value: '<p>10 fire damage.</p>', chat: '' },
    activities: {
      dmgfire000000001: {
        _id: 'dmgfire000000001',
        type: 'damage',
        damage: { parts: [{ types: ['fire'], custom: { enabled: true, formula: '10' } }] },
      },
    },
    identifier: 'searing-bolt',
  },
  effects: [],
  flags: {},
  folder: null,
});

// Ability whose activity references a top-level effect by id (cross-ref).
const squiresMark = () => ({
  name: "Squire's Mark",
  img: 'icons/skills/targeting/target-strike-triple-blue.webp',
  type: 'feat',
  _id: 'squiresmark00001',
  system: {
    description: { value: '<p>Mark.</p>', chat: '' },
    activities: {
      markdmg000000001: {
        _id: 'markdmg000000001',
        type: 'damage',
        effects: [{ _id: 'squiremarkeff001' }],
      },
    },
    identifier: 'squires-mark',
  },
  effects: [{ _id: 'squiremarkeff001', name: "Squire's Mark", changes: [] }],
  flags: {},
  folder: 'folderderek00001',
});

const actorDoc = (abilities, extra = {}) => ({
  _id: 'testgoblin000001',
  name: 'Test Goblin',
  type: 'npc',
  system: { abilities: { str: { value: 8 } } },
  items: [],
  effects: [],
  abilities,
  ...extra,
});

const mapOf = (...abis) => new Map(abis.map(a => [a.system.identifier, a]));

test('inlines a referenced ability as an embedded item', () => {
  const out = resolveActorAbilities(actorDoc(['searing-bolt']), mapOf(searingBolt()));
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].name, 'Searing Bolt');
});

test('re-keys item + activity ids to fresh 16-char ids', () => {
  const out = resolveActorAbilities(actorDoc(['searing-bolt']), mapOf(searingBolt()));
  const item = out.items[0];
  assert.match(item._id, ID16);
  assert.notEqual(item._id, 'searingbolt00001');
  const [actKey, act] = Object.entries(item.system.activities)[0];
  assert.match(actKey, ID16);
  assert.notEqual(actKey, 'dmgfire000000001');
  assert.equal(actKey, act._id, 'activity map key must equal activity._id');
});

test('preserves internal cross-references after re-key', () => {
  const out = resolveActorAbilities(actorDoc(['squires-mark']), mapOf(squiresMark()));
  const item = out.items[0];
  const act = Object.values(item.system.activities)[0];
  const newEffId = item.effects[0]._id;
  assert.match(newEffId, ID16);
  assert.notEqual(newEffId, 'squiremarkeff001');
  assert.equal(act.effects[0]._id, newEffId, 'activity effect ref must follow re-key');
});

test('is deterministic — same input, same ids', () => {
  const a = resolveActorAbilities(actorDoc(['searing-bolt']), mapOf(searingBolt()));
  const b = resolveActorAbilities(actorDoc(['searing-bolt']), mapOf(searingBolt()));
  assert.equal(a.items[0]._id, b.items[0]._id);
  assert.deepEqual(Object.keys(a.items[0].system.activities), Object.keys(b.items[0].system.activities));
});

test('same ability under different actors gets distinct ids', () => {
  const a = resolveActorAbilities(actorDoc(['searing-bolt']), mapOf(searingBolt()));
  const b = resolveActorAbilities(actorDoc(['searing-bolt'], { _id: 'othergoblin00001' }), mapOf(searingBolt()));
  assert.notEqual(a.items[0]._id, b.items[0]._id);
});

test('strips the top-level abilities field and the ability folder', () => {
  const out = resolveActorAbilities(actorDoc(['squires-mark']), mapOf(squiresMark()));
  assert.equal(out.abilities, undefined);
  assert.equal('folder' in out.items[0], false);
});

test('appends resolved items to pre-existing items', () => {
  const actor = actorDoc(['searing-bolt'], { items: [{ _id: 'existing00000001', name: 'Bite' }] });
  const out = resolveActorAbilities(actor, mapOf(searingBolt()));
  assert.equal(out.items.length, 2);
  assert.equal(out.items[0].name, 'Bite');
  assert.equal(out.items[1].name, 'Searing Bolt');
});

test('output passes injectKeys validation', () => {
  const out = resolveActorAbilities(actorDoc(['squires-mark']), mapOf(squiresMark()));
  assert.doesNotThrow(() => injectKeys(out, 'actors', 'test-goblin.json'));
});

test('throws naming actor + identifier on a missing ref', () => {
  assert.throws(
    () => resolveActorAbilities(actorDoc(['does-not-exist']), mapOf(searingBolt())),
    /Test Goblin.*does-not-exist|does-not-exist.*Test Goblin/,
  );
});

test('actor without an abilities field is returned unchanged', () => {
  const actor = { _id: 'plainnpc00000001', name: 'Plain', type: 'npc', items: [] };
  const out = resolveActorAbilities(actor, mapOf(searingBolt()));
  assert.equal(out.items.length, 0);
});

test('does not mutate the input ability source (clone)', () => {
  const src = searingBolt();
  const map = new Map([['searing-bolt', src]]);
  resolveActorAbilities(actorDoc(['searing-bolt']), map);
  assert.equal(src._id, 'searingbolt00001');
  assert.equal(Object.keys(src.system.activities)[0], 'dmgfire000000001');
});
