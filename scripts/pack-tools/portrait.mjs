#!/usr/bin/env node
// Generate a character portrait via the Gemini image API:
//   node scripts/pack-tools/portrait.mjs <prompt.txt|-> <out.png>
// Prompt source: a text file, or "-" to read stdin (paste the vault note's 🖼️
// prompt). Key: GEMINI_API_KEY env, falling back to ~/.config/forge-content/
// gemini-api-key (single line). Create a key at https://aistudio.google.com/apikey
// (free tier covers a few portraits/day; Google One subscription does NOT
// include API access).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const MODEL = "gemini-2.5-flash-image";

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const f = join(homedir(), ".config", "forge-content", "gemini-api-key");
  if (existsSync(f)) return readFileSync(f, "utf8").trim();
  console.error("No GEMINI_API_KEY env and no ~/.config/forge-content/gemini-api-key file.");
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

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
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
