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
import { computeDelta, computeAssetDelta, rewriteAssetPaths, rawUrl, apiCommitUrl } from "./sync-core.mjs";

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
  // { [assetPath]: { hash, url } } — what a prior sync uploaded and the path the
  // server stored it under (data-relative locally; Assets Library URL on Forge).
  game.settings.register(MODULE_ID, "assetState", {
    scope: "world", config: false, type: Object, default: {},
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
    return {
      manifest: await fetchJson(override),
      docUrl: e => `${base}/${e.path}`,
      // assets live next to dist/ (forge-content/assets/), not inside it
      assetUrl: a => `${base.replace(/\/dist$/, "")}/assets/${a.path}`,
    };
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
    assetUrl: a => rawUrl(REPO, ref, `forge-content/assets/${a.path}`),
  };
}

// Download stale/new assets and upload them through FilePicker so they land
// wherever this server keeps user files (Data dir locally, Assets Library on
// The Forge — its FilePicker override returns the CDN URL). Returns
// { urlMap, uploaded, failed }; urlMap feeds rewriteAssetPaths so synced docs
// point at the uploaded copies instead of the module-install path.
async function syncAssets(manifest, assetUrl) {
  const stored = game.settings.get(MODULE_ID, "assetState") ?? {};
  const { uploads, urlMap } = computeAssetDelta(manifest.assets ?? [], stored);
  if (!uploads.length) return { urlMap, uploaded: 0, failed: 0 };

  const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
  const state = foundry.utils.deepClone(stored);
  let uploaded = 0, failed = 0;
  for (const a of uploads) {
    try {
      const res = await fetch(assetUrl(a), { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const dir = `${MODULE_ID}/assets/${a.path.split("/").slice(0, -1).join("/")}`.replace(/\/$/, "");
      // Ensure the directory chain exists; createDirectory throws on existing dirs.
      let walked = "";
      for (const seg of dir.split("/")) {
        walked = walked ? `${walked}/${seg}` : seg;
        await FP.createDirectory("data", walked).catch(() => {});
      }
      const name = a.path.split("/").pop();
      const result = await FP.upload("data", dir, new File([blob], name, { type: blob.type }), {}, { notify: false });
      if (!result?.path) throw new Error("upload returned no path");
      state[a.path] = { hash: a.hash, url: result.path };
      urlMap[a.path] = result.path;
      uploaded++;
    } catch (err) {
      failed++;
      console.error(`${MODULE_ID} | asset upload failed for ${a.path}`, err);
    }
  }
  await game.settings.set(MODULE_ID, "assetState", state);
  return { urlMap, uploaded, failed };
}

export async function syncContent() {
  const { manifest, docUrl, assetUrl } = await resolveSource();
  const assets = await syncAssets(manifest, assetUrl);

  const existing = [];
  for (const packName of new Set(manifest.docs.map(d => d.pack))) {
    const pack = game.packs.get(`${MODULE_ID}.${packName}`);
    if (!pack) { console.warn(`${MODULE_ID} | unknown pack "${packName}" in manifest — skipped`); continue; }
    const index = await pack.getIndex({ fields: ["flags.forge-content.srcHash"] });
    for (const e of index) existing.push({ pack: packName, id: e._id, srcHash: e.flags?.["forge-content"]?.srcHash });
  }

  let { upserts, deletes, unchanged } = computeDelta(manifest.docs, existing);
  // Freshly uploaded assets mean previously-synced docs may still point at the
  // module-install path — re-create every doc so all refs pick up the uploaded
  // urls. Rare (only when image files change) and delete+create is exact-state.
  if (assets.uploaded > 0) { upserts = manifest.docs; unchanged = 0; }
  if (!upserts.length && !deletes.length) {
    console.log(`${MODULE_ID} | content up to date (v${manifest.version}, ${unchanged} docs)`);
    return { upserts: 0, deletes: 0, unchanged, assetsUploaded: 0 };
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
            const data = rewriteAssetPaths(await fetchJson(docUrl(entry)), assets.urlMap);
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

  const allFailed = failed + assets.failed;
  const msg = `Forge Content: synced v${manifest.version} — ${applied} doc(s) updated`
    + (assets.uploaded ? `, ${assets.uploaded} asset(s) uploaded` : "")
    + (allFailed ? `, ${allFailed} FAILED (see console)` : "") + ".";
  allFailed ? ui.notifications?.warn(msg) : ui.notifications?.info(msg);
  console.log(`${MODULE_ID} | ${msg} (${unchanged} unchanged)`);
  return { upserts: upserts.length, deletes: deletes.length, unchanged, applied, failed, assetsUploaded: assets.uploaded, assetsFailed: assets.failed };
}
