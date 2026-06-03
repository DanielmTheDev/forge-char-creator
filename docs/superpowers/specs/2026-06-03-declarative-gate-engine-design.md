# Declarative scene engine for the forge-content gate

Date: 2026-06-03
Status: approved (design)
Scope: forge-content functional gate (`forge-content/verify/`). Refactor only — no new
ability mechanics, no change to what midi/Foundry does. Addresses TODO problem #1
(bespoke-handler explosion) and folds in problem #2 (silent unknown-assert-key false-GREEN).

## Problem

`forge-content/verify/checks.mjs` has 5 handlers shipped one-at-a-time to the Foundry
browser context via `page.evaluate(handler, arg)`. Because `page.evaluate` serializes
ONLY the one function (no closure, no module-scope helpers), each combat handler
re-implements ~60% of the same scaffold AND its own copy of the assert vocabulary:

- `applyCheck` (T2-apply) — static item-apply on a dummy actor.
- `combatCheck` (T3-combat) — full assert vocabulary at `checks.mjs:197` (`assertResult`).
- `grantCheck` (T3-grant) — re-implements effect/flag/advantage asserts inline (~`:296`).
- `macroCheck` (T3-macro) — re-implements hpDelta/tempHp asserts inline (~`:393`).
- `aoeCheck` (T3-aoe) — re-implements per-target hpDelta/condition/effect asserts (~`:496`).

Consequences:

