# forge-content TODO

Simple running list. Check off as done. See CLAUDE.md for full spec.

## OPEN WORK — dispatch list (parallelizable; each item self-contained)
Master checklist for an agent army. Each links to its detail section below. Independent unless noted. **Every change touching the gate path needs a green `npm run content:verify` run (xvfb+Foundry, local) before commit — gate-green discipline.**

- [x] **G1. Gate handler dedup refactor** — DONE. Shared scaffolding installed on `globalThis.__fcGate` via `installGateHelpers()` (page.evaluate once after boot in `content.spec.mjs`); 4 T3 handlers read it like any browser global. Helpers: `strip/makeScene/makeActor/makeToken/makeCombat/drawAndWait/targetToken/clearTargets/useActivity/cleanup`. `applyCheck`(T2) untouched. Iterated combat→grant/macro/aoe, gate-green at each step (3× full `content:verify`, all 3.7-3.8m, 1 passed). See `## Gate hardening → G1`.
- [x] **G2. macroCheck radius coverage gap** — DONE. Added `outOfRangeAllies:1` (placed ~35ft from caster, x=800) asserting tempHp stays 0 while in-range allies get 5; exercises macro RADIUS=30 filter. Gate green (1 passed 3.8m).
- [x] **G3. Test-doc residue sweep** — DONE. `makeScene`/`makeActor` now stamp `flags.forge-content.test` (combats already did); `isolate()` (content.spec.mjs) generalized to sweep flagged Combats+Scenes+Actors, run at run-START + between handlers. Best-effort finally-cleanup orphans no longer pile up run-over-run (root of the stale-combat/broken-scene isolation bugs). NOTE: separate-test-world idea (was "Increment 1") DROPPED — `ishait` is a disposable test world, not the live campaign; flag-sweep is enough. Gate green (1 passed 3.1m).
- [x] **G4. Declarative scene engine** — DONE. Collapsed 5 bespoke handlers into ONE `genericCheck`; all 9 abilities on v2 expect.json; CHECKS map + shape-dispatch fork deleted; pre-boot `validate()` now covers ALL items. Gate green (1 passed 3.3m).
- [ ] **#5. Recharge actually firing** — SMALL. See `## NEXT UP → 5`. Start here (isolated).
- [ ] **#6. Reaction abilities** — MEDIUM. See `## NEXT UP → 6`. Most interactive/flaky midi surface.
- [ ] **BUG-1. Pack test residue** — 6 `Overtime_Poison_E2E_*` junk docs in forge-features pack. See `## Bugs found`.
- [ ] **BUG-2. `[object Object]` description** — Fire_Aura effect. See `## Bugs found`.
- [ ] **C-gate. Publish should be gated by B** — every push to main publishes unverified. See `## Roadmap → C`.
- [ ] **A2-redo. Real compendium-load proof** — LOW. See `## Now → A2-redo`.
- [ ] **D. Image → statblock** — LAST, highest risk, gated by B. See `## Roadmap → D`.
- [ ] **Icons-API. Generated-icon authoring** — FUTURE, discuss first. See `## Icons`.

## Gate hardening (found 2026-06-02 review)

### G1. T3 handler dedup refactor — DONE ✅
The 4 T3 handlers in `forge-content/verify/checks.mjs` (`combatCheck`, `grantCheck`, `macroCheck`, `aoeCheck`) duplicated ~60% scaffolding: `strip`, scene+actor+token+combat create, `canvas.draw`+`for(40)…300ms` wait loop, the `completeActivityUse` wrapper, the `finally` teardown.
- **Constraint:** each handler ships to the browser via `page.evaluate(handler, arg)` — serializes ONLY that fn, module-scope helpers NOT shipped. So a shared *module* helper would ReferenceError in-browser.
- **Fix taken (cleaner than the two options first sketched):** install the shared pieces on a BROWSER GLOBAL once. `installGateHelpers()` (exported from checks.mjs) runs via `page.evaluate` right after `bootFoundry` in `content.spec.mjs` and sets `globalThis.__fcGate = { strip, makeScene, makeActor, makeToken, makeCombat, drawAndWait, targetToken, clearTargets, useActivity, cleanup }`. Each handler destructures what it needs off `__fcGate` — same as reading `game`/`canvas`/`MidiQOL`. Handlers stay single self-contained fns (contract unchanged); only the genuinely per-tier logic (actor topology, scenario loops, asserts) remains in each. `applyCheck` (T2, non-combat) left untouched.
- **Notes for next time:** `useActivity(actor, doc, targetUuids, {settle, midiOptions})` — settle ms after the cast; aoe passes `settle:0` to read `wf.targets` for its hard invariant before settling manually. `cleanup([docs…])` deletes in caller order (combat→tokens→actors→scene). `makeCombat` stamps the `forge-content.test` flag so `isolate()` still purges test combats ([[gate-handler-isolation]]).
- **Verified:** iterated combat → grant/macro/aoe, full `npm run content:verify` green at each checkpoint (3 runs, ~3.7-3.8m each, `1 passed`). `isolate()` flag-purge preserved.

