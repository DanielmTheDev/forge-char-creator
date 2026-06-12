#!/usr/bin/env node
// Resolve vanilla dnd5e spell names -> committed spell cache.
//
// WHY A CACHE: CI (release.yml) has no Foundry install, but packs:build and
// content:dist run there — so spell docs CANNOT be read from the dnd5e LevelDB
// at build time. This script runs LOCALLY (once per new spell name), reads the
// system packs, and writes each spell doc to forge-content/src/spell-cache/
// (committed, OUTSIDE src/packs/ so doc-globs never treat it as authored
// content). All build-time consumers read only the cache.
//
// `npm run spells:resolve [-- <Extra Name> ...]` — scans every actor source for
// `spells: [...]` names (plus optional explicit names as args), looks each up in
// dnd5e `spells24` (2024 PHB) first, then `spells` (SRD fallback), matches by
// exact name (case-insensitive), and writes <kebab-name>.json with the source
// pack recorded at flags["forge-content"].spellSource.
//
// LevelDB nuance: compendium embedded effects live under separate keys
// (`!items.effects!<itemId>.<effId>`) — the item's `effects` array holds id
// strings only. We hydrate them back into full effect docs so the cached file
// is a complete, self-contained item doc.
//
// Foundry server must be STOPPED (LevelDB lock is exclusive) — errors clearly.
// Missing spell name → hard error listing near-matches. Never silent.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULES, COLLECTIONS } from "./modules.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CACHE_DIR = join(REPO_ROOT, "forge-content", "src", "spell-cache");
const DND5E_PACKS = join(REPO_ROOT, "FoundryData", "Data", "systems", "dnd5e", "packs");
// Lookup order: 2024 PHB preferred, SRD fallback.
const SPELL_PACKS = ["spells24", "spells"];

// --- pure helpers (unit-tested in spell-resolve.test.mjs) ---

