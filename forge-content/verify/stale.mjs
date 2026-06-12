// Stale-aware gate: per-doc "gate hash" decides whether a doc must re-run the
// functional gate or can skip on its recorded green marker (.gate-green.json,
// repo root, gitignored — local proof, never shared).
//
// Gate hash (sha256) covers every verified input:
//   1. resolved doc JSON (actors resolved via the same trio path as build:
//      resolveActorAbilities + resolveActorSpells — a dep change changes the hash)
//   2. the doc's .expect.json content
//   3. every expect `setup`-referenced ability doc
//   4. the ENGINE hash: gate/resolver source files + installed dnd5e/midi-qol/
//      dae/times-up versions — any engine or module change marks ALL docs stale
//      (CLAUDE.md "re-test on bump").
//
// Pure core (engineHash/docGateHash/staleDocs) is unit-tested in stale.test.mjs;
// fs wrappers below feed it. CLI: `node forge-content/verify/stale.mjs [--list]`
// prints stale keys (one per line; --list = keys only, no summary). Empty output
// = nothing stale (content-verify.sh fast path skips the Foundry boot entirely).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { COLLECTIONS } from "../../scripts/pack-tools/modules.mjs";
import { resolveActorAbilities } from "../../scripts/pack-tools/resolve-abilities.mjs";
import { resolveActorSpells, loadSpellCache } from "../../scripts/pack-tools/resolve-spells.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(ROOT, "forge-content", "src", "packs");
export const MARKER_FILE = join(ROOT, ".gate-green.json");

const sha = (s) => createHash("sha256").update(s).digest("hex");

// ---------- pure core ----------

// entries: [name, content] pairs. Sorted by name so caller order can't move the hash.
export function engineHash(entries) {
  const sorted = [...entries].sort((a, b) => a[0].localeCompare(b[0]));
  return sha(JSON.stringify(sorted));
}

export function docGateHash({ resolvedDoc, expectation, setupDocs, engineHash }) {
  return sha(JSON.stringify({ doc: resolvedDoc, expect: expectation, setup: setupDocs, engine: engineHash }));
}

// hashes: Map<key, hash>; markers: { key: hash }. Stale = no marker or hash moved.
export function staleDocs(hashes, markers) {
  return [...hashes].filter(([k, h]) => markers[k] !== h).map(([k]) => k);
}

// ---------- fs wrappers ----------

// Gate-affecting source: verify/*.mjs (tests excluded; includes this file),
// the resolver trio shared with build, the playwright config + gate shell.
function engineFileList() {
  const verifyDir = join(ROOT, "forge-content", "verify");
  const files = readdirSync(verifyDir)
    .filter(f => f.endsWith(".mjs") && !f.endsWith(".test.mjs"))
    .map(f => join("forge-content", "verify", f));
  return [
    ...files,
    join("scripts", "pack-tools", "resolve-abilities.mjs"),
    join("scripts", "pack-tools", "resolve-spells.mjs"),
    join("scripts", "pack-tools", "keys.mjs"),
    "playwright.content.config.js",
    "content-verify.sh",
  ];
}

// Installed dnd5e (system.json) + gate-relevant module versions. Missing file
// (e.g. machine without Foundry) hashes as "" — absence still moves the hash.
const VERSION_SOURCES = [
  ["dnd5e", join("FoundryData", "Data", "systems", "dnd5e", "system.json")],
  ["midi-qol", join("FoundryData", "Data", "modules", "midi-qol", "module.json")],
  ["dae", join("FoundryData", "Data", "modules", "dae", "module.json")],
  ["times-up", join("FoundryData", "Data", "modules", "times-up", "module.json")],
];

export function currentEngineHash(root = ROOT) {
  const entries = engineFileList().map(rel => [rel, readFileSync(join(root, rel), "utf8")]);
  for (const [id, rel] of VERSION_SOURCES) {
    const p = join(root, rel);
    entries.push([`version:${id}`, existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")).version ?? "") : ""]);
  }
  return engineHash(entries);
}

// Same walk as content.spec.mjs gather(): every authored doc + its expect.
function gatherDocs(src = SRC) {
  const out = [];
  for (const pack of readdirSync(src, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const dir = join(src, pack.name);
    for (const f of readdirSync(dir).filter(f => f.endsWith(".json") && !f.endsWith(".expect.json") && !f.startsWith("_"))) {
      const expectFile = join(dir, `${f.replace(/\.json$/, "")}.expect.json`);
      out.push({
        key: `${pack.name}/${f}`,
        coll: COLLECTIONS[pack.name] ?? "items",
        doc: JSON.parse(readFileSync(join(dir, f), "utf8")),
        expectation: existsSync(expectFile) ? JSON.parse(readFileSync(expectFile, "utf8")) : null,
      });
    }
  }
  return out;
}

// Map<key, gateHash> over all authored docs. Actors resolved on clones
// (resolvers structuredClone internally); items hashed raw.
export function computeAllHashes() {
  const all = gatherDocs();
  const byId = new Map(all.map(i => [i.doc.system?.identifier ?? i.doc.name, i.doc]));
  const spellMap = loadSpellCache();
  const engine = currentEngineHash();
  const hashes = new Map();
  for (const item of all) {
    const resolvedDoc = item.coll === "actors"
      ? resolveActorSpells(resolveActorAbilities(item.doc, byId), spellMap)
      : item.doc;
    const setupDocs = (item.expectation?.setup ?? []).map(s => byId.get(s) ?? null);
    hashes.set(item.key, docGateHash({ resolvedDoc, expectation: item.expectation, setupDocs, engineHash: engine }));
  }
  return hashes;
}

export function readMarkers(file = MARKER_FILE) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

// Merge-write: green docs from THIS run update their marker; others keep theirs.
export function writeMarkers(updates, file = MARKER_FILE) {
  const merged = { ...readMarkers(file), ...updates };
  writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
  return merged;
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const listOnly = process.argv.includes("--list");
  const hashes = computeAllHashes();
  const stale = staleDocs(hashes, readMarkers());
  if (stale.length) {
    if (!listOnly) console.log(`${stale.length}/${hashes.size} docs stale:`);
    for (const k of stale) console.log(k);
  } else if (!listOnly) {
    console.log(`nothing stale (${hashes.size} docs green)`);
  }
}
