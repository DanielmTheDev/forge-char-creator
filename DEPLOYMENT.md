# Deploying to The Forge

This guide explains how to get your local changes for **Forge Character Creator** deployed to your active game on The Forge.

## Method 1: Manual Zip Upload (Simplest)

Whenever you make changes locally and want them in your active campaign:

1. **Build the Zip File**:
   Open a terminal in your project directory and run the build script:
   ```bash
   ./build.sh
   ```
   *This will generate `dist/forge-char-creator.zip` without any unnecessary developer files.*

2. **Upload to The Forge**:
   - Log into your account at [forge-vtt.com](https://forge-vtt.com).
   - Go to your **My Foundry** page.
   - Click the green **Import Wizard** button.
   - Select the `dist/forge-char-creator.zip` file.
   - The Forge will automatically detect it as a module and install it to your Game Data.

3. **Restart the World**:
   Go to your module settings inside Foundry VTT and ensure it is activated. Refresh your game instance (Ctrl+F5) to ensure the newly uploaded files are loaded by the browsers of your players.

---

## Method 2: Manifest URL (auto-updates — recommended)

Install each module once in The Forge (**Install Module** → paste manifest URL):

| Module | Manifest URL |
|---|---|
| Forge Character Creator | `https://github.com/DanielmTheDev/forge-char-creator/releases/download/forge-char-creator-latest/module.json` |
| Forge Content | `https://github.com/DanielmTheDev/forge-char-creator/releases/download/forge-content-latest/module.json` |

After that, pushing to `main` is the whole release process. CI (`.github/workflows/release.yml`):

1. **Gate** — `test:unit`, `content:unit`, `packs:build` (node only; the Foundry gate `content:verify` stays local). A failure blocks the release.
2. **Plan** (`scripts/release/plan.mjs`) — a module is released only if its files changed since its last tag `<id>-v<x.y.z>`. Next version = last tag + 1 patch, or the `version` in its `module.json` if that is higher.
3. **Release** — immutable GitHub release `<id>-v<version>` (zip + module.json, installable forever), then the rolling `<id>-latest` release is refreshed with the same files. That is what the manifest URL points at.
4. **Content sync** — resolved docs + assets are pushed to the `content-dist` branch (only when they changed); `forge-content/scripts/sync.mjs` reads it on world load.

Nothing is committed back to `main`, so pushes never need a rebase.

- **Minor/major bump**: raise `version` in that `module.json` by hand (e.g. `1.4.7` → `1.5.0`) and push.
- **Roll back**: in Foundry, uninstall and install from the old release's manifest: `.../releases/download/<id>-v<version>/module.json`.
- **Re-run a release**: Actions → "Build and Release Foundry Module" → Run workflow.
