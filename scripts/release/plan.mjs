#!/usr/bin/env node
// Release planner for CI (.github/workflows/release.yml). No commits to main:
// each module's version comes from its last release tag (<id>-v<semver>), and a
// module is only released when its files changed since that tag.
//
//   next = max(lastTag + 1 patch, module.json version)
//
// The committed module.json version is a FLOOR: raise it by hand for a minor or
// major bump; otherwise leave it alone and CI patch-bumps from the tags.
//
// Usage:
//   plan.mjs                  -> GITHUB_OUTPUT lines per module (<key>_release, <key>_version, <key>_prev)
//   plan.mjs stamp <key> <v>  -> write version + versioned download URL into that module.json (CI workspace only)
//   plan.mjs notes <key>      -> markdown commit list since the module's last tag
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const REPO = "DanielmTheDev/forge-char-creator";

// paths: what ends up in (or builds) that module's zip. Change detection only.
export const MODULES = {
  cc: {
    id: "forge-char-creator", manifest: "module.json",
    paths: ["module.json", "scripts", "templates", "styles", "assets", "src", "lang", "LICENSE",
            ":(exclude)scripts/tests", ":(exclude)scripts/dev", ":(exclude)scripts/release", ":(exclude)scripts/*.test.mjs"],
  },
  fc: {
    id: "forge-content", manifest: "forge-content/module.json",
    paths: ["forge-content/module.json", "forge-content/src", "forge-content/scripts", "forge-content/assets",
            "scripts/pack-tools", ":(exclude)forge-content/scripts/*.test.mjs", ":(exclude)scripts/pack-tools/*.test.mjs"],
  },
};

const tagPrefix = id => `${id}-v`;
export const releaseTag = (id, v) => `${tagPrefix(id)}${v}`;
export const pointerTag = id => `${id}-latest`;
export const assetUrl = (tag, file) => `https://github.com/${REPO}/releases/download/${tag}/${file}`;

export function parse(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v ?? "").trim());
  return m ? m.slice(1).map(Number) : null;
}
export function compare(a, b) {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// Pure: lastTag = version of the newest release tag (or null), floor = module.json version.
export function nextVersion({ lastTag, floor }) {
  if (!parse(floor)) throw new Error(`module.json version "${floor}" is not x.y.z`);
  if (!lastTag) return floor;
  const [a, b, c] = parse(lastTag);
  const bumped = `${a}.${b}.${c + 1}`;
  return compare(floor, bumped) > 0 ? floor : bumped;
}

// Pure: release when there was no tag yet, the floor was raised past the tag, or files changed.
export function shouldRelease({ lastTag, floor, changed }) {
  return !lastTag || compare(floor, lastTag) > 0 || changed;
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

export function lastTagVersion(id) {
  const tags = git("tag", "-l", `${tagPrefix(id)}*`).split("\n").filter(Boolean)
    .map(t => t.slice(tagPrefix(id).length)).filter(parse);
  return tags.sort(compare).at(-1) ?? null;
}

function changedSince(mod, version) {
  try { git("diff", "--quiet", releaseTag(mod.id, version), "HEAD", "--", ...mod.paths); return false; }
  catch (e) { if (e.status === 1) return true; throw e; }
}

export function plan() {
  const out = {};
  for (const [key, mod] of Object.entries(MODULES)) {
    const floor = JSON.parse(readFileSync(mod.manifest, "utf8")).version;
    const lastTag = lastTagVersion(mod.id);
    const changed = lastTag ? changedSince(mod, lastTag) : true;
    const release = shouldRelease({ lastTag, floor, changed });
    out[key] = { id: mod.id, release, prev: lastTag ?? "", version: release ? nextVersion({ lastTag, floor }) : lastTag };
  }
  return out;
}

export function stamp(key, version) {
  const mod = MODULES[key];
  const json = JSON.parse(readFileSync(mod.manifest, "utf8"));
  json.version = version;
  json.manifest = assetUrl(pointerTag(mod.id), "module.json");
  json.download = assetUrl(releaseTag(mod.id, version), `${mod.id}.zip`);
  writeFileSync(mod.manifest, JSON.stringify(json, null, 2) + "\n");
}

export function notes(key) {
  const mod = MODULES[key];
  const last = lastTagVersion(mod.id);
  const range = last ? [`${releaseTag(mod.id, last)}..HEAD`] : ["-n", "20"];
  // Old CI bump commits (pre tag-based releases) are noise.
  const log = git("log", "--no-merges", "--invert-grep", "--grep=^chore(release): bump", "--pretty=- %s (%h)",
                  ...range, "--", ...mod.paths);
  return log || "- (no commits touching this module)";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, key, version] = process.argv.slice(2);
  if (cmd === "stamp") stamp(key, version);
  else if (cmd === "notes") console.log(notes(key));
  else for (const [k, p] of Object.entries(plan()))
    console.log(`${k}_release=${p.release}\n${k}_version=${p.version ?? ""}\n${k}_prev=${p.prev}`);
}
