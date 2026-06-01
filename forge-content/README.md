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

## Commands (run from repo root)
- `npm run content:pack` — JSON source → LevelDB. Injects `_key` (`!items!<id>`,
  effects `!items.effects!<docId>.<effId>`) into a staging copy first; source stays key-free.
- `npm run content:unpack` — LevelDB → JSON source. **For IMPORTING external/legacy packs
  into fresh source only.** It names files `<Name>_<id>.json` and will create duplicates
  next to hand-named files — do not run it to "round-trip" already-authored source.

## Conventions
- Source docs: `_id` required, `_key` forbidden (auto-injected).
- New pack? Add its primary collection to `COLLECTION` in `build-packs.mjs`
  (Item pack → `items`; Actor pack → `actors`).

## Distribution
Compiled packs are gitignored, so the GitHub-manifest install needs a CI-built
release artifact (sub-project C). Local zip build compiles first then zips.
