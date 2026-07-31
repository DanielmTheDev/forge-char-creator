# Eglath Ashlung — not automated / decisions

Source: vault note `Generated Characters/2026-07-31 1255 - Eglath Ashlung.md`.

## User decisions (asked before authoring)

| Statblock piece | Decision |
|---|---|
| **Hauler's Heave** (at-will, 10 ft, no save, push 10 ft, no damage) | **Description-only item.** Foundry has no forced-movement mechanic; the push was never automatable. Ships as the inert feat `haulers-heave` — icon + full text on the sheet, zero activities, no roll, no effect. GM moves the token. |
| **exhausted, starved** | **Biography note only** — no `system.attributes.exhaustion`, nothing to toggle or expire. Rider text says: disadvantage on STR & CON checks and saves. |
| **Compendium folder** | new `forge-npcs/_folders.json` folder **"Dhul Maldur"** (`folderdhulmaldur`). Required unblocking `statblock-validate.mjs` (it hard-failed any non-null actor `folder`); non-null is now legal when the id is declared in the pack's `_folders.json`. |

## Manual / not automated

- **Powerful Build** — one size larger for carrying capacity. Sheet note only (the statblock already marked it manual).
- **Hauler's Heave push** — GM drags the token 10 ft directly away. No roll, no chat automation.
- **"Will not fight if he can run"** — RP/tactics, biography note.
- **Printed DC 12 is unused.** The only save-shaped ability (Heave) has no save, so nothing on the sheet consumes it. Kept out of the JSON rather than faked onto an activity.

## Gate coverage

- Actor: **T3** — `load` block asserts HP 22 / AC 12 / all six scores / both items, then the authored NPC casts its own Snapped Haul-Chain in a real midi combat (forced hit) → `hpDeltaMin -14 / hpDeltaMax -3` (crit-tolerant for 1d6+2).
- `haulers-heave`: **T2 inert proof only** — the item embeds on an actor and changes nothing (no effect, no HP, no AC). That is the whole mechanic; there is nothing else to assert. Attack/damage behaviour is proven once by `example-strike`'s own expect.
- Attack bonus is derived, not authored: STR 14 (+2) + CR 1/8 proficiency (+2) = **+4**, matching the printed statblock.
