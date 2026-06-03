#!/usr/bin/env node
// Patch-bump the "version" field of a module.json in place.
// Surgical regex replace (not reserialize) so hand-formatted arrays/spacing
// stay untouched — only the version line changes.
// Usage: node scripts/bump-version.mjs <path-to-module.json>
import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: bump-version.mjs <module.json>");
  process.exit(1);
}

const raw = readFileSync(path, "utf8");
const m = raw.match(/("version"\s*:\s*")(\d+)\.(\d+)\.(\d+)(")/);
if (!m) {
  console.error(`no semver "version" field in ${path}`);
  process.exit(1);
}
const [major, minor, patch] = [m[2], m[3], m[4]].map((n) => parseInt(n, 10));
const prev = `${major}.${minor}.${patch}`;
const next = `${major}.${minor}.${patch + 1}`;
const out = raw.replace(m[0], `${m[1]}${next}${m[5]}`);

writeFileSync(path, out);
console.log(`${path}: ${prev} -> ${next}`);
