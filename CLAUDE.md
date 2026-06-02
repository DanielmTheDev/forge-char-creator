# CLAUDE.md — forge-char-creator repo

Two things live here:
1. **forge-char-creator** — player-facing dnd5e V13 wizard module (EffectCreatorApp, CharCreatorApp). Existing.
2. **forge-content** — content-as-code pipeline (NEW). Author abilities/items/actors as JSON, compile to compendium packs, functional-test in real Foundry combat, publish as its own module. This file is its working spec.

## forge-content goal
Author D&D5e content (effects → items → full NPCs/bosses, eventually from an image) with as little manual work as possible. I write source, the pipeline compiles + tests + publishes; user only reviews + imports. NO wizard UI in this loop.

## Locked decisions
- **Distribution**: new `forge-content` module IN THIS REPO. Own module.json + packs. Depends on same deps (dnd5e, midi-qol, dae, lib-wrapper, socketlib). User installs both modules.
- **Source of truth = plain JSON**, one file per document, git-readable. Industry pattern (dnd5e core does this).
- **Compile**: `@foundryvtt/foundryvtt-cli` packs JSON → LevelDB. JSON = committed truth; compiled pack = build artifact → **gitignore `packs/` AFTER migration** (regen via `npm run pack`). Caveat: Forge GitHub-manifest install (DEPLOYMENT.md Method 2) needs a CI-built release artifact once packs are ignored; Method 1 zip unaffected.
- **Reuse** EffectCreatorApp payload LOGIC as the correct-midi-flag reference. Not its UI.

## Testing gate (nothing publishes until green)
Runs inside real Foundry via `./test.sh` (boots server + Playwright + native suite). Tiers:
- T0 payload shape · T1 doc loads (schema valid) · T2 effect applies (derived data changes on real actor) · T3 combat E2E (real midi-qol workflow: forced dice, attack/damage/save/duration asserted on HP/flags).
- **Required**: T0+T1+T2 always; **T3 for anything combat-active** (damage/advantage/save/condition). Bosses = T3 mandatory.
- Determinism: force dice / auto-fast-forward so asserts are exact, not flaky.

## Known limits (surfaced, not hidden)
Version drift (pin dnd5e 5.2.5 / midi 13.0.63, re-test on bump) · combinatorial interaction gaps · manual-click paths uncovered · async hook flakiness.

## Roadmap (build in order, spec each separately)
- **A. Content pipeline** — JSON source dir → `npm run pack`/`unpack` round-trip. FOUNDATION. ← current
- **B. Functional test gate** — per-document T2/T3 generator wired into test.sh.
- **C. Publish automation** — push → CI build + release → Forge auto-update.
- **D. Image → statblock** — vision → structured def → feeds A. Last; highest risk, gated by B.

## Task list
See `TODO.md` — running checklist + tracked bugs + decisions log. Keep it updated.

## Content gate (B) — LOCAL + MANUAL
Foundry can't run in CI (binary + license gitignored/secret), so the functional gate is local. Discipline: **run `npm run content:verify` before pushing content** (push→publish, ungated by design — 2-person flow). Each ability needs a co-located `<name>.expect.json` or the gate fails it as untested:
- T2-apply: `{tier, actor, assert:{acDelta|abilityDelta|effectApplied}}` — applies item on a dummy actor.
- T3-combat: `{tier, defender:{hp,ac}, assert:{defenderHpDelta|conditionApplied}}` — real midi workflow in a fresh scene; deterministic via flat damage + rigged AC/HP.
PREREQ: `content:verify` runs **headed under xvfb** (`sudo apt-get install -y xvfb` once). Headless can't init Foundry's canvas/targeting that real midi combat needs. Handlers live in `forge-content/verify/checks.mjs` (CHECKS map by tier).

**Duration/DoT expiry needs Times-Up.** Effect `duration.rounds` only auto-expires if the **Times-Up** module is active — dnd5e core + midi do NOT delete expired effects themselves (midi delegates to `globalThis.TimesUp.isEffectExpired`). Without it, OverTime DoTs tick forever (unbounded/OP). So: any bounded DoT relies on Times-Up; the test instance + the user's game must have it active. forge-content recommends it. Test world has midi-qol/dae/lib-wrapper/socketlib/**times-up**/forge-content active (forge-content symlinked into FoundryData/Data/modules).

## Ability authoring rules
- **Every ability MUST have a concise `system.description.value`** the user understands at a glance — what it does, its dice/effect, recharge/cost. Plain, short, scannable. No untitled/empty descriptions.
- Every ability ships a fitting Foundry core icon + a `<name>.expect.json` functional check.
- **All `_id`s — doc, embedded effects, AND activity ids (the activities map key = the activity `_id`) — must be exactly 16 alphanumeric chars.** A wrong-length id silently drops the activity/item at Foundry-load. `scripts/pack-tools/keys.mjs` enforces this at build (`npm run packs:build` throws).

## Packs are content-as-code (BOTH modules)
JSON source committed; compiled LevelDB `packs/` gitignored (built on demand / in CI). Shared tooling `scripts/pack-tools/` (module registry in modules.mjs). `FoundryData/.../forge-char-creator` is a symlink to repo, so Foundry compacts `packs/` on every boot — gitignore keeps that invisible.

## Commands
- `npm run packs:build [moduleName]` — JSON source → LevelDB for all modules (or one).
- `npm run packs:unpack [moduleName]` — LevelDB → clean JSON source (import only; renames files).
- `npm run content:verify` — boot Foundry + run forge-content functional gate. Run before push.
- `./test.sh` — boot Foundry + run char-creator suite (server lifecycle handled).
- `npm run test` — Playwright char-creator suite only (server already running).
- `./build.sh` — local char-creator zip. CI (release.yml) builds packs then publishes both modules on push to main.

## Caveats (see agents.md)
Foundry init slow — keep generous timeouts. Combat/scene tests can destroy Playwright eval context; runner catches it. Native tests live in `scripts/tests/index.js`, called from `runAll()`.

## Memory dir
`/home/muckelbauer@sinc-intern.de/.claude/projects/-home-muckelbauer-sinc-intern-de-git-forge-char-creator/memory/`
