/**
 * Forge Effect Creator Wizard
 *
 * A standalone ApplicationV2 that builds Active Effects (with optional
 * Midi-QOL OverTime reroll logic) and saves them into the module's compendiums.
 * If "Wrap in Feature" is checked, a dnd5e Feature Item is created instead,
 * with the AE embedded inside it.
 */

import { CONDITIONS, DAMAGE_TYPES, ABILITIES, ADV_TYPES, ADV_ROLL_CATS, SPECIAL_DURATIONS, ACTIVATION_TYPES,
         DEFAULT_STATE, buildEffect, buildItem } from "./feature-payload.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

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
      scrollable: [".forge-form-body"]
    }
  };

  // ── State ──────────────────────────────────────────────────────────────────
  #state = foundry.utils.deepClone(DEFAULT_STATE);

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.s = this.#state;
    ctx.statusMap = {};
    for (const st of CONDITIONS) ctx.statusMap[st] = this.#state.statuses.includes(st);
    ctx.damageTypes = DAMAGE_TYPES;
    ctx.abilities = ABILITIES;
    ctx.conditions = CONDITIONS;
    ctx.advTypes = ADV_TYPES;
    ctx.advCats = ADV_ROLL_CATS;
    ctx.specialDurations = SPECIAL_DURATIONS;
    ctx.activationTypes = ACTIVATION_TYPES;
    ctx.targetTypes = CONFIG.DND5E.targetTypes;
    return ctx;
  }

  constructor(options = {}, initialState = {}, onComplete = null) {
    super(options);
    Object.assign(this.#state, initialState);
    this.onComplete = onComplete;
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

    // Add Ability Modifier Row
    const addAbilityBtn = el.querySelector("#addAbilityRow");
    if (addAbilityBtn) addAbilityBtn.addEventListener("click", () => {
      this.#state.abilityRows.push({ ability: "str", value: 0 });
      this.#renderAbilityRows(el);
    });

    this.#reactiveUpdate(el);
    this.#renderAdvRows(el);
    this.#renderAbilityRows(el);
    this.#updateRawPreview(el);
  }

  // ── Reactive section visibility ────────────────────────────────────────────
  #reactiveUpdate(el) {
    const s = this.#state;
    const show = (id, visible) => {
      const node = el.querySelector(`#${id}`);
      if (node) node.style.display = visible ? "" : "none";
    };
    // Rows that must stay flex when shown ("" would blockify them and drop the gap).
    const showFlex = (id, visible) => {
      const node = el.querySelector(`#${id}`);
      if (node) node.style.display = visible ? "flex" : "none";
    };
    show("otSection",           s.durationType === "overtime");
    show("otSaveSection",       s.durationType === "overtime" && s.otSave);
    show("otRollTypeSection",   s.durationType === "overtime" && !!s.otDamage);
    show("otDamageTypeSection", s.durationType === "overtime" && !!s.otDamage && s.otRollType === "damage");
    show("activationModeRow",   s.appMode === "activation");

    // Output Wrapper logic
    const isArea = s.wrapTargetArea in (CONFIG.DND5E?.areaTargetTypes ?? {});
    show("wrapFeatureOptions", s.wrapInFeature);
    show("wrapCommonRow", ["apply", "attack", "save", "damage", "temphp"].includes(s.wrapType));
    show("wrapDamageRow", ["attack", "save", "damage", "temphp"].includes(s.wrapType));
    showFlex("wrapDamageTypeSection", ["attack", "save", "damage"].includes(s.wrapType));
    show("wrapSaveRow", s.wrapType === "save");
    showFlex("wrapTargetCountBox", !isArea);
    showFlex("wrapAreaSizeBox", isArea);

    // The formula field is shared between damage and temp HP — relabel it.
    const isTemp = s.wrapType === "temphp";
    const fLabel = el.querySelector("#wrapDamageLabel");
    if (fLabel) fLabel.textContent = isTemp ? "Temp HP:" : "Damage:";
    const fInput = el.querySelector("[data-ef='wrapDamageFormula']");
    if (fInput) fInput.placeholder = isTemp ? "2d4+2" : "1d8+3";

    // Force ApplicationV2 to dynamically recalculate interior bounding box heights
    // This perfectly prevents the window from clipping un-hidden elements with standard scrollbars.
    if (this.rendered) {
      setTimeout(() => this.setPosition({ height: "auto" }), 10);
    }
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

  // ── Ability Score Modifier rows ───────────────────────────────────────────
  #renderAbilityRows(el) {
    const container = el.querySelector("#abilityRowsContainer");
    if (!container) return;

    if (this.#state.abilityRows.length === 0) {
      container.innerHTML = `<p class="notes" style="font-style:italic; font-size:0.85em; color:var(--color-text-light-5);">No ability modifiers added.</p>`;
      return;
    }

    const ABILITY_OPTIONS = [
      ["str","STR"], ["dex","DEX"], ["con","CON"],
      ["int","INT"], ["wis","WIS"], ["cha","CHA"]
    ];

    container.innerHTML = this.#state.abilityRows.map((row, idx) => `
      <div class="ability-row flexrow" style="gap:6px; align-items:center; margin-bottom:4px; background:rgba(0,0,0,0.15); border-radius:3px; padding:3px 6px;">
        <select class="ability-mod-ability" data-idx="${idx}" style="flex:1; height:1.8rem;">
          ${ABILITY_OPTIONS.map(([k,l]) => `<option value="${k}" ${row.ability===k?"selected":""}>${l}</option>`).join("")}
        </select>
        <input type="number" class="ability-mod-value" data-idx="${idx}" value="${row.value}"
               style="width:4rem; height:1.8rem; text-align:center;" placeholder="+/-">
        <button type="button" class="ability-mod-del" data-idx="${idx}"
                style="flex-shrink:0; padding:0 6px; height:1.8rem; color:var(--color-level-error-high);">×</button>
      </div>`).join("");

    // Wire events
    container.querySelectorAll(".ability-mod-ability").forEach(sel => sel.addEventListener("change", () => {
      this.#state.abilityRows[+sel.dataset.idx].ability = sel.value;
      this.#updateRawPreview(el);
    }));
    container.querySelectorAll(".ability-mod-value").forEach(inp => inp.addEventListener("change", () => {
      this.#state.abilityRows[+inp.dataset.idx].value = parseInt(inp.value) || 0;
      this.#updateRawPreview(el);
    }));
    container.querySelectorAll(".ability-mod-del").forEach(btn => btn.addEventListener("click", () => {
      this.#state.abilityRows.splice(+btn.dataset.idx, 1);
      this.#renderAbilityRows(el);
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
  // ── Payload Builder ────────────────────────────────────────────────────────
  _buildAEData() { return buildEffect(this.#state); }

  _buildItemData() {
    return buildItem(this.#state, {
      randomID: foundry.utils.randomID,
      areaTargetTypes: CONFIG.DND5E?.areaTargetTypes ?? {}
    });
  }

  // ── Creation ───────────────────────────────────────────────────────────────
  async _doCreate() {
    const s = this.#state;
    if (!s.name?.trim()) { ui.notifications.warn("Please enter an effect name."); return; }
    try {
      const itemData = this._buildItemData();

      const targetPack = s.wrapInFeature ? "forge-features" : "forge-effects";
      const pack = game.packs.get(`forge-char-creator.${targetPack}`);
      if (!pack) { ui.notifications.error(`Could not find ${targetPack} compendium. Reload Foundry.`); return; }

      if (pack.locked) await pack.configure({ locked: false }); // Auto-unlock the compendium for saving

      const tempItem = await Item.create(itemData, { temporary: true });
      const savedItem = await pack.importDocument(tempItem);
      ui.notifications.info(`Successfully saved to ${targetPack} compendium.`);
      
      if (this.onComplete) {
         this.onComplete(savedItem);
         return; // If part of a flow, let the callback manage window closing/resetting
      }

      // Reset state for next effect
      this.#state = foundry.utils.deepClone(DEFAULT_STATE);
      this.render();
    } catch (err) {
      console.error("Forge Effect Creator | Error saving effect:", err);
      ui.notifications.error(`Failed to save: ${err.message}`);
    }
  }
}
