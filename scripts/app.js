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
    actions: {
      createNPC: CharCreatorApp.#onCreateNPC
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

  static async #onCreateNPC(event, target) {
    // Process form data manually to avoid native redirections
    const form = target.closest("form");
    const formData = new FormDataExtended(form);
    const data = formData.object;
    
    // Ensure folder exists
    const folderName = "Forge Creations";
    let folder = game.folders.find(f => f.name === folderName && f.type === "Actor");
    if (!folder) {
      folder = await Folder.create({ name: folderName, type: "Actor" });
    }

    // Image Processing & Uploads
    let portraitPath = "icons/svg/mystery-man.svg";
    let tokenPath = "icons/svg/mystery-man.svg";
    
    // Check if the user uploaded an image
    const fileInput = form.querySelector("#portraitUpload");
    const file = fileInput?.files[0];
    
    if (file) {
      try {
        // 1. Read file into an Image
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => img.onload = resolve);
        
        // 2. Upload the RAW portrait image right away
        const targetDir = "forge-creations/images";
        
        // Ensure directory exists
        try {
          await FilePicker.browse("data", targetDir);
        } catch (err) {
          // Directory probably doesn't exist, try to create it natively
          try {
            await FilePicker.createDirectory("data", "forge-creations");
          } catch(e) {} // Might already exist, ignore
          try {
            await FilePicker.createDirectory("data", targetDir);
          } catch(e) {}
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // Portrait Upload
        const portraitUploadResult = await FilePicker.upload("data", targetDir, file, {});
        if (portraitUploadResult && portraitUploadResult.path) {
           portraitPath = portraitUploadResult.path;
        }

        // 3. Generate the Token Image via Canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        
        // Calculate crop to cover the circle
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size / 2) - (img.width / 2) * scale;
        const y = (size / 2) - (img.height / 2) * scale;
        
        // Clip to circle
        ctx.beginPath();
        ctx.arc(size/2, size/2, (size/2) - 10, 0, Math.PI * 2);
        ctx.closePath();
        ctx.save();
        ctx.clip();
        
        // Draw native image filled
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        ctx.restore();
        
        // Draw the Token Ring SVG over it
        const ringImg = new Image();
        ringImg.src = "modules/forge-char-creator/assets/token-ring.svg";
        await new Promise(resolve => ringImg.onload = resolve);
        ctx.drawImage(ringImg, 0, 0, size, size);
        
        // 4. Convert Canvas to WebP and Upload
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.9));
        // Use a synthetic File object for the picker
        const tokenFile = new File([blob], `token-${safeName.replace(/\.[^/.]+$/, "")}.webp`, { type: "image/webp" });
        
        const tokenUploadResult = await FilePicker.upload("data", targetDir, tokenFile, {});
        if (tokenUploadResult && tokenUploadResult.path) {
           tokenPath = tokenUploadResult.path;
        }
        
      } catch (e) {
        console.warn("Forge Creator | Failed to process images:", e);
        ui.notifications.warn("Image upload failed, falling back to default.");
      }
    }

    // Prepare actor data
    const actorName = data.charName || "Unnamed Creature";
    const actorData = {
      name: actorName,
      type: "npc",
      folder: folder.id,
      img: portraitPath,
      prototypeToken: {
        name: actorName,
        texture: { src: tokenPath },
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
      },
      system: {
        attributes: {
          hp: {
            value: data.hp ?? 10,
            max: data.hp ?? 10
          },
          ac: {
            flat: data.ac ?? 10,
            calc: "flat"
          }
        },
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
      // Close the app dialog after creation
      const app = foundry.applications.instances.get("forge-char-creator-app");
      if (app) app.close();
    } catch (err) {
      ui.notifications.error(`Failed to create Actor: ${err.message}`);
      console.error("Forge Character Creator | Error creating actor:", err);
    }
  }
}
