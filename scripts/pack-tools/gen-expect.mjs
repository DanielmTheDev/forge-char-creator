#!/usr/bin/env node
// Auto-generate the gate .expect.json for an image→statblock actor (Roadmap D).
// T2 asserts (hpMax/ac/abilities/hasItems) are fully derivable from the RESOLVED
// actor (post `resolveActorAbilities`), so they're written automatically — no
// Foundry, no human guessing. T3 combat asserts need a real run to know the
// damage, so `--t3` emits only a SCAFFOLD with TODO values for a human to fill.
//
// Never overwrites a hand-edited expect (so re-running is safe).
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTIONS } from "./modules.mjs";
import { resolveActorAbilities } from "./resolve-abilities.mjs";
import { resolveActorSpells, loadSpellCache } from "./resolve-spells.mjs";

const ABILITY_SCORES = ["str", "dex", "con", "int", "wis", "cha"];

// Map<identifier, abilityDoc> over item-collection packs (mirrors build.mjs#loadAbilityMap;
// not imported because build.mjs runs its CLI on import).
export function loadAbilityMap(srcPacks) {
  const map = new Map();
  for (const pack of readdirSync(srcPacks, { withFileTypes: true }).filter(d => d.isDirectory())) {
    if ((COLLECTIONS[pack.name] ?? "items") !== "items") continue;
    const dir = join(srcPacks, pack.name);
    for (const f of readdirSync(dir).filter(f => f.endsWith(".json") && !f.endsWith(".expect.json") && !f.startsWith("_"))) {
      const doc = JSON.parse(readFileSync(join(dir, f), "utf8"));
      map.set(doc.system?.identifier ?? doc.name, doc);
    }
  }
  return map;
}

// PURE: T2 expect from a resolved actor. ac flat -> derived ac === flat.
export function t2ExpectFor(resolved) {
  const abilities = {};
  for (const s of ABILITY_SCORES) {
    const v = resolved.system?.abilities?.[s]?.value;
    if (Number.isInteger(v)) abilities[s] = v;
  }
  return {
    tier: "T2",
    assert: {
      hpMax: resolved.system?.attributes?.hp?.max,
      ac: resolved.system?.attributes?.ac?.flat,
      abilities,
      hasItems: (resolved.items ?? []).map(i => i.name),
    },
  };
}

// PURE: T3 combat scaffold. Damage left as a TODO string (needs a real midi run).
export function t3ScaffoldFor(resolved) {
  const name = resolved.name;
  const firstAbilityId = resolved.items?.[0]?.system?.identifier ?? "TODO-ability-identifier";
  return {
    tier: "T3",
    actors: {
      [name]: { authored: true, disposition: 1, pos: [100, 100] },
      dummy: { hp: 100, ac: 10, disposition: -1, pos: [200, 100] },
    },
    steps: [
      { castOwn: name, ability: firstAbilityId, targets: ["dummy"] },
      { snapshot: "hit" },
    ],
    scenarios: [{ name: "default" }],
    assert: [
      { at: "hit", actor: "dummy", hpDelta: "TODO — fill from a real run (negative = damage)" },
    ],
  };
}

function main() {
  const args = process.argv.slice(2);
  const t3 = args.includes("--t3");
  const slug = args.find(a => !a.startsWith("--"));
  if (!slug) { console.error("usage: node gen-expect.mjs <actor-slug> [--t3]"); process.exit(2); }

  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const srcPacks = join(repoRoot, "forge-content", "src", "packs");
  const npcDir = join(srcPacks, "forge-npcs");
  const actorFile = join(npcDir, `${slug}.json`);
  if (!existsSync(actorFile)) { console.error(`no actor source at ${actorFile}`); process.exit(2); }

  const actorDoc = JSON.parse(readFileSync(actorFile, "utf8"));
  // Same resolution as build: abilities + vanilla spells — spell names join hasItems.
  const resolved = resolveActorSpells(resolveActorAbilities(actorDoc, loadAbilityMap(srcPacks)), loadSpellCache());

  const t2Path = join(npcDir, `${slug}.expect.json`);
  if (existsSync(t2Path)) {
    console.log(`• ${slug}.expect.json exists — left untouched (hand-edited expects are never overwritten)`);
  } else {
    writeFileSync(t2Path, JSON.stringify(t2ExpectFor(resolved), null, 2) + "\n");
    console.log(`✓ wrote ${slug}.expect.json (T2, auto-derived)`);
  }

  if (t3) {
    const scaffoldPath = join(npcDir, `${slug}.t3.expect.json.scaffold`);
    if (existsSync(scaffoldPath)) {
      console.log(`• ${slug}.t3.expect.json.scaffold exists — left untouched`);
    } else {
      writeFileSync(scaffoldPath, JSON.stringify(t3ScaffoldFor(resolved), null, 2) + "\n");
      console.log(`✓ wrote ${slug}.t3.expect.json.scaffold — fill TODO damage, then rename to ${slug}.expect.json`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
