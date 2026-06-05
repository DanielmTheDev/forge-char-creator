#!/usr/bin/env node
// Compile JSON source -> LevelDB packs for every registered module (or one,
// via `node build.mjs <moduleName>`). Source docs carry _id only; _key is
// injected into a staging copy, then `fvtt package pack` runs. Source stays clean.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MODULES, COLLECTIONS } from "./modules.mjs";
import { injectKeys } from "./keys.mjs";
import { resolveActorAbilities } from "./resolve-abilities.mjs";
import { writeCatalogs } from "./catalog.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Compendium document type per collection (folders need a matching `type`).
const DOC_TYPE = { items: "Item", actors: "Actor", journal: "JournalEntry" };

// Map<identifier, abilityDoc> over every item-collection pack in a module, so
// actor docs can resolve their `abilities: [<identifier>]` refs into embedded
// items (see resolve-abilities.mjs). Keyed by system.identifier (the stable
// logical key), falling back to name.
function loadAbilityMap(src, packDirs) {
  const map = new Map();
  for (const pack of packDirs) {
    if ((COLLECTIONS[pack.name] ?? "items") !== "items") continue;
    const dir = join(src, pack.name);
    for (const f of readdirSync(dir).filter(f => f.endsWith(".json") && !f.endsWith(".expect.json") && !f.startsWith("_"))) {
      const doc = JSON.parse(readFileSync(join(dir, f), "utf8"));
      map.set(doc.system?.identifier ?? doc.name, doc);
    }
  }
  return map;
}

function buildModule(mod) {
  const moduleDir = join(REPO_ROOT, mod.dir);
  const src = join(moduleDir, "src", "packs");
  const out = join(moduleDir, "packs");
  const stage = join(moduleDir, ".pack-build");

  if (!existsSync(src)) { console.log(`[${mod.name}] no src/packs — skip`); return; }
  rmSync(stage, { recursive: true, force: true });

  const packs = readdirSync(src, { withFileTypes: true }).filter(d => d.isDirectory());
  const abilityMap = loadAbilityMap(src, packs);
  for (const pack of packs) {
    const coll = COLLECTIONS[pack.name] ?? "items";
    const srcDir = join(src, pack.name);
    const stageDir = join(stage, pack.name);
    mkdirSync(stageDir, { recursive: true });

    // Optional `_folders.json` = [{ _id, name, folder?, sort? }] -> compendium folders.
    const foldersFile = join(srcDir, "_folders.json");
    let folderCount = 0;
    if (existsSync(foldersFile)) {
      for (const f of JSON.parse(readFileSync(foldersFile, "utf8"))) {
        const folderDoc = {
          _id: f._id, name: f.name, type: DOC_TYPE[coll] ?? "Item",
          folder: f.folder ?? null, sorting: f.sorting ?? "a", sort: f.sort ?? 0,
          color: f.color ?? null, flags: {}, _key: `!folders!${f._id}`,
        };
        writeFileSync(join(stageDir, `_folder_${f._id}.json`), JSON.stringify(folderDoc, null, 2));
        folderCount++;
      }
    }

    // Item docs: skip *.expect.json (test specs) and _*.json (folders / non-docs).
    const files = readdirSync(srcDir).filter(f => f.endsWith(".json") && !f.endsWith(".expect.json") && !f.startsWith("_"));
    for (const f of files) {
      let doc = JSON.parse(readFileSync(join(srcDir, f), "utf8"));
      // Actors: expand `abilities` refs into re-keyed embedded items before keying.
      if (coll === "actors") doc = resolveActorAbilities(doc, abilityMap);
      doc = injectKeys(doc, coll, f);
      const serialized = JSON.stringify(doc, null, 2);
      // Guard: a literal "[object Object]" means an object was coerced to string
      // somewhere in the authoring path (e.g. ActiveEffect.description must be a
      // plain string, not {value}). Never ship that. (BUG-2 root cause.)
      if (serialized.includes("[object Object]"))
        throw new Error(`[${mod.name}] "${pack.name}/${f}" contains literal "[object Object]" — a value was object-coerced; fix the authoring path.`);
      writeFileSync(join(stageDir, f), serialized);
    }

    rmSync(join(out, pack.name), { recursive: true, force: true });
    console.log(`[${mod.name}] packing "${pack.name}" (${files.length} docs, ${folderCount} folders, coll=${coll})...`);
    // `pack --in` reads JSON directly from the dir (asymmetric with `unpack --in`).
    execFileSync("npx", ["fvtt", "package", "pack", pack.name, "--in", stageDir, "--out", out],
      { stdio: "inherit", cwd: REPO_ROOT });
  }
  rmSync(stage, { recursive: true, force: true });
}

const only = process.argv[2];
const targets = only ? MODULES.filter(m => m.name === only) : MODULES;
if (only && !targets.length) { console.error(`Unknown module: ${only}`); process.exit(1); }
writeCatalogs(); // keep ability CATALOG.md current before packing
for (const m of targets) buildModule(m);
console.log("✅ Packs built.");
