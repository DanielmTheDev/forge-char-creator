# forge-content TODO

Simple running list. Check off as done. See CLAUDE.md for full spec.

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

## NEXT: Advantage / Disadvantage on attack (extends Example Strike pattern)
- Goal: prove attack roll picks up adv/disadv and harness asserts it. Builds directly on `attackScenarios` + `forceAttack` (already shipped, see DONE block above).
- Harness is READY: `runScenario` snapshot captures `attack.advantage`/`attack.disadvantage`; `assertResult` already has `attackAdvantage` key. ADD a `attackDisadvantage` assert key to `assertResult` (one line, mirrors `attackAdvantage`).
- Determinism — grant adv/disadv to the ATTACKER via midi flags on the attacker actor (NOT the defender):
  - advantage: `flags.midi-qol.advantage.attack.all = 1`
  - disadvantage: `flags.midi-qol.disadvantage.attack.all = 1`
  - VERIFY exact flag paths in installed midi first: `grep -rho 'advantage.attack.[a-z]*' FoundryData/Data/modules/midi-qol | sort -u` (same way `grants.attack.*` was verified for forceAttack).
  - Add `opts.advantage`/`opts.disadvantage` to `runScenario` applying flags to `attacker` (mirror the `forceSave`/`forceAttack` blocks). Normalize via a new `attackScenarios` opt field OR reuse existing scenario `force` — keep it `attackScenarios:[{force:'hit', advantage:true, assert:{attackAdvantage:true}}]` (force still controls hit so damage stays deterministic).
- Real-play angle (optional, richer): instead of raw flags, grant advantage via a condition on the DEFENDER (e.g. prone/marked) so the attack auto-rolls adv — proves the downstream-condition path, not just a flag. Squire's Mark (squiresmark00001) could be the setup doc. Lower priority than the flag version.
- Assert both: adv → `attackAdvantage:true`; disadv → `attackDisadvantage:true`. Keep `force:'hit'` so HP delta stays exact alongside the adv/disadv assert.
- Can fold into Example Strike's expect.json (add scenarios) or a new example ability. Prefer extending example-strike.expect.json to keep one canonical attack reference.

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
