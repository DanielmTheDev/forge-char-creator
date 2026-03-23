const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// ────────────────────────────────────────────────────────────────────────────
// Preset effect templates
// ────────────────────────────────────────────────────────────────────────────
const EFFECT_PRESETS = {
  burning: {
    name: "Burning", img: "icons/magic/fire/flame-burning-orange.webp",
    effectType: "overtime", turn: "end",
    hasDamage: true, damageRoll: "1d6", damageType: "fire", damageOnSave: "nodamage",
    hasSave: true, saveAbility: "dex", saveDC: "14", saveCount: "1",
    statuses: ["burning"], flags: []
  },
  poison: {
    name: "Poisoned", img: "icons/magic/unholy/strike-beam-blood-red-purple.webp",
    effectType: "overtime", turn: "end",
    hasDamage: true, damageRoll: "2d6", damageType: "poison", damageOnSave: "halfdamage",
    hasSave: true, saveAbility: "con", saveDC: "14", saveCount: "1",
    statuses: ["poisoned"], flags: []
  },
  regen: {
    name: "Regeneration", img: "icons/magic/life/heart-cross-strong-green.webp",
    effectType: "overtime", turn: "start",
    hasDamage: true, damageRoll: "10", damageType: "healing", damageOnSave: "nodamage",
    hasSave: false, statuses: [], flags: []
  },
  prone: {
    name: "Prone", img: "icons/svg/falling.svg",
    effectType: "passive",
    hasDamage: false, hasSave: false,
    statuses: ["prone"],
    flags: [
      { type: "grants.advantage", roll: "attack.mwak", mode: "OVERRIDE" },
      { type: "disadvantage", roll: "attack.all", mode: "OVERRIDE" }
    ]
  },
  stunned: {
    name: "Stunned", img: "icons/svg/stoned.svg",
    effectType: "passive",
    hasDamage: false, hasSave: false,
    statuses: ["stunned"],
    flags: [
      { type: "grants.advantage", roll: "attack.all", mode: "OVERRIDE" },
      { type: "fail", roll: "save.str", mode: "OVERRIDE" },
      { type: "fail", roll: "save.dex", mode: "OVERRIDE" }
    ]
  },
  frightened: {
    name: "Frightened", img: "icons/magic/unholy/orb-shadow-purple.webp",
    effectType: "passive",
    hasDamage: false, hasSave: false,
    statuses: ["frightened"],
    flags: [
      { type: "disadvantage", roll: "attack.all", mode: "OVERRIDE" }
    ]
  },
  hold: {
    name: "Hold Person", img: "icons/magic/control/debuff-chains-ropes-blue.webp",
    effectType: "overtime", turn: "end",
    hasDamage: false,
    hasSave: true, saveAbility: "wis", saveDC: "@attributes.spelldc", saveCount: "1",
    statuses: ["paralyzed"], flags: []
  }
};

const DAMAGE_TYPES = ["acid","bludgeoning","cold","fire","force","healing","lightning","necrotic","piercing","poison","psychic","radiant","slashing","thunder"];
const ABILITY_OPTS = { str:"Strength", dex:"Dexterity", con:"Constitution", int:"Intelligence", wis:"Wisdom", cha:"Charisma" };
const STATUS_LIST = ["blinded","charmed","deafened","exhaustion","frightened","grappled","incapacitated","invisible","paralyzed","petrified","poisoned","prone","restrained","stunned","unconscious","burning","bleeding","poisoned"];
const FLAG_TYPES = ["advantage","disadvantage","noAdvantage","noDisadvantage","critical","noCritical","fail","success","grants.advantage","grants.disadvantage","magicResistance","superSaver"];
const ROLL_CATEGORIES = [
  "attack.all","attack.mwak","attack.rwak","attack.msak","attack.rsak",
  "save.all","save.str","save.dex","save.con","save.int","save.wis","save.cha",
  "ability.all","ability.str","ability.dex","ability.con","ability.int","ability.wis","ability.cha",
  "skill.all","skill.acr","skill.ani","skill.arc","skill.ath","skill.dec","skill.his","skill.ins","skill.itm","skill.inv","skill.med","skill.nat","skill.prc","skill.prf","skill.per","skill.rel","skill.slt","skill.ste","skill.sur"
];
const EXPIRY_TRIGGERS = [
  { id:"1Attack", label:"After 1 Attack" }, { id:"1Action", label:"After 1 Action" },
  { id:"1Hit", label:"After Next Hit" }, { id:"isAttacked", label:"When Attacked" },
  { id:"isHit", label:"When Hit" }, { id:"isDamaged", label:"When Damaged" },
  { id:"isSave", label:"After Any Save" }, { id:"isSaveSuccess", label:"After Save Success" },
  { id:"isSaveFailure", label:"After Save Failure" }, { id:"isCheck", label:"After Any Check" }
];

