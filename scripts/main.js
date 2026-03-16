import { ForgeCharCreatorSettings } from "./data.js";
import { CharCreatorApp } from "./app.js";

// Global instance to prevent opening multiples
let charCreatorInstance = null;

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
});

Hooks.on("renderActorDirectory", (app, html, data) => {
  // Check if wizard is enabled in settings before showing button
  const settings = game.settings.get("forge-char-creator", "wizardSettings");
  if (settings?.enableWizard === false) return;

  // Create the button
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("forge-char-creator-btn");
  button.innerHTML = `<i class="fas fa-magic"></i> Forge Creator`;
  button.title = "Launch Forge Character Creator";

  button.addEventListener("click", () => {
    if (!charCreatorInstance) {
      charCreatorInstance = new CharCreatorApp();
    }
    charCreatorInstance.render(true, { focus: true });
  });

  // Inject at the bottom of the directory actions (next to Create Actor)
  const element = html[0] ?? html;
  const headerActions = element.querySelector(".header-actions.action-buttons") || element.querySelector(".directory-header .action-buttons");
  if (headerActions) {
    headerActions.insertAdjacentElement("beforeend", button);
  }
});
