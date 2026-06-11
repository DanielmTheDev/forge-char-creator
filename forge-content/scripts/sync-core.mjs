// Pure delta logic for runtime content sync — no Foundry globals so it is
// node-testable (sync-core.test.mjs) and reusable if the sync target changes.
//
// manifestDocs: index.json `docs` rows [{ pack, collection, id, name, path, hash }]
// existingDocs: docs currently in the module packs [{ pack, id, srcHash }]
//   srcHash = flags["forge-content"].srcHash; undefined means the doc was never
//   stamped (baseline pack install or manual edit) -> treat as stale, re-upsert.
//
// Deletes only ever target MANAGED docs (srcHash present): a doc the manifest
// dropped but sync once wrote. Unmanaged docs in the pack are never touched.
export function computeDelta(manifestDocs, existingDocs) {
  const existingByKey = new Map(existingDocs.map(d => [`${d.pack}/${d.id}`, d]));
  const manifestKeys = new Set(manifestDocs.map(m => `${m.pack}/${m.id}`));

  const upserts = manifestDocs.filter(m => existingByKey.get(`${m.pack}/${m.id}`)?.srcHash !== m.hash);
  const deletes = existingDocs
    .filter(d => d.srcHash !== undefined && !manifestKeys.has(`${d.pack}/${d.id}`))
    .map(d => ({ pack: d.pack, id: d.id }));
  const unchanged = manifestDocs.length - upserts.length;
  return { upserts, deletes, unchanged };
}

// Manifest + doc payloads are fetched from raw.githubusercontent.com PINNED to
// a commit SHA (immutable URL -> no CDN staleness). The SHA itself comes from
// the GitHub API, which is not cached, so a push is visible immediately.
export const rawUrl = (repo, ref, path) => `https://raw.githubusercontent.com/${repo}/${ref}/${path}`;
export const apiCommitUrl = (repo, branch) => `https://api.github.com/repos/${repo}/commits/${branch}`;