### G2. macroCheck radius filter untested — coverage gap — DONE ✅
Was: `macroCheck` placed ALL allies within 30ft → macro `RADIUS=30` filter never exercised (an unfiltered "buff every ally" macro would still pass).
- **Fix shipped:** `expectation.outOfRangeAllies` (count) → that many same-disposition allies placed at x=800 (~35ft from caster, >RADIUS); handler asserts their tempHp stays 0 always, while in-range allies get the macro's TEMP. `example-rally.expect.json` set `outOfRangeAllies:1`.
- **Verified with teeth:** gate green as-is (1 passed 3.8m); mutation test (macro RADIUS 30→100) flipped it RED (`OutAlly tempHp expected 0, got 5`) then reverted — proves the new assert actually exercises the filter, not a trivial pass.

### G4. Declarative scene engine — DONE ✅
Collapsed the 5 bespoke verify handlers (applyCheck/combatCheck/grantCheck/macroCheck/aoeCheck)
into ONE `genericCheck` driven by declarative expect.json v2 (`actors`/`steps`/`scenarios`/`assert`).
Pure `assertSnapshot` (verify/assert.mjs, node-unit-tested) shipped into the browser by toString;
pure `validate` (verify/schema.mjs) runs pre-boot. Problem #2 FIXED: unknown/misspelled assert
keys are HARD failures node-side (validate) AND browser-side (assertSnapshot) — proven by a
pre-boot fail on a deliberately bad key. `runScene` on `__fcGate` is the single doc-create path →
creation-tracked cleanup. All 9 abilities on v2; gate green; searing-bolt(combat)/example-boon(grant
timeline) mutation-tested red→green during the ports. New per-step `onlyScenarios` gate + `advanceUntil`
timeout error added. Spec/plan: docs/superpowers/{specs,plans}/2026-06-03-declarative-gate-engine*.
boot.mjs now waits for game.ready (fixed a flaky "coll is not iterable").

## NEXT UP — boss-combat mechanics (#1 DONE; next = #5 then #6)
Goal: close the ability-mechanic gaps that block real boss combat, BEFORE the full-actor/character-creation pivot. Each battle-tested in real midi + deterministic gate, same discipline as macro/save/attack work. Items 2 (multiattack), 3 (legendary resist/actions), 4 (healing) intentionally DEFERRED to the actor/boss phase.

What's already proven (reuse): save+dmg half/none (Radiant Rebuke), attack+on-hit (Example Strike), adv/disadv (Example Strike), condition apply, DoT+Times-Up duration, ally buff grant (Example Boon), macro conditional cross-recipient (Example Rally). Gate harness in `forge-content/verify/checks.mjs` (CHECKS map by tier), boot pieces in boot.mjs, expect.json per ability.

