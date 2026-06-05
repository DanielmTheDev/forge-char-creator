# Actor creation — Iter 3: Knobs (value overrides) (design)

Date: 2026-06-06
Status: implemented

## Context

Iter 2 (DONE) lets an NPC compose abilities by reference: actor source carries
`abilities: [<identifier>]`, the build resolves each from `forge-abilities` and inlines
a re-keyed copy. Every NPC gets the ability **verbatim**. Real enemies vary ("this
ogre's bolt hits harder, reaches further"). Iter 3 adds per-ref **value knobs** so an
inlined ability is tuned **without forking the base JSON**.

Hard guard: **knobs change VALUES only, never SHAPE** — no new activities, no
type/target/mechanic changes. This is what preserves the "tested once, reused
everywhere" guarantee (Iter 1 design §"Why reuse bounds testing"): overridden numbers
don't alter the base ability's gate-proven mechanic, only its magnitudes, so the NPC
still inherits that proof and is not re-tested.

## Ref format (backward compatible)

Each `abilities` entry is EITHER a plain identifier string (Iter 2, unchanged) OR a knob
object:

```json
"abilities": [
  "searing-bolt",
  { "ability": "searing-bolt", "name": "Greater Searing Bolt", "set": { "dmg": "20", "range": 90 } }
]
```

A plain string `"x"` is treated as `{ ability: "x" }`. The same identifier referenced
twice still gets distinct re-keyed ids (seed includes the array index).

## Knobs

- `name` (string) → renames the inlined item.
- `set.dmg` (string|number) → **broadcast** to every activity's every `damage.parts[i]`:
  sets `custom.enabled=true`, `custom.formula=String(dmg)`. (dmg is always expressed as
  a custom formula string.)
- `set.dc` (string|number) → broadcast to every activity with a `save`: sets
  `save.dc.calculation="custom"`, `save.dc.formula=String(dc)`.
- `set.range` (number) → broadcast to every activity with a `range`: sets
  `range.value=Number(range)`.

**Broadcast to all** — all current abilities are single-activity, so this is the obvious
behavior; multi-activity does the intuitive thing. **Caveat:** a knob whose field is
absent (e.g. `set.dc` on a no-save ability) is a silent no-op, not an error.

## Guard ("knobs-only, never shape")

Enforced pre-boot in `verify/schema.mjs#validateActorRefs` (primary) and defensively in
`resolve-abilities.mjs#applyKnobs` (throws on unknown knob). A ref object may carry ONLY
`ability`/`name`/`set`; any other key (e.g. `activities`, `type`, `target`) is a hard
validation error. `set` may carry only `dmg`/`dc`/`range`. Types checked (range=number;
dmg/dc=string|number; name=string).

## Implementation

- `scripts/pack-tools/resolve-abilities.mjs`: ref normalization + new `applyKnobs(item,
  ref)` called in `inlineAbility` BEFORE re-key. Dual call-site (build.mjs → LevelDB +
  content.spec.mjs → gate) unchanged — both share the function.
- `forge-content/verify/schema.mjs`: `validateActorRefs` accepts object refs + guard.
- Fixture `forge-content/src/packs/forge-npcs/test-ogre.json` (+ `.expect.json`): a
  knobbed `searing-bolt` ref (rename + dmg + range). `test-goblin` stays the plain-ref
  baseline → gate covers both ref forms.

## Testing (cheap smoke; mechanic reused)

- Value knobs (dmg/dc/range) proven in `scripts/pack-tools/resolve-abilities.test.mjs`
  (node, fast): broadcast on searing-bolt + radiant-rebuke, coercion, mixed refs,
  unknown-knob throw, injectKeys still valid. Schema cases in
  `forge-content/verify/schema.test.mjs`.
- `name` rename proven end-to-end in the gate via existing `hasItems:["Greater Searing
  Bolt"]` — no new gate assert keys, **no T3**. Mutation-tested: breaking the name turns
  `content:verify` RED (`missing item "Greater Searing Bolt"`).

## Out of scope

Catalog knob metadata (knobs are generic, not per-ability declared) · shape changes ·
actor T3 combat (Iter 4) · `character`-type actors.
