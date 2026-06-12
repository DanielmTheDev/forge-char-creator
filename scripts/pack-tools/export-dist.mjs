#!/usr/bin/env node
// Export resolved forge-content docs as plain JSON + hash manifest to
// forge-content/dist/, committed by CI and fetched at runtime by the module's
// sync script (forge-content/scripts/sync.mjs). Docs are the SAME resolved
// shape the pack build compiles (actors get abilities inlined), minus `_key`
// (runtime document creation must not see it), plus a content hash stamped at
// flags["forge-content"].srcHash so sync can detect stale pack docs.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { COLLECTIONS } from "./modules.mjs";
import { resolveActorAbilities } from "./resolve-abilities.mjs";
import { resolveActorSpells, loadSpellCache } from "./resolve-spells.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MODULE_DIR = join(REPO_ROOT, "forge-content");

// Pure core: packs = [{ name, collection, docs }] with docs already resolved.
// Hash covers the doc WITHOUT _key and WITHOUT a prior srcHash stamp, so
// re-exporting an already-stamped doc is idempotent.
export function buildDistDocs({ packs, version }) {
  const files = [];
  const indexDocs = [];
  for (const pack of [...packs].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const src of [...pack.docs].sort((a, b) => a._id.localeCompare(b._id))) {
      const doc = JSON.parse(JSON.stringify(src));
      delete doc._key;
      doc.flags ??= {};
      delete doc.flags["forge-content"]?.srcHash;
      if (doc.flags["forge-content"] && Object.keys(doc.flags["forge-content"]).length === 0)
        delete doc.flags["forge-content"];
      const hash = createHash("sha256").update(JSON.stringify(doc)).digest("hex");
      doc.flags["forge-content"] = { ...(doc.flags["forge-content"] ?? {}), srcHash: hash };
      const path = `${pack.name}/${doc._id}.json`;
      files.push({ path, doc });
      indexDocs.push({ pack: pack.name, collection: pack.collection, id: doc._id, name: doc.name, path, hash });
    }
  }
  return { files, index: { version, docs: indexDocs } };
}

// Pure: files = [{ path, data: Buffer }] (path relative to forge-content/assets/).
// Content-addressed sha256 per file so sync can skip unchanged uploads.
export function buildAssetIndex(files) {
  return [...files]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(f => ({ path: f.path, hash: createHash("sha256").update(f.data).digest("hex") }));
}

// fs wrapper: load forge-content source, resolve actors, write dist/.
export function exportDist() {
  const src = join(MODULE_DIR, "src", "packs");
  const out = join(MODULE_DIR, "dist");
  const version = JSON.parse(readFileSync(join(MODULE_DIR, "module.json"), "utf8")).version;

  const packDirs = readdirSync(src, { withFileTypes: true }).filter(d => d.isDirectory());
  const docFiles = dir => readdirSync(dir).filter(f => f.endsWith(".json") && !f.endsWith(".expect.json") && !f.startsWith("_"));

  const abilityMap = new Map();
  for (const pack of packDirs) {
    if ((COLLECTIONS[pack.name] ?? "items") !== "items") continue;
    for (const f of docFiles(join(src, pack.name))) {
      const doc = JSON.parse(readFileSync(join(src, pack.name, f), "utf8"));
      abilityMap.set(doc.system?.identifier ?? doc.name, doc);
    }
  }

  const spellMap = loadSpellCache();
  const packs = packDirs.map(pack => {
    const collection = COLLECTIONS[pack.name] ?? "items";
    const docs = docFiles(join(src, pack.name)).map(f => {
      let doc = JSON.parse(readFileSync(join(src, pack.name, f), "utf8"));
      if (collection === "actors") doc = resolveActorSpells(resolveActorAbilities(doc, abilityMap), spellMap);
      return doc;
    });
    return { name: pack.name, collection, docs };
  });

  // Module assets (token/portrait images). Committed at forge-content/assets/;
  // sync fetches them straight from the repo at that path, so the manifest only
  // needs path + hash, not a dist copy.
  const assetsDir = join(MODULE_DIR, "assets");
  const assetFiles = [];
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(join(dir, e.name), p);
      else assetFiles.push({ path: p, data: readFileSync(join(dir, e.name)) });
    }
  };
  if (existsSync(assetsDir)) walk(assetsDir, "");

  const { files, index } = buildDistDocs({ packs, version });
  index.assets = buildAssetIndex(assetFiles);
  rmSync(out, { recursive: true, force: true });
  for (const f of files) {
    const target = join(out, f.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(f.doc, null, 2) + "\n");
  }
  writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 2) + "\n");
  console.log(`[forge-content] dist export: ${files.length} docs, ${index.assets.length} assets (v${version}) -> forge-content/dist/`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && existsSync(MODULE_DIR)) {
  exportDist();
}