### 1. Multi-target / AoE (save-each) — DONE ✅
Example Blast (Examples folder): "up to 3 creatures within 30 ft", DEX DC14, flat 12 fire, half-on-save. New `T3-aoe` tier (`aoeCheck` in checks.mjs): ONE cast vs 3 rigged defenders via explicit `targetUuids[N]`, forced 2 fail (−12) + 1 success (−6) → per-target HP asserts prove independent per-target saves. Hard invariant: `wf.targets.size === N`. Gate green end-to-end. Spec+plan: `docs/superpowers/specs|plans/2026-06-02-aoe-multitarget-save*`.
- **No template — by necessity.** Ranged template (sphere/cone placed-at-range) ABORTS headless: midi sets `expectedTemplateCount=1` (~24283), workflow aborts in `WorkflowState_AwaitTemplate` (real play needs the interactive Place-Template click). `workflowOptions.templateUuid` can't fix it (Workflow ctor resets `templateUuids=[]` after the setter, ~24287). A self-emanation (`range:self`+`template.type:radius`) DOES auto-place headless (`activityHasAutoPlaceTemplate` ~19914) — but final choice = NO template, explicit `targetUuids[N]` (same path as combatCheck/macroCheck). Simplest, deterministic, proves the identical mechanic. `MidiQOL.templateTokens` does NOT exist in 13.0.63. See memory `gate-aoe-targeting`.
- **Harness fix (the real lesson): handler test-isolation.** Adding aoeCheck flipped Example Boon (`T3-grant`) red — purely on suite ORDER. A handler running combat leaves a stale ACTIVE combat; DAE stamps a granted effect's `startRound` from `game.combat.current.round`, so the next handler's `turnEndSource` buff stamped against the stale combat (round 0) and expired a turn early. Boon only passed because it was the first combat. FIX: dispatcher (`content.spec.mjs`) purges lingering TEST combats (orphaned / "T3 " scene; never real combats) before every handler → order-independent. See memory `gate-handler-isolation`.
- Determinism: flat dmg, rigged per-target save flags, fixed token positions. midi `targetsToUse` still broken (use targetUuids).
- Still open (deferred): ranged-template AoE in-gate (cone/sphere) needs a placement-simulation harness — real-play ranged AoE works for users, only the headless gate can't place. Lower priority.

### 5. Recharge actually firing — SMALL.
Why: Radiant Rebuke HAS `uses.recovery:[{period:"recharge",formula:"5"}]` but the gate never asserts the recharge ROLL happens / re-enables the ability. Untested = unproven.
What's NEW: advance a combat turn, force the recharge die (recharge succeeds on ≥ formula), assert `item.system.uses.spent` resets to 0 (or `uses.value` back to max) after a start-of-turn recharge roll. Force the d6 deterministically (midi/dnd5e recharge roll — find the roll hook or set the die). Likely small extension to an existing handler or a `T2`/`T3` assert key `rechargeRestored:true`. Investigate how dnd5e 5.2.5 rolls recharge (Item#rollRecharge or activity recovery) + how to force the die.

### 6. Reaction abilities (trigger-based) — MEDIUM.
Why: bosses have reactions (parry/riposte, Hellish Rebuke-style retaliate). No trigger-based ability proven. Reactions fire OFF another workflow, not the actor's own turn.
What's NEW / to solve:
- **Activation type `reaction`** + a trigger. midi reaction triggers: `flags.midi-qol.reactionXXX` / the item's `activation.type:"reaction"` + midi's reaction prompt on isHit/isDamaged/etc. DECIDE trigger mechanism: midi auto-reaction (`reactionCondition`/onUse macro at `isAttacked`/`isDamaged`) vs a macro that calls the reaction. Reference ability = "Example Riposte" (when attacker is hit by a foe within 5ft → riposte dmg back) OR "Example Retaliate" (when this actor takes dmg → dmg attacker).
- **Gate challenge:** reactions normally prompt the reacting user (interactive — fights the gate). Need auto-fire path: midi `configSettings.autoItemEffects`/reaction auto-roll, or `MidiQOL.completeActivityUse` triggered from a macro at the right pass, fully fast-forwarded. Determinism via forced dmg/attack. New tier likely `T3-reaction`: actor A attacks/damages actor B (who has the reaction) → assert A took the riposte dmg (HP delta on the ORIGINAL attacker).
Risks: reaction prompts are the most interactive/least-gate-friendly midi surface — budget for flakiness, generous waits, confirm an auto-fire setting exists in installed midi BEFORE committing to the approach.

First step when resumed (fresh context): start with #5 Recharge (small, isolated). Brainstorm → spec → plan. Investigate how dnd5e 5.2.5 rolls recharge (Item#rollRecharge / activity recovery) + how to force the d6 deterministically; add a gate assert (`rechargeRestored:true` or uses.spent→0) to an existing handler. Radiant Rebuke already HAS recharge defined — reuse it. New gate handlers: rely on the dispatcher's flag-based combat isolation (see memory gate-handler-isolation); tag any new test combat with flags.forge-content.test. Then #6 Reactions.

