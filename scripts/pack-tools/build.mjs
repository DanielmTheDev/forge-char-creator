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

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function buildModule(mod) {
  const moduleDir = join(REPO_ROOT, mod.dir);
  const src = join(moduleDir, "src", "packs");
  const out = join(moduleDir, "packs");
  const stage = join(moduleDir, ".pack-build");

  if (!existsSync(src)) { console.log(`[${mod.name}] no src/packs — skip`); return; }
  rmSync(stage, { recursive: true, force: true });

  const packs = readdirSync(src, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const pack of packs) {
    const coll = COLLECTIONS[pack.name] ?? "items";
    const srcDir = join(src, pack.name);
    const stageDir = join(stage, pack.name);
    mkdirSync(stageDir, { recursive: true });

    // *.expect.json are functional-test specs (content:verify), not pack docs.
    const files = readdirSync(srcDir).filter(f => f.endsWith(".json") && !f.endsWith(".expect.json"));
    for (const f of files) {
      const doc = injectKeys(JSON.parse(readFileSync(join(srcDir, f), "utf8")), coll, f);
      writeFileSync(join(stageDir, f), JSON.stringify(doc, null, 2));
    }

    rmSync(join(out, pack.name), { recursive: true, force: true });
    console.log(`[${mod.name}] packing "${pack.name}" (${files.length} docs, coll=${coll})...`);
    // `pack --in` reads JSON directly from the dir (asymmetric with `unpack --in`).
    execFileSync("npx", ["fvtt", "package", "pack", pack.name, "--in", stageDir, "--out", out],
      { stdio: "inherit", cwd: REPO_ROOT });
  }
  rmSync(stage, { recursive: true, force: true });
}

const only = process.argv[2];
const targets = only ? MODULES.filter(m => m.name === only) : MODULES;
if (only && !targets.length) { console.error(`Unknown module: ${only}`); process.exit(1); }
for (const m of targets) buildModule(m);
console.log("✅ Packs built.");
