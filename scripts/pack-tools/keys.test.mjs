import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectKeys, stripKeys, genId } from './keys.mjs';

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

test('injectKeys(actors) rejects a wrong-length actor-own effect id', () => {
  const d = actorDoc();
  d.effects[0]._id = 'short';
  assert.throws(() => injectKeys(d, 'actors', 'test-goblin.json'), /16 alphanumeric/);
});

test('injectKeys(items) still sets item-pack effect _key (unchanged)', () => {
  const d = injectKeys({ _id: 'abilitydoc000001', name: 'Bolt', effects: [{ _id: 'abilityeff000001', name: 'E' }] }, 'items', 'bolt.json');
  assert.equal(d._key, '!items!abilitydoc000001');
  assert.equal(d.effects[0]._key, '!items.effects!abilitydoc000001.abilityeff000001');
});

const ID16 = /^[A-Za-z0-9]{16}$/;

test('genId returns a 16-alphanumeric id', () => {
  assert.match(genId('actor:searing-bolt:0'), ID16);
});

test('genId is deterministic — same seed, same id', () => {
  assert.equal(genId('actor:searing-bolt:0'), genId('actor:searing-bolt:0'));
});

test('genId differs for different seeds', () => {
  assert.notEqual(genId('actor:searing-bolt:0'), genId('actor:searing-bolt:1'));
  assert.notEqual(genId('a:x:0'), genId('b:x:0'));
});

test('genId output passes injectKeys id validation', () => {
  const id = genId('actor:searing-bolt:0:act:dmgfire000000001');
  const d = injectKeys({ _id: id, name: 'X', effects: [] }, 'items', 'x.json');
  assert.equal(d._key, `!items!${id}`);
});

test('stripKeys removes _key at every actor level', () => {
  const d = injectKeys(actorDoc(), 'actors', 'test-goblin.json');
  stripKeys(d);
  assert.equal(d._key, undefined);
  assert.equal(d.effects[0]._key, undefined);
  assert.equal(d.items[0]._key, undefined);
  assert.equal(d.items[0].effects[0]._key, undefined);
});
