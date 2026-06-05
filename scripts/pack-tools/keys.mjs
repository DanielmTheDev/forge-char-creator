// Shared: inject foundryvtt-cli _key into a pack document from its _id.
// Item packs: top doc `!<coll>!<id>`, embedded effects `!<coll>.effects!<docId>.<effId>`.
// Actor packs: top `!actors!<id>`, actor-own effects `!actors.effects!<actorId>.<effId>`,
// embedded items `!actors.items!<actorId>.<itemId>`, their effects
// `!actors.items.effects!<actorId>.<itemId>.<effId>` (see injectKeys actor branch).
// Foundry/dnd5e require all document + pseudo-document (activity) ids to be
// exactly 16 alphanumeric chars; a wrong-length id silently drops the activity
// (and the whole item). Validate here so it fails at build, not Foundry-load.
const ID16 = /^[A-Za-z0-9]{16}$/;
function checkId(id, what, file) {
  if (!id) throw new Error(`${file}: ${what} missing _id`);
  if (!ID16.test(id)) throw new Error(`${file}: ${what} _id "${id}" must be 16 alphanumeric chars (got ${id.length})`);
}

// Inject _key onto an item's embedded effects + validate its activity ids.
// effectColl is the LevelDB collection segment for that item's effects:
//   item pack          -> "items.effects",       keyed by <itemId>
//   actor-embedded item-> "actors.items.effects", keyed by <actorId>.<itemId>
function injectItemEmbeds(item, effectColl, keyPath, file) {
  for (const eff of item.effects ?? []) {
    checkId(eff._id, `effect "${eff.name}" in "${item.name}"`, file);
    eff._key = `!${effectColl}!${keyPath}.${eff._id}`;
  }
  for (const [aid, act] of Object.entries(item.system?.activities ?? {})) {
    checkId(aid, `activity in "${item.name}"`, file);
    if (act?._id && act._id !== aid) throw new Error(`${file}: activity key "${aid}" != _id "${act._id}" in "${item.name}"`);
  }
}

export function injectKeys(doc, coll, file) {
  checkId(doc._id, `doc "${doc.name}"`, file);
  doc._key = `!${coll}!${doc._id}`;

  if (coll === "actors") {
    for (const eff of doc.effects ?? []) {
      checkId(eff._id, `effect "${eff.name}" on actor "${doc.name}"`, file);
      eff._key = `!actors.effects!${doc._id}.${eff._id}`;
    }
    for (const item of doc.items ?? []) {
      checkId(item._id, `item "${item.name}" in actor "${doc.name}"`, file);
      item._key = `!actors.items!${doc._id}.${item._id}`;
      injectItemEmbeds(item, "actors.items.effects", `${doc._id}.${item._id}`, file);
    }
    return doc;
  }

  // item pack (default)
  injectItemEmbeds(doc, `${coll}.effects`, doc._id, file);
  return doc;
}

const VOLATILE = ["createdTime", "modifiedTime", "lastModifiedBy", "systemVersion", "coreVersion"];

// Shared: strip _key + volatile _stats so unpacked source stays minimal/diff-stable.
export function stripKeys(doc) {
  delete doc._key;
  if (doc._stats) for (const k of VOLATILE) delete doc._stats[k];
  const stripEffects = (host) => {
    for (const eff of host.effects ?? []) {
      delete eff._key;
      if (eff._stats) for (const k of VOLATILE) delete eff._stats[k];
    }
  };
  stripEffects(doc);
  for (const item of doc.items ?? []) {
    delete item._key;
    if (item._stats) for (const k of VOLATILE) delete item._stats[k];
    stripEffects(item);
  }
  return doc;
}
