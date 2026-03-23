import { CharCreatorApp } from "./app.js";
import { EffectCreatorApp } from "./effect-creator.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ForgeHubApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "forge-ui-hub",
    classes: ["forge-hub-app"],
    title: "Forge Central Hub",
    position: { width: 500, height: "auto" },
    window: { icon: "fas fa-hammer", resizable: false },
    actions: {
      launchCharCreator: function() { this._launch(CharCreatorApp); },
      launchEffectCreator: function() { this._launch(EffectCreatorApp); }
    }
  };

  static PARTS = {
    form: {
      template: "./modules/forge-char-creator/templates/forge-hub.hbs"
    }
  };

  _launch(AppClass) {
    new AppClass().render({ force: true });
    this.close();
  }
}
