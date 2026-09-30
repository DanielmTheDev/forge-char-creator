# Forge Character Creator

A GM toolkit for **Foundry VTT V13** and the **D&D 5e** system that speeds up building NPCs and
active effects. Author advanced NPCs from auto-scaling archetypes and craft Midi-QOL / DAE active
effects through a guided wizard — no hand-editing flag JSON.

> Needs the D&D5e system. Midi-QOL and DAE are strongly recommended — the character wizard and
> basic effects work without them, but advanced effect features (over-time damage/saves,
> advantage/disadvantage, stacking) only apply when they are active. See [Requirements](#requirements).

<!-- SCREENSHOTS: add images here before publishing. Suggested:
     1. The Forge Hub launcher (Alt+F / hammer button)
     2. Effect Creator wizard mid-build
     3. Character Creator generating an NPC
     Place files under assets/ and reference them, e.g.:
     ![Forge Hub](assets/screenshot-hub.png)
-->

## Features

- **Forge Hub** — a central launcher for the tools. Open it with **Alt+F** or the floating hammer
  button (GM only). Pick a tool to begin.
- **Character Creator** — generate advanced NPCs with auto-scaling archetypes, pulling matching
  items from your compendia. **Create New** builds a custom attack/ability right inside the wizard;
  it is added to the creature on Create.
- **Feature Builder** (the Effect Creator) — one wizard for everything a creature can do. Pick what
  it is, and only the relevant steps show:
  - **Attack** — fixed `+X to hit` (statblock style) or calculated (ability + proficiency + bonus),
    reach/range, one damage row per type, and optionally **on hit: saving throw** (ability, DC,
    damage on a failure, half/none on a success) with conditions/effects applied on a failed save.
  - **Saving Throw** — area or targeted save with damage + effects, or auto damage with no save.
  - **Buff / Heal** — apply an effect to self or targets, or grant temporary HP.
  - **Passive** — always-on effect (AC, advantage, resistances…).
  - **Effect only** — a bare Active Effect to drag onto other items.

  Uses: at will, X per long rest, or Recharge N–6. Effects: conditions, duration, repeat saves /
  damage over time, advantage/disadvantage, AC/ability modifiers, stacking. Every field has a
  tooltip, the Review step shows a plain-English summary, and the icon button opens a **searchable
  icon grid** with suggestions from the feature's name. Emits the correct **Midi-QOL** and **DAE**
  flags. Results save into the module's **Forge Effects** / **Forge Features** compendia.

### Keyboard

Both wizards are split into steps:

| Keys | Action |
|---|---|
| `Alt+Shift+←` / `Alt+Shift+→` | previous / next step |
| `Alt+Shift+1` … `Alt+Shift+9` | jump to a step |
| `Ctrl+Enter` | create |
| `Esc` | close the search list / icon picker |

In the icon picker: type to search, `↓` into the grid, arrows to move, `Enter` to pick.

## Requirements

| | |
|---|---|
| Foundry VTT | V13 (verified 13.351) |
| Game system | [D&D 5e](https://github.com/foundryvtt/dnd5e) |
| Recommended modules | [Midi-QOL](https://gitlab.com/tposney/midi-qol), [DAE (Dynamic Active Effects)](https://gitlab.com/tposney/dae), [lib-wrapper](https://github.com/ruipin/fvtt-lib-wrapper), [socketlib](https://github.com/manuelVo/foundryvtt-socketlib) |

The Effect Creator writes Midi-QOL and DAE flags. The module activates without them and the
character wizard works fully, but effects that use those flags only take effect when Midi-QOL and
DAE (plus their prerequisites lib-wrapper + socketlib) are installed and active. They are declared
as recommended dependencies in the manifest.

## Installation

In Foundry: **Add-on Modules → Install Module**, paste the manifest URL:

```
https://raw.githubusercontent.com/DanielmTheDev/forge-char-creator/main/module.json
```

Enable **Forge Character Creator** in your world's module settings (along with the required modules
above).

## Usage

1. As GM, press **Alt+F** or click the floating hammer button to open the Forge Hub.
2. Choose **Character Creator** to build an NPC, or **Effect Creator** to build a feature or effect.
3. Effects you create are stored in the **Forge Effects** / **Forge Features** compendia — drag
   them onto actors from there.

## License

[MIT](LICENSE) © 2026 Daniel Muckelbauer
