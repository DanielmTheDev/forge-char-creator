// Encounter math for the char wizard: party + difficulty ↔ CR ↔ AC/HP.
// Pure (no Foundry globals) so node --test covers it.
// Budget: 2024 DMG XP per character. Stats: DMG "Monster Statistics by Challenge Rating".

export const DIFFICULTIES = ["trivial", "low", "moderate", "high", "deadly"];
export const DIFFICULTY_LABELS = { trivial: "Trivial", low: "Low", moderate: "Moderate", high: "High", deadly: "Deadly" };

// 2024 DMG: XP budget per character, [low, moderate, high], index = level - 1.
const BUDGET = [
  [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100],
  [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100],
  [1900, 2900, 4100], [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800],
  [3800, 6100, 9800], [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]
];

// cr, xp, prof, ac, hp range, attack bonus, damage/round range, save DC
export const CR_TABLE = [
  [0, 10, 2, 13, 1, 6, 3, 0, 1, 13],
  [0.125, 25, 2, 13, 7, 35, 3, 2, 3, 13],
  [0.25, 50, 2, 13, 36, 49, 3, 4, 5, 13],
  [0.5, 100, 2, 13, 50, 70, 3, 6, 8, 13],
  [1, 200, 2, 13, 71, 85, 3, 9, 14, 13],
  [2, 450, 2, 13, 86, 100, 3, 15, 20, 13],
  [3, 700, 2, 13, 101, 115, 4, 21, 26, 13],
  [4, 1100, 2, 14, 116, 130, 5, 27, 32, 14],
  [5, 1800, 3, 15, 131, 145, 6, 33, 38, 15],
  [6, 2300, 3, 15, 146, 160, 6, 39, 44, 15],
  [7, 2900, 3, 15, 161, 175, 6, 45, 50, 15],
  [8, 3900, 3, 16, 176, 190, 7, 51, 56, 16],
  [9, 5000, 4, 16, 191, 205, 7, 57, 62, 16],
  [10, 5900, 4, 17, 206, 220, 7, 63, 68, 16],
  [11, 7200, 4, 17, 221, 235, 8, 69, 74, 17],
  [12, 8400, 4, 17, 236, 250, 8, 75, 80, 17],
  [13, 10000, 5, 18, 251, 265, 8, 81, 86, 18],
  [14, 11500, 5, 18, 266, 280, 8, 87, 92, 18],
  [15, 13000, 5, 18, 281, 295, 8, 93, 98, 18],
  [16, 15000, 5, 18, 296, 310, 9, 99, 104, 18],
  [17, 18000, 6, 19, 311, 325, 10, 105, 110, 19],
  [18, 20000, 6, 19, 326, 340, 10, 111, 116, 19],
  [19, 22000, 6, 19, 341, 355, 10, 117, 122, 19],
  [20, 25000, 6, 19, 356, 400, 10, 123, 140, 19],
  [21, 33000, 7, 19, 401, 445, 11, 141, 158, 20],
  [22, 41000, 7, 19, 446, 490, 11, 159, 176, 20],
  [23, 50000, 7, 19, 491, 535, 11, 177, 194, 20],
  [24, 62000, 7, 19, 536, 580, 12, 195, 212, 21],
  [25, 75000, 8, 19, 581, 625, 12, 213, 230, 21],
  [26, 90000, 8, 19, 626, 670, 12, 231, 248, 21],
  [27, 105000, 8, 19, 671, 715, 13, 249, 266, 22],
  [28, 120000, 8, 19, 716, 760, 13, 267, 284, 22],
  [29, 135000, 9, 19, 761, 805, 13, 285, 302, 22],
  [30, 155000, 9, 19, 806, 850, 14, 303, 320, 23]
].map(([cr, xp, prof, ac, hpMin, hpMax, atk, dmgMin, dmgMax, dc]) => ({ cr, xp, prof, ac, hpMin, hpMax, atk, dmgMin, dmgMax, dc }));

const FRACTIONS = { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };
export const crLabel = (cr) => FRACTIONS[cr] ?? String(cr);
export const crRow = (cr) => CR_TABLE.find(r => r.cr === Number(cr)) ?? CR_TABLE[0];

const clampLevel = (lvl) => Math.min(20, Math.max(1, Math.round(Number(lvl) || 1)));

/** Whole-party XP thresholds. Trivial = under half the low budget; deadly = over high. */
export function partyBudget(size, level) {
  const n = Math.max(1, Math.round(Number(size) || 1));
  const [low, moderate, high] = BUDGET[clampLevel(level) - 1].map(x => x * n);
  return { low, moderate, high };
}

/** Difficulty of `copies` monsters of this CR against the party. */
export function difficultyOf(cr, { size, level, copies = 1 }) {
  const xp = crRow(cr).xp * Math.max(1, Math.round(Number(copies) || 1));
  const b = partyBudget(size, level);
  if (xp <= b.low / 2) return "trivial";
  if (xp <= b.low) return "low";
  if (xp <= b.moderate) return "moderate";
  if (xp <= b.high) return "high";
  return "deadly";
}

/** Highest CR that still rates as `difficulty`, so difficultyOf(suggestCR(d)) === d whenever any CR can. */
export function suggestCR(difficulty, party) {
  const hits = CR_TABLE.filter(r => difficultyOf(r.cr, party) === difficulty);
  if (difficulty === "deadly") return hits[0]?.cr ?? 30; // weakest CR that is deadly: deadly, not absurd
  if (hits.length) return hits.at(-1).cr;
  // Unreachable band (e.g. trivial vs a level-1 party): nearest CR on the requested side.
  const want = DIFFICULTIES.indexOf(difficulty);
  const below = CR_TABLE.filter(r => DIFFICULTIES.indexOf(difficultyOf(r.cr, party)) <= want);
  return (below.at(-1) ?? CR_TABLE[0]).cr;
}

/** AC/HP that rate exactly as this CR (HP = middle of the table band). */
export function statsForCR(cr) {
  const r = crRow(cr);
  return { ac: r.ac, hp: Math.round((r.hpMin + r.hpMax) / 2) };
}

const mod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);

/**
 * DMG CR estimate from what the wizard knows: defensive CR from HP, shifted one step per
 * 2 AC off the table; offense assumes table damage, shifted by attack bonus (prof + best
 * of STR/DEX/spellcasting mod) the same way. Final CR = average of both.
 */
export function estimateCR({ hp, ac, abilities = {}, spellcasting = "" }) {
  const n = CR_TABLE.length - 1;
  const hpVal = Math.max(1, Number(hp) || 1);
  let def = CR_TABLE.findIndex(r => hpVal <= r.hpMax);
  if (def < 0) def = n;
  def = Math.min(n, Math.max(0, def + Math.trunc(((Number(ac) || 10) - CR_TABLE[def].ac) / 2)));
  const row = CR_TABLE[def];
  const best = Math.max(mod(abilities.str), mod(abilities.dex), spellcasting ? mod(abilities[spellcasting]) : -5);
  const off = Math.min(n, Math.max(0, def + Math.trunc((row.prof + best - row.atk) / 2)));
  return CR_TABLE[Math.round((def + off) / 2)].cr;
}

/** Lowest score ≥ `score` whose mod + prof reaches the table attack bonus for this CR. */
export function attackFloor(cr, score) {
  const r = crRow(cr);
  return Math.max(Number(score) || 10, 10 + 2 * (r.atk - r.prof));
}
