/**
 * Forge Effect Creator Wizard
 *
 * A standalone ApplicationV2 that builds Active Effects (with optional
 * Midi-QOL OverTime reroll logic) and saves them into the module's compendiums.
 * If "Wrap in Feature" is checked, a dnd5e Feature Item is created instead,
 * with the AE embedded inside it.
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// ── Constants ───────────────────────────────────────────────────────────────

const DND5E_CONDITIONS = [
  "blinded", "charmed", "deafened", "exhaustion", "frightened",
  "grappled", "incapacitated", "invisible", "paralyzed", "petrified",
  "poisoned", "prone", "restrained", "stunned", "unconscious"
];

const DAMAGE_TYPES = [
  "acid","bludgeoning","cold","fire","force","lightning","necrotic",
  "piercing","poison","psychic","radiant","slashing","thunder","healing"
];

const ABILITIES = [
  ["str","Strength"], ["dex","Dexterity"], ["con","Constitution"],
  ["int","Intelligence"], ["wis","Wisdom"], ["cha","Charisma"]
];

const ADV_TYPES = [
  { id: "advantage",    label: "Advantage" },
  { id: "disadvantage", label: "Disadvantage" },
  { id: "noAdv",        label: "No Advantage" },
  { id: "noDisadv",     label: "No Disadvantage" }
];

const ADV_ROLL_CATS = [
  { id: "all",       label: "All Rolls" },
  { id: "attack.all", label: "All Attacks" },
  { id: "attack.mwak", label: "Melee Attack" },
  { id: "attack.rwak", label: "Ranged Attack" },
  { id: "attack.msak", label: "Melee Spell" },
  { id: "attack.rsak", label: "Ranged Spell" },
  { id: "save.all",  label: "All Saves" },
  { id: "save.str", label: "STR Save" }, { id: "save.dex", label: "DEX Save" },
  { id: "save.con", label: "CON Save" }, { id: "save.int", label: "INT Save" },
  { id: "save.wis", label: "WIS Save" }, { id: "save.cha", label: "CHA Save" },
  { id: "skill.all", label: "All Skills" }
];

// ── EffectCreatorApp ─────────────────────────────────────────────────────────

export class EffectCreatorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "forge-effect-creator-app",
    classes: ["forge-effect-creator", "standard-form"],
    title: "Forge Effect Creator",
    position: { width: 750, height: "auto" },
    window: { icon: "fas fa-sparkles", resizable: true },
    actions: { 
      createEffect: function() { this._doCreate(); }
    }
  };

  static PARTS = {
    form: {
      template: "./modules/forge-char-creator/templates/effect-creator.hbs",
      scrollable: [".forge-effect-creator-content"]
    }
  };

  // ── State ──────────────────────────────────────────────────────────────────
  #state = {
    name: "",
    img: "icons/svg/aura.svg",
    description: "",
    durationType: "fixed",   // "fixed" | "overtime"
    rounds: 0,
    // OverTime
    otTrigger: "end",         // "start" | "end"
    otWhose: "target",        // "source" | "target"
    otDamage: "",
    otRollType: "damage",     // "damage" | "healing"
    otDamageType: "fire",
    otSave: false,
    otSaveAbility: "dex",
    otSaveDC: "14",
    otOnSave: "nodamage",     // "nodamage" | "halfdamage" | "fulldamage"
    otSuccesses: "1",
    // Application mode
    appMode: "activation",       // "passive" | "activation"
    activationTarget: "targets", // "wearer" | "targets"
    // Conditions
    statuses: [],
    // Adv/Disadv rows
    advRows: [],
    // Output
    wrapInFeature: false,
    wrapType: "none",
    wrapTargetCount: "1",
    wrapTargetArea: "none",
    wrapDamageFormula: "",
    wrapDamageType: "bludgeoning",
    wrapSaveAbility: "dex",
    wrapSaveDC: "14"
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.s = this.#state;
    ctx.statusMap = {};
    for (const st of DND5E_CONDITIONS) ctx.statusMap[st] = this.#state.statuses.includes(st);
    ctx.damageTypes = DAMAGE_TYPES;
    ctx.abilities = ABILITIES;
    ctx.conditions = DND5E_CONDITIONS;
    ctx.advTypes = ADV_TYPES;
    ctx.advCats = ADV_ROLL_CATS;
    return ctx;
  }

  // ── Render hooks ───────────────────────────────────────────────────────────
  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;

    // Live-bind all simple fields
    el.querySelectorAll("[data-ef]").forEach(input => {
      const key = input.dataset.ef;
      const type = input.type;
      input.addEventListener("change", () => {
        if (type === "checkbox") this.#state[key] = input.checked;
        else this.#state[key] = input.value;
        this.#reactiveUpdate(el);
        this.#updateRawPreview(el);
      });
    });

    // Status checkboxes (multi-select array)
    el.querySelectorAll("[data-status]").forEach(cb => {
      cb.addEventListener("change", () => {
        const s = cb.dataset.status;
        if (cb.checked) { if (!this.#state.statuses.includes(s)) this.#state.statuses.push(s); }
        else this.#state.statuses = this.#state.statuses.filter(x => x !== s);
        this.#updateRawPreview(el);
      });
    });

    // Icon path preview
    const imgInput = el.querySelector("[data-ef='img']");
    const imgPreview = el.querySelector("#efImgPreview");
    if (imgInput && imgPreview) {
      imgInput.addEventListener("input", () => { imgPreview.src = imgInput.value || "icons/svg/aura.svg"; });
    }

    // Add Adv Row
    const addAdvBtn = el.querySelector("#addAdvRow");
    if (addAdvBtn) addAdvBtn.addEventListener("click", () => {
      this.#state.advRows.push({ type: "advantage", cat: "attack.all", grants: false });
      this.#renderAdvRows(el);
    });

    this.#reactiveUpdate(el);
    this.#renderAdvRows(el);
    this.#updateRawPreview(el);
  }

  // ── Reactive section visibility ────────────────────────────────────────────
  #reactiveUpdate(el) {
    const s = this.#state;
    const show = (id, visible) => {
      const node = el.querySelector(`#${id}`);
      if (node) node.style.display = visible ? "" : "none";
    };
    show("otSection",           s.durationType === "overtime");
    show("otSaveSection",       s.durationType === "overtime" && s.otSave);
    show("otRollTypeSection",   s.durationType === "overtime" && !!s.otDamage);
    show("otDamageTypeSection", s.durationType === "overtime" && !!s.otDamage && s.otRollType === "damage");
    show("activationModeRow",   s.appMode === "activation");
    
    // Output Wrapper logic
    show("wrapFeatureOptions", s.wrapInFeature);
    show("wrapCommonRow", s.wrapType === "attack" || s.wrapType === "save");
    show("wrapSaveRow", s.wrapType === "save");
  }

  // ── Advantage/Disadvantage rows ────────────────────────────────────────────
  #renderAdvRows(el) {
    const container = el.querySelector("#advRowsContainer");
    if (!container) return;

    if (this.#state.advRows.length === 0) {
      container.innerHTML = `<p class="notes" style="font-style:italic; font-size:0.85em; color:var(--color-text-light-5);">No modifiers added.</p>`;
      return;
    }

    container.innerHTML = this.#state.advRows.map((row, idx) => `
      <div class="adv-row flexrow" style="gap:6px; align-items:center; margin-bottom:4px; background:rgba(0,0,0,0.15); border-radius:3px; padding:3px 6px;">
        <select class="adv-type" data-idx="${idx}" style="flex:1; height:1.8rem;">
          ${ADV_TYPES.map(t => `<option value="${t.id}" ${row.type===t.id?"selected":""}>${t.label}</option>`).join("")}
        </select>
        <span style="font-size:0.8em; color:var(--color-text-light-5);">on</span>
        <select class="adv-cat" data-idx="${idx}" style="flex:1.4; height:1.8rem;">
          ${ADV_ROLL_CATS.map(c => `<option value="${c.id}" ${row.cat===c.id?"selected":""}>${c.label}</option>`).join("")}
        </select>
        <label style="font-size:0.82em; display:flex; align-items:center; gap:3px; white-space:nowrap;">
          <input type="checkbox" class="adv-grants" data-idx="${idx}" ${row.grants?"checked":""}> Grants (incoming)
        </label>
        <button type="button" class="adv-del" data-idx="${idx}" style="flex-shrink:0; padding:0 6px; height:1.8rem; color:var(--color-level-error-high);">×</button>
      </div>`).join("");

    // Wire events
    container.querySelectorAll(".adv-type").forEach(sel => sel.addEventListener("change", () => {
      this.#state.advRows[+sel.dataset.idx].type = sel.value;
      this.#updateRawPreview(el);
    }));
    container.querySelectorAll(".adv-cat").forEach(sel => sel.addEventListener("change", () => {
      this.#state.advRows[+sel.dataset.idx].cat = sel.value;
      this.#updateRawPreview(el);
    }));
    container.querySelectorAll(".adv-grants").forEach(cb => cb.addEventListener("change", () => {
      this.#state.advRows[+cb.dataset.idx].grants = cb.checked;
      this.#updateRawPreview(el);
    }));
    container.querySelectorAll(".adv-del").forEach(btn => btn.addEventListener("click", () => {
      this.#state.advRows.splice(+btn.dataset.idx, 1);
      this.#renderAdvRows(el);
      this.#updateRawPreview(el);
    }));
  }

  // ── Live Raw Preview ───────────────────────────────────────────────────────
  #updateRawPreview(el) {
    const pre = el.querySelector("#efRawPreview");
    if (!pre) return;
    try {
      const payload = this._buildAEData();
      pre.textContent = JSON.stringify(payload, null, 2);
    } catch { pre.textContent = "(error building preview)"; }
  }

  // ── Payload Builder ────────────────────────────────────────────────────────
  _buildAEData() {
    const s = this.#state;
    const changes = [];

    // Over-Time flag
    const hasDamage = s.otDamage && s.otDamage.trim();
    const hasSave = s.otSave && s.otSaveAbility;
    if (s.durationType === "overtime" && (hasDamage || hasSave)) {
      const whose = s.otWhose === "source" ? "Source" : "Target";
      const trigger = `turn${s.otTrigger === "start" ? "Start" : "End"}${whose}`;
      const parts = [`turn=${trigger}`];
      if (hasDamage) {
        parts.push(`damageRoll=${s.otDamage}`);
        parts.push(`damageType=${s.otRollType === "healing" ? "healing" : s.otDamageType}`);
      }
      if (s.otSave && s.otSaveAbility) {
        parts.push(`saveAbility=${s.otSaveAbility}`);
        parts.push(`saveDC=${s.otSaveDC || 14}`);
        if (s.otOnSave !== "nodamage") parts.push(`saveDamage=${s.otOnSave}`);
        if (s.otSuccesses) parts.push(`saveCount=${s.otSuccesses}-`);
      }
      parts.push(`label="${s.name || "Effect"}"`);
      changes.push({
        key: `flags.midi-qol.OverTime`,
        mode: 0,
        value: parts.join(", "),
        priority: 20
      });
    }

    // Advantage / Disadvantage rows
    for (const row of (s.advRows || [])) {
      const prefix = row.grants ? "grants" : "advantage_mode";
      // Map type to midi flag path
      const typeMap = {
        advantage:    "flags.midi-qol.advantage",
        disadvantage: "flags.midi-qol.disadvantage",
        noAdv:        "flags.midi-qol.fail.all",
        noDisadv:     "flags.midi-qol.fail.all"
      };
      const catPath = row.cat === "all" ? "all" : row.cat;
      const base = row.type === "advantage" ? "flags.midi-qol.advantage"
                 : row.type === "disadvantage" ? "flags.midi-qol.disadvantage"
                 : row.type === "noAdv" ? "flags.midi-qol.critical.all"
                 : "flags.midi-qol.fail.all";
      const key = row.grants ? `flags.midi-qol.grants.${row.type}.${catPath}`
                              : `${base}.${catPath}`;
      changes.push({ key, mode: 5, value: "1", priority: 20 });
    }

    let descriptionText = s.description || "";
    if (!descriptionText.trim()) {
      const summaries = [];
      if (s.statuses?.length) summaries.push(`Applies ${s.statuses.join(", ")}.`);
      
      const hasDamage = s.otDamage && s.otDamage.trim();
      const hasSave = s.otSave && s.otSaveAbility;
      if (s.durationType === "overtime" && (hasDamage || hasSave)) {
        let otStr = `At the ${s.otTrigger === "start" ? "start" : "end"} of the ${s.otWhose}'s turn, `;
        if (hasSave) otStr += `make a DC ${s.otSaveDC} ${s.otSaveAbility.toUpperCase()} save`;
        if (hasDamage && hasSave) otStr += ` (${s.otOnSave === "nodamage" ? "no" : "half"} damage on success). `;
        else if (hasSave) otStr += ` to remove the effect. `;
        if (hasDamage) otStr += `Takes ${s.otDamage} ${s.otRollType === "healing" ? "healing" : s.otDamageType}.`;
        summaries.push(otStr.trim());
      }
      
      if (s.advRows?.length) {
        summaries.push(`Modifiers: ${s.advRows.map(r => `${r.type} on ${r.cat}`).join(", ")}.`);
      }
      
      descriptionText = summaries.join(" ") || "A custom effect.";
    }

    const aeData = {
      name: s.name || "New Effect",
      img: s.img || "icons/svg/aura.svg",
      description: { value: descriptionText },
      transfer: s.appMode === "passive",
      statuses: [...(s.statuses || [])],
      duration: s.durationType === "fixed" ? { rounds: parseInt(s.rounds) || 0 } : {},
      changes,
      flags: {}
    };
    return aeData;
  }

  // ── Creation ───────────────────────────────────────────────────────────────
  async _doCreate() {
    const s = this.#state;
    if (!s.name?.trim()) { ui.notifications.warn("Please enter an effect name."); return; }
    const aeData = this._buildAEData();

    try {
      const itemData = {
        name: s.wrapInFeature ? s.name.trim() : `[AE] ${s.name.trim()}`,
        img: s.img || (s.wrapInFeature ? "icons/svg/feature.svg" : "icons/svg/aura.svg"),
        type: "feat",
        system: { description: { value: s.description || "" } },
        effects: [aeData]
      };
      
      if (s.wrapInFeature && s.wrapType !== "none") {
        itemData.system.activation = { type: "action", cost: 1, condition: "" };
        const isArea = s.wrapTargetArea !== "none";
        itemData.system.target = { 
          value: isArea ? 20 : (parseInt(s.wrapTargetCount) || 1), 
          type: isArea ? s.wrapTargetArea : "creature" 
        };
        if (s.wrapDamageFormula?.trim()) {
          itemData.system.damage = { parts: [[s.wrapDamageFormula.trim(), s.wrapDamageType]] };
        }
        if (s.wrapType === "attack") {
          itemData.system.actionType = "mwak"; // Default to melee weapon attack representation
        } else if (s.wrapType === "save") {
          itemData.system.actionType = "save";
          const dcv = String(s.wrapSaveDC).trim();
          itemData.system.save = { 
            ability: s.wrapSaveAbility, 
            dc: isNaN(dcv) ? null : parseInt(dcv), 
            scaling: isNaN(dcv) ? dcv.replace("@attributes.","").replace("@","") : "flat" 
          };
        }
      }
      
      const targetPack = s.wrapInFeature ? "forge-features" : "forge-effects";
      const pack = game.packs.get(`forge-char-creator.${targetPack}`);
      if (!pack) { ui.notifications.error(`Could not find ${targetPack} compendium. Reload Foundry.`); return; }
      
      if (pack.locked) await pack.configure({ locked: false }); // Auto-unlock the compendium for saving
      
      const tempItem = await Item.create(itemData, { temporary: true });
      await pack.importDocument(tempItem);
      ui.notifications.info(`Successfully saved to ${targetPack} compendium.`);
      // Reset state for next effect
      this.#state = {
        name: "", img: "icons/svg/aura.svg", description: "",
        durationType: "fixed", rounds: 0,
        otTrigger: "end", otWhose: "target", otDamage: "", otRollType: "damage", otDamageType: "fire",
        otSave: false, otSaveAbility: "dex", otSaveDC: "14", otOnSave: "nodamage", otSuccesses: "1",
        appMode: "activation", activationTarget: "targets",
        statuses: [], advRows: [], wrapInFeature: false, wrapType: "none", wrapTargetCount: "1",
        wrapTargetArea: "none", wrapDamageFormula: "", wrapDamageType: "bludgeoning", wrapSaveAbility: "dex", wrapSaveDC: "14"
      };
      this.render();
    } catch (err) {
      console.error("Forge Effect Creator | Error saving effect:", err);
      ui.notifications.error(`Failed to save: ${err.message}`);
    }
  }
}
