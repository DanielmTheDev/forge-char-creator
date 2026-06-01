# forge-content

Content-as-code Foundry V13 / dnd5e module. Abilities/items (later NPCs/bosses)
authored as JSON, compiled to LevelDB compendium packs.

## Layout
- `module.json` — module manifest (packs declared here).
- `src/packs/<pack>/*.json` — **source of truth** (committed). One doc per file.
- `packs/<pack>/` — compiled LevelDB. **gitignored build artifact** — never edit, never commit.

## Author → compile loop
1. Write a doc JSON in `src/packs/forge-abilities/`. Must have a stable 16-char `_id`
   (and each embedded effect its own `_id`). Do NOT write `_key` — it's auto-injected.
2. `npm run content:pack` → compiles all packs into `packs/<pack>/`.
3. Install/refresh in Foundry → item available in the compendium.

## Commands (run from repo root; shared tooling in scripts/pack-tools/)
- `npm run packs:build [forge-content]` — JSON source → LevelDB for all modules (or one).
  Injects `_key` (`!items!<id>`, effects `!items.effects!<docId>.<effId>`) into a staging
  copy first; source stays key-free.
- `npm run packs:unpack [forge-content]` — LevelDB → JSON source. **For IMPORTING external/
  legacy packs into fresh source only.** Names files `<Name>_<id>.json` and will duplicate
  hand-named files — do not run it to "round-trip" already-authored source.

## Verify before publish
- `npm run content:verify` — boots local Foundry, applies each ability on a throwaway
  actor, asserts its co-located `<name>.expect.json`. **Run before pushing** (push→publish).
- Each ability MUST have `<name>.expect.json` or the gate fails it as untested:
  `{ "tier": "T2-apply", "actor": {"type":"npc"}, "assert": { "acDelta": 2 } }`
  Supported asserts: `acDelta`, `abilityDelta: {ability, delta}`, `effectApplied: "<name>"`.
  (`*.expect.json` is excluded from packs — it's test data, not a document.)

## Conventions
- Source docs: `_id` required, `_key` forbidden (auto-injected).
- New pack? Add its primary collection to `COLLECTION` in `build-packs.mjs`
  (Item pack → `items`; Actor pack → `actors`).
- Every ability ships with a `<name>.expect.json` functional check.

## Distribution
Compiled packs are gitignored, so the GitHub-manifest install needs a CI-built
release artifact (sub-project C). Local zip build compiles first then zips.
