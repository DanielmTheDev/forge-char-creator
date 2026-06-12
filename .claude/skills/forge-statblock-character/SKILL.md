---
name: forge-statblock-character
description: Use when the user hands a D&D5e character/NPC statblock (Format A vault note, pasted text, or vault note path) — with or without a portrait image — and wants it built into a forge-content actor, gate-tested and published. Supersedes forge-image-statblock for anything that has a statblock.
---

# forge-statblock-character — statblock → published forge-content actor

End-to-end: vault note / statblock text → triage → gate-proven abilities →
actor + token → full gate → push (runtime sync delivers it; user only reloads
the world). You author NEW abilities here (unlike forge-image-statblock's
catalog-only rule) — every one ships with a `.expect.json` and must go gate-green.

Input usually comes from the vault skill `creating-characters`
(`<vault>/Generated Characters/YYYY-MM-DD HHmm - <Name>.md`, Format A statblock
in a code block + 🖼️ portrait prompt). Vault path: see memory `campaign-vault`.

## Procedure

1. **Read the statblock** (vault note path or pasted). Pull linked `[[lore]]`
   notes only if flavor is unclear. Extract: name, AC/HP/Spd/DC/atk, traits,
   every CUSTOM / IMPROVISED / BUILT-IN ability.

2. **Triage — then ASK (mandatory, user rule).** Sort every piece into:
   - *automatable* — maps to an archetype below;
   - *sheet data* — scores, resistances (`system.traits.dr.value`), darkvision
     (`attributes.senses`), speed (`attributes.movement.walk`), skill profs;
   - *needs-decision* — conditional riders ("next save disadv"), situational
     advantages (adv vs charm/poison), flavor (area light, terrain), triggers
     ("when bloodied"). Present the table via AskUserQuestion and let the user
     pick model / simplify / note for each. Do NOT decide unilaterally.
   - Statblock missing ability scores → derive from atk/DC (atk = prof(+2 at
     lvl≤4) + mod; DC custom-flat anyway), say they're invented.

3. **Author abilities from the gate-proven exemplars** (all in
   `forge-content/src/packs/forge-abilities/`, each with its expect next to it):

   | Archetype | Exemplar | Notes |
   |---|---|---|
   | attack + damage | `example-strike.json` | reskin via actor ref knobs when only dmg/range differ — no new file |
   | attack + condition on hit | `writhing-lash.json` | effect with `statuses:[...]`, no duration = until removed |
   | save + damage + condition | `emberlight.json`, `drop-the-prop.json` | `damage.onSave: none/half`; effect ref `{_id, onSave:false}` |
   | multi-target save | `drop-the-prop.json` | `target.count: "N"` + explicit targets — NEVER template AoE |
   | self/ally buff | `unshaped-surge.json` | MUST use ally-target shape; effect changes for AC/resist/advantage |
   | X/day or limited uses | `emberlight.json` | `uses{max,recovery:[{period:"day"}]}` + `consumption.targets itemUses` — without consumption uses are a NO-OP |
   | expanded crit | `vicious-pick.json` | `attack.critical.threshold: N` |

   **Vanilla 5e SPELLS are NEVER modeled as forge abilities** (user rule
   2026-06-11) — the pipeline attaches the real dnd5e compendium spells (2024
   PHB `dnd5e.spells24` preferred, SRD `dnd5e.spells` fallback) automatically.
   Author them on the actor instead:
   ```json
   "spellcasting": { "ability": "cha", "level": 3, "slots": { "1": 2 } },
   "spells": ["Sacred Flame", "Light", "Guiding Bolt", "Healing Word"]
   ```
   Exact vanilla spelling required. New names: `npm run spells:resolve` (Foundry
   server must be STOPPED — LevelDB lock) writes the committed cache at
   `forge-content/src/spell-cache/`; build/dist/gate resolve from the cache (CI
   has no Foundry). `spellcasting` sets sheet ability/caster level/slots;
   cantrips scale off caster level. Slot consumption is NOT gate-assertable —
   note it in STUBS. A T3 actor expect can `castOwn` a spell by its dnd5e
   identifier (e.g. `guiding-bolt`) and keep T2 stat asserts via a `load` block.

   Rules: every `_id` (doc + activity-map key + effect) EXACTLY 16 alnum chars;
   doc `_id = genId(slug)` (`node -e "import('./scripts/pack-tools/keys.mjs').then(m=>console.log(m.genId('<slug>')))"`);
   concise `system.description.value` the user reads at a glance — manual
   riders and manual triggers stated IN the description; verified core icon
   (`FoundryVTT-Linux-13.351/resources/app/public/icons/`); NO recharge-roll
   mechanics for new content (vault skill bans them; use at-will / X-day).

