# forge-content TODO

Simple running list. Check off as done. See CLAUDE.md for full spec.

## Now
- [ ] A. Scaffold forge-content module: module.json + src/packs/<pack>/ JSON source + `npm run pack`/`unpack` scripts.
- [ ] A. Author first ability as JSON, compile into loadable pack (no tests yet — prove author→compile→loads).

## Roadmap (after A)
- [ ] B. Functional test gate (T0-T3) wired into test.sh; nothing publishes until green.
- [ ] C. Publish automation: push → CI build + release → Forge auto-update.
- [ ] D. Image → statblock (vision → JSON → pipeline A). Last, highest risk.

## Bugs found (fix later, tracked)
- [ ] **Pack test residue**: 6 `Overtime_Poison_E2E_*` junk docs committed in forge-features pack. E2E tests write into the real pack → source of git churn. Fix: tests use throwaway/temp pack or clean up after. (found 2026-06-01)
- [ ] **`[object Object]` description**: Fire_Aura effect `description` serialized to literal `"[object Object]"`. Serialization bug in authoring path. (found 2026-06-01)

## Decisions log
- 2026-06-01: New `forge-content` module, same repo. JSON source → foundryvtt-cli compile → LevelDB packs. Stop committing binary .ldb diffs.
