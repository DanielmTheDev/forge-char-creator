import { ForgeCharCreatorSettings } from "./data.js";
import { CharCreatorApp } from "./app.js";
import { EffectCreatorApp } from "./effect-creator.js";

// Global instances to prevent opening multiples
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
});

// ── Character Wizard — Actor Directory ───────────────────────────────────────
Hooks.on("renderActorDirectory", (app, html, data) => {
  const settings = game.settings.get("forge-char-creator", "wizardSettings");
  if (settings?.enableWizard === false) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("forge-char-creator-btn");
  button.innerHTML = `<i class="fas fa-magic"></i> Forge Creator`;
  button.title = "Launch Forge Character Creator";

  button.addEventListener("click", () => {
    if (!charCreatorInstance) charCreatorInstance = new CharCreatorApp();
    charCreatorInstance.render(true, { focus: true });
  });

  const element = html[0] ?? html;
  const headerActions = element.querySelector(".header-actions.action-buttons")
                     || element.querySelector(".directory-header .action-buttons");
  if (headerActions) headerActions.insertAdjacentElement("beforeend", button);
});

// ── Effect Creator — Item Directory ──────────────────────────────────────────
Hooks.on("renderItemDirectory", (app, html, data) => {
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("forge-effect-creator-btn");
  button.innerHTML = `<i class="fas fa-sparkles"></i> Forge Effect`;
  button.title = "Launch Forge Effect Creator";

  button.addEventListener("click", () => {
    if (!effectCreatorInstance) {
      effectCreatorInstance = new EffectCreatorApp();
      // Expose for internal action lookup
      globalThis._forgeEffectCreatorInstance = effectCreatorInstance;
    }
    effectCreatorInstance.render(true, { focus: true });
  });

  const element = html[0] ?? html;
  const headerActions = element.querySelector(".header-actions.action-buttons")
                     || element.querySelector(".directory-header .action-buttons");
  if (headerActions) headerActions.insertAdjacentElement("beforeend", button);
});
