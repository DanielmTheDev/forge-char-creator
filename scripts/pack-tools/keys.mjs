// Shared: inject foundryvtt-cli _key into a pack document from its _id.
// Item packs: top doc `!<coll>!<id>`, embedded effects `!<coll>.effects!<docId>.<effId>`.
// NOTE: nested embeds for Actor packs (items-in-actors, their effects) are NOT yet
// handled — extend here when adding actor/boss packs.
// Foundry/dnd5e require all document + pseudo-document (activity) ids to be
// exactly 16 alphanumeric chars; a wrong-length id silently drops the activity
// (and the whole item). Validate here so it fails at build, not Foundry-load.
const ID16 = /^[A-Za-z0-9]{16}$/;
function checkId(id, what, file) {
  if (!id) throw new Error(`${file}: ${what} missing _id`);
  if (!ID16.test(id)) throw new Error(`${file}: ${what} _id "${id}" must be 16 alphanumeric chars (got ${id.length})`);
}

export function injectKeys(doc, coll, file) {
  checkId(doc._id, `doc "${doc.name}"`, file);
  doc._key = `!${coll}!${doc._id}`;
  for (const eff of doc.effects ?? []) {
    checkId(eff._id, `effect "${eff.name}" in "${doc.name}"`, file);
    eff._key = `!${coll}.effects!${doc._id}.${eff._id}`;
  }
  for (const [aid, act] of Object.entries(doc.system?.activities ?? {})) {
    checkId(aid, `activity in "${doc.name}"`, file);
    if (act?._id && act._id !== aid) throw new Error(`${file}: activity key "${aid}" != _id "${act._id}" in "${doc.name}"`);
  }
  return doc;
}

const VOLATILE = ["createdTime", "modifiedTime", "lastModifiedBy", "systemVersion", "coreVersion"];

// Shared: strip _key + volatile _stats so unpacked source stays minimal/diff-stable.
export function stripKeys(doc) {
  delete doc._key;
  if (doc._stats) for (const k of VOLATILE) delete doc._stats[k];
  for (const eff of doc.effects ?? []) {
    delete eff._key;
    if (eff._stats) for (const k of VOLATILE) delete eff._stats[k];
  }
  return doc;
}
