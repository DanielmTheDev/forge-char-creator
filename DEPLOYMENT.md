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

## Method 2: GitHub Integration (Best for Constant Updates)

If you plan to update this module frequently, you can link it directly to a GitHub repository:

1. Push this folder to a public GitHub repository.
2. In The Forge, use the **Install Module** interface and provide the raw URL to your `module.json` file on GitHub:
   `https://raw.githubusercontent.com/YourName/forge-char-creator/main/module.json`
3. Whenever you make local changes, simply commit and push them to GitHub. 
4. In The Forge, navigate to your installed modules and click the **Update** button next to Forge Character Creator to pull the latest changes automatically.
