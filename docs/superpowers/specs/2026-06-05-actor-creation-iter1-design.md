# Actor creation — Iter 1: Actor spine (design)

Date: 2026-06-05
Status: approved (design); plan pending

## Context

forge-content authors D&D5e content as JSON → compiles to LevelDB compendium
packs → functional-gates in real Foundry (`npm run content:verify`) → publishes.
Today only **Item** packs exist (`forge-abilities`, gate-tested per ability via
co-located `<name>.expect.json`). The next capability is **actor (NPC) creation**:
talk about an enemy, author it, test it here, push it to the module — repeatable
every session.

This document specs **Iteration 1 only** — the actor *spine*. It is the first of a
4-iteration decomposition (below). Each iteration ships independently and gets its
own spec → plan → implementation cycle.

### Full decomposition (agreed)

- **Iter 1 — Actor spine (THIS DOC).** New `forge-npcs` actors pack + registry.
  Extend `keys.mjs` for nested embeds (actor→items→effects→activities — the gap
  flagged in `keys.mjs` itself). Author ONE NPC by hand (stats + 1 existing ability
  hand-inlined, re-keyed). Prove: build round-trip · T1 loads · T2 derived stats.
  No auto-compose, no knobs, no combat.
- **Iter 2 — Compose from library + catalog.** Actor source = `stats + [ability ids]`;
  build resolves from `forge-abilities`, re-keys per actor, inlines. Add ability
  metadata (tags/summary/knobs) → generated `CATALOG.md` so the assistant can
  *match-before-authoring* ("a base ability already exists for this"). Actor gate =
  assembly only; reused abilities NOT re-proven (the test-explosion guard).
- **Iter 3 — Knobs (value overrides).** `{ability, name?, set:{dmg,dc,range}}` +
  "knobs-only, never shape" guard. Cheap smoke that the overridden value reached the
  doc; mechanic proof reused.
