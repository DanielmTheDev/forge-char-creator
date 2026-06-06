import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, buildCatalogJson } from './catalog.mjs';

const rows = () => ([
  { identifier: 'searing-bolt', name: 'Searing Bolt', img: 'icons/magic/fire/x.webp',
    description: '<p>You hurl a mote of fire dealing <strong>10 fire</strong> damage.</p>', tier: 'T3' },
  { identifier: 'bracers-of-defense', name: 'Bracers of Defense', img: 'icons/equipment/y.webp',
    description: '<p>+2 AC while worn.</p>', tier: undefined },
]);

test('renders a markdown table with a header row', () => {
  const md = buildCatalog(rows());
  assert.match(md, /\| *Identifier *\|/);
  assert.match(md, /\| *-+ *\|/);
});

test('emits one row per ability with identifier + name', () => {
  const md = buildCatalog(rows());
  assert.match(md, /searing-bolt/);
  assert.match(md, /Searing Bolt/);
  assert.match(md, /bracers-of-defense/);
});

test('strips HTML from the description', () => {
  const md = buildCatalog(rows());
  assert.equal(md.includes('<p>'), false);
  assert.equal(md.includes('<strong>'), false);
  assert.match(md, /10 fire/);
});

test('uses a dash fallback for a missing tier', () => {
  const md = buildCatalog([rows()[1]]);
  assert.match(md, /—/);
});

test('sorts rows by identifier (deterministic)', () => {
  const md = buildCatalog(rows());
  assert.ok(md.indexOf('bracers-of-defense') < md.indexOf('searing-bolt'));
});

test('escapes pipe characters so table cells do not break', () => {
  const md = buildCatalog([{ identifier: 'x', name: 'A|B', img: '', description: 'a | b', tier: 'T2' }]);
  // No raw " | " inside a cell would split it; expect escaped pipes.
  assert.equal(md.includes('A|B'), false);
  assert.match(md, /A\\\|B/);
});

test('buildCatalogJson emits structured rows sorted by identifier', () => {
  const j = buildCatalogJson(rows());
  assert.equal(j.length, 2);
  assert.equal(j[0].identifier, 'bracers-of-defense'); // sorted before searing-bolt
  assert.equal(j[1].identifier, 'searing-bolt');
  assert.deepEqual(Object.keys(j[0]), ['identifier', 'name', 'tier', 'img', 'description']);
});

test('buildCatalogJson strips HTML but does NOT escape pipes (valid JSON values)', () => {
  const j = buildCatalogJson([{ identifier: 'x', name: 'A|B', img: '', description: '<p>a | b</p>', tier: 'T2' }]);
  assert.equal(j[0].name, 'A|B');          // raw pipe preserved
  assert.equal(j[0].description, 'a | b'); // tags stripped, no escape
});

test('buildCatalogJson uses null (not undefined) for missing tier', () => {
  const j = buildCatalogJson([rows()[1]]);
  assert.equal(j[0].tier, null);
});