## Macro-driven abilities — DONE ✅
First "if X then do Y to Z" content logic. Example Rally (Examples folder): DEX DC14 save, range 30ft; on FAIL → 10 force to target (`damage.onSave:"none"`) AND every same-disposition ally within 30ft of caster gains 5 temp HP. Green 2x via new T3-macro gate (both branches). Spec+plan: `docs/superpowers/specs|plans/2026-06-02-macro-save-buff-ability.*`.
- **Macro = content-as-code, NO Item Macro module.** (Overturns old prereq guess.) Store JS inline at `flags.dae.macro.command` + reference via `flags.midi-qol.onUseMacroName:"[postActiveEffects]ItemMacro"`. midi-qol 13.0.63 `resolveItemMacro` (midi-qol.js:14282) reads `flags.dae.macro` (DAE — already a dep) ?? `flags.itemacro.macro`, then EXECUTES it itself (`new CONFIG.Macro... .command`). DAE only needed to read the flag (already dep). Pack tooling passes flags untouched. See [[forge-content-macro-storage]].
- **Macro scope** (midi-qol.js:26821): `{ workflow, token (caster), actor, item, args[0].macroPass }`. `workflow.failedSaves` = Set of failed token PLACEABLES (verified). Conditional branch = `if (!workflow.failedSaves?.size) return`. Cross-recipient = scan `canvas.tokens.placeables` by disposition+distance, `actor.update` each.
- **Temp HP via direct `actor.update`**, NOT an AE: dnd5e temp HP is a stored resource (AE override locks it + reverts to 0 on expiry) and has no native duration. Real-play-correct + deterministic. (Durationed boon-via-macro = future, would use Times-Up [[times-up-duration-expiry]].)
- **New gate tier `T3-macro`** (`macroCheck` in checks.mjs): caster + N allies + enemy in real combat; force save fail → enemy −10 + each ally tempHp 5; force success → enemy 0 + allies tempHp 0 (negative proves conditional). Determinism: forced save flag, flat dmg, flat temp HP, fixed ally positions in range.
- Distance: macro uses `canvas.grid.measurePath([a,b]).distance` w/ pixel-fallback.
- `_id` gotcha: `keys.mjs` rejected a 15-char activity id at build — caught, not silent.
- Risks carried: midi/DAE version-drift surface (re-test on bump); async macro flakiness (generous waits in gate); security — macro JS authored by us = trusted, but future image→statblock auto-gen MUST NOT auto-run untrusted generated macros.
- Next testable: multi-pass macros; macro-granted durationed effects (Times-Up); template/AoE-targeted macros.

## Now — Option 2: one-ability spike (bottom-up, scaffold after)
- [x] A0. Author ONE ability as JSON by hand. (Bracers of Defense, +2 AC passive — /tmp/fc-spike/src)
- [x] A1. Compile standalone via foundryvtt-cli into LevelDB pack. Round-trip verified. FINDING: docs need `_key` field (`!items!<id>`, effects `!items.effects!<itemId>.<effectId>`) or CLI silently skips them → A3 scaffold should auto-inject `_key` from `_id`.
- [x] A2. Proved in real Foundry via throwaway probe: doc loads (T1) + passive effect applies (AC +2, T2). Probe deleted. NOTE: playwright 1.60.0 bump required `npx playwright install chromium` once.
- [x] A3. forge-content scaffold built: module.json, src/packs/forge-abilities/, build-packs.mjs (auto-injects `_key`), unpack-packs.mjs (strips `_key`), npm content:pack/unpack, README. Compiled packs/ gitignored. FINDINGS: CLI `pack --in` reads dir directly but `unpack --in` reads <dir>/<name> (asymmetric); `unpack` renames files to `<Name>_<id>.json` so it's import-only, not for round-tripping authored source.
- [x] A4. Migrated forge-char-creator packs → JSON source (src/packs/forge-effects [empty +.gitkeep], src/packs/forge-features [14 docs]). Untracked + gitignored root `packs/` (built on demand). Round-trip verified 14→14. Shared module-aware tooling scripts/pack-tools/ (build.mjs/unpack.mjs/keys.mjs/modules.mjs). release.yml builds packs before zip. Binary churn now invisible to git.
- [x] B-refactor. verify split: boot.mjs (shared Foundry boot) + checks.mjs (per-tier handlers, CHECKS map) + thin content.spec. T3 slots in as combatCheck handler (currently stub). Ready for combat harness.
- [x] SAFETY. zip symlink-loop froze machine 2x (FoundryData self-symlink + zip following it). build.sh + release.yml hardened with `-ry` + exclude Foundry dirs. See memory zip-symlink-loop-hazard. NEVER run repo-root zip locally.
- [ ] A2-redo. Re-prove compiled forge-content pack loads via registered module install (probe used Item.create, not real compendium load). LOW priority — user confirmed install works in browser.

