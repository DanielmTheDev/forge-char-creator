import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropGeometry, maskArgs } from './tokenize.mjs';

test('portrait image: square from top region, default 6% top offset', () => {
  const g = cropGeometry({ width: 1536, height: 2752 });
  assert.deepEqual(g, { side: 1536, x: 0, y: Math.round(2752 * 0.06) });
});

test('portrait image: explicit yoff wins, clamped to bounds', () => {
  assert.equal(cropGeometry({ width: 1536, height: 2752, yoff: 200 }).y, 200);
  assert.equal(cropGeometry({ width: 1536, height: 2752, yoff: 99999 }).y, 2752 - 1536);
});

test('landscape image: centered horizontally, xoff override clamped', () => {
  const g = cropGeometry({ width: 2816, height: 1536 });
  assert.deepEqual(g, { side: 1536, x: 640, y: 0 });
  assert.equal(cropGeometry({ width: 2816, height: 1536, xoff: 527 }).x, 527);
  assert.equal(cropGeometry({ width: 2816, height: 1536, xoff: 99999 }).x, 2816 - 1536);
});

test('mask draws full-bleed circle with ~2.5% margin', () => {
  assert.equal(maskArgs(1536), 'circle 768,768 768,38');
});
