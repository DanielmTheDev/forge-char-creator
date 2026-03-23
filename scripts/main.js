import { ForgeCharCreatorSettings } from "./data.js";
import { CharCreatorApp } from "./app.js";
import { EffectCreatorApp } from "./effect-creator.js";
import { ForgeHubApp } from "./forge-hub.js";

// Global instances for direct access
let charCreatorInstance = null;
let effectCreatorInstance = null;

Hooks.once("init", () => {
  console.log("Forge Character Creator | Initializing");

  game.settings.register("forge-char-creator", "wizardSettings", {
    name: "Wizard Settings",
    hint: "Configure the Forge Character Creator wizard.",
    scope: "world",
    config: true,
    type: ForgeCharCreatorSettings,
    default: {}
  });
});

Hooks.once("ready", () => {
  console.log("Forge Character Creator | Ready");
  if (ui.controls) ui.controls.initialize();
});

// ── Global Hub UI & Omni-Search Hooks ────────────────────────────────────────

// 1. Native V12 Command Palette / Keybind integration
Hooks.once("init", () => {
  game.keybindings.register("forge-char-creator", "openHub", {
    name: "Open Forge Hub",
    hint: "Launch the centralized Forge creator dashboard.",
    editable: [{ key: "KeyF", modifiers: ["Alt"] }],
    onDown: () => { new ForgeHubApp().render({ force: true }); },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
});

// 2. Global Scene Controls (Floating Icon on left)
Hooks.on("getSceneControlButtons", (controls) => {
  if (!Array.isArray(controls)) return;
  const tokenControls = controls.find(c => c.name === "token");
  if (tokenControls && game?.user?.isGM) {
    tokenControls.tools.push({
      name: "forge-hub",
      title: "The Forge Hub",
      icon: "fas fa-hammer",
      button: true,
      onClick: () => { new ForgeHubApp().render({ force: true }); }
    });
  }
});

// 3. Third-party Omnisearch support (e.g., Spotlight Omnisearch)
Hooks.on("omnisearch", (api) => {
  api.addAction({
    name: "Forge Character & Effect Creator",
    icon: '<i class="fas fa-hammer"></i>',
    callback: () => { new ForgeHubApp().render({ force: true }); }
  });
});

// ── Test Suite (Development Only) ──────────────────────────────────────────────
import("./tests/index.js").catch(() => {
  // Silent fail in production where tests are excluded from the build zip.
});
