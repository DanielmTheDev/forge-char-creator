#!/usr/bin/env node
// Compile forge-content JSON source -> LevelDB compendium packs.
// Source docs carry _id only; this injects the foundryvtt-cli _key
// (`!<coll>!<id>`, effects `!<coll>.effects!<docId>.<effId>`) into a
// staging copy, then runs `fvtt package pack`. Source stays key-free.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));   // forge-content/
const REPO_ROOT = dirname(MODULE_DIR);                        // repo root (has node_modules)
const SRC = join(MODULE_DIR, "src", "packs");
const STAGE = join(MODULE_DIR, ".pack-build");
const OUT = join(MODULE_DIR, "packs");

// Primary document collection per pack (Item pack => "items").
const COLLECTION = { "forge-abilities": "items" };

function injectKeys(doc, coll, file) {
  if (!doc._id) throw new Error(`${file}: doc "${doc.name}" missing _id`);
  doc._key = `!${coll}!${doc._id}`;
  for (const eff of doc.effects ?? []) {
    if (!eff._id) throw new Error(`${file}: effect "${eff.name}" missing _id`);
    eff._key = `!${coll}.effects!${doc._id}.${eff._id}`;
  }
  return doc;
}

if (!existsSync(SRC)) { console.error(`No source dir: ${SRC}`); process.exit(1); }
rmSync(STAGE, { recursive: true, force: true });

const packs = readdirSync(SRC, { withFileTypes: true }).filter(d => d.isDirectory());
if (!packs.length) { console.error("No packs found under src/packs/"); process.exit(1); }

for (const pack of packs) {
  const name = pack.name;
  const coll = COLLECTION[name] ?? "items";
  const srcDir = join(SRC, name);
  const stageDir = join(STAGE, name);
  mkdirSync(stageDir, { recursive: true });

  const files = readdirSync(srcDir).filter(f => f.endsWith(".json"));
  for (const f of files) {
    const doc = injectKeys(JSON.parse(readFileSync(join(srcDir, f), "utf8")), coll, f);
    writeFileSync(join(stageDir, f), JSON.stringify(doc, null, 2));
  }

  rmSync(join(OUT, name), { recursive: true, force: true });   // clean stale leveldb
  console.log(`Packing "${name}" (${files.length} docs, coll=${coll})...`);
  // NOTE: `pack --in` reads JSON directly from the given dir (asymmetric with
  // `unpack --in`, which reads <dir>/<name>). So point --in at the staged pack dir.
  execFileSync("npx", ["fvtt", "package", "pack", name, "--in", stageDir, "--out", OUT],
    { stdio: "inherit", cwd: REPO_ROOT });
}

rmSync(STAGE, { recursive: true, force: true });
console.log("✅ Packs built to forge-content/packs/");
