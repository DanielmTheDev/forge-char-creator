import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDelta, rawUrl, apiCommitUrl } from './sync-core.mjs';

const manifest = () => ([
  { pack: 'forge-abilities', collection: 'items', id: 'abilityaaaaaaaa1', name: 'Searing Bolt', path: 'forge-abilities/abilityaaaaaaaa1.json', hash: 'h1' },
  { pack: 'forge-abilities', collection: 'items', id: 'abilityaaaaaaaa2', name: 'Rending Pounce', path: 'forge-abilities/abilityaaaaaaaa2.json', hash: 'h2' },
  { pack: 'forge-npcs', collection: 'actors', id: 'actorbbbbbbbbbb1', name: 'Test Goblin', path: 'forge-npcs/actorbbbbbbbbbb1.json', hash: 'h3' },
]);

test('missing doc -> upsert', () => {
  const existing = [
    { pack: 'forge-abilities', id: 'abilityaaaaaaaa1', srcHash: 'h1' },
    { pack: 'forge-npcs', id: 'actorbbbbbbbbbb1', srcHash: 'h3' },
  ];
  const d = computeDelta(manifest(), existing);
  assert.deepEqual(d.upserts.map(u => u.id), ['abilityaaaaaaaa2']);
  assert.deepEqual(d.deletes, []);
  assert.equal(d.unchanged, 2);
});

test('hash mismatch -> upsert', () => {
  const existing = [
    { pack: 'forge-abilities', id: 'abilityaaaaaaaa1', srcHash: 'STALE' },
    { pack: 'forge-abilities', id: 'abilityaaaaaaaa2', srcHash: 'h2' },
    { pack: 'forge-npcs', id: 'actorbbbbbbbbbb1', srcHash: 'h3' },
  ];
  const d = computeDelta(manifest(), existing);
  assert.deepEqual(d.upserts.map(u => u.id), ['abilityaaaaaaaa1']);
});

test('doc without srcHash flag (manual/unmanaged or wiped stamp) -> upsert to restore managed state', () => {
  const existing = [
    { pack: 'forge-abilities', id: 'abilityaaaaaaaa1', srcHash: undefined },
    { pack: 'forge-abilities', id: 'abilityaaaaaaaa2', srcHash: 'h2' },
    { pack: 'forge-npcs', id: 'actorbbbbbbbbbb1', srcHash: 'h3' },
  ];
  const d = computeDelta(manifest(), existing);
  assert.deepEqual(d.upserts.map(u => u.id), ['abilityaaaaaaaa1']);
});

test('managed doc absent from manifest -> delete; unmanaged doc untouched', () => {
  const existing = [
    { pack: 'forge-abilities', id: 'abilityaaaaaaaa1', srcHash: 'h1' },
    { pack: 'forge-abilities', id: 'abilityaaaaaaaa2', srcHash: 'h2' },
    { pack: 'forge-npcs', id: 'actorbbbbbbbbbb1', srcHash: 'h3' },
    { pack: 'forge-abilities', id: 'removedmanaged01', srcHash: 'hX' },
    { pack: 'forge-abilities', id: 'usermanualdoc001', srcHash: undefined },
  ];
  const d = computeDelta(manifest(), existing);
  assert.deepEqual(d.deletes, [{ pack: 'forge-abilities', id: 'removedmanaged01' }]);
  assert.deepEqual(d.upserts, []);
});

test('everything in sync -> empty delta', () => {
  const existing = manifest().map(m => ({ pack: m.pack, id: m.id, srcHash: m.hash }));
  const d = computeDelta(manifest(), existing);
  assert.deepEqual(d.upserts, []);
  assert.deepEqual(d.deletes, []);
  assert.equal(d.unchanged, 3);
});

test('url builders', () => {
  assert.equal(
    rawUrl('DanielmTheDev/forge-char-creator', 'abc123', 'forge-content/dist/index.json'),
    'https://raw.githubusercontent.com/DanielmTheDev/forge-char-creator/abc123/forge-content/dist/index.json');
  assert.equal(
    apiCommitUrl('DanielmTheDev/forge-char-creator', 'main'),
    'https://api.github.com/repos/DanielmTheDev/forge-char-creator/commits/main');
});