export class CharCreatorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "forge-char-creator-app",
    classes: ["forge-char-creator", "standard-form"],
    title: "Forge Character Wizard",
    position: { width: 700, height: "auto" },
    window: { icon: "fas fa-user-plus", resizable: true },
    actions: { createNPC: CharCreatorApp.#onCreateNPC }
  };

  static PARTS = {
    form: {
      template: "./modules/forge-char-creator/templates/char-creator.hbs",
      scrollable: [".forge-char-creator-content"]
    }
  };

  // ── State ──────────────────────────────────────────────────────────────────
  selectedItems = new Map();   // UUID → { name, img }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.message = "Create a new Character or Creature using the wizard.";
    context.abilities = { str:"STR", dex:"DEX", con:"CON", int:"INT", wis:"WIS", cha:"CHA" };
    // Provide a simple array generator for Handlebars to build the 1-20 level dropdown
    context.range = (start, end) => Array.from({length: (end - start + 1)}, (v, k) => k + start);
    return context;
  }

  // ── Render hooks ──────────────────────────────────────────────────────────
  _onRender(context, options) {
    super._onRender(context, options);

    // ── Simple CSS tab switching ──────────────────────────────────────────────
    const tabBtns = this.element.querySelectorAll(".forge-tab-btn");
    const tabPanels = this.element.querySelectorAll(".forge-tab-panel");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.forgeTab;
        tabBtns.forEach(b => b.classList.toggle("active", b.dataset.forgeTab === target));
        tabPanels.forEach(p => p.classList.toggle("active", p.dataset.forgePanel === target));
      });
    });

    // ── Archetype Mathematics & Reactivity ──────────────────────────────────
    const levelSelect = this.element.querySelector("#charLevel");
    const archSelect = this.element.querySelector("#charArchetype");
    if (levelSelect && archSelect) {
      const applyArchetype = () => {
        const arch = archSelect.value;
        if (arch === "custom") return; // Do not overwrite user inputs if Custom is selected
        
        const lvl = parseInt(levelSelect.value) || 1;
        
        let ac=10, hp=10, str=10, dex=10, con=10, int=10, wis=10, cha=10, spell=""
        
        if (arch === "warrior") {
          ac = 16 + Math.floor(lvl / 4);
          hp = 10 + (lvl * Math.floor(6 + (lvl/5)));
          str = Math.min(22, 15 + Math.floor(lvl / 3));
          dex = Math.min(14, 10 + Math.floor(lvl / 5));
          con = Math.min(20, 14 + Math.floor(lvl / 4));
          wis = 12;
        } else if (arch === "rogue") {
          ac = 14 + Math.min(5, Math.floor(lvl / 4));
          hp = 8 + (lvl * Math.floor(4.5 + (lvl/6)));
          dex = Math.min(22, 16 + Math.floor(lvl / 3));
          con = Math.min(16, 12 + Math.floor(lvl / 4));
          int = 12; cha = 12; str = 8;
        } else if (arch.startsWith("mage_") || arch === "cleric_wis") {
          ac = 12 + Math.floor(lvl / 5);
          hp = 6 + (lvl * Math.floor(3.5 + (lvl/6)));
          dex = Math.min(16, 12 + Math.floor(lvl / 4));
          con = Math.min(18, 12 + Math.floor(lvl / 4));
          str = 8;
          
          if (arch === "mage_int") {
            int = Math.min(24, 16 + Math.floor(lvl / 3));
            wis = 14; cha = 10;
            spell = "int";
          } else if (arch === "cleric_wis") {
            wis = Math.min(24, 16 + Math.floor(lvl / 3));
            ac = 14 + Math.floor(lvl / 5); // clerics get slightly better AC naturally
            hp = 8 + (lvl * Math.floor(4.5 + (lvl/6))); // slightly tankier
            int = 10; cha = 12;
            spell = "wis";
          } else if (arch === "mage_cha") {
            cha = Math.min(24, 16 + Math.floor(lvl / 3));
            int = 12; wis = 12;
            spell = "cha";
          }
          // Auto-fill spell level
          const spellInput = this.element.querySelector("#spellLevel");
          if (spellInput) spellInput.value = Math.max(1, Math.min(20, lvl));
        }
        
        // Write the calculated values to the DOM inputs
        const setVal = (id, val) => { const el = this.element.querySelector(`#${id}`); if (el) el.value = val; };
        setVal("ac", ac); setVal("hp", hp);
        setVal("ability-str", str); setVal("ability-dex", dex); setVal("ability-con", con);
        setVal("ability-int", int); setVal("ability-wis", wis); setVal("ability-cha", cha);
        setVal("spellcasting", spell);
        
        // Reset the dropdown back to custom so the user knows it's an unlocked state
        archSelect.value = "custom";
        ui.notifications.info(`Auto-filled stats for Level ${lvl} ${arch.replace("_", " ")}`);
      };

      archSelect.addEventListener("change", applyArchetype);
    }

    // Portrait preview
    const fileInput = this.element.querySelector("#portraitUpload");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (f) {
          const preview = this.element.querySelector("#portraitPreview");
          if (preview) preview.src = URL.createObjectURL(f);
        }
      });
    }

    // Item search on "form" tab
    const searchInput = this.element.querySelector("#itemSearchQuery");
    if (searchInput) {
      const searchResults = this.element.querySelector("#itemSearchResults");
      const selectedBin = this.element.querySelector("#selectedItemsBin");

      this.#renderSelectedItems(selectedBin);

      let timeout = null;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => this.#performSearch(e.target.value, searchResults, selectedBin, searchInput), 300);
      });
      document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target))
          searchResults.style.display = "none";
      });
      searchInput.addEventListener("focus", () => {
        if (searchResults.children.length > 0 && searchInput.value.length > 0)
          searchResults.style.display = "block";
      });

      // Drag & Drop
      selectedBin.addEventListener("dragenter", (e) => { e.preventDefault(); selectedBin.classList.add("drag-hover"); });
      selectedBin.addEventListener("dragover", (e) => { e.preventDefault(); });
      selectedBin.addEventListener("dragleave", (e) => { e.preventDefault(); selectedBin.classList.remove("drag-hover"); });
      selectedBin.addEventListener("drop", async (e) => {
        e.preventDefault();
        selectedBin.classList.remove("drag-hover");
        try {
          const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
          if (dragData.type !== "Item" || !dragData.uuid) return;
          const itemDoc = await fromUuid(dragData.uuid);
          if (!itemDoc) return;
          this.selectedItems.set(dragData.uuid, { name: itemDoc.name, img: itemDoc.img || "icons/svg/item-bag.svg" });
          this.#renderSelectedItems(selectedBin);
        } catch(err) { console.warn("Forge Creator | drag drop error", err); }
      });
    }

  }

  // ── Compendium Search ───────────────────────────────────────────────────────────

  async #performSearch(query, resultsList, selectedBin, searchInput) {
    query = query.toLowerCase().trim();
    if (query.length === 0) { resultsList.style.display = "none"; resultsList.innerHTML = ""; return; }

    const itemPacks = game.packs.filter(p => p.documentName === "Item");
    let matches = [];
    for (const pack of itemPacks) {
      const index = await pack.getIndex({ fields: ["name", "img"] });
      for (const entry of index) {
        if (entry.name.toLowerCase().includes(query)) {
          matches.push({ uuid: `Compendium.${pack.metadata.id}.${entry._id}`, name: entry.name, img: entry.img || "icons/svg/item-bag.svg", packTitle: pack.title });
        }
      }
    }
    matches.sort((a, b) => a.name.localeCompare(b.name));
    matches = matches.slice(0, 50);

    if (matches.length === 0) {
      resultsList.innerHTML = `<li style="pointer-events:none; color:gray;">No items found.</li>`;
    } else {
      resultsList.innerHTML = matches.map(m => `
        <li data-uuid="${m.uuid}" data-name="${m.name}" data-img="${m.img}" data-pack="${m.packTitle}">
          <img src="${m.img}" alt="${m.name}">
          <span class="item-name">${m.name}</span>
          <span class="compendium-name">(${m.packTitle})</span>
        </li>`).join("");
      resultsList.querySelectorAll("li[data-uuid]").forEach(li => {
        li.addEventListener("click", () => {
          this.selectedItems.set(li.dataset.uuid, { name: li.dataset.name, img: li.dataset.img });
          this.#renderSelectedItems(selectedBin);
          resultsList.style.display = "none";
          searchInput.value = "";
        });
      });
    }
    resultsList.style.display = "block";
  }
  #renderSelectedItems(container) {
    if (!container) return;
    if (this.selectedItems.size === 0) {
      container.innerHTML = `<span class="empty-bin-msg" style="color:var(--color-text-light-5); font-style:italic; font-size:0.9em;">No items selected.</span>`;
      return;
    }
    container.innerHTML = Array.from(this.selectedItems.entries()).map(([uuid, data]) => `
      <div class="item-pill">
        <img src="${data.img}" alt="${data.name}">
        <span>${data.name}</span>
        <span class="remove-btn" data-uuid="${uuid}">×</span>
      </div>`).join("");
    container.querySelectorAll(".remove-btn").forEach(btn => {
      btn.addEventListener("click", () => { this.selectedItems.delete(btn.dataset.uuid); this.#renderSelectedItems(container); });
    });
  }


  // ── NPC Creation ──────────────────────────────────────────────────────────
  static async #onCreateNPC(event, target) {
    const form = target.closest("form") ?? target.closest(".forge-char-creator-content");
    const formData = new FormDataExtended(form);
    const data = formData.object;

    const instance = foundry.applications.instances.get("forge-char-creator-app");

    if (!instance) {
      ui.notifications.error("Could not find CharCreatorApp instance.");
      return;
    }

    await instance._createNPC(data);
  }

  async _createNPC(data) {
    const folderName = "Forge Creations";
    let folder = game.folders.find(f => f.name === folderName && f.type === "Actor");
    if (!folder) folder = await Folder.create({ name: folderName, type: "Actor" });

    let portraitPath = "icons/svg/mystery-man.svg";
    let tokenPath = "icons/svg/mystery-man.svg";

    const fileInput = document.getElementById("portraitUpload");
    const file = fileInput?.files[0];
    if (file) {
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => img.onload = resolve);
        const targetDir = "forge-creations/images";
        try { await FilePicker.browse("data", targetDir); } catch {
          try { await FilePicker.createDirectory("data", "forge-creations"); } catch {}
          try { await FilePicker.createDirectory("data", targetDir); } catch {}
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const portraitResult = await FilePicker.upload("data", targetDir, file, {});
        if (portraitResult?.path) portraitPath = portraitResult.path;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 256;
        canvas.width = canvas.height = size;
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size / 2) - (img.width / 2) * scale;
        const y = (size / 2) - (img.height / 2) * scale;
        ctx.beginPath(); ctx.arc(size/2, size/2, (size/2)-10, 0, Math.PI*2); ctx.closePath(); ctx.save(); ctx.clip();
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale); ctx.restore();
        const ringImg = new Image();
        ringImg.crossOrigin = "Anonymous"; // Fix for The Forge CDN Tainted Canvas
        ringImg.src = "modules/forge-char-creator/assets/token-ring.svg";
        await new Promise(resolve => ringImg.onload = resolve);
        ctx.drawImage(ringImg, 0, 0, size, size);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.9));
        const tokenFile = new File([blob], `token-${safeName.replace(/\.[^/.]+$/, "")}.webp`, { type: "image/webp" });
        const tokenResult = await FilePicker.upload("data", targetDir, tokenFile, {});
        if (tokenResult?.path) tokenPath = tokenResult.path;
      } catch(e) {
        console.warn("Forge Creator | Image processing failed", e);
        ui.notifications.warn("Image upload failed, using default.");
      }
    }

    const actorName = data.charName || "Unnamed Creature";
    const actorData = {
      name: actorName, type: "npc", folder: folder.id, img: portraitPath,
      prototypeToken: {
        name: actorName, texture: { src: tokenPath },
        disposition: parseInt(data.disposition) || CONST.TOKEN_DISPOSITIONS.HOSTILE
      },
      system: {
        traits: { size: data.size || "med" },
        attributes: {
          hp: { value: data.hp ?? 10, max: data.hp ?? 10 },
          ac: { flat: data.ac ?? 10, calc: "flat" },
          spellcasting: data.spellcasting || "",
          spell: { level: parseInt(data.spellLevel) || 0 }
        },
        abilities: {
          str: { value: data.abilities?.str ?? 10 }, dex: { value: data.abilities?.dex ?? 10 },
          con: { value: data.abilities?.con ?? 10 }, int: { value: data.abilities?.int ?? 10 },
          wis: { value: data.abilities?.wis ?? 10 }, cha: { value: data.abilities?.cha ?? 10 }
        }
      }
    };

    try {
      const npc = await Actor.create(actorData);
      const app = foundry.applications.instances.get("forge-char-creator-app");

      // Inject compendium items
      if (app?.selectedItems?.size > 0) {
        const docs = await Promise.all(Array.from(app.selectedItems.keys()).map(uuid => fromUuid(uuid)));
        const valid = docs.filter(i => i).map(i => {
          const obj = i.toObject();
          delete obj._id;     // Strip ID to prevent collision limits during creation
          delete obj.folder;  // Strip compendium folder IDs
          return obj;
        });
        if (valid.length > 0) await npc.createEmbeddedDocuments("Item", valid);
      }

      ui.notifications.info(`Successfully created ${actorName}!`);
      if (app) app.close();
    } catch(err) {
      ui.notifications.error(`Failed to create Actor: ${err.message}`);
      console.error("Forge Character Creator | Error:", err);
    }
  }
}
