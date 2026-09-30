import { test } from "node:test";
import assert from "node:assert/strict";
import { nextVersion, shouldRelease, compare, parse } from "./plan.mjs";

test("first release uses the module.json version", () => {
  assert.equal(nextVersion({ lastTag: null, floor: "1.4.0" }), "1.4.0");
});

test("patch bump from last tag", () => {
  assert.equal(nextVersion({ lastTag: "1.4.0", floor: "1.4.0" }), "1.4.1");
  assert.equal(nextVersion({ lastTag: "1.4.9", floor: "1.3.0" }), "1.4.10");
});

test("raised floor wins (manual minor/major bump)", () => {
  assert.equal(nextVersion({ lastTag: "1.4.7", floor: "1.5.0" }), "1.5.0");
  assert.equal(nextVersion({ lastTag: "1.4.7", floor: "2.0.0" }), "2.0.0");
});

test("release only on change, missing tag, or raised floor", () => {
  assert.equal(shouldRelease({ lastTag: "1.4.2", floor: "1.4.0", changed: false }), false);
  assert.equal(shouldRelease({ lastTag: "1.4.2", floor: "1.4.0", changed: true }), true);
  assert.equal(shouldRelease({ lastTag: null, floor: "1.4.0", changed: false }), true);
  assert.equal(shouldRelease({ lastTag: "1.4.2", floor: "1.5.0", changed: false }), true);
});

test("semver compare is numeric, not lexical", () => {
  assert.ok(compare("1.4.10", "1.4.9") > 0);
  assert.equal(parse("1.4"), null);
  assert.throws(() => nextVersion({ lastTag: null, floor: "dev" }));
});
