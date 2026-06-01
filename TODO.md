# forge-content TODO

Simple running list. Check off as done. See CLAUDE.md for full spec.

## Now — Option 2: one-ability spike (bottom-up, scaffold after)
- [x] A0. Author ONE ability as JSON by hand. (Bracers of Defense, +2 AC passive — /tmp/fc-spike/src)
- [x] A1. Compile standalone via foundryvtt-cli into LevelDB pack. Round-trip verified. FINDING: docs need `_key` field (`!items!<id>`, effects `!items.effects!<itemId>.<effectId>`) or CLI silently skips them → A3 scaffold should auto-inject `_key` from `_id`.
- [x] A2. Proved in real Foundry via throwaway probe: doc loads (T1) + passive effect applies (AC +2, T2). Probe deleted. NOTE: playwright 1.60.0 bump required `npx playwright install chromium` once.
- [ ] A3. THEN formalize forge-content scaffold (module.json, src/packs/, npm pack/unpack scripts) around what we learned. Must auto-inject `_key` from `_id` at pack time.
- [ ] A4. Migrate existing packs → JSON source; gitignore `packs/`; regen via `npm run pack`. (kills binary churn + junk docs)

## Roadmap (after A)
- [ ] B. Functional test gate (T0-T3) wired into test.sh; nothing publishes until green.
- [ ] C. Publish automation: push → CI build + release → Forge auto-update.
- [ ] D. Image → statblock (vision → JSON → pipeline A). Last, highest risk.

## Bugs found (fix later, tracked)
- [ ] **Pack test residue**: 6 `Overtime_Poison_E2E_*` junk docs committed in forge-features pack. E2E tests write into the real pack → source of git churn. Fix: tests use throwaway/temp pack or clean up after. (found 2026-06-01)
- [ ] **`[object Object]` description**: Fire_Aura effect `description` serialized to literal `"[object Object]"`. Serialization bug in authoring path. (found 2026-06-01)

## Decisions log
- 2026-06-01: New `forge-content` module, same repo. JSON source → foundryvtt-cli compile → LevelDB packs. Stop committing binary .ldb diffs.
