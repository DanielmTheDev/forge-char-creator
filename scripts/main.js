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

// 2. Global Floating Action Button (Universal Compatibility)
import("./forge-hub.js").then(({ ForgeHubApp }) => {
  Hooks.once("ready", () => {
    if (!game.user.isGM) return;

    const fabButton = document.createElement("button");
    fabButton.id = "forge-hub-fab";
    fabButton.innerHTML = `<i class="fas fa-hammer"></i>`;
    fabButton.title = "Launch The Forge Hub";
    
    // Aesthetic overlay positioning
    Object.assign(fabButton.style, {
      position: "fixed",
      bottom: "20px",
      left: "120px",
      width: "50px",
      height: "50px",
      borderRadius: "50%",
      background: "rgba(0, 0, 0, 0.7)",
      border: "2px solid #a4c639",
      color: "white",
      fontSize: "20px",
      cursor: "pointer",
      boxShadow: "0 0 10px rgba(0,0,0,0.5)",
      zIndex: "100",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease"
    });

    fabButton.addEventListener("mouseenter", () => {
      fabButton.style.transform = "scale(1.1)";
      fabButton.style.boxShadow = "0 0 15px #a4c639";
    });
    fabButton.addEventListener("mouseleave", () => {
      fabButton.style.transform = "scale(1)";
      fabButton.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    });

    // Native Drag and Drop physics
    let isDragging = false, hasDragged = false;
    let startX, startY, initialLeft, initialTop;

    fabButton.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // Only drag on left click
      isDragging = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = fabButton.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      fabButton.style.transition = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      if (Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3) {
        hasDragged = true;
      }
      fabButton.style.left = `${initialLeft + (e.clientX - startX)}px`;
      fabButton.style.top = `${initialTop + (e.clientY - startY)}px`;
      fabButton.style.bottom = "auto";
      fabButton.style.right = "auto";
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        fabButton.style.transition = "all 0.2s ease";
      }
    });

    fabButton.addEventListener("click", (e) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        hasDragged = false;
        return;
      }
      new ForgeHubApp().render({ force: true });
    });

    document.body.appendChild(fabButton);
  });
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
