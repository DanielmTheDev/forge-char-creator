# Actor creation — Iter 3: Knobs (plan)

Date: 2026-06-06
Status: DONE
Spec: docs/superpowers/specs/2026-06-06-actor-creation-iter3-knobs-design.md

Per-ref value knobs on inlined abilities: `{ ability, name?, set:{dmg,dc,range} }`,
broadcast to all activities, knobs-only-never-shape guard. Backward compatible with
plain-string refs.

## Steps (all complete)

1. `scripts/pack-tools/resolve-abilities.mjs`
   - `resolveActorAbilities`: normalize each entry (`string → {ability:string}`), look up
     `ref.ability`, pass ref to `inlineAbility`.
   - `inlineAbility(ability, actorId, ref, index)`: call `applyKnobs(item, ref)` after
     clone, before re-key. Seed = `${actorId}:${ref.ability}:${index}`.
   - `applyKnobs`: name + set.dmg/dc/range broadcast (see spec); throws on unknown knob.
2. `forge-content/verify/schema.mjs#validateActorRefs`: accept string or object refs;
   reject unknown ref keys (never-shape guard) + unknown knobs + bad value types.
3. Fixture: `forge-content/src/packs/forge-npcs/test-ogre.json` + `test-ogre.expect.json`
   (knobbed searing-bolt; `hasItems:["Greater Searing Bolt"]`).
4. Tests: `resolve-abilities.test.mjs` (8 knob cases) + `schema.test.mjs` (7 ref cases).

## Verification (all green)

- `npm run content:unit` → 87 pass.
- `npm run packs:build forge-content` → Test Ogre packed; 16-char id checks pass on the
  knobbed inlined item.
- `npm run content:verify` → 1 passed (3.9m); Test Ogre + Test Goblin green.
- Gate mutation: renamed knob → RED `missing item "Greater Searing Bolt"` → reverted.