## B3 combat harness — DONE ✅
T3-combat gate works: Searing Bolt (flat 10 fire) → exact -10 on rigged defender, 2x deterministic. combatCheck in checks.mjs. Required pieces (each was a real blocker):
- Run HEADED under xvfb (`content-verify.sh` wraps `xvfb-run`; playwright config `headless:false`). Headless alone never inits canvas targeting.
- FRESH scene per test via `Scene.create` (dev world's existing scene has a broken actor that aborts canvas.draw → canvas.ready stays false).
- `canvas.draw(scene)` to switch the canvas (scene.view()/activate() did NOT switch it here).
- midi 13.x API: `MidiQOL.completeActivityUse(activity.uuid, {midiOptions:{fastForward,fastForwardAttack,fastForwardDamage,autoRollDamage:'always',targetUuids:[tokenDoc.uuid],ignoreUserTargets:true}})`. NOTE: midi `targetsToUse` is broken (Array trips not-a-Set guard; Set crashes .map) — use `targetUuids`.
- Determinism by construction: flat damage formula, rigged AC/HP (no RNG control needed).
- PREREQ: `sudo apt-get install -y xvfb` on the dev machine.
- Next: combat .expect.json vocab can grow (conditionApplied already supported; add saveResult, effectExpiresTurn, advantage).

## Attack rolls (new mechanic) — separate folder — DONE ✅
- Example Strike (Examples folder): feat w/ `type:"attack"` activity (melee weapon, STR), flat 10 slashing on hit. Reference pattern for future to-hit abilities.
- Determinism: `forceAttack` opt added to runScenario (mirrors `forceSave`) via midi `flags.midi-qol.grants.attack.success/fail.all` on DEFENDER (both flag names verified in installed midi). `attackScenarios:[{force:'hit'|'miss',assert}]` expect shape (twin of saveScenarios). NO nat-1/20 flake, no AC rigging.
- Gate proves BOTH branches: hit → attackHit:true, −10; miss → attackHit:false, 0 (damage gated by to-hit). Green 2x.
- `assertResult` already had attackHit/Crit/Advantage — no change needed.
- Still testable next: advantage/disadvantage (see NEXT below), crit.

## Advantage / Disadvantage on attack — DONE ✅
- Example Strike expect now has 6 attackScenarios: hit, miss, +adv, +disadv, +grantAdv, +grantDis. Green 2.2m.
- Two angles BOTH proven:
  - ATTACKER-side (this actor rolls adv/disadv): `opts.advantage`/`disadvantage` → `flags.midi-qol.advantage.attack.all` / `disadvantage.attack.all` on attacker.
  - GRANTS-side (attacks AGAINST defender get adv/disadv — restrained=grantAdv, dodging/obscured=grantDis): `opts.grantAdvantage`/`grantDisadvantage` → `flags.midi-qol.grants.advantage.attack.all` / `grants.disadvantage.attack.all` on DEFENDER (same place as forceAttack's grants flags).
  - All 4 flag paths verified in installed midi before wiring.
- `assertResult` gained `attackDisadvantage` (mirrors `attackAdvantage`; snapshot already had `attack.disadvantage`). Each new scenario asserts active mode `true` AND opposite `false` (catches mis-mapping).
- Determinism: keep `force:'hit'` alongside adv/disadv → HP delta stays exact (-10) while roll-mode asserted. force(grants success/fail) and roll-mode are independent.
- Still testable next: crit. Real-play condition angle (grant adv via prone/marked condition on defender, not raw flag) still open — lower priority, grants-flag path already covers the mechanic.

## Saving throws (NEW mechanic) — DONE ✅
- Radiant Rebuke (Derek, light magic): Recharge 5–6, DEX save, 12 radiant, half on save.
- Save-activity execution solved (the old `undefined` wall was just a 15-char activity id — builder now enforces 16-char ids via keys.mjs).
- Harness: `saveScenarios` in expect — runs once per forced outcome via midi `flags.midi-qol.fail/success.ability.save.all`. Proven both ways: fail → −12, success → −6 (exact, deterministic).
- Remaining gaps for future: healing/temp-HP (HP up), attack rolls + advantage/crit, condition downstream effects, resistance/vuln, AoE, concentration.

## Companion abilities (Derek + Mucknathal) — DONE ✅
- Squire's Mark (Derek): bonus action, Recharge 5–6, applies `flags.world.squiresMark` to a foe (via 0-dmg damage activity carrying the effect — utility activities don't apply effects on-hit; the hit-producing activity does).
- Rending Pounce (Mucknathal): Recharge 5–6, 3d6 bleed (midi OverTime, turn=start) for **2 rounds**, HARD-gated `condition=target?.flags?.world?.squiresMark` (non-@ so it isn't baked at apply-time; @ resolves vs source). Bounded by **Times-Up** native duration expiry (plain duration.rounds:2) — NO macro.
- Folders: Derek + Mucknathal (one each), `_folders.json` + build.mjs folder support.
- Gate proves: mark applies, bleed ticks exactly 2 then stops (advanceTurns:6 → still 2), hard-gate negative (unmarked = 0 dmg). No expiry-sweep/tricks.
- KEY: [[times-up-duration-expiry]] — Times-Up installed + enabled in test world; forge-content symlinked + enabled.
- Harness gained: multi-step combo `setup`, advanceTurns + tick counting, range asserts (hpDeltaMin/Max), effect/flag asserts, `negative` hard-gate re-run, keep embedded effect _ids (activity→effect link).

## Grant ally advantage (buff, NEW mechanics) — DONE ✅
- Example Boon (Examples): action, targets an **ally**, grants advantage on attack rolls until end of caster's next turn.
- NEW: first **utility** activity that applies an effect (works on-use to a target — unlike on-hit, where you need the hit-producing activity, see Squire's Mark line above).
- NEW: authored advantage grant — effect change `flags.midi-qol.advantage.attack.all` mode:5 on the recipient (same flag the harness used to force adv; now shipped as content).
- NEW: "until end of source's next turn" duration = DAE `flags.dae.specialDuration:["turnEndSource"]` + `duration.rounds:1`. Worked first try (needs DAE + [[times-up-duration-expiry]]).
- NEW harness `grantCheck` (tier `T3-grant`): 3 actors (caster/ally/dummy). Caster buffs ally → ally attacks dummy; advantage read off ally's own workflow at 3 moments — buffed (true), after caster's 1st turn-end (still true = proves "next turn" not "this turn"), after 2nd turn-end (false = expired). Hard-fails on advanceUntil timeout / null workflow. Ally attack item supplied via existing `setup:[example-strike]`. Green 2.7m.

## Roadmap (after A)
- [~] B. Functional gate. DONE B1: `npm run content:verify` boots Foundry, applies each ability on a dummy actor, asserts co-located `<name>.expect.json` (acDelta/abilityDelta/effectApplied). Fails on untested abilities + on wrong assertions (negative-tested). LOCAL + MANUAL (run before push; CI can't run Foundry). TODO B3: T3 combat scenarios (damage/save/duration on real midi workflow).
- [x] C. Publish automation DONE: release.yml builds forge-content packs in CI, zips, uploads forge-content.zip to rolling `latest` release. Manifest + download verified HTTP 200. PENDING: B should gate publish (currently every push to main publishes, even unverified).
- [ ] D. Image → statblock (vision → JSON → pipeline A). Last, highest risk.

## Icons
- Convention NOW: every ability uses a fitting **Foundry core icon** (`icons/<cat>/...`, 6323 available under FoundryVTT-Linux-13.351/resources/app/public/icons — weapons/magic/equipment/creatures/consumables/skills/tools/...). Pick by theme; verify path exists before authoring.
- [ ] FUTURE: hook up an image-generation API so generated icons can be authored onto abilities. Details TBD (which API, cost, where files live in module, how referenced in module.json img). Discuss before building.

## Bugs found (fix later, tracked)
- [ ] **Pack test residue**: 6 `Overtime_Poison_E2E_*` junk docs committed in forge-features pack. E2E tests write into the real pack → source of git churn. Fix: tests use throwaway/temp pack or clean up after. (found 2026-06-01)
- [ ] **`[object Object]` description**: Fire_Aura effect `description` serialized to literal `"[object Object]"`. Serialization bug in authoring path. (found 2026-06-01)

## Decisions log
- 2026-06-01: New `forge-content` module, same repo. JSON source → foundryvtt-cli compile → LevelDB packs. Stop committing binary .ldb diffs.
