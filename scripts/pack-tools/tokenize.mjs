#!/usr/bin/env node
// Image -> forge-content token assets:
//   node scripts/pack-tools/tokenize.mjs <image> <slug> [--yoff N | --xoff N]
// Copies the portrait to forge-content/assets/tokens/<slug>.png, square-crops
// (portrait images: top region framing the head; landscape: centered unless
// --xoff), applies a circular alpha mask (Dynamic Token Ring subjects need
// transparent corners — opaque squares COVER the ring), writes
// <slug>-token.png + a /tmp thumbnail for a one-glance visual check.
// Actor JSON then uses: ring { enabled: true, subject: { scale: 0.75 } }.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOKENS_DIR = join(REPO_ROOT, "forge-content", "assets", "tokens");

export function cropGeometry({ width, height, yoff = null, xoff = null }) {
  const side = Math.min(width, height);
  if (width >= height) {
    // landscape: centered horizontally unless xoff given
    const x = xoff ?? Math.round((width - side) / 2);
    return { side, x: Math.max(0, Math.min(x, width - side)), y: 0 };
  }
  // portrait: head sits in the upper part — default a small top offset
  const y = yoff ?? Math.round(height * 0.06);
  return { side, x: 0, y: Math.max(0, Math.min(y, height - side)) };
}

export function maskArgs(side) {
  const c = Math.round(side / 2);
  const margin = Math.round(side / 40);
  return `circle ${c},${c} ${c},${margin}`;
}

function main() {
  const args = process.argv.slice(2);
  const [image, slug] = args;
  if (!image || !slug) {
    console.error("usage: tokenize.mjs <image> <slug> [--yoff N | --xoff N]");
    process.exit(1);
  }
  const opt = (name) => {
    const i = args.indexOf(name);
    return i !== -1 ? Number(args[i + 1]) : null;
  };

  mkdirSync(TOKENS_DIR, { recursive: true });
  const portrait = join(TOKENS_DIR, `${slug}.png`);
  const token = join(TOKENS_DIR, `${slug}-token.png`);
  copyFileSync(image, portrait);

  const dims = execFileSync("identify", ["-format", "%w %h", portrait]).toString().trim().split(" ").map(Number);
  const { side, x, y } = cropGeometry({ width: dims[0], height: dims[1], yoff: opt("--yoff"), xoff: opt("--xoff") });

  execFileSync("convert", [
    portrait, "-crop", `${side}x${side}+${x}+${y}`, "+repage",
    "(", "+clone", "-alpha", "extract", "-fill", "black", "-colorize", "100",
    "-fill", "white", "-draw", maskArgs(side), ")",
    "-alpha", "off", "-compose", "CopyOpacity", "-composite", token,
  ]);

  const thumb = `/tmp/thumb-${slug}-token.png`;
  execFileSync("convert", [token, "-resize", "150x", thumb]);
  console.log(`✓ ${portrait}`);
  console.log(`✓ ${token} (${side}x${side}+${x}+${y}, circle-masked)`);
  console.log(`  visual check: ${thumb}`);
  console.log(`  actor JSON: "prototypeToken": { "texture": { "src": "modules/forge-content/assets/tokens/${slug}-token.png" }, "ring": { "enabled": true, "subject": { "scale": 0.75 } } }`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
