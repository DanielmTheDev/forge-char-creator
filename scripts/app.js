const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharCreatorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "forge-char-creator-app",
    classes: ["forge-char-creator", "standard-form"],
    title: "Forge Character Wizard",
    position: {
      width: 400,
      height: "auto"
    },
    window: {
      icon: "fas fa-user-plus",
      resizable: false
    }
  };

  static PARTS = {
    form: {
      template: "./modules/forge-char-creator/templates/char-creator.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.message = "Create a new Character or Creature using the wizard.";
    return context;
  }
}
