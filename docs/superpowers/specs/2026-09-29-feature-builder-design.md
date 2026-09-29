# Feature Builder — design (2026-09-29)

## Goal
During character creation, author statblock-style features: **attack (+X to hit) → damage → on hit, saving throw → on fail conditions / damage / effect**. Plus: keyboard-driven navigation, tooltips/explanations, nicer icon selection. All tested.

## Decisions (user-approved)
- **One builder**, not two. Effects and features are the same authoring flow: an AE = *what happens*, a feature = item that *delivers* it. Evolve `EffectCreatorApp` (keeps id `forge-effect-creator-app` and entry points: Forge Hub, char wizard "Create New"). "Effect only" = an output kind, not a separate app.
- **To-hit**: flat `+X` default (statblock style); toggle to derived (ability + proficiency + extra bonus).
- **Navigation**: steps + shortcuts, for builder AND char wizard.
- **Icons**: searchable grid over Foundry core `icons/`, name-based suggestions, file picker fallback.
- **Storage**: feature saved to `forge-features` compendium AND embedded on the new actor (unchanged behavior).

## Architecture
| Unit | Purpose | Depends on |
|---|---|---|
| `scripts/feature-payload.js` | Pure `buildFeature(state, cfg) → { itemData }` and `summarize(state) → string`. No DOM, no Foundry globals; `cfg = { randomID, areaTargetTypes }` injected. | nothing |
| `scripts/effect-creator.js` | UI only: state binding, step visibility, calls `buildFeature`, saves to pack. | payload, stepper, icon-picker |
| `scripts/ui/stepper.js` | `attachStepper(root, { steps, onCreate })`: step sidebar, show/hide panes, keyboard shortcuts, focus management, footer hints. | DOM only |
| `scripts/ui/icon-picker.js` | `IconPickerApp` (ApplicationV2): indexes `icons/` once per session (`FilePicker.browse` recursive), search + suggestions, arrow/Enter pick, resolves a Promise with the path. `suggestTerms(name, damageType)` pure. | Foundry FilePicker |
| `scripts/app.js` | Char wizard: split into steps via stepper; "Create New" opens builder. | stepper, builder |

Tooltips: Foundry native `data-tooltip` on every label/field with a short plain-English explanation.

## Builder state & kinds
`state.kind` ∈ `attack | save | buff | passive | effect` replaces `wrapInFeature` + `wrapType`. Mapping from old:
- `effect` → old `wrapInFeature:false` (bare AE item `[AE] name` → `forge-effects`).
- `passive` → feature, no activity, AE `transfer:true`.
- `buff` → feature + utility activity applying AE (self or targets); sub-option Temp HP → heal activity with `healing.types:["temphp"]` (BUG-4 behavior preserved).
- `save` → feature + save activity (damage rows, onSave, AE on fail).
- `attack` → feature + attack activity (+ optional on-hit save rider).
- Old "Midi Damage" (auto damage, no roll to hit/save) → sub-option of `save` kind: **"No save (auto damage)"** → `damage` activity.
- Old "Just Apply" → `buff`.

Locked mode (`isLocked`, from char wizard) forbids kind `effect`.

## Steps (visible per kind)
1. **Basics** (all): name, icon (+picker), description (auto-summary if blank), activation (action/bonus/reaction/none; hidden for passive/effect), uses: at-will / X per long rest / Recharge N–6.
2. **Attack** (attack): melee/ranged, reach/range ft, to-hit mode flat/derived; flat `+X`; derived ability + extra bonus; targets count; damage rows `[formula, type]` (≥0, add/remove).
3. **Save** (save; attack with "On hit: saving throw" checked): ability, DC (number or `spell` → spellcasting calc), fail damage rows, on success half/none; or "No save (auto damage)" for save kind.
4. **Effects** (all except when nothing to apply): existing sections — conditions, duration rounds, expires (special duration), OverTime (repeat save / DoT), adv/dis rows, AC/ability mods, stacking; apply-to self/targets for buff.
5. **Review** (all): summary line, raw JSON preview, Create button.

