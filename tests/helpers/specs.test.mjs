import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// The worker-scoped gmPage stays logged in for the whole run: a spec that opens its own
// `{ page }` would connect a SECOND Gamemaster client, and GM-side automation
// (midi OverTime, DAE/Times-Up expiry) could then run twice.
test('every spec uses the shared gmPage fixture, never its own page', () => {
  const dir = new URL('..', import.meta.url);
  for (const f of readdirSync(dir).filter(f => f.endsWith('.spec.js'))) {
    const s = readFileSync(new URL(f, dir), 'utf8');
    assert.ok(!/\(\{[^}]*\bpage\b[^}]*\}\)\s*=>/.test(s.replace(/gmPage: page/g, '')), `${f} takes its own { page }`);
    assert.ok(s.includes("from './helpers/fixtures.js'"), `${f} must import test from ./helpers/fixtures.js`);
  }
});
