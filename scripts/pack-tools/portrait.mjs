#!/usr/bin/env node
// Generate a character portrait via the Gemini image API:
//   node scripts/pack-tools/portrait.mjs <prompt.txt|-> <out.png>
// Prompt source: a text file, or "-" to read stdin (paste the vault note's 🖼️
// prompt). Key: GEMINI_API_KEY env var (exported from the user's ~/.zshrc —
// sessions started from zsh inherit it). Create a key at
// https://aistudio.google.com/apikey (free tier covers a few portraits/day;
// Google One subscription does NOT include API access).
import { readFileSync, writeFileSync } from "node:fs";

// Default = fast/cheap flash (1K only). Override with IMAGE_MODEL=gemini-3-pro-image
// (Nano Banana Pro) for native 2K/4K via IMAGE_SIZE — flash silently ignores imageSize.
const MODEL = process.env.IMAGE_MODEL || "gemini-2.5-flash-image";

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  console.error("GEMINI_API_KEY env var not set (export it in ~/.zshrc and start the session from zsh).");
  console.error("Create a key at https://aistudio.google.com/apikey");
  process.exit(1);
}

async function main() {
  const [promptSrc, out] = process.argv.slice(2);
  if (!promptSrc || !out) {
    console.error("usage: portrait.mjs <prompt.txt|-> <out.png>");
    process.exit(1);
  }
  const prompt = promptSrc === "-" ? readFileSync(0, "utf8") : readFileSync(promptSrc, "utf8");

  // Optional native size / shape control (Gemini imageConfig). Unset → API default (1K square).
  //   IMAGE_SIZE   = 512 | 1K | 2K | 4K
  //   ASPECT_RATIO = 1:1 | 16:9 | 21:9 | 4:3 | 3:4 | 9:16 | ...
  const imageConfig = {};
  if (process.env.IMAGE_SIZE) imageConfig.imageSize = process.env.IMAGE_SIZE.trim();
  if (process.env.ASPECT_RATIO) imageConfig.aspectRatio = process.env.ASPECT_RATIO.trim();
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  if (Object.keys(imageConfig).length) body.generationConfig = { imageConfig };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 500)}`);
    process.exit(1);
  }
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (!part) {
    console.error(`No image in response: ${JSON.stringify(json).slice(0, 500)}`);
    process.exit(1);
  }
  writeFileSync(out, Buffer.from(part.inlineData.data, "base64"));
  console.log(`✓ ${out} (${part.inlineData.mimeType})`);
}

main();