## Midi / dnd5e payload rules (dnd5e 5.2.5, midi 13.0.63)
- Everything activity-level lives on the activity (FeatData drops item-level activation/damage/save — BUG-4 lesson).
- All ids 16 alphanumeric (`randomID(16)`).
- **Attack**: `type:"attack"`, `attack.type.value` melee|ranged, `classification:"weapon"`, `range`, `target.affects`, damage parts from rows (`custom.enabled`, formula, `types:[t]`). Flat: `attack.flat:true, attack.bonus:"<X>"`. Derived: `attack.flat:false, attack.ability:<a>, attack.bonus:"<extra>"`.
- **Attack + rider**: attack activity has NO effects and `otherActivityId:<saveActId>`; save activity `midiProperties.automationOnly:true`, `save.ability:[a]`, `save.dc`, fail damage parts, `damage.onSave` half|none, `effects:[{_id: aeId}]`. Midi auto-rolls the other activity's save on hit targets only.
- **Attack, no rider**: AE (if any) on the attack activity → applied on hit.
- **Save**: as above but top-level (no automationOnly). No-save variant → `type:"damage"`.
- **Uses**: X/long rest → `uses:{max:"X", recovery:[{period:"lr", type:"recoverAll"}]}`; Recharge N → `uses:{max:"1", recovery:[{period:"recharge", formula:"N"}]}`. Primary activity gets `consumption.targets:[{type:"itemUses", target:"", value:"1"}]` (without it recharge is a no-op).

## Keyboard map (stepper)
`Alt+→` / `Alt+←` next/prev step (not Ctrl+arrow: collides with word-jump in text fields) · `Alt+1..9` jump to step · `Ctrl+Enter` create · `Esc` closes open popup (search dropdown, icon picker) before anything else. Entering a step focuses its first field. Steps also clickable in sidebar. Footer shows hints. Hidden steps skipped by next/prev and by numbering.

Char wizard steps: **Identity** (name, level, archetype, portrait, size, disposition) · **Stats** (AC, HP, abilities, spellcasting) · **Features** (search, Create New, selected bin) · **Token** (aura, link actor data). `Ctrl+Enter` = Create from any step.

## Icon picker
- Index: recursive `FilePicker.browse("public", "icons")` → flat list of image paths, cached in module-level variable for the session; loading indicator on first open.
- Search: case-insensitive, all words must match path; results capped (200), lazy `<img loading="lazy">`.
- Suggestions (empty query): `suggestTerms(name, damageType)` → keyword map (e.g. bite→fang/bite, claw→claw, fire→fire, poison→poison, sword→sword, arrow/bow→arrow…) + name words; union of matches shown first.
- Keys: type to search, arrows move in grid, Enter picks, Esc cancels. "Browse files…" opens core FilePicker.

## Testing
- **Node unit** `scripts/feature-payload.test.mjs` (added to a new `npm run unit` + `content:unit` glob): each kind's shape; flat vs derived; damage rows; rider chain (`otherActivityId` equals save act id, automationOnly, attack has no effects, save has AE); uses/recharge + consumption; 16-char ids; summary text.
- **T0 native** (`scripts/tests/index.js`): payload through UI for attack+rider; existing tests migrated to `kind`.
- **T3 Playwright** `tests/attack-save.spec.js`: build via UI → real midi workflow, forced hit (flat +50 / AC rig), flat damage → HP delta exact; forced failed save → condition + fail damage; forced success → half/none, no condition; no-hit → nothing.
- **Playwright** `tests/keyboard-nav.spec.js` (builder + char wizard shortcuts, focus), `tests/icon-picker.spec.js` (index, search, keys, pick sets img), char wizard "Create New" → actor has item.
- Pre-existing reds (Omega combat hang, overtime.spec `pack.deleteDocument`, search-descriptions refetch count) are listed, not hidden; not in scope unless they block.

## Increments (each: tests green → commit)
1. Extract pure payload module + unit tests; no behavior change.
2. `kind` state + attack/save model (to-hit, damage rows, rider chain, uses/recharge) + T0 + T3 E2E.
3. Step layout + kind-driven visibility + tooltips + summary (builder).
4. Stepper keyboard (builder, then char wizard) + spec.
5. Icon picker + spec.
6. Char wizard integration pass, TODO.md/README update.

## Out of scope
Multiple attacks per feature (multiattack), ammo, spell-slot scaling, reactions auto-triggers, standalone forge-content JSON export from the builder.
