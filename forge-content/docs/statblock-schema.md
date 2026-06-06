# Statblock → Actor JSON schema (Roadmap D, Iter 1)

Canonical contract for the actor JSON the **image → statblock** step emits into
`forge-content/src/packs/forge-npcs/<slug>.json`. The vision skill
(`.claude/skills/forge-image-statblock/`) follows this; `statblock-validate.mjs`
enforces it. The build pipeline (`resolveActorAbilities` → `injectKeys` → LevelDB)
consumes it unchanged — D is only a front-end onto existing actor authoring.

## Shape

```json
{
  "_id": "<genId(slug)>",
  "name": "Goblin Boss",
  "type": "npc",
  "img": "icons/creatures/mammals/humanoid-wolf-dog-blue.webp",
  "system": {
    "abilities": {
      "str": { "value": 10 }, "dex": { "value": 14 }, "con": { "value": 10 },
      "int": { "value": 10 }, "wis": { "value": 8 },  "cha": { "value": 10 }
    },
    "attributes": {
      "hp": { "value": 21, "max": 21, "formula": "" },
      "ac": { "calc": "flat", "flat": 17 }
    },
    "details": { "cr": 1, "type": { "value": "humanoid" } }
  },
  "items": [],
  "abilities": ["searing-bolt", { "ability": "searing-bolt", "name": "Scorch", "set": { "dmg": "12", "range": 60 } }],
  "effects": [],
  "flags": {},
  "folder": null
}
```

## Field rules

| Field | Rule |
|-------|------|
| `_id` | EXACTLY `genId(slug)` (from `scripts/pack-tools/keys.mjs`). `slug` = the file stem. Deterministic, 16 alphanumeric chars. |
| `name` | Display name from the statblock. Non-empty. |
| `type` | Always `"npc"`. |
| `img` | Portrait. Either a Foundry **core** icon (`icons/...`, must exist in the install) OR a committed module asset (`modules/forge-content/assets/tokens/<slug>.png`, must exist in repo). When the source image is the creature itself, save it as a module asset and use it here. |
| `prototypeToken.texture.src` | Optional. Token art. Same path rules as `img`; set to the same module-asset path so the placed token shows the creature. |
| `prototypeToken.ring` | When the token is a rectangular creature image, enable the Dynamic Token Ring so it frames cleanly: `{ "enabled": true, "subject": { "scale": 1 } }`. Foundry uses `texture.src` as the ring subject. Leave off for square core icons. |
| `system.abilities.{str,dex,con,int,wis,cha}.value` | Integer **3–20**. Read off the statblock's ability scores (the score, NOT the modifier). |
| `system.attributes.hp.{value,max}` | Equal integers (authored NPC = full HP). `formula: ""`. |
| `system.attributes.ac` | `{ "calc": "flat", "flat": <int> }`. Use the statblock's printed AC. |
| `system.details.cr` | Number (0–30; fractions like `0.5` allowed). |
| `system.details.type.value` | Non-empty creature type string (`"humanoid"`, `"giant"`, `"undead"`, …). |
| `abilities` | Array of refs. Each is a `string` identifier OR `{ ability, name?, set }`. **Every `ability` MUST be an existing identifier in `forge-abilities/_CATALOG.json`.** |
| `items`, `effects`, `flags`, `folder` | Always `[]`, `[]`, `{}`, `null`. The build inlines `abilities` refs into `items`. |

## Ability refs

- **String** — `"searing-bolt"`: inline the catalog ability as-is.
- **Object** — `{ "ability": "<id>", "name": "<display>", "img": "<icon>", "set": { "dmg": "12", "dc": "15", "range": 60 } }`:
  - `name` — rename the inlined item.
  - `img` — override the inlined ability's icon (item-level, like name). Give a shared base ability a creature-specific icon. Core-icon path; must exist. NOT under `set`.
  - `set` knobs — **VALUE overrides only**, broadcast to all activities: `dmg` (damage formula, string), `dc` (save DC, string), `range` (ft, number). No other keys.
- Match statblock attacks/actions to the closest catalog identifier by name + description; set knobs from the statblock's numbers where they differ from the base.

## Hard rules (security — non-negotiable, Iter 1)

1. **No new abilities.** Only refs to identifiers already in `_CATALOG.json`. A statblock ability with no catalog match is NOT invented — it goes in `<slug>.STUBS.md` for human authoring.
2. **No macro JS.** Never emit `flags.dae.macro.command` / `flags.midi-qol.onUseMacroName` or any executable string. Generated content must be inert.
3. **No shape knobs.** `set` changes values only; never activity types, targets, or new activities. The base ability's gate-proven mechanic must still hold.
4. **No silent drops.** Unmatched statblock abilities are surfaced in `STUBS.md`, never dropped quietly.

Rationale: TODO.md "image→statblock auto-gen MUST NOT auto-run untrusted generated macros." Iter 1 generates zero executable content; the validator hard-fails any ref outside the catalog, so nothing un-vetted reaches Foundry.

## After emit

1. `node scripts/pack-tools/statblock-validate.mjs forge-content/src/packs/forge-npcs/<slug>.json` → fix until clean.
2. `node scripts/pack-tools/gen-expect.mjs <slug>` → writes `<slug>.expect.json` (T2).
3. **Stop. Human reviews** the actor JSON + STUBS before `npm run packs:build` / commit.
