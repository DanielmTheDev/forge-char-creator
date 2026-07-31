# forge-content TODO

Simple running list. Check off as done. See CLAUDE.md for full spec.

## OPEN WORK — dispatch list (parallelizable; each item self-contained)
Master checklist for an agent army. Each links to its detail section below. Independent unless noted. **Every change touching the gate path needs a green `npm run content:verify` run (xvfb+Foundry, local) before commit — gate-green discipline.**

- [x] **G1. Gate handler dedup refactor** — DONE. Shared scaffolding installed on `globalThis.__fcGate` via `installGateHelpers()` (page.evaluate once after boot in `content.spec.mjs`); 4 T3 handlers read it like any browser global. Helpers: `strip/makeScene/makeActor/makeToken/makeCombat/drawAndWait/targetToken/clearTargets/useActivity/cleanup`. `applyCheck`(T2) untouched. Iterated combat→grant/macro/aoe, gate-green at each step (3× full `content:verify`, all 3.7-3.8m, 1 passed). See `## Gate hardening → G1`.
- [x] **G2. macroCheck radius coverage gap** — DONE. Added `outOfRangeAllies:1` (placed ~35ft from caster, x=800) asserting tempHp stays 0 while in-range allies get 5; exercises macro RADIUS=30 filter. Gate green (1 passed 3.8m).
- [x] **G3. Test-doc residue sweep** — DONE. `makeScene`/`makeActor` now stamp `flags.forge-content.test` (combats already did); `isolate()` (content.spec.mjs) generalized to sweep flagged Combats+Scenes+Actors, run at run-START + between handlers. Best-effort finally-cleanup orphans no longer pile up run-over-run (root of the stale-combat/broken-scene isolation bugs). NOTE: separate-test-world idea (was "Increment 1") DROPPED — `ishait` is a disposable test world, not the live campaign; flag-sweep is enough. Gate green (1 passed 3.1m).
- [x] **G4. Declarative scene engine** — DONE. Collapsed 5 bespoke handlers into ONE `genericCheck`; all 9 abilities on v2 expect.json; CHECKS map + shape-dispatch fork deleted; pre-boot `validate()` now covers ALL items. Gate green (1 passed 3.3m).
- [x] **#5. Recharge actually firing** — DONE. `usesSpent` assert key + `recharge` force (success|fail) via a `dnd5e.rollRecharge` hook (NOT formula rig — rig silently breaks the cast). radiant-rebuke now CONSUMES its use (added `consumption.targets:[{type:itemUses,target:"",value:"1"}]` — it never did, so Recharge 5–6 was a no-op). rechargeOk (spent 1→0) + rechargeFail (stays 1) scenarios, mutation-tested. **FOLLOW-UP: squires-mark + rending-pounce share the same missing-`consumption` bug → their Recharge 5–6 is a no-op too. Add consumption + usesSpent asserts.**
- [x] **#6. Reaction abilities** — DONE + auto-trigger CLOSED (Iter 4). Payload first proven via gate-fired cast (Example Retaliate). Auto-TRIGGER now gate-covered headless via an authored NPC statblock `_source` onUseMacro: **Test Retaliator** (forge-npcs) auto-fires −6 on the attacker on `isDamaged` with NO manual cast. The old "infeasible headless" limitation was specific to a DAE transfer effect on a bare-NPC ITEM (can't inject `_source` flags); an authored actor bakes `flags.midi-qol.onUseMacroName="[isDamaged]ItemMacro.<ReactionItemName>"` into `_source` at Actor.create. `ItemMacro.<Name>` resolves to the DEFENDER's own item (bare `ItemMacro` → ATTACKER's). See `## Actor creation → Iter 4`.
- [x] **BUG-1. Pack test residue** — DONE. overtime.spec cleanup now deletes E2E/Test docs from the compendium (was searching `game.items`, which never holds pack docs); forge-features pack emptied (+.gitkeep); `packs:build` guard added.
- [x] **BUG-2. `[object Object]` description** — DONE. Root cause `effect-creator.js:432` (AE `description` must be a plain string, not `{value}`); fixed + `packs:build` guard throws on any literal `[object Object]`.
- [x] **SPELLS. Vanilla spell support end-to-end** — DONE (2026-06-12). Actors author `spellcasting:{ability,level,slots}` + `spells:["Name",...]`; `npm run spells:resolve` reads dnd5e `spells24`→`spells` LevelDB locally (server stopped) into committed `forge-content/src/spell-cache/` (CI has no Foundry — cache IS the build input); `resolve-spells.mjs` inlines re-keyed spell items + sets sheet ability/casterLevel/slots, wired into the build/dist/gate trio. Gate: actor T3 expect gained optional `load` block (T2 stat asserts kept on a T3 actor) + castOwn-by-spell-identifier; `FC_ONLY` now comma-separable (`-- caelnor,nine,thord`). Caelnor rebuilt: 4 spells attached, Guiding Bolt T3-proven (forced hit, 4d6 crit-tolerant). Slot consumption NOT gate-assertable (noted in STUBS). Vault+repo skills updated.
- [x] **G5. Stale-aware (changed-only) gate** — DONE (2026-06-12). Default `content:verify` runs only docs whose **gate hash** moved: sha256 over resolved doc (trio path — dep change re-runs dependents) + expect.json + setup-referenced docs + ENGINE hash (verify/*.mjs, resolver trio, playwright config, content-verify.sh, dnd5e/midi/dae/times-up installed versions → any engine/module change = ALL stale). Markers per-doc-on-PASS in gitignored `.gate-green.json`; nothing-stale = exit 0 in ~2s with NO Foundry boot (content-verify.sh fast path). `-- --full`/`FC_FULL=1` forces sweep; `FC_ONLY` ignores markers but records greens; `npm run content:stale` lists. Core `forge-content/verify/stale.mjs` + `stale.test.mjs`. User decisions: stale-only default, markers local, NO pre-push hook (honor system).
- [x] **NPC-folders. Non-null actor `folder` honored** — DONE (2026-07-31). `statblock-validate.mjs` used to hard-fail ANY non-null actor `folder`, so the mandatory compendium-folder ask had nowhere to land. Now: `folder` is null OR a 16-alnum id declared in the pack's sibling `_folders.json` (ids read in `main()`, passed as `validateStatblock`'s 6th arg — fn stays fs-free); unknown/malformed id = hard error. `build.mjs` already packed `_folders.json` per pack (`DOC_TYPE.actors="Actor"`), so no build change. First user: `forge-npcs/_folders.json` → "Dhul Maldur" (`folderdhulmaldur`), Eglath Ashlung in it; older NPCs stay at root. Schema doc updated, 4 unit tests.
- [x] **PORT. `FOUNDRY_PORT` override for the gate** — DONE (2026-07-31). Foundry's default 30000 is also what a running JetBrains IDE's `cef_server` grabs → gate died with `EADDRINUSE` + `net::ERR_EMPTY_RESPONSE` at boot. `content-verify.sh` now pre-checks the port (clear error + `ss` line instead of a 12s-later Playwright crash), passes `--port=$FOUNDRY_PORT` to Foundry, and exports it; `verify/boot.mjs` builds its URL from the same var. Usage: `FOUNDRY_PORT=30010 npm run content:verify`.
- [ ] **C-gate. Publish should be gated by B** — every push to main publishes unverified. See `## Roadmap → C`.
- [ ] **A2-redo. Real compendium-load proof** — LOW. See `## Now → A2-redo`.
- [~] **D. Image → statblock** — Iter 1 DONE (match-catalog-only, gate-valid output, no exec content). See `## Roadmap → D`.
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

## Actor creation (NEW pipeline) — Iter 1 + Iter 2 + Iter 3 DONE ✅
4-iter split (spec+plan docs/superpowers/{specs,plans}/2026-06-05-actor-creation-iter1*):
1 actor spine · 2 compose+catalog (THIS) · 3 knobs · 4 actor-T3-combat+reactions.
- Iter 1: `forge-npcs` actors pack + `COLLECTIONS["forge-npcs"]="actors"`.
  `keys.mjs` extended to inject nested `_key`s (actor→items→item-effects→activities
  + actor-own effects), 16-char ids enforced at every level, unit-tested
  (`keys.test.mjs`, 9 tests). Hand-authored `test-goblin` npc inlines a re-keyed
  `searing-bolt`. New `actorLoadCheck` (T1 loads + T2 derived hp/ac/abilities/item
  present) + `validateActor` pre-boot schema; dispatcher (`content.spec.mjs`) splits
  ability vs actor packs by collection (empty-guard now counts items+actors).
  Reused ability NOT re-proven (test-explosion guard). FULL GATE GREEN: 11/11
  (10 abilities + Test Goblin T2), 1 passed 3.8m. No statblock fix needed —
  ac.calc:"flat"/flat:13, hp.max:20, str8/dex14 all derived first try.
- Nested `_key` format confirmed empirically off dnd5e `monsters` pack:
  `!actors!`, `!actors.items!A.I`, `!actors.items.effects!A.I.E`, `!actors.effects!A.E`.
- Iter 2 DONE ✅: actor source = stats + top-level `abilities:[<identifier>]`; build
  resolves refs from forge-abilities, inlines each as a re-keyed embedded item.
  - `keys.mjs#genId(seed)` deterministic 16-alphanum id (FNV-1a, no Date/random).
  - NEW `resolve-abilities.mjs#resolveActorAbilities(doc, abilityMap)`: pure/fs-free,
    clones ability, builds old→new id map (item/activity/effect, seed=actorId:id:idx),
    rebuilds activity map keys + full-string-equality deep-replace (preserves cross-refs
    e.g. activity.effects[].​_id), strips `folder` + top-level `abilities`. Hard-errors
    on missing ref. Unit-tested (11).
  - DUAL call-site: `build.mjs` (→LevelDB, before injectKeys) AND `content.spec.mjs`
    gather (→gate; reads SOURCE json, so must inline or actorLoadCheck sees 0 items).
    `validateActorRefs` pre-boot (array-of-known-identifiers).
  - NEW `catalog.mjs#buildCatalog` → `forge-abilities/CATALOG.md` (committed, HTML-stripped
    table id/name/tier/icon/desc); auto-regen at packs:build start + `npm run content:catalog`.
  - `unpack.mjs` SKIPS actor packs (resolver one-way; would clobber ref source). UNPACK_ACTORS=1 forces.
  - test-goblin migrated to `abilities:["searing-bolt"]`. content:unit 73 green; GATE GREEN 11/11 (3.9m).
- Iter 3 DONE ✅: per-ref VALUE knobs on inlined abilities, no base fork. Ref entry is
  now string OR `{ability, name?, set:{dmg,dc,range}}` (string = `{ability}`, backward
  compat). **Knobs change values only, never shape** (preserves tested-once/reused proof).
  - `applyKnobs(item, ref)` in resolve-abilities.mjs (before re-key): `name`→item.name;
    `set.dmg`→every `damage.parts[].custom.{enabled:true,formula:String}` (dmg always a
    custom formula); `set.dc`→every save activity `save.dc.{calculation:"custom",formula}`;
    `set.range`→every activity `range.value:Number`. **Broadcast to ALL** activities;
    absent field = silent no-op (NOT an error). Throws on unknown knob.
  - `validateActorRefs` (schema.mjs) accepts object refs; rejects unknown ref keys
    (only ability/name/set — the never-shape guard), unknown knobs (only dmg/dc/range),
    bad value types. Pre-boot fast-fail. Dual call-site (build + gate) unchanged.
  - Fixture `test-ogre.json` (knobbed searing-bolt: rename+dmg20+range90) + expect
    `hasItems:["Greater Searing Bolt"]`. test-goblin stays plain-ref baseline.
  - Smoke = unit tests (resolve-abilities.test +8, schema.test +7) for dmg/dc/range;
    rename proven E2E in gate via hasItems. No new gate assert keys, NO T3 (mechanic
    reused). content:unit 87 green; GATE GREEN (1 passed 3.9m, Goblin+Ogre); gate
    mutation (break rename) → RED `missing item "Greater Searing Bolt"` → reverted.
  - Spec/plan: docs/superpowers/{specs,plans}/2026-06-06-actor-creation-iter3-knobs*.
- Iter 4 DONE ✅: actor T3 combat + reaction auto-fire (closes #6).
  - `runScene` (checks.mjs) gained TWO additive, opt-in branches (no-ops for the 10
    ability expects): (1) **authored roster slot** — `spec.actors[n].authored=<resolved
    NPC doc>` builds that actor from the statblock (with its inlined embedded abilities)
    via `Actor.create` instead of bare `makeActor`; (2) **`castOwn` step** —
    `{castOwn:<name>, ability:<identifier>, targets}` finds the actor's OWN embedded item
    by `system.identifier` (preserved through inlineAbility re-key) + runs its first
    activity in real midi. New `actorCombatCheck` handler (sibling of actorLoadCheck)
    injects the resolved doc into the `authored:true` slot, mirrors genericCheck.
  - Schema: `validateActor` branches on `tier:"T3"` → `validateActorCombat` (reuses the
    ability actors/steps/assert grammar via factored-out `validateStepsAndAsserts`; rules:
    exactly one `authored:true` actor, `castOwn` ability ∈ actor's held refs). T1/T2
    unchanged. content:unit 95 green.
  - **Test Bruiser** (forge-npcs, `abilities:["searing-bolt"]`, T3 expect): casts its own
    inlined searing-bolt at a dummy → −10. Proves assembly glue (re-keyed item executes
    in real combat), NOT the mechanic again (test-explosion guard). Mutation-tested.
  - **#6 reaction auto-fire CLOSED** (overturns the prior "infeasible headless" finding).
    **Test Retaliator** (forge-npcs, `abilities:["example-retaliate"]`): actor `_source`
    flag `flags.midi-qol.onUseMacroName="[isDamaged]ItemMacro.Example Retaliate"` +
    inline-JS `flags.dae.macro.command` on the item (deal flat 6 force to `workflow.token`
    attacker, guarded on `macroPass==='isDamaged'`). Gate: attacker forced-hit strikes
    retaliator, **NO manual reaction cast** → attacker −6 auto-applied. Mutation-tested.
    The key unlock: an authored NPC bakes onUseMacroName into `_source` at Actor.create
    (a DAE transfer effect on a bare-NPC item couldn't), AND `ItemMacro.<Name>` (vs bare
    `ItemMacro`, which resolves to the ATTACKER's item) resolves to the DEFENDER's own
    item. Example Retaliate's existing manual-fire expect still green (item has no
    item-level onUseMacroName, so the macro stays dormant during a normal cast).
  - DEFERRED to a later boss phase (per spec): multiattack routing, legendary
    resist/actions, healing. FC_ONLY=<substr> works for fast single-actor iteration.

## NEXT UP — boss-combat mechanics (#1 DONE; next = #5 then #6)
Goal: close the ability-mechanic gaps that block real boss combat, BEFORE the full-actor/character-creation pivot. Each battle-tested in real midi + deterministic gate, same discipline as macro/save/attack work. Items 2 (multiattack), 3 (legendary resist/actions), 4 (healing) intentionally DEFERRED to the actor/boss phase.

What's already proven (reuse): save+dmg half/none (Radiant Rebuke), attack+on-hit (Example Strike), adv/disadv (Example Strike), condition apply, DoT+Times-Up duration, ally buff grant (Example Boon), macro conditional cross-recipient (Example Rally). Gate harness in `forge-content/verify/checks.mjs` (CHECKS map by tier), boot pieces in boot.mjs, expect.json per ability.

### 1. Multi-target / AoE (save-each) — DONE ✅
Example Blast (Examples folder): "up to 3 creatures within 30 ft", DEX DC14, flat 12 fire, half-on-save. New `T3-aoe` tier (`aoeCheck` in checks.mjs): ONE cast vs 3 rigged defenders via explicit `targetUuids[N]`, forced 2 fail (−12) + 1 success (−6) → per-target HP asserts prove independent per-target saves. Hard invariant: `wf.targets.size === N`. Gate green end-to-end. Spec+plan: `docs/superpowers/specs|plans/2026-06-02-aoe-multitarget-save*`.
- **No template — by necessity.** Ranged template (sphere/cone placed-at-range) ABORTS headless: midi sets `expectedTemplateCount=1` (~24283), workflow aborts in `WorkflowState_AwaitTemplate` (real play needs the interactive Place-Template click). `workflowOptions.templateUuid` can't fix it (Workflow ctor resets `templateUuids=[]` after the setter, ~24287). A self-emanation (`range:self`+`template.type:radius`) DOES auto-place headless (`activityHasAutoPlaceTemplate` ~19914) — but final choice = NO template, explicit `targetUuids[N]` (same path as combatCheck/macroCheck). Simplest, deterministic, proves the identical mechanic. `MidiQOL.templateTokens` does NOT exist in 13.0.63. See memory `gate-aoe-targeting`.
- **Harness fix (the real lesson): handler test-isolation.** Adding aoeCheck flipped Example Boon (`T3-grant`) red — purely on suite ORDER. A handler running combat leaves a stale ACTIVE combat; DAE stamps a granted effect's `startRound` from `game.combat.current.round`, so the next handler's `turnEndSource` buff stamped against the stale combat (round 0) and expired a turn early. Boon only passed because it was the first combat. FIX: dispatcher (`content.spec.mjs`) purges lingering TEST combats (orphaned / "T3 " scene; never real combats) before every handler → order-independent. See memory `gate-handler-isolation`.
- Determinism: flat dmg, rigged per-target save flags, fixed token positions. midi `targetsToUse` still broken (use targetUuids).
- Still open (deferred): ranged-template AoE in-gate (cone/sphere) needs a placement-simulation harness — real-play ranged AoE works for users, only the headless gate can't place. Lower priority.

### 5. Recharge actually firing — DONE ✅
- **New assert key `usesSpent`** (exact) — snapActor reads the cast item's `system.uses.spent`. New scenario force `recharge: success|fail` on the caster.
- **dnd5e 5.2.5 recharge mechanics:** auto-fires on **NPC turn-start** (`recoverUses`→`rollRecharge`) only when world setting `dnd5e.autoRecharge` ≠ `"no"` (default IS "no" — gate sets `"silent"` when a scenario rigs recharge). The d6 succeeds when `total ≥ parseInt(recovery.formula)`. `recoverUses` with periods `turn/turnStart` treats `formula` as a recovery AMOUNT (not the recharge threshold) — recharge period is handled separately via `rollRecharge`.
- **Determinism via the `dnd5e.rollRecharge` hook** (installed in installGateHelpers), NOT by rigging `recovery.formula` — rigging the formula on the test-copy item silently makes `completeActivityUse` return falsy (the cast "doesn't run"). The hook overrides `updates['system.uses.spent']` before apply: success→0, fail→delete. Keyed off per-run `__fcGate._rechargeForce`.
- **CONTENT BUG fixed:** radiant-rebuke's activity had NO `consumption`, so using it never spent the use → Recharge 5–6 was a no-op (usable every turn). Added `consumption.targets:[{type:"itemUses",target:"",value:"1"}]`.
- **Save activities must force the save in recharge scenarios too** — an unforced save blocks the headless workflow (dialog) → `completeActivityUse` returns falsy. radiant-rebuke's recharge scenarios force `defender.save:"fail"`.
- Scenarios: rechargeOk (spent 1→0), rechargeFail (stays 1); both mutation-tested. See memory [[recharge-gate]].

### 6. Reaction abilities (trigger-based) — DONE ✅ (payload + auto-trigger, Iter 4).
Why: bosses have reactions (parry/riposte, Hellish Rebuke-style retaliate). Reactions fire OFF another workflow, not the actor's own turn.
- **Payload proof** (first pass): Example Retaliate (Examples) = `activation.type:"reaction"` damage activity, 6 force. Gate fires the holder's reaction at the attacker after a forced hit → −6 on the attacker. Mutation-tested.
- **Auto-trigger CLOSED in Iter 4** (overturns the spike's "infeasible headless"): **Test Retaliator** (forge-npcs) carries an actor `_source` flag `flags.midi-qol.onUseMacroName="[isDamaged]ItemMacro.Example Retaliate"`; the inlined item carries inline-JS `flags.dae.macro.command` (flat 6 force to `workflow.token` attacker, guarded on `macroPass==='isDamaged'`). Gate: attacker forced-hit strikes the retaliator, NO manual reaction cast → attacker −6 auto-applied. Mutation-tested.
- **Why it works now vs the spike's blocker:** midi `triggerTargetMacros` reads `target.actor.flags['midi-qol'].onUseMacroParts` from the actor's `_source`. The spike only tried a DAE transfer effect on a bare-NPC ITEM (can't inject `_source`). An AUTHORED NPC bakes the flag into `_source` at Actor.create. And `ItemMacro.<Name>` resolves to the DEFENDER's own item (bare `ItemMacro` resolves to the ATTACKER's item — `callMacros(this.item,...)`). True reaction-dialog reactions still can't headless-auto-fire (interactive `reactionDialog`), but the actor onUse-macro path covers retaliate-style reactions.
- New engine (Iter 4): `runScene` authored slot + `castOwn` step; `actorCombatCheck` handler; `validateActorCombat`. `FC_ONLY=<substr>` env filter (single-ability/actor iteration; byId uses unfiltered gather so setup still resolves); test timeout 600s.

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
- [~] D. Image → statblock (vision → JSON → pipeline A). Iter 1 DONE. See `## Roadmap → D`.

## Roadmap → D — Image → statblock
Front-end onto the EXISTING actor pipeline: image → gate-valid `forge-npcs/<slug>.json` → `packs:build` + `content:verify` carry it the rest. Spec/plan: `docs/superpowers/{specs,plans}/2026-06-06-image-statblock-iter1*`.

### Iter 1 — DONE ✅ (match-catalog-only, zero executable content)
- **Vision engine = Claude Code itself** (no API/key/deps). Skill `.claude/skills/forge-image-statblock/SKILL.md` directs it to Read the image + emit actor JSON per `forge-content/docs/statblock-schema.md`.
- **Match CATALOG only, stub the rest.** Statblock abilities matched to existing `forge-abilities` identifiers (string ref or `{ability,name,set:{dmg,dc,range}}` knob); unmatched → `<slug>.STUBS.md` for human authoring. NO new abilities, NO macro JS, NO shape knobs — honors the security lock (auto-gen must not auto-run untrusted macros). Validator HARD-fails any ref ∉ catalog → nothing un-vetted reaches Foundry.
- **Machine catalog:** `catalog.mjs#buildCatalogJson` writes `forge-abilities/_CATALOG.json` (consumed by match step + validator; `_`-prefixed so doc-globs skip it) at every packs:build.
- **Validator** `scripts/pack-tools/statblock-validate.mjs` (`content:statblock-validate`): stat ranges, `_id===genId(slug)`, icon-path existence, refs ∈ catalog (reuses `schema.mjs#validateActorRefs` for ref/knob shape).
- **Auto-expect** `scripts/pack-tools/gen-expect.mjs` (`content:gen-expect`): T2 expect (hpMax/ac/abilities/hasItems) auto-derived from the resolved actor; `--t3` writes a scaffold with TODO damage; never overwrites a hand-edited expect.
- **Demo fixture** `forge-npcs/cave-gnoll.json` (+auto `.expect.json`, `.STUBS.md`): proves image-shaped authoring → validate → gen-expect → build → T2 gate, reusing `example-strike` (knobbed) — no new mechanic.
- **Verified:** content:unit 113 pass; packs:build green (`_CATALOG.json` 10); validator mutation-tested (str=25 RED, unknown ref RED, revert GREEN); content:verify Cave Gnoll T2 green + full suite green.

### Deferred
- **D-iter2** — unmatched-ability authoring loop: human authors each stubbed ability, gate-proven (T2/T3) before the actor that needs it builds; fill T3 scaffold damage from real runs.
- **D-iter3** — batch import, token-image generation (see `## Icons`), CI hook (intersects open C-gate: publish should be gated by B).

## Icons
- Convention NOW: every ability uses a fitting **Foundry core icon** (`icons/<cat>/...`, 6323 available under FoundryVTT-Linux-13.351/resources/app/public/icons — weapons/magic/equipment/creatures/consumables/skills/tools/...). Pick by theme; verify path exists before authoring.
- [ ] FUTURE: hook up an image-generation API so generated icons can be authored onto abilities. Details TBD (which API, cost, where files live in module, how referenced in module.json img). Discuss before building.

## Bugs found (fix later, tracked)
- [x] **Pack test residue** — FIXED. overtime.spec cleanup now deletes E2E/Test docs from the `forge-char-creator.forge-features` compendium index (was searching `game.items`, which never holds pack docs). forge-features pack emptied (+.gitkeep). (found 2026-06-01, fixed 2026-06-05)
- [x] **`[object Object]` description** — FIXED. Root cause `scripts/effect-creator.js:432`: AE `description` was written as `{value}` but Foundry V13 `ActiveEffect.description` is a plain string → object-coerced on save. Now a plain string (+ line 463 reads it directly). `packs:build` guard now throws on any literal `[object Object]`. (found 2026-06-01, fixed 2026-06-05)
- [x] **Recharge no-op on squires-mark + rending-pounce** — FIXED. Both activities now consume `itemUses` (`consumption.targets:[{type:"itemUses",target:"",value:"1"}]`); gates assert `usesSpent: 1` at the post-cast snapshot (squires-mark `main`, rending-pounce new `cast` snapshot — taken before any recharge roll so it stays deterministic). FC_ONLY gate runs green. (found 2026-06-05, fixed 2026-06-11)
- [ ] **char-creator suite RED on main (pre-existing)** — `tests/module.spec.js` (native ForgeTestingSuite: `Description was not generated`, `Cannot read properties of undefined (reading 'includes')`, `Timeout waiting for Item.create`, `reading 'type'`) + `tests/overtime.spec.js` (eval-context timeout) fail on a CLEAN main checkout — verified 2026-06-11 via git stash baseline. Unrelated to dropdown/sync work (new specs green). Triage natively in `scripts/tests/index.js`. (found 2026-06-11)
- [x] **Gate broken by ACTIVE world scene** — FIXED. With any campaign scene active, T3 turn-driven asserts go nondeterministic (repro: Example Boon advantage `false`, Rending Pounce `ticks 1` — both green with no active scene). content.spec.mjs now deactivates the active scene for the run and restores it after. Symmetric wart: overtime.spec/native suite NEED an active scene — the two suites had opposite scene requirements; gate is now self-sufficient either way. (found+fixed 2026-06-11)

## Decisions log
- 2026-06-01: New `forge-content` module, same repo. JSON source → foundryvtt-cli compile → LevelDB packs. Stop committing binary .ldb diffs.
- 2026-06-06: Actor Iter 3 knobs = VALUE overrides only (dmg/dc/range + name), broadcast
  to all activities, never shape — guard in validateActorRefs + applyKnobs. Ref format
  string|object, backward compat. Smoke = node unit + gate rename via hasItems, no T3.
- 2026-06-05: Recharge determinism via `dnd5e.rollRecharge` hook (not formula rig). Reactions: payload-proven via gate-fired cast; auto-trigger deferred to the actor/boss phase (item-based auto-reactions infeasible on bare NPCs — actor `_source` macro needed). BUG-1/BUG-2 fixed at root + build guard.
- 2026-06-11: Runtime content sync replaces per-change Forge module updates. CI commits resolved docs + sha256 manifest to `forge-content/dist/`; `scripts/sync.mjs` (GM, ready hook) resolves main SHA via GitHub API (uncached, no raw-CDN lag), fetches SHA-pinned raw docs, delete+recreates stale pack docs via `flags["forge-content"].srcHash` diff. Module zip = first-install baseline; reinstall self-heals next sync. E2E: `tests/content-sync.spec.js` against local dist via `manifestUrl` override. Imported world copies NOT updated (re-drag).
- 2026-06-12: Authored-actor AC = `calc:"natural"` ALWAYS (flat skips ac.bonus → +AC effects no-op; natural keeps printed value, no dex added) — statblock-validate enforces, all 10 forge-npcs flipped. Reskin refs (`name`/`set`) now REQUIRE `desc` (item-level override like name/img) or exemplar "Reference ability…" text + base numbers leak in-game — validateActorRefs enforces. New value knob `dmgType` (5e type whitelist) so reskins match vault damage types. Skills (repo statblock+image, vault creating-characters) updated.
- 2026-06-12: Gate default = changed-only (stale-aware). Old always-full discipline existed for cross-doc leaks, fixed at source (G3 flag-sweep + active-scene handling); residual risk covered by engine-hash (any gate/resolver/module change → ALL stale) + `-- --full`. Markers `.gate-green.json` local+gitignored. Pre-push hook DECLINED (honor system stays).
