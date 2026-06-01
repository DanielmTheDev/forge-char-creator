#!/usr/bin/env node
// Unpack compiled LevelDB packs -> clean JSON source.
// Reverse of build-packs.mjs: strips the foundryvtt-cli _key and volatile
// _stats so the committed source stays minimal and diff-stable.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(MODULE_DIR);
const PACKS = join(MODULE_DIR, "packs");
const SRC = join(MODULE_DIR, "src", "packs");
const TMP = join(MODULE_DIR, ".pack-unpack");

const VOLATILE = ["createdTime", "modifiedTime", "lastModifiedBy", "systemVersion", "coreVersion"];

function clean(doc) {
  delete doc._key;
  if (doc._stats) for (const k of VOLATILE) delete doc._stats[k];
  for (const eff of doc.effects ?? []) { delete eff._key; if (eff._stats) for (const k of VOLATILE) delete eff._stats[k]; }
  return doc;
}

if (!existsSync(PACKS)) { console.error(`No compiled packs: ${PACKS}`); process.exit(1); }
rmSync(TMP, { recursive: true, force: true });

for (const pack of readdirSync(PACKS, { withFileTypes: true }).filter(d => d.isDirectory())) {
  const name = pack.name;
  const tmpDir = join(TMP, name);
  mkdirSync(tmpDir, { recursive: true });
  console.log(`Unpacking "${name}"...`);
  execFileSync("npx", ["fvtt", "package", "unpack", name, "--in", PACKS, "--out", tmpDir],
    { stdio: "inherit", cwd: REPO_ROOT });

  const outDir = join(SRC, name);
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(tmpDir).filter(f => f.endsWith(".json"))) {
    const doc = clean(JSON.parse(readFileSync(join(tmpDir, f), "utf8")));
    writeFileSync(join(outDir, f), JSON.stringify(doc, null, 2) + "\n");
  }
}

rmSync(TMP, { recursive: true, force: true });
console.log("✅ Source written to forge-content/src/packs/");
