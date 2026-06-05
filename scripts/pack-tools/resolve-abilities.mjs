// Resolve an actor's `abilities: [<identifier>]` refs into embedded items by
// inlining each ability's source doc and AUTO RE-KEYING every id (item, each
// activity, each effect) to fresh deterministic 16-char ids unique to the actor.
//
// ONE-WAY by design: source authors stats + ability identifiers; this expands
// them at build/gate time. `packs:unpack` would produce a fully-inlined, renamed
// actor JSON instead — so unpack skips actor packs (see unpack.mjs). Do NOT
// round-trip a ref-based actor through unpack.
//
// Pure + fs-free: caller supplies `abilityMap` (Map<identifier, abilityDoc>).
// Used by build.mjs (-> LevelDB) AND verify/content.spec.mjs (-> gate); both must
// resolve or the gate, which reads SOURCE json, sees zero items.
import { genId } from "./keys.mjs";

// Deep-replace every string value that EXACTLY equals an old id with its new id.
// Full-string equality only (never substring) so opaque 16-char ids can't collide
// with real content. Object KEYS are not touched here — activity map keys are
// rebuilt structurally by the caller before this runs.
function remapIds(node, idMap) {
  if (Array.isArray(node)) {
    for (const v of node) remapIds(v, idMap);
  } else if (node && typeof node === "object") {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string" && idMap.has(v)) node[k] = idMap.get(v);
      else remapIds(v, idMap);
    }
  }
}

// Iter 3 — value knobs. Apply per-ref overrides to a cloned ability BEFORE re-key.
// Knobs change VALUES only, never SHAPE (no new activities / type / target changes)
// so the base ability's gate-proven mechanic still holds — only its numbers move.
// Broadcast to ALL applicable spots; a knob whose field is absent is a silent no-op.
const KNOBS = new Set(["dmg", "dc", "range"]);
function applyKnobs(item, ref) {
  if (ref.name != null) item.name = ref.name;
  const set = ref.set;
  if (!set) return;
  for (const k of Object.keys(set)) {
    if (!KNOBS.has(k)) throw new Error(`ability "${ref.ability}": unknown knob "${k}" (allowed: ${[...KNOBS].join(", ")})`);
  }
  const activities = Object.values(item.system?.activities ?? {});
  if ("dmg" in set) {
    for (const act of activities)
      for (const part of act.damage?.parts ?? []) part.custom = { enabled: true, formula: String(set.dmg) };
  }
  if ("dc" in set) {
    for (const act of activities) if (act.save) act.save.dc = { calculation: "custom", formula: String(set.dc) };
  }
  if ("range" in set) {
    for (const act of activities) if (act.range) act.range.value = Number(set.range);
  }
}

// Inline one ability source as a re-keyed embedded item for `actorId`.
function inlineAbility(ability, actorId, ref, index) {
  const item = structuredClone(ability);
  applyKnobs(item, ref);
  const seed = `${actorId}:${ref.ability}:${index}`;

  const idMap = new Map();
  idMap.set(item._id, genId(seed));
  const activities = item.system?.activities ?? {};
  for (const aid of Object.keys(activities)) idMap.set(aid, genId(`${seed}:act:${aid}`));
  for (const eff of item.effects ?? []) idMap.set(eff._id, genId(`${seed}:eff:${eff._id}`));

  // Rebuild the activities map under new keys (deep-replace can't touch keys).
  if (item.system?.activities) {
    const rebuilt = {};
    for (const [aid, act] of Object.entries(item.system.activities)) rebuilt[idMap.get(aid)] = act;
    item.system.activities = rebuilt;
  }
  // Now swap every id VALUE (item._id, activity._id, effect ids, cross-refs).
  remapIds(item, idMap);

  // Embedded items don't belong to compendium folders.
  delete item.folder;
  return item;
}

export function resolveActorAbilities(actorDoc, abilityMap) {
  const out = structuredClone(actorDoc);
  if (!Array.isArray(out.abilities)) return out;

  out.items = out.items ?? [];
  out.abilities.forEach((rawRef, index) => {
    // Ref is either a plain identifier string or an object { ability, name?, set? }.
    const ref = typeof rawRef === "string" ? { ability: rawRef } : rawRef;
    const ability = abilityMap.get(ref.ability);
    if (!ability)
      throw new Error(`Actor "${out.name}" references unknown ability "${ref.ability}" — no forge-abilities source with that identifier`);
    out.items.push(inlineAbility(ability, out._id, ref, index));
  });

  delete out.abilities;
  return out;
}
