const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharCreatorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "forge-char-creator",
    classes: ["forge-char-creator"],
    title: "Forge Character Creator",
    position: {
      width: 600,
      height: 400
    },
    window: {
      icon: "fas fa-users",
      resizable: true
    }
  };

  static PARTS = {
    form: {
      template: "./modules/forge-char-creator/templates/char-creator.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.message = "Welcome to the Forge Character Creator V13!";
    return context;
  }
}
