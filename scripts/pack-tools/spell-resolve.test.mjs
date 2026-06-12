// Pure logic of spell-resolve.mjs: slug, exact match, near-matches, name collection.
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugifySpell, matchSpell, nearMatches, collectSpellNames } from "./spell-resolve.mjs";

test("slugifySpell kebab-cases names", () => {
  assert.equal(slugifySpell("Sacred Flame"), "sacred-flame");
  assert.equal(slugifySpell("Melf's Acid Arrow"), "melf-s-acid-arrow");
  assert.equal(slugifySpell("  Light "), "light");
  assert.equal(slugifySpell("Tasha's Hideous Laughter!"), "tasha-s-hideous-laughter");
});

const DOCS = [
  { name: "Guiding Bolt" },
  { name: "Healing Word" },
  { name: "Mass Healing Word" },
  { name: "Sacred Flame" },
  { name: "Light" },
];

test("matchSpell is exact, case-insensitive", () => {
  assert.equal(matchSpell("guiding bolt", DOCS).name, "Guiding Bolt");
  assert.equal(matchSpell("GUIDING BOLT", DOCS).name, "Guiding Bolt");
  assert.equal(matchSpell("Light", DOCS).name, "Light");
  // never substring: "Healing Word" must not match "Mass Healing Word" entry order traps
  assert.equal(matchSpell("Healing Word", DOCS).name, "Healing Word");
  assert.equal(matchSpell("Guiding", DOCS), null);
  assert.equal(matchSpell("Fireball", DOCS), null);
});

test("nearMatches surfaces likely candidates for the error message", () => {
  const near = nearMatches("Healing Words", DOCS);
  assert.ok(near.includes("Healing Word"));
  assert.ok(near.includes("Mass Healing Word"));
  assert.ok(!near.includes("Light"));
  assert.deepEqual(nearMatches("Wish", DOCS), []);
});

test("collectSpellNames dedupes across actors and rejects junk", () => {
  const actors = [
    { name: "A", spells: ["Light", "Sacred Flame"] },
    { name: "B", spells: ["Light"] },
    { name: "C" }, // no spells field — fine
  ];
  assert.deepEqual(collectSpellNames(actors).sort(), ["Light", "Sacred Flame"]);
  assert.throws(() => collectSpellNames([{ name: "Bad", spells: [""] }]), /non-empty strings/);
  assert.throws(() => collectSpellNames([{ name: "Bad", spells: [42] }]), /non-empty strings/);
});
