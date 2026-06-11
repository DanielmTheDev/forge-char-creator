import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDistDocs } from './export-dist.mjs';

const samplePacks = () => ([
  {
    name: 'forge-abilities', collection: 'items',
    docs: [
      { _id: 'abilityaaaaaaaa1', name: 'Searing Bolt', type: 'feat', system: {}, flags: {} },
      { _id: 'abilityaaaaaaaa2', name: 'Rending Pounce', type: 'feat', system: {}, flags: {} },
    ],
  },
  {
    name: 'forge-npcs', collection: 'actors',
    docs: [{ _id: 'actorbbbbbbbbbb1', name: 'Test Goblin', type: 'npc', system: {}, flags: {} }],
  },
]);

test('emits one file per doc at <pack>/<id>.json', () => {
  const { files } = buildDistDocs({ packs: samplePacks(), version: '0.1.9' });
  assert.deepEqual(files.map(f => f.path).sort(), [
    'forge-abilities/abilityaaaaaaaa1.json',
    'forge-abilities/abilityaaaaaaaa2.json',
    'forge-npcs/actorbbbbbbbbbb1.json',
  ]);
});

test('stamps srcHash flag matching the index hash', () => {
  const { files, index } = buildDistDocs({ packs: samplePacks(), version: '0.1.9' });
  for (const f of files) {
    const entry = index.docs.find(d => d.path === f.path);
    assert.ok(entry, `index entry for ${f.path}`);
    assert.equal(f.doc.flags['forge-content'].srcHash, entry.hash);
    assert.match(entry.hash, /^[0-9a-f]{64}$/);
  }
});

test('hash is stable and independent of a pre-existing srcHash stamp (idempotent re-export)', () => {
  const first = buildDistDocs({ packs: samplePacks(), version: '0.1.9' });
  // Re-export the already-stamped docs: hashes must not change.
  const restamped = [
    { name: 'forge-abilities', collection: 'items', docs: first.files.filter(f => f.path.startsWith('forge-abilities/')).map(f => f.doc) },
    { name: 'forge-npcs', collection: 'actors', docs: first.files.filter(f => f.path.startsWith('forge-npcs/')).map(f => f.doc) },
  ];
  const second = buildDistDocs({ packs: restamped, version: '0.1.9' });
  assert.deepEqual(
    second.index.docs.map(d => [d.id, d.hash]).sort(),
    first.index.docs.map(d => [d.id, d.hash]).sort(),
  );
});

test('hash changes when doc content changes', () => {
  const a = buildDistDocs({ packs: samplePacks(), version: '0.1.9' });
  const packs = samplePacks();
  packs[0].docs[0].system.description = { value: 'changed' };
  const b = buildDistDocs({ packs, version: '0.1.9' });
  const ha = a.index.docs.find(d => d.id === 'abilityaaaaaaaa1').hash;
  const hb = b.index.docs.find(d => d.id === 'abilityaaaaaaaa1').hash;
  assert.notEqual(ha, hb);
});

test('emitted docs carry no _key and index rows carry pack/collection/name/version', () => {
  const packs = samplePacks();
  packs[0].docs[0]._key = '!items!abilityaaaaaaaa1';
  const { files, index } = buildDistDocs({ packs, version: '1.2.3' });
  for (const f of files) assert.equal(f.doc._key, undefined);
  assert.equal(index.version, '1.2.3');
  const row = index.docs.find(d => d.id === 'actorbbbbbbbbbb1');
  assert.deepEqual({ pack: row.pack, collection: row.collection, name: row.name },
    { pack: 'forge-npcs', collection: 'actors', name: 'Test Goblin' });
});

test('index ordering is deterministic (pack, then id)', () => {
  const shuffled = samplePacks().reverse();
  shuffled[1].docs.reverse();
  const a = buildDistDocs({ packs: samplePacks(), version: '0.1.9' });
  const b = buildDistDocs({ packs: shuffled, version: '0.1.9' });
  assert.deepEqual(a.index.docs.map(d => d.path), b.index.docs.map(d => d.path));
});
