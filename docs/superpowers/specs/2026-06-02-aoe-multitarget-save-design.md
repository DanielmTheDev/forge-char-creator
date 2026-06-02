# Multi-target / AoE (save-each) — design

Date: 2026-06-02
Roadmap: boss-combat mechanics #1 (TODO.md "NEXT UP"). Biggest, harness-shaped. Build first.

## Problem

The functional gate (`forge-content/verify/checks.mjs`) is hardwired to ONE defender.
`combatCheck.runScenario` creates a single `defender`/`defTok` and fires
`completeActivityUse(..., {targetUuids:[defTok.uuid]})`. Every handler uses only
`[...item.system.activities][0]`. Real boss AoE (breath cone, fireball sphere) hits
N creatures, each rolling its own save, taking per-target damage. No tier proves this.

## Goal

Prove a save-each AoE ability in a real midi-qol workflow, deterministically, with
per-target HP asserts that demonstrate each target rolls its save **independently**
(mixed fail/success in one cast). Reuse Radiant Rebuke (save + half-on-save) as the
damage/save base.

## Decisions (locked with user)

- **Targeting**: template auto-target as the primary (real-play) path, with an
  explicit-`targetUuids` fallback so the gate never flakes. (#1 risk in TODO =
  template auto-target nondeterminism under xvfb.)
- **Shape**: sphere (fireball). Simplest geometry; most common boss AoE.
- **Save semantics**: half-on-save (`damage.onSave:"half"`), DEX DC 14, flat dmg.
- **Targets**: 3 defenders, forced 2 fail + 1 success.
- **Harness shape**: NEW standalone handler `aoeCheck` (tier `T3-aoe`), mirroring
  `combatCheck`. Zero regression to the 6 green single-target abilities. Matches the
  established pattern (T3-macro, T3-grant were each their own handler). Generalizing
  `runScenario` to an array (approach B) and extracting a shared scene helper
  (approach C) both rejected for now — C is a future cleanup if duplication bites.

## Components

### 1. Reference ability — "Example Blast"
Location: `forge-content/src/packs/forge-abilities/example-blast.json` (Examples folder
— same folder as Example Strike/Rally/Boon).

- `type:"feat"`, single `save` activity (16-char doc id + 16-char activity id).
- `save`: `ability:["dex"]`, `dc:{calculation:"custom",formula:"14"}`.
- `damage`: `onSave:"half"`, one part, flat custom formula `"12"`, type radiant (or fire).
- `target`: `{ template:{ type:"sphere", size:"20", units:"ft" }, affects:{ type:"creature" } }`
  (no `affects.count` → all creatures in the area). VERIFIED against dnd5e 5.2.5
  `TargetField` schema (dnd5e.mjs:9423): `template.units` is **required** (`blank:false`);
  `template.size`/`count` are `FormulaField` → strings (`"20"`), NOT numbers. `type:"sphere"`
  is a valid `DND5E.areaTargetTypes` key → renders a `circle` template, `sizes:["radius"]`
  (size = 20ft radius).
- `range`: `{ value:30, units:"ft" }` (caster places template within range).
- Concise `system.description.value` (what it does, DC, dice, half-on-save) per
  authoring rules. Fitting Foundry core sphere/explosion icon.

### 2. expect.json — `example-blast.expect.json`
```json
{
  "tier": "T3-aoe",
  "template": { "type": "sphere", "size": "20", "units": "ft" },
  "targets": [
    { "hp": 100, "ac": 1, "force": "fail",    "assert": { "defenderHpDelta": -12 } },
    { "hp": 100, "ac": 1, "force": "fail",    "assert": { "defenderHpDelta": -12 } },
    { "hp": 100, "ac": 1, "force": "success", "assert": { "defenderHpDelta": -6  } }
  ]
}
```
- `targets[]`: one entry per defender — its rigged hp/ac, forced save outcome, and the
  per-target assert (reuses existing `assertResult` keys: `defenderHpDelta`,
  `conditionApplied`, `effectApplied`, `flagPresent`, …).
- 2×fail (−12 full) + 1×success (−6 half) proves independent per-target saves.

