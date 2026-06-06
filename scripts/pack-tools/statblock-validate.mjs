#!/usr/bin/env node
// Validate an image→statblock-generated actor SOURCE doc (Roadmap D, Iter 1)
// against forge-content/docs/statblock-schema.md BEFORE it enters the build.
// Pure `validateStatblock` (returns string[] of errors, [] = clean) + a CLI
// `main()` that reads the file, CATALOG.json, and the core-icons dir.
//
// Hard-fails any ability ref not in CATALOG.json — the security guard that makes
// it impossible to smuggle an un-vetted ability through the auto path. Ref/knob
// shape is delegated to schema.mjs#validateActorRefs (single source of truth).
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { genId } from "./keys.mjs";
import { validateActorRefs } from "../../forge-content/verify/schema.mjs";

const ABILITY_SCORES = ["str", "dex", "con", "int", "wis", "cha"];

// `iconExists(path) -> boolean` is injected so the core fn stays fs-free + testable.
export function validateStatblock(doc, catalogIds, iconExists, slug) {
  const errs = [];
  const who = `actor "${doc?.name ?? "?"}"`;
  if (!doc || typeof doc !== "object") return ["statblock is not an object"];

  // Identity
  if (!doc.name || typeof doc.name !== "string") errs.push(`${who}: "name" must be a non-empty string`);
  if (doc.type !== "npc") errs.push(`${who}: "type" must be "npc"`);
  if (slug != null) {
    const want = genId(slug);
    if (doc._id !== want) errs.push(`${who}: "_id" must be genId("${slug}") = "${want}" (got "${doc._id}")`);
  } else if (!/^[A-Za-z0-9]{16}$/.test(doc._id ?? "")) {
    errs.push(`${who}: "_id" must be 16 alphanumeric chars (got "${doc._id}")`);
  }

  // Icon
  if (typeof doc.img !== "string" || !doc.img) errs.push(`${who}: "img" must be a core-icon path`);
  else if (!iconExists(doc.img)) errs.push(`${who}: "img" "${doc.img}" does not exist under the Foundry core icons dir`);

  const sys = doc.system ?? {};

  // Ability scores 3–20
  const ab = sys.abilities ?? {};
  for (const s of ABILITY_SCORES) {
    const v = ab[s]?.value;
    if (!Number.isInteger(v) || v < 3 || v > 20) errs.push(`${who}: ability "${s}".value must be an integer 3–20 (got ${v})`);
  }

  // HP value === max, formula ""
  const hp = sys.attributes?.hp ?? {};
  if (!Number.isInteger(hp.value) || hp.value <= 0) errs.push(`${who}: hp.value must be a positive integer (got ${hp.value})`);
  if (hp.value !== hp.max) errs.push(`${who}: hp.value (${hp.value}) must equal hp.max (${hp.max})`);
  if (hp.formula !== "") errs.push(`${who}: hp.formula must be "" (got ${JSON.stringify(hp.formula)})`);

  // AC flat
  const ac = sys.attributes?.ac ?? {};
  if (ac.calc !== "flat") errs.push(`${who}: ac.calc must be "flat" (got ${JSON.stringify(ac.calc)})`);
  if (!Number.isInteger(ac.flat) || ac.flat <= 0) errs.push(`${who}: ac.flat must be a positive integer (got ${ac.flat})`);

  // Details
  const det = sys.details ?? {};
  if (typeof det.cr !== "number" || det.cr < 0) errs.push(`${who}: details.cr must be a non-negative number (got ${det.cr})`);
  if (!det.type?.value || typeof det.type.value !== "string") errs.push(`${who}: details.type.value must be a non-empty string`);

  // Inert containers
  if (!Array.isArray(doc.items) || doc.items.length) errs.push(`${who}: "items" must be [] (build inlines abilities)`);
  if (!Array.isArray(doc.effects) || doc.effects.length) errs.push(`${who}: "effects" must be []`);
  if (doc.folder !== null) errs.push(`${who}: "folder" must be null`);

  // Refs + knobs (delegated) — and the security guard: every ref ∈ catalog.
  if (!Array.isArray(doc.abilities) || !doc.abilities.length) errs.push(`${who}: "abilities" must be a non-empty array of catalog refs`);
  errs.push(...validateActorRefs(doc, catalogIds));

  return errs;
}

function main() {
  const file = process.argv[2];
  if (!file) { console.error("usage: node statblock-validate.mjs <actor.json>"); process.exit(2); }
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const catalogPath = join(repoRoot, "forge-content", "src", "packs", "forge-abilities", "_CATALOG.json");
  if (!existsSync(catalogPath)) { console.error(`_CATALOG.json missing — run \`npm run content:catalog\` first`); process.exit(2); }
  const catalogIds = JSON.parse(readFileSync(catalogPath, "utf8")).map(r => r.identifier);

  const iconsBase = join(repoRoot, "FoundryVTT-Linux-13.351", "resources", "app", "public");
  const iconExists = (p) => existsSync(join(iconsBase, p));

  const doc = JSON.parse(readFileSync(file, "utf8"));
  const slug = basename(file).replace(/\.json$/, "");
  const errs = validateStatblock(doc, catalogIds, iconExists, slug);
  if (errs.length) {
    console.error(`✗ ${file} — ${errs.length} error(s):`);
    for (const e of errs) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ ${file} — valid statblock`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
