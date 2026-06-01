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
Version drift (pin dnd5e 5.2.0 / midi 13.0.63, re-test on bump) · combinatorial interaction gaps · manual-click paths uncovered · async hook flakiness.

## Roadmap (build in order, spec each separately)
- **A. Content pipeline** — JSON source dir → `npm run pack`/`unpack` round-trip. FOUNDATION. ← current
- **B. Functional test gate** — per-document T2/T3 generator wired into test.sh.
- **C. Publish automation** — push → CI build + release → Forge auto-update.
- **D. Image → statblock** — vision → structured def → feeds A. Last; highest risk, gated by B.

## Task list
See `TODO.md` — running checklist + tracked bugs + decisions log. Keep it updated.

## Commands
- `./test.sh` — boot Foundry + run full suite (handles server lifecycle).
- `npm run test` — Playwright only (server already running).
- `./build.sh` — zip char-creator for Forge upload. (forge-content build TBD in C.)

## Caveats (see agents.md)
Foundry init slow — keep generous timeouts. Combat/scene tests can destroy Playwright eval context; runner catches it. Native tests live in `scripts/tests/index.js`, called from `runAll()`.

## Memory dir
`/home/muckelbauer@sinc-intern.de/.claude/projects/-home-muckelbauer-sinc-intern-de-git-forge-char-creator/memory/`