- **Iter 4 — Actor T3 combat + reaction unlock.** Authored NPC fights with its own
  abilities in real midi; `_source`-macro reactions auto-fire (closes TODO #6).
  Multiattack / legendary / healing (deferred boss mechanics) land here.

The user's regular per-session enemy workflow becomes real at Iter 2; knobs (3) make
it pleasant; combat proof (4) makes bosses trustworthy.

### Why reuse (composition) bounds testing rather than exploding it

Each ability is gate-tested **once** via its `expect.json`. An NPC that *references*
an already-tested ability inherits that proof — it does NOT re-test the mechanic.
Actor tests cover only **actor-level glue** (stats derive, items assemble, later:
multiattack routing, `_source` reactions). Test cost per new NPC stays ~flat in the
number of abilities. Recreate-per-NPC is what explodes (every NPC ships untested
copies). This is the core rationale for the whole feature direction.

## Iter 1 goal

Authored NPC JSON → compiles into an actors pack → loads in Foundry, derived stats
are correct, the reused ability is present on the statblock. Strictly load + derive.
No combat (the inlined ability is already proven in `forge-abilities`).

## Guinea pig

A **generic disposable enemy** — `test-goblin`, dnd5e `npc` type, reusing the
already-tested `searing-bolt` Example ability. No campaign lore needed; matches the
end-goal (session enemies). **Kept committed** as the ongoing actor-load gate fixture
(clearly test-tagged), so the actor path keeps coverage in `content:verify` after
Iter 1. May be ship-excluded from the published pack if undesirable in user compendia.

## Components

### 1. Pack + registry wiring

- `forge-content/module.json`: add a `forge-npcs` pack entry, `"type": "Actor"`,
  `"system": "dnd5e"`, ownership mirroring `forge-abilities`.
- `scripts/pack-tools/modules.mjs`: `COLLECTIONS["forge-npcs"] = "actors"`.
- Source dir: `forge-content/src/packs/forge-npcs/`.
- `build.mjs` already maps `DOC_TYPE.actors = "Actor"` (folders) and threads `coll`
  through `injectKeys` — no change expected beyond what keys.mjs needs.

### 2. `keys.mjs` nested-embed walk (the real infra)

Today `injectKeys` handles only item-pack depth (top item + its effects + activity-id
checks). `keys.mjs` carries an explicit NOTE that actor nested embeds are unhandled.
Add an `actors` branch that deep-walks and assigns `_key` at every embedded level:

- Actor: `!actors!<actorId>`
- Actor item: `!actors.items!<actorId>.<itemId>`
- Actor item effect: `!actors.items.effects!<actorId>.<itemId>.<effId>`
- Actor own effect: `!actors.effects!<actorId>.<effId>`

16-char alphanumeric id check **at every level** (doc, each item, each effect, each
activity-map key), plus the existing `activity key == _id` check on item activities.
`stripKeys` gets the mirror walk so unpack produces clean diff-stable source.

**The exact `_key` string format is verified empirically, not trusted from this doc**
(A1-style spike): round-trip `unpack → build → unpack` must be byte-stable, and the
dnd5e `_source` packs are the format reference. A wrong key silently drops the embed
at Foundry-load (same failure class as the 15-char activity-id bug) — the round-trip
+ the T1 "item present" assert are the guardrails.

Refactor note: `injectKeys(doc, coll, file)` currently assumes item shape. Branch on
`coll === "actors"` for the deep walk; keep the item path unchanged.

### 3. Authored fixture — `src/packs/forge-npcs/test-goblin.json`

dnd5e `npc`-type actor, **minimal valid** statblock (exact required-field set found by
spike — npc schema is heavier than item): name, `type:"npc"`, img, `system.attributes.hp`,
`system.abilities.*`, `system.attributes.ac`, CR/type. `items: [` one hand-inlined copy
of `searing-bolt` with **fresh 16-char ids** for item `_id`, activity id, and effect ids
`]` so there is no id collision with the source ability. Hand-doing this re-key previews
the Iter-2 automated re-keying.

### 4. Actor gate path — `actorLoadCheck`

- Dispatcher (`content.spec.mjs`) gathers `forge-npcs` docs and runs a new minimal
  `actorLoadCheck` against a co-located `test-goblin.expect.json`.
- **T1**: the actor doc loads with no schema errors and the inlined item is present.
- **T2**: derived data asserts — `hpMax`, `ac`, ability scores, `hasItems:["Searing Bolt"]`.
- **Load mechanism**: import the authored actor into the test world (stamped with the
  `forge-content.test` flag so the existing `isolate()` sweep cleans it up). If reading
  derived data off a compendium *temp* doc (`pack.getDocument(id)`) is sufficient and
  cheaper, prefer that — the spike decides.
- A tiny actor `expect.json` schema (`{tier, assert:{hpMax, ac, abilities, hasItems}}`)
  is validated **pre-boot** in `schema.mjs` (same discipline as item expects: typos fail
  in <1s, not after the ~4m boot). New assert keys are hard failures node-side.

## Data flow

```
test-goblin.json
  → keys.injectKeys(doc, "actors", file)   # deep _key walk + id checks
  → fvtt package pack                       # JSON → LevelDB (forge-npcs)
  → gate: import into test world (flagged)  # or pack temp-doc
  → assert derived data (hpMax/ac/abilities/hasItems)
  → isolate() cleanup
```

## Testing

- New `actorLoadCheck` handler + actor `expect.json` schema in `schema.mjs`
  (pre-boot validation).
- T1 (loads, item present) + T2 (derived stats). **No T3** — the reused ability is
  already proven; combat is Iter 4.
- Gate-green discipline: `npm run content:verify` (xvfb + Foundry) must pass before
  commit, per repo policy.

## Empirical spikes (de-risk first, mirrors the ability A0/A1 spike)

1. **Exact nested `_key` format** — confirm against dnd5e `_source` packs; prove
   round-trip stability.
2. **`fvtt package pack` on actors** — does it pack actor-embedded items/effects
   cleanly from the staged JSON.
3. **Derived-data source** — compendium temp-doc vs world-import for reading
   `hp.max` / `ac` / abilities.

## Risks

- `_key` format wrong → embeds silently dropped at load. Caught by round-trip +
  "item present" T1 assert.
- npc schema heavier than item → more required fields; minimal valid statblock found
  by spike, not guessed.
- World-import mutates the test world → relies on the existing flag + `isolate()`
  sweep (proven infra) for cleanup.

## Explicitly out of scope (Iter 1)

Auto-composition from ability ids · knobs/value overrides · the catalog · actor T3
combat · reactions/multiattack/legendary/healing · `character`-type actors (class
levels). All are later iterations.