1. **Combinatorial growth.** Each new mechanic (TODO #5 recharge, #6 reactions) is a new
   bespoke `XxxCheck` re-deriving scaffold + asserts. Cost is per-mechanic, not additive.
2. **Assert divergence.** A fix to one assert key does not propagate to the other 3 copies.
   The "single uniform assert layer" comment at `checks.mjs:195` is true only inside
   `combatCheck`.
3. **Silent false-GREEN (problem #2).** Every assert is `if (spec.key !== undefined) …`
   with no unknown-key rejection. A misspelled key (`defenderHPDelta`) never runs and the
   gate passes — an ability ships unproven.

The constraint that forced the duplication — `page.evaluate` ships one fn — is already
solved for builders: `installGateHelpers()` puts shared pieces on `globalThis.__fcGate`,
read by every handler like `game`/`canvas`/`MidiQOL`. This design extends that pattern to
the scenario engine and the assert layer, then makes each handler *data, not code*.

## Goal

Collapse all 5 handlers into ONE `genericCheck` driven by a declarative expect.json.

- New ability of an existing shape → write expect.json, ZERO new JS.
- New primitive → add ONE new step type to the engine, once; every future ability reuses it.
  Additive, not combinatorial.
- ONE assert vocabulary in ONE place, with unknown-key rejection (kills #2).

Out of scope: ranged-template AoE headless coverage (#1-deferred), recharge (#5), reactions
(#6), publish-gating (#3), CI (Foundry can't run in CI). Those remain separate TODO items;
this refactor makes #5/#6 cheap to add afterward.

## Decisions (locked with user 2026-06-03)

- **Existing expect.json:** rewrite all 7 to the v2 shape. One shape in the repo, no legacy
  adapter / dual code path.
- **CHECKS map:** collapse to one `genericCheck`. `expectation.tier` survives as a
  doc-classification LABEL only (CLAUDE.md: T3 mandatory for combat-active), NOT a dispatch
  selector.
- **Problem #2:** fold unknown-assert-key rejection into the shared assert layer now.

## Architecture

Three layers on `globalThis.__fcGate`, all self-contained (browser globals only — no
module-scope refs — same constraint as today's `installGateHelpers`).

### 1. Builders (exist today, unchanged)

`strip / makeScene / makeActor / makeToken / makeCombat / drawAndWait / targetToken /
clearTargets / useActivity / cleanup`.

### 2. Engine — `runScene(spec)` (NEW)

Resolves the roster, builds scene + actors (applying per-actor `forces`) + tokens + combat,
draws and waits, then executes `steps` in order, accumulating a `snapshots` map. Returns
`{ snapshots, targetedCount, error }`. Cleans up in `finally`.

- **Creation-tracking cleanup.** The engine records the id of every doc it creates and
  deletes exactly those in `finally` (in safe order: combats → scenes → actors; embedded
  tokens/items die with their parent). The `forge-content.test` flag-sweep in
  `content.spec.mjs` (`isolate()`) stays as the between-handler backstop. Because there is
  now ONE create path, no handler can "forget to stamp the flag" — a structural improvement
  to problem #5 (partial; full isolation hardening stays out of scope).
- **`combat: false`** skips scene/combat creation → covers the T2 static-apply case
  (just create actor, apply item, read derived data).

### 3. Assert — `assertSnapshot(asserts, snapshots, knownKeys)` (NEW)

Single key vocabulary, evaluated against the captured snapshots. Failure modes:

- Unknown assert key → hard fail `unknown assert key "X"` (kills problem #2).
- Assert `at` references a label no `snapshot` step produced → hard fail.
- Assert `actor` not in roster → hard fail.

### Dispatch — `genericCheck({ doc, expectation, setupDocs, knownKeys })`

Resolve `scenarios` (or one implicit run from top-level `steps`/`assert`), run `runScene`
for each, feed snapshots to `assertSnapshot`, collect fails. This single function replaces
all 5 handlers. `knownKeys` is passed in from node so the vocabulary has ONE source
(see "Single source for vocabulary").

## Data model — expect.json v2

```jsonc
{
  "tier": "T3",                 // LABEL only (doc classification per CLAUDE.md); not a dispatch selector
  "combat": true,               // default true; false = static T2 apply (no scene/combat)
  "actors": {
    "<name>": {
      "role": "caster|attacker|ally|target",   // readability label, drives nothing
      "hp": 100, "ac": 1, "temp": 0,            // all optional
      "disposition": 1,                          // 1 friendly / -1 hostile / 0 neutral
      "pos": [x, y],                            // grid px; engine defaults if omitted
      "forces": {                               // optional determinism (midi flags)
        "save": "fail|success",                 // this actor's saves
        "attack": "hit|miss",                   // attacks AGAINST this actor (grants flag on it)
        "advantage": true, "disadvantage": true,            // this actor's own attack rolls
        "grantAdvantage": true, "grantDisadvantage": true   // attacks against it get adv/disadv
      }
    }
  },
  "steps": [
    { "cast": "<actor>", "ability": "main|<identifier>", "targets": ["<actor>", "..."],
      "expectTargets": 3 },                     // optional hard invariant (AoE multi-target)
    { "advanceTurns": 6, "countDamageTo": "<actor>" },  // ticks = # turns that dropped that HP
    { "advanceUntil": { "round": 2, "actor": "<actor>" } },
    { "snapshot": "<label>" }
  ],
  "scenarios": [                                // optional; if absent, one implicit run of `steps`
    { "name": "fail",
      "forces": { "<actor>": { "save": "fail" } },   // deep-merged over roster before this run
      "assert": [ /* assert entries, see below */ ] }
  ],
  "assert": [ { "at": "<label>", "actor": "<actor>", "<key>": "<value>" } ]  // single-run form
}
```

- `ability: "main"` = the document under test (`doc`). Any other string = an identifier
  resolved against the suite via `setup` (the existing `setupDocs` wiring in
  `content.spec.mjs:84`), used for combo setup casts and the ally-attack in grant.
- A `cast` step's `targets` are actor names; the engine maps them to token uuids and passes
  them as `targetUuids` to `useActivity` (NOT `targetsToUse` — midi's is broken, per
  existing memory).
- `scenarios[].forces` is deep-merged over the base roster's per-actor `forces` before that
  scenario's run, then `steps` execute unchanged. This expresses `saveScenarios` /
  `attackScenarios` / macro fail-vs-success as data.

### Assert vocabulary (the ONE enforced set)

Per-actor: `hpDelta`, `hpDeltaMin`, `hpDeltaMax`, `tempHp`, `acDelta`, `abilityDelta`
(`{ability, delta}`), `conditionApplied`, `effectApplied`, `effectAbsent`, `flagPresent`,
`lastWorkflow.advantage`, `lastWorkflow.disadvantage`, `lastWorkflow.hit`,
`lastWorkflow.crit`, `ticks`.

Run-scoped (no `actor` field): `targetedCount`.

Any key outside this set → hard fail. (`acDelta`/`abilityDelta` are migrated from
`applyCheck`; everything else from the existing T3 vocabulary.)

### Snapshot shape (per actor, at each `snapshot` step)

```jsonc
{
  "hp": <int>, "hpDelta": <int vs scene-build baseline>, "tempHp": <int>,
  "ac": <int>, "abilities": { "<abil>": <score> },
  "statuses": ["..."], "effects": ["<name>", "..."], "flags": { /* deepClone */ },
  "lastWorkflow": { "advantage": false, "disadvantage": false, "hit": false,
                    "crit": false, "total": <int|null> }
}
```

- `hpDelta` baseline = each actor's HP captured at scene build (before any cast).
- `lastWorkflow` = the most-recent cast made BY this actor. This is what lets grant read the
  ALLY's own attack-advantage at three points, not the caster's cast.
- `ticks` is populated by the preceding `advanceTurns`+`countDamageTo` step (turns that
  reduced that actor's HP), read at the next snapshot.

## Coverage proof — every current handler maps to v2 data

| Current handler | v2 expression |
|---|---|
| **combatCheck** (Searing Bolt, Radiant Rebuke, Example Strike) | `actors{attacker, defender}` + `steps[cast attacker main → defender, snapshot "main"]`. `saveScenarios` → `scenarios[{forces:{defender:{save:"fail"}}}, {…"success"}]`. `attackScenarios` → scenarios with `forces.attack`/`advantage`/`disadvantage`/`grantAdvantage`/`grantDisadvantage`. `negative` re-run → a no-setup scenario asserting `hpDeltaMin`. Combo `setup` (Rending Pounce needs Squire's Mark) → extra `cast` step + `advanceTurns countDamageTo` + `ticks` assert. |
| **aoeCheck** (Example Blast) | `actors{caster, def0, def1, def2}` each with `forces.save` + `steps[cast caster main targets:[def0,def1,def2] expectTargets:3, snapshot]` + per-target `hpDelta`/`conditionApplied`/`effectApplied` asserts + run-scoped `targetedCount:3`. |
| **macroCheck** (Example Rally) | `actors{caster, defender, ally0..N (temp:0, in range), out0..M (temp:0, far pos)}` + `steps[cast caster main → defender, snapshot]` + asserts `defender hpDelta`, each `ally tempHp`, each `out tempHp:0`. `scenarios[{name:"fail"…},{name:"success"…}]`. |
| **grantCheck** (Example Boon) | `actors{caster, ally, dummy (forces.attack:"hit")}` + `steps[cast caster main → ally, snapshot "buffed", cast ally <attack> → dummy, snapshot "buffed", advanceUntil{round:1,actor:ally}, cast ally <attack> → dummy, snapshot "mid", advanceUntil{round:2,actor:ally}, cast ally <attack> → dummy, snapshot "expired"]` + asserts `lastWorkflow.advantage` buffed/mid=true, expired=false; `effectApplied` at buffed, `effectAbsent` at expired. Ally attack ability via existing `setup:[example-strike]`. |
| **applyCheck** (Bracers of Defense) | `combat:false`, `actors{dummy}` + `steps[cast dummy main, snapshot]` + `acDelta`/`abilityDelta`/`effectApplied` asserts. |

**`cast` step semantics by mode.** With `combat:true` a `cast` step runs a real midi
workflow (`useActivity` → `completeActivityUse`, fast-forwarded) against `targets`. With
`combat:false` a `cast` step just creates the item on the actor and waits for AE-transfer +
derive (the old `applyCheck` path) — no midi workflow, `targets` ignored. Mode is chosen by
`spec.combat`, so the same step keyword covers both without a new step type.

All 5 expressible. grant is the only non-trivial timeline (see Risks).

## Static pre-validation (NEW, pre-boot, in content.spec.mjs)

Before the ~3.8m Foundry boot, validate each expect.json structurally (node-side, <1s):

- only these top-level keys allowed: `tier`, `combat`, `actors`, `steps`, `scenarios`,
  `assert`, `setup`. Any other key (including the legacy `defender`/`saveScenarios`/
  `attackScenarios`/`targets`/`negative`/`advanceTurns`) → fail with "legacy/unknown key;
  migrate to v2".
- every `step.cast`/`step.targets`/`advanceUntil.actor`/`countDamageTo` names a roster actor
- every `assert.at` label is produced by some `snapshot` step (across the run's steps)
- every `assert.actor` is a roster actor; every assert key is in `knownKeys`
- every `scenarios[].forces` actor exists; every `scenarios[].name` unique
- `ability:"main"` or an identifier present in the suite (`byId`)

This catches authoring typos in <1s instead of after a full boot — a free partial nod to
problem #7. Validation failures fail the test before boot with a precise message.

## Single source for the assert vocabulary

`verify/schema.mjs` (NEW) exports `KNOWN_KEYS` (the set above) and `validate(expectation,
byId)`. `content.spec.mjs` calls `validate()` pre-boot AND passes `KNOWN_KEYS` into
`genericCheck` via the `page.evaluate` arg, so the browser-side `assertSnapshot` does not
re-declare the list. ONE definition, used in both node and browser.

## File layout

- `verify/schema.mjs` — NEW. `KNOWN_KEYS` + `validate()`. Single vocabulary source.
- `verify/checks.mjs` — shrinks substantially: `installGateHelpers` (builders) + `runScene`
  + `assertSnapshot` + `genericCheck`. The 5 bespoke handler bodies deleted. `CHECKS` either
  removed or reduced to `{ default: genericCheck }`; `content.spec.mjs` calls `genericCheck`
  directly.
- `verify/content.spec.mjs` — gains the static `validate()` pre-boot pass; dispatch simplifies
  to always `genericCheck` (tier no longer selects a handler).
- `verify/boot.mjs` — unchanged.
- 7 `*.expect.json` under `src/packs/forge-abilities/` — rewritten to v2.

## Error handling

- `runScene` wraps in try/catch/finally; any throw → `{error}` recorded, the scenario reports
  `<scenario>: <message>`, cleanup still runs (creation-tracking + flag-sweep backstop).
- midi returns null workflow → fail (as today).
- `expectTargets` mismatch → fail (the existing AoE hard invariant, now a built-in step assert).
- All validation failures (unknown key, missing label/actor) are hard fails, never silent.

## Testing the refactor itself

Correctness criterion: the full `npm run content:verify` stays GREEN across every increment,
AND a deliberate mutation flips it RED (anti-false-GREEN proof, same discipline as TODO G2).
Per the migration increments below, each gate-green run is the checkpoint; the mutation tests
prove the ported handler still has teeth.

## Incremental migration (gate-green at each step — same discipline as G1/G2)

1. **Extract assert + snapshot reader.** Add `assertSnapshot` + a per-actor snapshot reader to
   `__fcGate`; make all 4 T3 handlers CALL them instead of their inline copies. Behavior-
   identical, low risk. Kills assert divergence immediately. Run full `content:verify` → green.
2. **Add `runScene`; port `combatCheck`.** Rewrite combat on the engine. Green +
   mutation (flip an expected `hpDelta` in one expect.json) → red, then revert.
3. **Port `aoeCheck`.** Green (keep the `targetedCount`/`expectTargets` invariant).
4. **Port `macroCheck`.** Green + re-run the RADIUS 30→100 mutation (the G2 proof) → red,
   then revert. Confirms the ported macro still exercises the distance filter.
5. **Port `grantCheck`** (last — riskiest timeline). Green. If the 3-phase advantage read
   can't be reproduced declaratively, fall back per Risks.
6. **Fold `applyCheck` (`combat:false`); add `schema.mjs` + static validate + unknown-key
   rejection; collapse `CHECKS` → `genericCheck`; rewrite all 7 expect.json to v2.** Green.
7. **Final proof.** Full suite green + one mutation per mechanic (combat hpDelta, aoe
   per-target, macro radius, grant advantage-expiry) each flips red, then revert.

Each increment is its own commit. Every commit touching the gate path requires a green
`content:verify` run before commit (gate-green discipline, per TODO).

## Risks / caveats

- **grant timeline is the integration risk.** Its three forced advantage reads
  (buffed / after caster's 1st turn-end / after 2nd) depend on `advanceUntil` + per-actor
  `lastWorkflow` reproducing the exact turn sequence. If it can't, the "one genericCheck"
  goal bends: grant stays a thin holdout handler that still consumes `runScene` +
  `assertSnapshot` (increments 1-2 win regardless). This is surfaced at increment 5, not
  papered over. Do not force 100% collapse if grant resists.
- **DSL creep.** The vocabulary is frozen at the keys + 4 step types above. A new ability
  needing a new key or step is a deliberate engine change WITH a mutation-test, never a
  silent knob. A schema that grows a flag per ability is just the copy-paste problem wearing
  JSON.
- **Engine self-containment.** `runScene`/`assertSnapshot` ship via `page.evaluate` →
  browser globals only, no module-scope refs (the `installGateHelpers` constraint). The
  `KNOWN_KEYS` list crosses the boundary as a `page.evaluate` argument, not a shared import.
- **Version drift unchanged.** Still pinned dnd5e 5.2.5 / midi 13.0.63; re-test on bump. The
  refactor does not touch the midi API surface (`completeActivityUse`, the forced-outcome
  flags), only how scenarios are assembled around it.

## Success criteria

- All 5 bespoke handler bodies removed; `genericCheck` is the only handler.
- All 7 abilities pass via v2 expect.json; `npm run content:verify` green.
- A misspelled assert key fails the gate (manually verified once).
- A mutation per mechanic flips the gate red (anti-false-GREEN proof).
- Adding a hypothetical new ability of an existing shape requires no JS change — only a new
  JSON + expect.json (demonstrated by the rewrites being pure data).
