// Shared: inject foundryvtt-cli _key into a pack document from its _id.
// Item packs: top doc `!<coll>!<id>`, embedded effects `!<coll>.effects!<docId>.<effId>`.
// NOTE: nested embeds for Actor packs (items-in-actors, their effects) are NOT yet
// handled — extend here when adding actor/boss packs.
export function injectKeys(doc, coll, file) {
  if (!doc._id) throw new Error(`${file}: doc "${doc.name}" missing _id`);
  doc._key = `!${coll}!${doc._id}`;
  for (const eff of doc.effects ?? []) {
    if (!eff._id) throw new Error(`${file}: effect "${eff.name}" in "${doc.name}" missing _id`);
    eff._key = `!${coll}.effects!${doc._id}.${eff._id}`;
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
