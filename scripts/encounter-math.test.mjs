import { test } from "node:test";
import assert from "node:assert/strict";
import { CR_TABLE, DIFFICULTIES, crLabel, partyBudget, difficultyOf, suggestCR, statsForCR, estimateCR, attackFloor } from "./encounter-math.js";

test("partyBudget scales 2024 per-character budget by party size", () => {
  assert.deepEqual(partyBudget(4, 5), { low: 2000, moderate: 3000, high: 4400 });
  assert.deepEqual(partyBudget(1, 99), { low: 6400, moderate: 13200, high: 22000 }); // level clamped
});

test("difficultyOf bands total XP of all copies", () => {
  const party = { size: 4, level: 5 };
  assert.equal(difficultyOf(1, party), "trivial");                 // 200 ≤ 1000
  assert.equal(difficultyOf(4, party), "low");                     // 1100
  assert.equal(difficultyOf(5, party), "low");                     // 1800 ≤ 2000
  assert.equal(difficultyOf(6, party), "moderate");                // 2300
  assert.equal(difficultyOf(8, party), "high");                    // 3900 ≤ 4400
  assert.equal(difficultyOf(9, party), "deadly");                  // 5000
  assert.equal(difficultyOf(4, { ...party, copies: 4 }), "high");   // 4400 = high edge
  assert.equal(difficultyOf(4, { ...party, copies: 5 }), "deadly"); // 5500
});

test("suggestCR round-trips through difficultyOf for every reachable band", () => {
  for (const size of [1, 3, 4, 6]) for (let level = 1; level <= 20; level++) for (const copies of [1, 4]) {
    const party = { size, level, copies };
    for (const d of DIFFICULTIES) {
      const reachable = CR_TABLE.some(r => difficultyOf(r.cr, party) === d);
      if (reachable) assert.equal(difficultyOf(suggestCR(d, party), party), d, `${d} ${JSON.stringify(party)}`);
    }
  }
});

test("statsForCR + attackFloor estimate back to the same CR", () => {
  for (const { cr } of CR_TABLE) {
    const { ac, hp } = statsForCR(cr);
    const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    abilities.str = attackFloor(cr, abilities.str);
    assert.equal(estimateCR({ hp, ac, abilities }), cr, `CR ${crLabel(cr)}`);
  }
});

test("estimateCR: AC and attack shift the estimate", () => {
  const base = { hp: 138, ac: 15, abilities: { str: 16 } };    // CR 5, +3 prof +3 = +6
  assert.equal(estimateCR(base), 5);
  assert.equal(estimateCR({ ...base, ac: 19 }), 7);             // +4 AC → def +2 (offense rated vs that row)
  assert.equal(estimateCR({ ...base, abilities: { str: 8, dex: 8 } }), 4); // +2 attack vs +6 → off -2 → avg -1
  assert.equal(estimateCR({ ...base, abilities: { str: 10, int: 16 }, spellcasting: "int" }), 5);
  assert.equal(estimateCR({ hp: 3, ac: 10, abilities: {} }), 0);
  assert.equal(estimateCR({ hp: 9999, ac: 25, abilities: { str: 30 } }), 30);
});
