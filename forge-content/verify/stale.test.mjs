import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { engineHash, docGateHash, staleDocs, computeAllHashes, readMarkers, writeMarkers } from './stale.mjs';

const baseArgs = () => ({
  resolvedDoc: { name: 'Strike', system: { identifier: 'strike' } },
  expectation: { tier: 'T3', assert: { defenderHpDelta: -6 } },
  setupDocs: [{ name: 'Mark' }],
  engineHash: 'e1',
});

test('docGateHash stable for identical input', () => {
  assert.equal(docGateHash(baseArgs()), docGateHash(baseArgs()));
});

test('docGateHash moves on doc / expect / setup-dep / engine change', () => {
  const base = docGateHash(baseArgs());
  const mutate = (patch) => docGateHash({ ...baseArgs(), ...patch });
  assert.notEqual(mutate({ resolvedDoc: { name: 'Strike2' } }), base);
  assert.notEqual(mutate({ expectation: { tier: 'T2' } }), base);
  assert.notEqual(mutate({ setupDocs: [{ name: 'Mark', img: 'x' }] }), base);
  assert.notEqual(mutate({ engineHash: 'e2' }), base);
});

test('engineHash order-insensitive, content-sensitive', () => {
  const a = ['a.mjs', 'AAA'], b = ['b.mjs', 'BBB'];
  assert.equal(engineHash([a, b]), engineHash([b, a]));
  assert.notEqual(engineHash([a, b]), engineHash([a, ['b.mjs', 'BBB2']]));
});

test('staleDocs: missing marker or moved hash = stale; match = green', () => {
  const hashes = new Map([['p/a.json', 'h1'], ['p/b.json', 'h2'], ['p/c.json', 'h3']]);
  const markers = { 'p/a.json': 'h1', 'p/b.json': 'OLD' };
  assert.deepEqual(staleDocs(hashes, markers), ['p/b.json', 'p/c.json']);
  assert.deepEqual(staleDocs(hashes, { 'p/a.json': 'h1', 'p/b.json': 'h2', 'p/c.json': 'h3' }), []);
});

test('marker round-trip: write merges, read returns merged', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gate-green-'));
  const file = join(dir, '.gate-green.json');
  try {
    assert.deepEqual(readMarkers(file), {});
    writeMarkers({ 'p/a.json': 'h1' }, file);
    writeMarkers({ 'p/b.json': 'h2' }, file);
    assert.deepEqual(readMarkers(file), { 'p/a.json': 'h1', 'p/b.json': 'h2' });
    writeMarkers({ 'p/a.json': 'h1b' }, file);
    assert.equal(readMarkers(file)['p/a.json'], 'h1b');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Integration (read-only fs): every authored doc gets a key-formatted hash.
test('computeAllHashes covers all authored docs with pack/file keys', () => {
  const hashes = computeAllHashes();
  assert.ok(hashes.size > 0);
  for (const [k, h] of hashes) {
    assert.match(k, /^[\w-]+\/[\w-]+\.json$/);
    assert.match(h, /^[0-9a-f]{64}$/);
  }
  // deterministic across calls
  assert.deepEqual([...computeAllHashes()], [...hashes]);
});
