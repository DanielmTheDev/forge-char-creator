const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharCreatorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "forge-char-creator-app",
    classes: ["forge-char-creator", "standard-form"],
    title: "Forge Character Wizard",
    position: {
      width: 450,
      height: "auto"
    },
    window: {
      icon: "fas fa-user-plus",
      resizable: false
    },
    form: {
      handler: CharCreatorApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
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
    context.abilities = {
      str: "STR",
      dex: "DEX",
      con: "CON",
      int: "INT",
      wis: "WIS",
      cha: "CHA"
    };
    return context;
  }

  static async #onSubmit(event, form, formData) {
    event.preventDefault();

    // Process form data. FormDataExtended in v13 expands objects automatically,
    // so formData.object.abilities will be an object.
    const data = formData.object;
    
    // Ensure folder exists
    const folderName = "Forge Creations";
    let folder = game.folders.find(f => f.name === folderName && f.type === "Actor");
    if (!folder) {
      folder = await Folder.create({ name: folderName, type: "Actor" });
    }

    // Prepare actor data
    const actorName = data.charName || "Unnamed Creature";
    const actorData = {
      name: actorName,
      type: "npc",
      folder: folder.id,
      prototypeToken: {
        name: actorName,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
      },
      system: {
        abilities: {
          str: { value: data.abilities?.str ?? 10 },
          dex: { value: data.abilities?.dex ?? 10 },
          con: { value: data.abilities?.con ?? 10 },
          int: { value: data.abilities?.int ?? 10 },
          wis: { value: data.abilities?.wis ?? 10 },
          cha: { value: data.abilities?.cha ?? 10 }
        }
      }
    };

    try {
      await Actor.create(actorData);
      ui.notifications.info(`Successfully created ${actorName}!`);
    } catch (err) {
      ui.notifications.error(`Failed to create Actor: ${err.message}`);
      console.error("Forge Character Creator | Error creating actor:", err);
    }
  }
}
