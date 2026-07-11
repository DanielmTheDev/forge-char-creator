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
  items from your compendia.
- **Effect Creator** — build Active Effects through a wizard: conditions, ability/AC changes,
  duration, and over-time damage/saves. Emits the correct **Midi-QOL** (`OverTime`, grants,
  advantage/disadvantage) and **DAE** flags for you, with quick presets (Burning, Poisoned, …).
  Optionally "wrap in feature" to produce a dnd5e Feature Item with the effect embedded. Results
  save into the module's **Forge Effects** / **Forge Features** compendia.

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
2. Choose **Character Creator** to build an NPC, or **Effect Creator** to build an active effect.
3. Effects you create are stored in the **Forge Effects** / **Forge Features** compendia — drag
   them onto actors from there.

## License

[MIT](LICENSE) © 2026 Daniel Muckelbauer
