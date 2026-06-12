// Resolve an actor's vanilla-spell fields into real spellcasting:
//
//   "spellcasting": { "ability": "cha", "level": 3, "slots": { "1": 2 } },
//   "spells": ["Sacred Flame", "Light", "Guiding Bolt", "Healing Word"]
//
// Each named spell is inlined from the committed spell cache
// (forge-content/src/spell-cache/, written by `npm run spells:resolve`) as an
// embedded item, re-keyed through the same deterministic path as ability refs
// (inlineAbility + genId). The spellcasting block becomes real sheet data:
// system.attributes.spellcasting (ability), system.details.spellLevel (caster
// level — cantrips scale off it), system.spells.spell<N> {value,max,override}.
//
// Pure + fs-free core (caller supplies spellMap), mirroring resolve-abilities;
// `loadSpellCache()` is the one fs helper all consumers share. Wired into the
// same trio: build.mjs, export-dist.mjs, verify/content.spec.mjs.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inlineAbility } from "./resolve-abilities.mjs";

const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "forge-content", "src", "spell-cache");

// Map<lowercased spell name, spellDoc> from the committed cache. Missing dir = empty
// map (repos without vanilla spells stay valid).
export function loadSpellCache(dir = CACHE_DIR) {
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const f of readdirSync(dir).filter(f => f.endsWith(".json"))) {
    const doc = JSON.parse(readFileSync(join(dir, f), "utf8"));
    map.set(doc.name.toLowerCase(), doc);
  }
  return map;
}

const ABILITY_SCORES = ["str", "dex", "con", "int", "wis", "cha"];

// Validate the authored spellcasting/spells fields. Returns string[] of errors.
// Shared by resolveActorSpells (throws on any) and statblock-validate (reports).
export function validateActorSpells(actorDoc, spellNames) {
  const errs = [];
  const who = `actor "${actorDoc?.name ?? "?"}"`;
  const hasSpells = "spells" in (actorDoc ?? {});
  const hasCasting = "spellcasting" in (actorDoc ?? {});
  if (!hasSpells && !hasCasting) return errs;

  if (hasSpells && !hasCasting) errs.push(`${who}: "spells" requires a "spellcasting" block (ability/level — cantrips scale off caster level)`);
  if (hasCasting && !hasSpells) errs.push(`${who}: "spellcasting" without "spells" is dead config — add spell names or drop it`);

  if (hasSpells) {
    if (!Array.isArray(actorDoc.spells) || !actorDoc.spells.length) errs.push(`${who}: "spells" must be a non-empty array of vanilla spell names`);
    else {
      const known = new Set(spellNames.map(n => n.toLowerCase()));
      for (const n of actorDoc.spells) {
        if (typeof n !== "string" || !n.trim()) { errs.push(`${who}: spells entries must be non-empty strings (got ${JSON.stringify(n)})`); continue; }
        if (!known.has(n.toLowerCase())) errs.push(`${who}: spell "${n}" not in spell-cache — run \`npm run spells:resolve\` (exact vanilla spelling required)`);
      }
    }
  }

  if (hasCasting) {
    const sc = actorDoc.spellcasting;
    if (!sc || typeof sc !== "object" || Array.isArray(sc)) { errs.push(`${who}: "spellcasting" must be an object { ability, level, slots? }`); return errs; }
    for (const k of Object.keys(sc)) if (!["ability", "level", "slots"].includes(k)) errs.push(`${who}: unknown spellcasting key "${k}" (allowed: ability, level, slots)`);
    if (!ABILITY_SCORES.includes(sc.ability)) errs.push(`${who}: spellcasting.ability must be one of ${ABILITY_SCORES.join("/")} (got ${JSON.stringify(sc.ability)})`);
    if (!Number.isInteger(sc.level) || sc.level < 1 || sc.level > 20) errs.push(`${who}: spellcasting.level must be an integer 1–20 (got ${JSON.stringify(sc.level)})`);
    if ("slots" in sc) {
      if (!sc.slots || typeof sc.slots !== "object" || Array.isArray(sc.slots)) errs.push(`${who}: spellcasting.slots must be an object { "<1-9>": count }`);
      else for (const [lvl, n] of Object.entries(sc.slots)) {
        if (!/^[1-9]$/.test(lvl)) errs.push(`${who}: slot level "${lvl}" must be 1–9`);
        if (!Number.isInteger(n) || n < 0) errs.push(`${who}: slot count for level ${lvl} must be a non-negative integer (got ${JSON.stringify(n)})`);
      }
    }
  }
  return errs;
}

export function resolveActorSpells(actorDoc, spellMap) {
  const out = structuredClone(actorDoc);
  if (!("spells" in out) && !("spellcasting" in out)) return out;

  const errs = validateActorSpells(out, [...spellMap.values()].map(d => d.name));
  if (errs.length) throw new Error(errs.join("\n"));

  const sc = out.spellcasting;
  out.system ??= {};
  out.system.attributes ??= {};
  out.system.attributes.spellcasting = sc.ability;
  out.system.details ??= {};
  out.system.details.spellLevel = sc.level;
  for (const [lvl, n] of Object.entries(sc.slots ?? {})) {
    out.system.spells ??= {};
    out.system.spells[`spell${lvl}`] = { value: n, max: n, override: n };
  }

  out.items = out.items ?? [];
  (out.spells ?? []).forEach((name, index) => {
    const spell = spellMap.get(name.toLowerCase());
    // validateActorSpells already guaranteed presence; guard for direct callers.
    if (!spell) throw new Error(`actor "${out.name}": spell "${name}" not in spell-cache — run \`npm run spells:resolve\``);
    const item = inlineAbility(spell, out._id, { ability: `spell:${name}` }, index);
    // NPC sheets have no prepare toggle; an unprepared inlined spell can't be cast.
    if (item.system?.preparation?.mode === "prepared") item.system.preparation.prepared = true;
    out.items.push(item);
  });

  delete out.spells;
  delete out.spellcasting;
  return out;
}