### 3. Harness — `aoeCheck` (new handler, CHECKS['T3-aoe'])
Location: `forge-content/verify/checks.mjs`.

Mirrors `combatCheck` scene/combat boilerplate (fresh `Scene.create`, attacker actor,
`canvas.draw`, ready-wait), extended for N defenders:

- Create N defender actors + tokens at **fixed positions clustered inside** a 20ft sphere
  (e.g. all within ~10ft of a center point), caster token in `range`. Positions
  hard-coded so the template deterministically covers exactly the N defenders.
- Per-defender force flag: `flags.midi-qol.fail.ability.save.all` /
  `success.ability.save.all` set from each `targets[i].force`.
- **Targeting (primary)**: create a `MeasuredTemplateDocument` (sphere, distance=20) at
  the cluster center; drive midi auto-target so `game.user.targets` = the N defenders;
  call `completeActivityUse(activity.uuid, {midiOptions:{fastForward, fastForwardDamage,
  autoRollDamage:'always', ignoreUserTargets:false}})` (template targets drive).
- **Targeting (fallback)**: if `game.user.targets.size !== N` after placement, re-run via
  explicit `targetUuids:[...all N defTok.uuid]` + `ignoreUserTargets:true` (the proven
  single-target path, generalized to N). `log()` which path ran — no silent fallback.
- Snapshot each defender's hp before/after → return
  `{ targets:[{ delta, statuses, effectNames, flags }] }`.
- Reuse `assertResult(spec, r)` unchanged, called once per target: `assertResult(targets[i].assert, snapshot.targets[i])`.
- Cleanup in `finally`: delete template, all N tokens, all N actors, combat, scene.
- Register in CHECKS map: `'T3-aoe': aoeCheck`.

## Data flow
1. `content:verify` boots Foundry (headed/xvfb), loads packs, reads `*.expect.json`.
2. Dispatcher routes `tier:"T3-aoe"` → `aoeCheck({doc, expectation})`.
3. `aoeCheck` builds scene + N rigged defenders, places template, runs ONE midi cast.
4. Per-target HP snapshot → `assertResult` per target → aggregate pass/fail.

## Error handling / determinism
- Flat damage formula + rigged HP/AC + forced per-target save flags → no RNG; deltas exact.
- Fixed token positions guarantee template coverage = exactly N.
- Auto-target failure is caught (count check) → explicit-targetUuids fallback, logged.
- midi `targetsToUse` stays unused (broken — Set/Array guard). Fallback uses `targetUuids`.
- Generous waits (mirror `combatCheck`'s 2000ms post-cast, canvas-ready loop) for async
  midi/template flakiness.

## Testing gate
- Tier `T3-aoe` is combat-active → mandatory T3 per spec.
- Green = all 3 targets hit their per-target assert (2×−12, 1×−6) across one cast,
  run 2× deterministically (same discipline as prior abilities).
- `npm run content:verify` before push.

## Out of scope (deferred)
- Cone template (Example Breath) — TODO offered "both"; chose sphere only. Cone is a
  follow-up once sphere auto-target is proven.
- Multiattack (#2), legendary resist/actions (#3), healing (#4) — actor/boss phase.
- Template-targeted macros (AoE + Example-Rally-style cross-recipient) — future.

## Risks
- Template auto-target may not populate `game.user.targets` deterministically under
  xvfb → mitigated by the explicit-targetUuids fallback (gate stays green regardless).
- midi/dnd5e version drift on template targeting API → re-test on bump. NOTE: installed
  dnd5e is **5.2.5**, but CLAUDE.md pins **5.2.0** — confirm the pin / bump it and re-run
  the full gate. midi-qol confirmed 13.0.63 (matches pin). Schema above verified against
  the installed 5.2.5.
- midi auto-target-under-a-pre-placed-template in fast-forward is **NOT yet verified at
  runtime** (only the explicit-`targetUuids` fallback is proven). The implementation plan
  must include a live probe of the auto-target path; the gate stays green via fallback
  either way. This is the #1 risk, by design fallback-covered.
- Duplicated scene boilerplate between `combatCheck`/`aoeCheck` → accepted now;
  extract shared helper (approach C) later if it bites.
