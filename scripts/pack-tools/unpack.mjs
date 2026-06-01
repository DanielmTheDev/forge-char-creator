#!/usr/bin/env node
// Unpack compiled LevelDB packs -> clean JSON source for every registered
// module (or one, via `node unpack.mjs <moduleName>`). Strips _key + volatile
// _stats. For IMPORTING packs into source (initial migration / external packs);
// it names files <Name>_<id>.json and will duplicate hand-named files, so don't
// run it to "round-trip" already-authored source.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MODULES } from "./modules.mjs";
import { stripKeys } from "./keys.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function unpackModule(mod) {
  const moduleDir = join(REPO_ROOT, mod.dir);
  const packsDir = join(moduleDir, "packs");
  const src = join(moduleDir, "src", "packs");
  const tmp = join(moduleDir, ".pack-unpack");

  if (!existsSync(packsDir)) { console.log(`[${mod.name}] no packs/ — skip`); return; }
  rmSync(tmp, { recursive: true, force: true });

  for (const pack of readdirSync(packsDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const tmpDir = join(tmp, pack.name);
    mkdirSync(tmpDir, { recursive: true });
    console.log(`[${mod.name}] unpacking "${pack.name}"...`);
    execFileSync("npx", ["fvtt", "package", "unpack", pack.name, "--in", packsDir, "--out", tmpDir],
      { stdio: "inherit", cwd: REPO_ROOT });

    const outDir = join(src, pack.name);
    mkdirSync(outDir, { recursive: true });
    for (const f of readdirSync(tmpDir).filter(f => f.endsWith(".json"))) {
      const doc = stripKeys(JSON.parse(readFileSync(join(tmpDir, f), "utf8")));
      writeFileSync(join(outDir, f), JSON.stringify(doc, null, 2) + "\n");
    }
  }
  rmSync(tmp, { recursive: true, force: true });
}

const only = process.argv[2];
const targets = only ? MODULES.filter(m => m.name === only) : MODULES;
if (only && !targets.length) { console.error(`Unknown module: ${only}`); process.exit(1); }
for (const m of targets) unpackModule(m);
console.log("✅ Source written.");