// "Sacred Flame" -> "sacred-flame"; strips anything non-alphanumeric.
export function slugifySpell(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Exact case-insensitive name match over [{name, ...}] docs. Returns doc or null.
export function matchSpell(name, docs) {
  const want = String(name).toLowerCase();
  return docs.find(d => (d.name ?? "").toLowerCase() === want) ?? null;
}

// For the hard-error message: docs whose name shares a word or contains the query.
export function nearMatches(name, docs, limit = 8) {
  const want = String(name).toLowerCase();
  const words = want.split(/\s+/).filter(w => w.length > 3);
  return docs
    .map(d => d.name)
    .filter(n => {
      const ln = n.toLowerCase();
      return ln.includes(want) || want.includes(ln) || words.some(w => ln.includes(w));
    })
    .sort()
    .slice(0, limit);
}

// Collect unique spell names from actor source docs' `spells: [...]` fields.
export function collectSpellNames(actorDocs) {
  const names = new Set();
  for (const doc of actorDocs) {
    for (const n of doc.spells ?? []) {
      if (typeof n !== "string" || !n.trim()) throw new Error(`actor "${doc.name}": spells entries must be non-empty strings (got ${JSON.stringify(n)})`);
      names.add(n);
    }
  }
  return [...names];
}

// --- fs/db part ---

async function openPack(name) {
  const { ClassicLevel } = await import("classic-level");
  const db = new ClassicLevel(join(DND5E_PACKS, name), {
    keyEncoding: "utf8", valueEncoding: "json", createIfMissing: false, readOnly: true,
  });
  try {
    await db.open();
  } catch (e) {
    if (/lock/i.test(e.message ?? "") || /lock/i.test(e.cause?.message ?? ""))
      throw new Error(`dnd5e pack "${name}" is LOCKED — stop the Foundry server first (pgrep -f "[m]ain.js --dataPath"), then re-run.`);
    throw e;
  }
  return db;
}

// Load all spell items of a pack + hydrate their embedded effects.
async function loadPackSpells(db) {
  const items = [];
  const effects = new Map(); // itemId -> [effectDoc]
  for await (const [key, doc] of db.iterator()) {
    if (key.startsWith("!items!")) items.push(doc);
    else if (key.startsWith("!items.effects!")) {
      const itemId = key.slice("!items.effects!".length).split(".")[0];
      if (!effects.has(itemId)) effects.set(itemId, []);
      effects.get(itemId).push(doc);
    }
  }
  for (const item of items) {
    const own = effects.get(item._id) ?? [];
    // Storage keeps id strings in item.effects; replace with full docs (stable order).
    item.effects = (item.effects ?? []).map(id => {
      const eff = own.find(e => e._id === id);
      if (!eff) throw new Error(`spell "${item.name}": embedded effect "${id}" missing from pack`);
      return eff;
    });
  }
  return items.filter(i => i.type === "spell");
}

const VOLATILE_STATS = ["createdTime", "modifiedTime", "lastModifiedBy", "duplicateSource", "exportSource"];

function cleanSpellDoc(doc, sourcePack) {
  const out = structuredClone(doc);
  // Compendium-only residue; embedded items must not carry these.
  delete out.folder;
  delete out.sort;
  delete out.ownership;
  delete out._key;
  if (out._stats) for (const k of VOLATILE_STATS) delete out._stats[k];
  for (const eff of out.effects ?? []) {
    delete eff._key;
    delete eff.sort;
    if (eff._stats) for (const k of VOLATILE_STATS) delete eff._stats[k];
  }
  out.flags ??= {};
  out.flags["forge-content"] = { ...(out.flags["forge-content"] ?? {}), spellSource: `dnd5e.${sourcePack}` };
  return out;
}

async function main() {
  const extraNames = process.argv.slice(2).filter(a => !a.startsWith("--"));

  // Scan every registered module's actor packs for `spells:` names.
  const actorDocs = [];
  for (const mod of MODULES) {
    const src = join(REPO_ROOT, mod.dir, "src", "packs");
    if (!existsSync(src)) continue;
    for (const pack of readdirSync(src, { withFileTypes: true }).filter(d => d.isDirectory())) {
      if ((COLLECTIONS[pack.name] ?? "items") !== "actors") continue;
      const dir = join(src, pack.name);
      for (const f of readdirSync(dir).filter(f => f.endsWith(".json") && !f.endsWith(".expect.json") && !f.startsWith("_"))) {
        actorDocs.push(JSON.parse(readFileSync(join(dir, f), "utf8")));
      }
    }
  }

  const names = [...new Set([...collectSpellNames(actorDocs), ...extraNames])];
  if (!names.length) { console.log("No `spells:` names in any actor source and no names given — nothing to resolve."); return; }

  // Load both packs once (preferred order).
  const packSpells = []; // [{ pack, spells }]
  for (const packName of SPELL_PACKS) {
    if (!existsSync(join(DND5E_PACKS, packName))) { console.warn(`(dnd5e pack "${packName}" not installed — skipped)`); continue; }
    const db = await openPack(packName);
    try {
      packSpells.push({ pack: packName, spells: await loadPackSpells(db) });
    } finally {
      await db.close();
    }
  }
  if (!packSpells.length) throw new Error(`No dnd5e spell packs found under ${DND5E_PACKS}`);

  mkdirSync(CACHE_DIR, { recursive: true });
  const failures = [];
  for (const name of names) {
    let hit = null;
    for (const { pack, spells } of packSpells) {
      const doc = matchSpell(name, spells);
      if (doc) { hit = { doc, pack }; break; }
    }
    if (!hit) {
      const all = packSpells.flatMap(p => p.spells);
      const near = nearMatches(name, all);
      failures.push(`"${name}" — not found in ${packSpells.map(p => p.pack).join(" or ")}.${near.length ? ` Near matches: ${near.join(", ")}` : ""}`);
      continue;
    }
    const file = join(CACHE_DIR, `${slugifySpell(name)}.json`);
    writeFileSync(file, JSON.stringify(cleanSpellDoc(hit.doc, hit.pack), null, 2) + "\n");
    console.log(`✓ ${name} <- dnd5e.${hit.pack} -> spell-cache/${slugifySpell(name)}.json`);
  }

  if (failures.length) {
    console.error(`✗ ${failures.length} spell(s) unresolved:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`✅ spell cache up to date (${names.length} name(s)).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { console.error(`✗ ${e.message}`); process.exit(1); });
}
