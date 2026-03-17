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
    position: { width: 700, height: 800 },
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
  _effects = [];               // Array of effect data objects
  _selectedEffectIdx = -1;     // Currently-open effect index

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.message = "Create a new Character or Creature using the wizard.";
    context.abilities = { str:"STR", dex:"DEX", con:"CON", int:"INT", wis:"WIS", cha:"CHA" };
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

    // Effects tab wiring
    const addEffectBtn = this.element.querySelector("#addEffectBtn");
    if (addEffectBtn) {
      addEffectBtn.addEventListener("click", () => this.#addNewEffect());

      // Preset buttons
      this.element.querySelectorAll(".preset-btn").forEach(btn => {
        btn.addEventListener("click", () => this.#applyPreset(btn.dataset.preset));
      });

      this.#renderEffectList();
    }
  }

  // ── Effects: List rendering ───────────────────────────────────────────────
  #renderEffectList() {
    const container = this.element.querySelector("#effectListContainer");
    if (!container) return;

    if (this._effects.length === 0) {
      container.innerHTML = `<p class="notes" style="font-style:italic; font-size:0.85em; color: var(--color-text-light-5); text-align:center; padding: 8px;">No effects added yet.</p>`;
      return;
    }

    container.innerHTML = this._effects.map((eff, idx) => `
      <div class="effect-list-item ${idx === this._selectedEffectIdx ? 'active' : ''}"
           data-idx="${idx}" style="display:flex; align-items:center; gap:4px; padding:4px 6px; border-radius:4px; cursor:pointer; border:1px solid var(--color-border-light-tertiary); background: ${idx === this._selectedEffectIdx ? 'rgba(255,255,255,0.1)' : 'transparent'};">
        <img src="${eff.img || 'icons/svg/aura.svg'}" width="20" height="20" style="border:none; border-radius:2px; flex-shrink:0;" alt="">
        <span style="flex:1; font-size:0.85em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${eff.name || "Unnamed Effect"}</span>
        <span class="effect-delete-btn" data-idx="${idx}" style="color:var(--color-text-light-5); cursor:pointer; font-weight:bold; padding:0 2px;">×</span>
      </div>
    `).join("");

    container.querySelectorAll(".effect-list-item").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.classList.contains("effect-delete-btn")) return;
        this._selectedEffectIdx = parseInt(el.dataset.idx);
        this.#renderEffectList();
        this.#renderEffectEditor();
      });
    });

    container.querySelectorAll(".effect-delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        this._effects.splice(idx, 1);
        if (this._selectedEffectIdx >= this._effects.length) this._selectedEffectIdx = this._effects.length - 1;
        this.#renderEffectList();
        this.#renderEffectEditor();
      });
    });
  }

  // ── Effects: Editor rendering ─────────────────────────────────────────────
  #renderEffectEditor() {
    const panel = this.element.querySelector("#effectEditorPanel");
    if (!panel) return;

    if (this._selectedEffectIdx < 0 || this._selectedEffectIdx >= this._effects.length) {
      panel.innerHTML = `<p class="notes" style="font-style:italic; color:var(--color-text-light-5); text-align:center; margin-top:40px;">Select an effect or click <strong>"Add Effect"</strong>.</p>`;
      return;
    }

    const eff = this._effects[this._selectedEffectIdx];
    const idx = this._selectedEffectIdx;

    // Build damage type options
    const dmgOpts = DAMAGE_TYPES.map(t => `<option value="${t}" ${eff.damageType === t ? "selected" : ""}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join("");

    // Build ability save options
    const abilOpts = Object.entries(ABILITY_OPTS).map(([k,v]) => `<option value="${k}" ${eff.saveAbility === k ? "selected" : ""}>${v}</option>`).join("");

    // Build status conditions (multi-check)
    const statusChecks = STATUS_LIST.map(s => `
      <label style="display:inline-flex; align-items:center; gap:3px; font-size:0.85em; cursor:pointer; white-space:nowrap;">
        <input type="checkbox" data-eff-field="statuses" data-status="${s}" ${(eff.statuses||[]).includes(s) ? "checked" : ""}> ${s}</label>`).join("");

    // Build flag rows
    const flagRows = (eff.flags || []).map((f, fi) => this.#buildFlagRow(f, fi)).join("");

    // Build expiry trigger checks
    const expiryChecks = EXPIRY_TRIGGERS.map(t => `
      <label style="display:inline-flex; align-items:center; gap:3px; font-size:0.85em; cursor:pointer; white-space:nowrap;">
        <input type="checkbox" data-eff-field="expiryTriggers" data-trigger="${t.id}" ${(eff.expiryTriggers||[]).includes(t.id) ? "checked" : ""}> ${t.label}</label>`).join("");

    panel.innerHTML = `
    <div class="effect-editor" style="display:flex; flex-direction:column; gap:8px;">

      <!-- 1. Identity -->
      <fieldset><legend>Identity</legend>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" data-eff-field="name" placeholder="Effect Name" value="${eff.name||""}" style="flex:1; height:2rem;">
          <input type="text" data-eff-field="img" placeholder="Icon path" value="${eff.img||""}" style="flex:1.5; height:2rem; font-size:0.8em;">
          <img src="${eff.img||'icons/svg/aura.svg'}" width="32" height="32" style="border:none; border-radius:4px;" id="editorEffIcon">
        </div>
        <input type="text" data-eff-field="description" placeholder="Description (optional)" value="${eff.description||""}" style="width:100%; margin-top:4px; height:2rem;">
      </fieldset>

      <!-- 2. Duration & Timing -->
      <fieldset><legend>Duration & Timing</legend>
        <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
          <label style="font-size:0.9em;">Type:
            <select data-eff-field="effectType" style="height:1.8rem; margin-left:4px;">
              <option value="passive" ${eff.effectType==="passive"?"selected":""}>Passive Buff/Debuff</option>
              <option value="overtime" ${eff.effectType==="overtime"?"selected":""}>Over Time (Turns)</option>
            </select>
          </label>
          <label style="font-size:0.9em;">Duration:
            <input type="number" data-eff-field="durationRounds" value="${eff.durationRounds||0}" min="0" style="width:3rem; height:1.8rem; text-align:center; margin:0 4px;">
            rounds
          </label>
          <label style="font-size:0.9em;"><input type="checkbox" data-eff-field="concentration" ${eff.concentration?"checked":""}> Requires Concentration</label>
        </div>
        <div class="overtime-section" style="margin-top:6px; ${eff.effectType!=="overtime" ? "display:none;" : ""}">
          <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
            <label style="font-size:0.9em;">Trigger Turn:
              <select data-eff-field="turn" style="height:1.8rem; margin-left:4px;">
                <option value="start" ${eff.turn==="start"?"selected":""}>Start of Target Turn</option>
                <option value="end" ${eff.turn==="end"?"selected":""}>End of Target Turn</option>
              </select>
            </label>
            <label style="font-size:0.9em; flex:1;">Remove If:
              <input type="text" data-eff-field="removeCondition" placeholder="e.g. @attributes.hp.value < 1" value="${eff.removeCondition||""}" style="height:1.8rem; width:100%; margin-left:4px;">
            </label>
          </div>
        </div>
      </fieldset>

      <!-- 3. Over-Time Damage -->
      <fieldset class="overtime-section" style="${eff.effectType!=="overtime" ? "display:none;" : ""}">
        <legend>Damage / Healing</legend>
        <label style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
          <input type="checkbox" data-eff-field="hasDamage" ${eff.hasDamage?"checked":""}> Apply Damage / Healing
        </label>
        <div class="damage-sub" style="${!eff.hasDamage ? "display:none;" : ""} display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <input type="text" data-eff-field="damageRoll" placeholder="e.g. 2d6 or @con.mod" value="${eff.damageRoll||""}" style="flex:1; height:1.8rem;">
          <select data-eff-field="damageType" style="height:1.8rem;">${dmgOpts}</select>
          <label style="font-size:0.85em;"><input type="checkbox" data-eff-field="damageBeforeSave" ${eff.damageBeforeSave?"checked":""}> Damage Before Save</label>
          <label style="font-size:0.85em;">On Save:
            <select data-eff-field="damageOnSave" style="height:1.8rem; margin-left:4px;">
              <option value="nodamage" ${eff.damageOnSave==="nodamage"?"selected":""}>No Damage</option>
              <option value="halfdamage" ${eff.damageOnSave==="halfdamage"?"selected":""}>Half Damage</option>
              <option value="fulldamage" ${eff.damageOnSave==="fulldamage"?"selected":""}>Full Damage</option>
            </select>
          </label>
        </div>
      </fieldset>

      <!-- 4. Saving Throw -->
      <fieldset class="overtime-section" style="${eff.effectType!=="overtime" ? "display:none;" : ""}">
        <legend>Saving Throw</legend>
        <label style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
          <input type="checkbox" data-eff-field="hasSave" ${eff.hasSave?"checked":""}> Requires Save / Check
        </label>
        <div class="save-sub" style="${!eff.hasSave ? "display:none;" : ""} display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <label style="font-size:0.85em;">Ability:
            <select data-eff-field="saveAbility" style="height:1.8rem; margin-left:4px;">${abilOpts}</select>
          </label>
          <label style="font-size:0.85em;">DC:
            <input type="text" data-eff-field="saveDC" value="${eff.saveDC||"14"}" style="width:4rem; height:1.8rem; text-align:center; margin-left:4px;">
          </label>
          <label style="font-size:0.85em;"><input type="checkbox" data-eff-field="saveMagic" ${eff.saveMagic?"checked":""}> Magical Save</label>
        </div>
      </fieldset>

      <!-- 5. Save/Fail Counters -->
      <fieldset class="overtime-section" style="${eff.effectType!=="overtime" ? "display:none;" : ""}">
        <legend>Save / Fail Counters</legend>
        <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
          <label style="font-size:0.85em;">Remove after
            <input type="number" data-eff-field="saveCount" value="${eff.saveCount||"1"}" min="0" style="width:2.5rem; height:1.8rem; text-align:center; margin:0 4px;">
            success(es)
          </label>
          <label style="font-size:0.85em;">After
            <input type="number" data-eff-field="failCount" value="${eff.failCount||""}" min="0" style="width:2.5rem; height:1.8rem; text-align:center; margin:0 4px;">
            failure(s):
            <select data-eff-field="failMode" style="height:1.8rem; margin-left:4px;">
              <option value="-" ${eff.failMode==="-"?"selected":""}>Remove Effect</option>
              <option value="+" ${eff.failMode==="+"?"selected":""}>Make Permanent</option>
            </select>
          </label>
          <label style="font-size:0.85em;">Apply Status:
            <select data-eff-field="failStatus" style="height:1.8rem; margin-left:4px;">
              <option value="">None</option>
              ${STATUS_LIST.map(s => `<option value="${s}" ${eff.failStatus===s?"selected":""}>${s}</option>`).join("")}
            </select>
          </label>
        </div>
      </fieldset>

      <!-- 6. Roll Modifier Flags -->
      <fieldset>
        <legend>Roll Modifiers (Midi-QOL Flags)</legend>
        <div id="flagRowsContainer" style="display:flex; flex-direction:column; gap:4px; margin-bottom:4px;">${flagRows}</div>
        <button type="button" id="addFlagRowBtn" style="font-size:0.8em; padding:2px 8px;"><i class="fas fa-plus"></i> Add Flag</button>
      </fieldset>

      <!-- 7. Status Conditions -->
      <fieldset>
        <legend>Applied Status Conditions</legend>
        <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">${statusChecks}</div>
      </fieldset>

      <!-- 8. Special Expiry -->
      <fieldset>
        <legend>Special Expiry Triggers (Midi-QOL)</legend>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">${expiryChecks}</div>
      </fieldset>

      <!-- 9. Display -->
      <fieldset>
        <legend>Display</legend>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <label style="font-size:0.85em;">Chat Flavor:
            <input type="text" data-eff-field="chatFlavor" value="${eff.chatFlavor||""}" placeholder="Flavor text..." style="height:1.8rem; margin-left:4px;">
          </label>
          <label style="font-size:0.85em;">Roll Mode:
            <select data-eff-field="rollMode" style="height:1.8rem; margin-left:4px;">
              <option value="" ${!eff.rollMode?"selected":""}>Default</option>
              <option value="publicroll" ${eff.rollMode==="publicroll"?"selected":""}>Public</option>
              <option value="gmroll" ${eff.rollMode==="gmroll"?"selected":""}>GM Only</option>
              <option value="blindroll" ${eff.rollMode==="blindroll"?"selected":""}>Blind</option>
              <option value="selfroll" ${eff.rollMode==="selfroll"?"selected":""}>Self</option>
            </select>
          </label>
          <label style="font-size:0.85em;"><input type="checkbox" data-eff-field="killAnim" ${eff.killAnim?"checked":""}> Suppress Animations</label>
        </div>
      </fieldset>
    </div>`;

    // Wire up change events
    panel.querySelectorAll("[data-eff-field]").forEach(el => {
      const field = el.dataset.effField;
      const evt = el.type === "checkbox" ? "change" : "input";
      el.addEventListener(evt, () => this.#onEffectFieldChange(el, field));
    });

    // Special: status checkboxes
    panel.querySelectorAll("[data-status]").forEach(el => {
      el.addEventListener("change", () => {
        const status = el.dataset.status;
        const curr = this._effects[this._selectedEffectIdx].statuses || [];
        if (el.checked) { if (!curr.includes(status)) curr.push(status); }
        else { const i = curr.indexOf(status); if (i > -1) curr.splice(i, 1); }
        this._effects[this._selectedEffectIdx].statuses = curr;
        this.#updateRawPreview();
      });
    });

    // Special: expiry trigger checkboxes
    panel.querySelectorAll("[data-trigger]").forEach(el => {
      el.addEventListener("change", () => {
        const trigger = el.dataset.trigger;
        const curr = this._effects[this._selectedEffectIdx].expiryTriggers || [];
        if (el.checked) { if (!curr.includes(trigger)) curr.push(trigger); }
        else { const i = curr.indexOf(trigger); if (i > -1) curr.splice(i, 1); }
        this._effects[this._selectedEffectIdx].expiryTriggers = curr;
        this.#updateRawPreview();
      });
    });

    // Add flag row button
    panel.querySelector("#addFlagRowBtn")?.addEventListener("click", () => {
      if (!this._effects[this._selectedEffectIdx].flags) this._effects[this._selectedEffectIdx].flags = [];
      this._effects[this._selectedEffectIdx].flags.push({ type: "advantage", roll: "attack.all", mode: "OVERRIDE" });
      const container = panel.querySelector("#flagRowsContainer");
      const newIdx = this._effects[this._selectedEffectIdx].flags.length - 1;
      container.insertAdjacentHTML("beforeend", this.#buildFlagRow(this._effects[this._selectedEffectIdx].flags[newIdx], newIdx));
      this.#wireLastFlagRow(container, newIdx);
      this.#updateRawPreview();
    });

    // Wire existing flag rows
    const flagContainer = panel.querySelector("#flagRowsContainer");
    (eff.flags || []).forEach((_, fi) => this.#wireLastFlagRow(flagContainer, fi));

    // Show/hide dynamic sections based on current state
    this.#syncConditionalSections(panel, eff);
    this.#updateRawPreview();
  }

  #buildFlagRow(f, fi) {
    const typeOpts = FLAG_TYPES.map(t => `<option value="${t}" ${f.type===t?"selected":""}>${t}</option>`).join("");
    const rollOpts = ROLL_CATEGORIES.map(r => `<option value="${r}" ${f.roll===r?"selected":""}>${r}</option>`).join("");
    return `<div class="flag-row" data-fi="${fi}" style="display:flex; gap:4px; align-items:center;">
      <select data-fi="${fi}" data-flag-field="type" style="height:1.6rem; font-size:0.82em; flex:1.2;">${typeOpts}</select>
      <select data-fi="${fi}" data-flag-field="roll" style="height:1.6rem; font-size:0.82em; flex:1.5;">${rollOpts}</select>
      <input type="number" data-fi="${fi}" data-flag-field="value" value="${f.value||1}" style="width:2.5rem; height:1.6rem; text-align:center; font-size:0.82em;">
      <span data-fi="${fi}" class="flag-delete-btn" style="cursor:pointer; color:var(--color-text-light-5); font-weight:bold; padding:0 4px;">×</span>
    </div>`;
  }

  #wireLastFlagRow(container, fi) {
    const row = container.querySelector(`.flag-row[data-fi="${fi}"]`);
    if (!row) return;
    row.querySelectorAll("[data-flag-field]").forEach(el => {
      el.addEventListener("change", () => {
        const flags = this._effects[this._selectedEffectIdx].flags;
        if (flags[fi]) flags[fi][el.dataset.flagField] = el.type==="number" ? parseFloat(el.value) : el.value;
        this.#updateRawPreview();
      });
    });
    row.querySelector(".flag-delete-btn")?.addEventListener("click", () => {
      this._effects[this._selectedEffectIdx].flags.splice(fi, 1);
      this.#renderEffectEditor();
    });
  }

  #onEffectFieldChange(el, field) {
    const eff = this._effects[this._selectedEffectIdx];
    if (!eff) return;
    if (el.type === "checkbox") eff[field] = el.checked;
    else eff[field] = el.value;

    // Update icon preview if img path changed
    if (field === "img") {
      const preview = this.element.querySelector("#editorEffIcon");
      if (preview) preview.src = el.value || "icons/svg/aura.svg";
    }

    this.#syncConditionalSections(this.element.querySelector("#effectEditorPanel"), eff);
    this.#updateRawPreview();
    this.#renderEffectList(); // Keep names/icons in sync
  }

  #syncConditionalSections(panel, eff) {
    if (!panel) return;
    const isOvertime = eff.effectType === "overtime";
    panel.querySelectorAll(".overtime-section").forEach(el => {
      el.style.display = isOvertime ? "" : "none";
    });
    const damageSub = panel.querySelector(".damage-sub");
    if (damageSub) damageSub.style.display = eff.hasDamage ? "flex" : "none";
    const saveSub = panel.querySelector(".save-sub");
    if (saveSub) saveSub.style.display = eff.hasSave ? "flex" : "none";
  }

  // ── Effects: Preset application ───────────────────────────────────────────
  #applyPreset(presetKey) {
    const preset = EFFECT_PRESETS[presetKey];
    if (!preset) return;
    this._effects.push(foundry.utils.deepClone(preset));
    this._selectedEffectIdx = this._effects.length - 1;
    this.#renderEffectList();
    this.#renderEffectEditor();
  }

  #addNewEffect() {
    this._effects.push({
      name: "New Effect", img: "icons/svg/aura.svg", description: "",
      effectType: "passive", durationRounds: 0, concentration: false,
      turn: "end", removeCondition: "",
      hasDamage: false, damageRoll: "", damageType: "fire", damageBeforeSave: false, damageOnSave: "nodamage",
      hasSave: false, saveAbility: "con", saveDC: "14", saveMagic: false,
      saveCount: "1", failCount: "", failMode: "-", failStatus: "",
      flags: [], statuses: [], expiryTriggers: [],
      chatFlavor: "", rollMode: "", killAnim: false
    });
    this._selectedEffectIdx = this._effects.length - 1;
    this.#renderEffectList();
    this.#renderEffectEditor();
  }

  // ── Effects: Payload builder ──────────────────────────────────────────────
  #buildEffectPayload(eff) {
    const changes = [];

    // Over-Time flag
    if (eff.effectType === "overtime") {
      const parts = [`turn=${eff.turn || "end"}`];
      if (eff.hasDamage && eff.damageRoll) {
        parts.push(`damageRoll=${eff.damageRoll}`);
        parts.push(`damageType=${eff.damageType || "fire"}`);
        if (eff.damageBeforeSave) parts.push("damageBeforeSave=true");
        if (eff.damageOnSave && eff.damageOnSave !== "nodamage") parts.push(`saveDamage=${eff.damageOnSave}`);
      }
      if (eff.hasSave && eff.saveAbility) {
        parts.push(`saveAbility=${eff.saveAbility}`);
        parts.push(`saveDC=${eff.saveDC || 14}`);
        if (eff.saveMagic) parts.push("saveMagic=true");
        if (eff.saveCount) parts.push(`saveCount=${eff.saveCount}-${eff.failStatus || ""}`);
        if (eff.failCount) parts.push(`failCount=${eff.failCount}${eff.failMode || "-"}${eff.failStatus || ""}`);
      }
      if (eff.removeCondition) parts.push(`removeCondition=${eff.removeCondition}`);
      if (eff.chatFlavor) parts.push(`chatFlavor="${eff.chatFlavor}"`);
      if (eff.rollMode) parts.push(`rollMode=${eff.rollMode}`);
      if (eff.killAnim) parts.push("killAnim=true");
      if (eff.name) parts.push(`label="${eff.name}"`);

      changes.push({
        key: `flags.midi-qol.OverTime.${(eff.name || "effect").replace(/\s+/g, "_").toLowerCase()}`,
        mode: 0, // CUSTOM
        value: parts.join(", "),
        priority: 20
      });
    }

    // Midi-QOL roll modifier flags
    for (const f of (eff.flags || [])) {
      if (!f.type || !f.roll) continue;
      changes.push({
        key: `flags.midi-qol.${f.type}.${f.roll}`,
        mode: f.mode === "OVERRIDE" ? 5 : (f.mode === "ADD" ? 2 : 0),
        value: String(f.value ?? 1),
        priority: 20
      });
    }

    // Expiry triggers via DAE
    for (const trigger of (eff.expiryTriggers || [])) {
      changes.push({
        key: "flags.dae.specialDuration",
        mode: 0,
        value: trigger,
        priority: 20
      });
    }

    // Build duration
    const duration = {};
    if (eff.durationRounds && eff.durationRounds > 0) duration.rounds = parseInt(eff.durationRounds);

    return {
      name: eff.name || "New Effect",
      img: eff.img || "icons/svg/aura.svg",
      description: { value: eff.description || "" },
      disabled: false,
      statuses: eff.statuses || [],
      flags: { dnd5e: { concentration: !!eff.concentration } },
      duration,
      changes
    };
  }

  // ── Raw preview ───────────────────────────────────────────────────────────
  #updateRawPreview() {
    const preview = this.element.querySelector("#rawOutputPreview");
    const content = this.element.querySelector("#rawOutputContent");
    if (!preview || !content) return;
    if (this._selectedEffectIdx < 0 || this._selectedEffectIdx >= this._effects.length) {
      preview.style.display = "none";
      return;
    }
    preview.style.display = "";
    const payload = this.#buildEffectPayload(this._effects[this._selectedEffectIdx]);
    content.textContent = JSON.stringify(payload, null, 2);
  }

  // ── Item Search ───────────────────────────────────────────────────────────
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
        const valid = docs.filter(i => i).map(i => i.toObject());
        if (valid.length > 0) await npc.createEmbeddedDocuments("Item", valid);
      }

      // Inject Active Effects from the Effects tab
      if (app?._effects?.length > 0) {
        const effectPayloads = app._effects.map(eff => app.#buildEffectPayload(eff));
        if (effectPayloads.length > 0) await npc.createEmbeddedDocuments("ActiveEffect", effectPayloads);
      }

      ui.notifications.info(`Successfully created ${actorName}!`);
      if (app) app.close();
    } catch(err) {
      ui.notifications.error(`Failed to create Actor: ${err.message}`);
      console.error("Forge Character Creator | Error:", err);
    }
  }
}
