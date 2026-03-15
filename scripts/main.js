import { ForgeCharCreatorSettings } from "./data.js";
import { CharCreatorApp } from "./app.js";

Hooks.once("init", () => {
  console.log("Forge Character Creator | Initializing");

  // Register Settings Data Model
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
  
  // Optionally open the app for testing
  // new CharCreatorApp().render(true);
});