4. **Write `.expect.json` per new ability** — copy the exemplar's expect.
   Forces vocab: `{attack: "hit"|"miss"}`, `{save: "fail"|"success"}`,
   `{advantage|disadvantage|grantAdvantage|grantDisadvantage: true}`,
   `{recharge: "success"|"fail"}`. Dice damage → `hpDeltaMin/Max` (crit-tolerant:
   double the dice for max). Conditions → `conditionApplied: "<status-id>"`,
   effects by name → `effectApplied`/`effectAbsent`. Uses → `usesSpent`.

5. **Gate gotchas (every one cost a debug cycle once — don't repeat):**
   - True `self` target type SKIPS midi effect application → ally shape.
   - Gate actor spec with `ac:` = flat calc → `ac.bonus` invisible; OMIT `ac`
     on the actor whose `acDelta` you assert (forced hits ignore AC anyway).
   - Template AoEs abort headless; explicit `targets:[...]` + `expectTargets`.
   - `critical.threshold` is settable but NOT gate-assertable — note in STUBS.
   - Resist-all works: effect change `system.traits.dr.all` mode 0 value "1";
     prove via forced flat-dmg hit halved.
   - Bounded-duration effects expire only with Times-Up (active in test world).
   - An ACTIVE world scene breaks T3 determinism — content.spec handles it; do
     not "fix" a red run by deactivating scenes manually.

6. **Scoped gate per ability:** `npm run content:verify -- <name-substring>`
   (~40s each). Comma-separate to scope a SET in one run (matches ANY part,
   case-insensitive): `npm run content:verify -- caelnor,nine,thord`. Iterate
   to green BEFORE building the actor. Full run still required before push.

7. **Token assets.** Image normally already exists next to the vault note at
   `<vault>/Generated Characters/img/<slug>.png` (vault skill generates it).
   `node scripts/pack-tools/tokenize.mjs <image> <slug> [--yoff N|--xoff N]`
   → portrait + circle-masked `-token.png` + `/tmp/thumb-<slug>-token.png`
   (Read it — verify head framing). No image but a 🖼️ prompt?
   `node scripts/pack-tools/portrait.mjs <prompt.txt|-> <out.png>` (needs
   `GEMINI_API_KEY` env — user's ~/.zshrc; if unset, ask user) then tokenize.
   No image at all → fitting core icon, ring off.

8. **Actor JSON** (`forge-content/src/packs/forge-npcs/<slug>.json`): schema
   per `forge-content/docs/statblock-schema.md`; ability refs = identifiers or
   `{ability, name, img, set:{dmg|dc|range}}` (VALUE knobs only — anything
   shape-different is a new ability file); ring block
   `{enabled:true, subject:{scale:0.75}}` (1.0/0.85 hide the rim);
   biography carries ALL manual riders. Then:
   - `<slug>.STUBS.md` — what is NOT automated + user decisions + invented stats.
   - `npm run content:gen-expect -- <slug>` (T2).
   - `npm run packs:build forge-content`.

9. **Full gate → publish:** `npm run content:verify` (full, must be 100%
   green) → `npm run content:dist` → commit → `git pull --rebase` → push (CI
   publishes; sync delivers). Tell the user: reload world, drag from compendium
   (re-drag if replacing). Never push on a red gate.

## Common mistakes

| Mistake | Fix |
|---|---|
| Deciding rider handling yourself | Step 2 ask is mandatory (user rule 2026-06-11) |
| New ability when only numbers differ | Use a knobbed `example-strike`/exemplar ref |
| `uses` without `consumption` | Recharge/X-day silently no-ops — gate with `usesSpent` |
| Asserting exact hpDelta on dice formulas | `hpDeltaMin/Max`, crit-tolerant |
| Opaque square token art | tokenize.mjs masks it; scale 0.75 — else ring invisible |
| Skipping full gate before push | Push = publish (CI is ungated by design) |
