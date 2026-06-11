// Runtime content sync — pulls the latest published content into this module's
// compendium packs without a module update. CI commits resolved docs + a hash
// manifest to forge-content/dist/ on every push to main; on world ready (GM
// only) this fetches the manifest, diffs it against the docs in the packs via
// their flags["forge-content"].srcHash stamp, and upserts only what changed.
//
// The commit SHA is resolved through the GitHub API (uncached -> a push is
// visible immediately); manifest + docs are then fetched from
// raw.githubusercontent.com pinned to that SHA, so the CDN can never serve a
// stale mix. If the API is unreachable (rate limit/offline) we fall back to
// the branch ref (worst case ~5 min CDN lag) and finally to doing nothing —
// the packs shipped in the module zip remain the baseline.
//
// Limits (by design): docs already IMPORTED into the world/scenes are copies —
// sync updates the compendium only; re-drag to pick up changes.
import { computeDelta, rawUrl, apiCommitUrl } from "./sync-core.mjs";

const MODULE_ID = "forge-content";
const REPO = "DanielmTheDev/forge-char-creator";
const BRANCH = "main";
const DIST_PATH = "forge-content/dist";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoSync", {
    name: "Auto-sync content on world load",
    hint: "GM only: fetch the latest published forge-content docs from GitHub and update the compendium packs in place. Disable to fall back to plain module updates.",
    scope: "world", config: true, type: Boolean, default: true,
  });
  game.settings.register(MODULE_ID, "manifestUrl", {
    name: "Manifest URL override",
    hint: "Advanced/testing: full URL of a dist index.json (doc files are fetched relative to it). Leave empty to use the GitHub API + raw content of the main branch.",
    scope: "world", config: true, type: String, default: "",
  });
});

Hooks.once("ready", () => {
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = { syncContent };
  if (!game.user.isGM) return;
  if (!game.settings.get(MODULE_ID, "autoSync")) return;
  syncContent().catch(err => {
    console.error(`${MODULE_ID} | sync failed`, err);
    ui.notifications?.warn(`Forge Content: sync failed (${err.message}) — packs keep their current content.`);
  });
});

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

// -> { manifest, docUrl(entry) } using the override URL or SHA-pinned GitHub raw.
async function resolveSource() {
  const override = game.settings.get(MODULE_ID, "manifestUrl");
  if (override) {
    const base = override.replace(/\/index\.json$/, "");
    return { manifest: await fetchJson(override), docUrl: e => `${base}/${e.path}` };
  }
  let ref = BRANCH;
  try {
    ref = (await fetchJson(apiCommitUrl(REPO, BRANCH))).sha ?? BRANCH;
  } catch (err) {
    console.warn(`${MODULE_ID} | GitHub API unreachable (${err.message}); falling back to branch ref (content may lag ~5 min).`);
  }
  return {
    manifest: await fetchJson(rawUrl(REPO, ref, `${DIST_PATH}/index.json`)),
    docUrl: e => rawUrl(REPO, ref, `${DIST_PATH}/${e.path}`),
  };
}

export async function syncContent() {
  const { manifest, docUrl } = await resolveSource();

  const existing = [];
  for (const packName of new Set(manifest.docs.map(d => d.pack))) {
    const pack = game.packs.get(`${MODULE_ID}.${packName}`);
    if (!pack) { console.warn(`${MODULE_ID} | unknown pack "${packName}" in manifest — skipped`); continue; }
    const index = await pack.getIndex({ fields: ["flags.forge-content.srcHash"] });
    for (const e of index) existing.push({ pack: packName, id: e._id, srcHash: e.flags?.["forge-content"]?.srcHash });
  }

  const { upserts, deletes, unchanged } = computeDelta(manifest.docs, existing);
  if (!upserts.length && !deletes.length) {
    console.log(`${MODULE_ID} | content up to date (v${manifest.version}, ${unchanged} docs)`);
    return { upserts: 0, deletes: 0, unchanged };
  }

  let applied = 0, failed = 0;
  const byPack = new Map();
  for (const u of upserts) byPack.set(u.pack, [...(byPack.get(u.pack) ?? []), { kind: "upsert", entry: u }]);
  for (const d of deletes) byPack.set(d.pack, [...(byPack.get(d.pack) ?? []), { kind: "delete", entry: d }]);

  for (const [packName, ops] of byPack) {
    const pack = game.packs.get(`${MODULE_ID}.${packName}`);
    if (!pack) continue;
    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });
    try {
      const cls = getDocumentClass(pack.documentName);
      for (const { kind, entry } of ops) {
        try {
          if (pack.index.has(entry.id)) await cls.deleteDocuments([entry.id], { pack: pack.collection });
          if (kind === "upsert") {
            const data = await fetchJson(docUrl(entry));
            // Delete-then-create with keepId: exact published state, no diff-merge
            // ambiguity on embedded items/effects/activities.
            await cls.create(data, { pack: pack.collection, keepId: true });
          }
          applied++;
        } catch (err) {
          failed++;
          console.error(`${MODULE_ID} | sync of ${packName}/${entry.id} (${entry.name ?? kind}) failed`, err);
        }
      }
    } finally {
      if (wasLocked) await pack.configure({ locked: true });
    }
  }

  const msg = `Forge Content: synced v${manifest.version} — ${applied} doc(s) updated${failed ? `, ${failed} FAILED (see console)` : ""}.`;
  failed ? ui.notifications?.warn(msg) : ui.notifications?.info(msg);
  console.log(`${MODULE_ID} | ${msg} (${unchanged} unchanged)`);
  return { upserts: upserts.length, deletes: deletes.length, unchanged, applied, failed };
}
