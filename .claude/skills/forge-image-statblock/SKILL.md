---
name: forge-image-statblock
description: Use when the user hands you a D&D5e monster/NPC image (statblock photo or creature art) and wants it turned into a forge-content actor. Reads the image, matches its abilities against the existing forge-abilities CATALOG, and emits an authored actor JSON + an auto-derived T2 gate expect. Roadmap D, Iter 1.
---

# forge-image-statblock — image → forge-content actor

Roadmap D, Iter 1. You (Claude Code) ARE the vision engine — no API, no script. You
Read the image and emit actor JSON onto the existing actor pipeline. The build
(`resolveActorAbilities` → `injectKeys` → LevelDB) and gate (`actorLoadCheck`) carry
it the rest of the way.

**Schema contract:** `forge-content/docs/statblock-schema.md` — read it first; it is the
exact shape you must emit.

## Hard rules (security — never break)

1. **Match catalog only.** Every `abilities[]` ref MUST be an identifier already in
   `forge-content/src/packs/forge-abilities/_CATALOG.json`. Never invent a new ability,
   never author new ability JSON.
2. **No executable content.** Never emit `flags.dae.macro.command`,
   `flags.midi-qol.onUseMacroName`, or any macro/JS string. The actor must be inert.
3. **No shape knobs.** `set` overrides only `dmg`/`dc`/`range` (values), never activity
   types/targets/new activities.
4. **Surface, don't drop.** Statblock abilities with no catalog match go in
   `<slug>.STUBS.md` — never silently omitted.
5. **Stop for review.** Do NOT `npm run packs:build` or commit. Hand off after validate.

## Procedure

1. **Read the image.** Extract: name, CR, creature type, AC, HP, the six ability scores
   (the SCORE, not the modifier), and every named action/trait/attack.

2. **Load the catalog.** `ctx_read` (or Read) `forge-content/src/packs/forge-abilities/_CATALOG.json`.
   For each statblock action, find the closest identifier by name + description. Where the
   statblock's numbers differ from the catalog base, set knobs:
   `{ "ability": "<id>", "name": "<statblock name>", "set": { "dmg": "<formula>", "dc": "<n>", "range": <ft> } }`.
   A plain `"identifier"` string is fine when no override is needed.

   For each action, also pick a fitting ability ICON via the `img` ref field (the base
   ability's icon is often generic/dead). Core-icon path, must exist.

3. **Portrait + token = the creature.** Save the SOURCE image as a module asset:
   `cp <image> forge-content/assets/tokens/<slug>.png` → use it for the actor `img`
   (the sheet portrait can be the full rectangle).
   **The token must be SQUARE** — a rectangular subject gets stretched inside the
   Dynamic Token Ring. Crop a square focused on head + upper body:
   `convert <slug>.png -crop WxW+0+<yoff> +repage <slug>-token.png` (W = the image
   width; pick yoff to frame the head). Point `prototypeToken.texture.src` at the
   `-token.png` and enable the ring:
   `"prototypeToken": { "texture": { "src": "modules/forge-content/assets/tokens/<slug>-token.png" }, "ring": { "enabled": true, "subject": { "scale": 1 } } }`.
   If no usable source image, fall back to a fitting core icon under
   `FoundryVTT-Linux-13.351/resources/app/public/icons/` (verify the path exists) and
   leave the ring off.

4. **Compute `_id`.** `slug` = kebab-case of the name (this is the file stem).
   `_id = genId(slug)`. Get the value:
   `node -e "import('./scripts/pack-tools/keys.mjs').then(m=>console.log(m.genId('<slug>')))"`.

5. **Emit the actor.** Write `forge-content/src/packs/forge-npcs/<slug>.json` per the
   schema doc. `items:[]`, `effects:[]`, `flags:{}`, `folder:null`.

6. **Emit stubs.** Write `forge-content/src/packs/forge-npcs/<slug>.STUBS.md` listing every
   statblock ability with NO catalog match — name + verbatim statblock text — under a
   "needs authoring" heading. If all matched, write a one-line "all abilities matched" note.

7. **Validate.** `npm run content:statblock-validate -- forge-content/src/packs/forge-npcs/<slug>.json`.
   Fix until clean (clean = exit 0).

8. **Generate the gate expect.** `npm run content:gen-expect -- <slug>` (add `--t3` if the
   actor should be combat-proven; that writes a `.scaffold` for a human to fill).

9. **Hand off.** Report: actor file, expect file, STUBS contents (what still needs authoring),
   and the next command (`npm run packs:build forge-content` + `npm run content:verify`).
   Do NOT run them — human reviews first.

## Notes

- Knobs are broadcast to ALL of an ability's activities (resolve-abilities.mjs#applyKnobs).
- `gen-expect` never overwrites an existing expect — safe to re-run.
- T2 expect (hpMax/ac/abilities/hasItems) is auto-derived; T3 damage values are NOT
  knowable without a real run — that's why `--t3` only scaffolds.
