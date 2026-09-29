/**
 * Forge feature payload builder — pure. No DOM, no Foundry globals.
 * Foundry-only helpers (randomID, CONFIG.DND5E.areaTargetTypes) come in via `cfg`,
 * so node can unit-test every payload shape (scripts/feature-payload.test.mjs).
 */

// ── Constants ───────────────────────────────────────────────────────────────

export const CONDITIONS = [
  "blinded", "charmed", "deafened", "exhaustion", "frightened",
  "grappled", "incapacitated", "invisible", "paralyzed", "petrified",
  "poisoned", "prone", "restrained", "stunned", "unconscious"
];

export const DAMAGE_TYPES = [
  "acid","bludgeoning","cold","fire","force","lightning","necrotic",
  "piercing","poison","psychic","radiant","slashing","thunder","healing"
];

export const ABILITIES = [
  ["str","Strength"], ["dex","Dexterity"], ["con","Constitution"],
  ["int","Intelligence"], ["wis","Wisdom"], ["cha","Charisma"]
];

export const ADV_TYPES = [
  { id: "advantage",    label: "Advantage" },
  { id: "disadvantage", label: "Disadvantage" }
];

export const ADV_ROLL_CATS = [
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

// DAE special durations (expired by the Times-Up module — see CLAUDE.md).
export const SPECIAL_DURATIONS = [
  { id: "none",            label: "None" },
  { id: "turnEnd",         label: "End of target's next turn" },
  { id: "turnEndSource",   label: "End of source's next turn" },
  { id: "turnStart",       label: "Start of target's next turn" },
  { id: "turnStartSource", label: "Start of source's next turn" }
];

// Subset of CONFIG.DND5E.activityActivationTypes worth offering here.
export const ACTIVATION_TYPES = [
  { id: "action",   label: "Action" },
  { id: "bonus",    label: "Bonus Action" },
  { id: "reaction", label: "Reaction" },
  { id: "",         label: "No Cost" }
];

// Wizard wrapType -> dnd5e activity type / default activity name.
export const ACT_TYPES = { apply: "utility", attack: "attack", save: "save", damage: "damage", temphp: "heal" };
export const ACT_NAMES = { apply: "Apply",   attack: "Attack", save: "Save", damage: "Damage", temphp: "Temp HP" };

// Default wizard state. Single source of truth for the initial state AND the
// post-create reset; deep-cloned on use so the arrays are never shared.
export const DEFAULT_STATE = {
  name: "",
  img: "icons/svg/aura.svg",
  description: "",
  durationType: "fixed",     // "fixed" | "overtime"
  rounds: 0,
  specialDuration: "none",   // DAE special duration id, or "none"
  // OverTime
  otTrigger: "end",          // "start" | "end"
  otWhose: "target",         // "source" | "target"
  otDamage: "",
  otRollType: "damage",      // "damage" | "healing"
  otDamageType: "fire",
  otSave: false,
  otSaveAbility: "dex",
  otSaveDC: "14",
  otOnSave: "nodamage",      // "nodamage" | "halfdamage" | "fulldamage"
  otSuccesses: "1",
  // Application mode
  appMode: "activation",       // "passive" | "activation"
  activationTarget: "targets", // "wearer" | "targets"
  // Conditions
  statuses: [],
  // Adv/Disadv rows
  advRows: [],
  // Stat Modifiers
  acBonus: 0,
  abilityRows: [],      // [{ability: "str", value: 2}, ...]
  stackable: "none",    // "none" | "count" | "multi"
  // Output
  wrapInFeature: false,
  wrapType: "none",          // none | apply | attack | save | damage | temphp
  wrapActivation: "action",  // activity activation.type ("" = no cost)
  wrapTargetCount: "1",
  wrapAreaSize: "20",        // template size in ft, used for area target types
  wrapTargetArea: "creature",
  wrapDamageFormula: "",     // damage formula — the Temp HP formula when wrapType is "temphp"
  wrapDamageType: "bludgeoning",
  wrapSaveAbility: "dex",
  wrapSaveDC: "14"
};

// ── Payload builders ────────────────────────────────────────────────────────

export function buildChanges(s) {
  const changes = [];

  // Over-Time flag
  const hasDamage = s.otDamage && s.otDamage.trim();
  const hasSave = s.otSave && s.otSaveAbility;
  if (s.durationType === "overtime" && (hasDamage || hasSave)) {
    const trigger = s.otTrigger === "start" ? "start" : "end";
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
    if (row.type !== "advantage" && row.type !== "disadvantage") continue;
    const key = row.grants ? `flags.midi-qol.grants.${row.type}.${row.cat}`
                           : `flags.midi-qol.${row.type}.${row.cat}`;
    changes.push({ key, mode: 5, value: "1", priority: 20 });
  }

  // AC Bonus/Penalty
  const acVal = parseInt(s.acBonus);
  if (acVal && acVal !== 0) {
    changes.push({
      key: "system.attributes.ac.bonus",
      mode: 2, // ADD
      value: String(acVal),
      priority: 20
    });
  }

  // Ability Score Modifiers
  for (const row of (s.abilityRows || [])) {
    const numVal = parseInt(row.value);
    if (!numVal || numVal === 0) continue;
    changes.push({
      key: `system.abilities.${row.ability}.value`,
      mode: 2, // ADD
      value: String(numVal),
      priority: 20
    });
  }

  return changes;
}

export function buildEffect(s) {
  const changes = buildChanges(s);

  let descriptionText = s.description || "";
  if (!descriptionText.trim()) {
    const summaries = [];

    // Temp HP grant leads the summary — it is the headline of the ability.
    if (s.wrapInFeature && s.wrapType === "temphp") {
      const cost = ACTIVATION_TYPES.find(a => a.id === (s.wrapActivation ?? "action"));
      const grant = `Grants ${(s.wrapDamageFormula || "").trim() || "5"} temporary hit points.`;
      summaries.push(cost?.id ? `${cost.label}: ${grant.charAt(0).toLowerCase()}${grant.slice(1)}` : grant);
    }

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
      summaries.push(`Modifiers: ${s.advRows.map(r => `${r.grants ? "grants " : ""}${r.type} on ${r.cat}`).join(", ")}.`);
    }

    // AC Modifier
    const acDescVal = parseInt(s.acBonus);
    if (acDescVal && acDescVal !== 0) {
      summaries.push(`AC ${acDescVal > 0 ? "+" : ""}${acDescVal}.`);
    }

    // Ability Score Modifiers
    if (s.abilityRows?.length) {
      const mods = s.abilityRows.filter(r => r.value && parseInt(r.value) !== 0)
        .map(r => {
          const v = parseInt(r.value);
          return `${r.ability.toUpperCase()} ${v > 0 ? "+" : ""}${v}`;
        });
      if (mods.length) summaries.push(`Ability Modifiers: ${mods.join(", ")}.`);
    }

    // Stackability
    if (s.stackable && s.stackable !== "none") {
      const stackLabel = s.stackable === "multi" ? "Full Stack" : "Count Stacks";
      summaries.push(`Stacking: ${stackLabel}.`);
    }

    // Application Mode
    if (s.appMode === "passive") {
      summaries.push("Mode: Passive (always active).");
    } else if (s.appMode === "activation") {
      const target = s.activationTarget === "wearer" ? "self" : "target(s)";
      summaries.push(`Mode: On Activation (applies to ${target}).`);
    }

    // Duration
    const durationRounds = parseInt(s.rounds);
    if (s.durationType === "fixed" && durationRounds > 0) {
      summaries.push(`Duration: ${durationRounds} round${durationRounds !== 1 ? "s" : ""}.`);
    } else if (s.durationType === "fixed" && (!durationRounds || durationRounds === 0)
               && (!s.specialDuration || s.specialDuration === "none")) {
      summaries.push("Duration: Indefinite.");
    }

    if (s.specialDuration && s.specialDuration !== "none") {
      const sd = SPECIAL_DURATIONS.find(d => d.id === s.specialDuration);
      if (sd) summaries.push(`Expires at the ${sd.label.replace(/^(End|Start)/, m => m.toLowerCase())}.`);
    }

    descriptionText = summaries.join(" ") || "A custom effect.";
  }

  const aeData = {
    name: s.name || "New Effect",
    img: s.img || "icons/svg/aura.svg",
    description: descriptionText,
    transfer: s.appMode === "passive",
    statuses: [...(s.statuses || [])],
    duration: s.durationType === "fixed" ? { rounds: parseInt(s.rounds) || 0 } : {},
    changes,
    flags: {
      dae: { showIcon: true },
      core: { overlay: true }
    }
  };

  // Stacking (DAE)
  if (s.stackable && s.stackable !== "none") {
    aeData.flags.dae.stackable = s.stackable;
  }

  // Special duration (DAE) — expired by Times-Up, e.g. end of the target's next turn
  if (s.specialDuration && s.specialDuration !== "none") {
    aeData.flags.dae.specialDuration = [s.specialDuration];
  }

  return aeData;
}

export function buildItem(s, { randomID, areaTargetTypes = {} }) {
  const aeData = buildEffect(s);
  aeData._id = randomID(16);

  const itemData = {
    name: s.wrapInFeature ? s.name.trim() : `[AE] ${s.name.trim()}`,
    img: s.img || (s.wrapInFeature ? "icons/svg/feature.svg" : "icons/svg/aura.svg"),
    type: "feat",
    system: { description: { value: aeData.description } },
    effects: [aeData]
  };

  if (s.wrapInFeature && s.wrapType !== "none") {
    // dnd5e 5.x keeps activation / target / damage / save on the ACTIVITY.
    // FeatData has no such fields, so item-level writes are silently dropped
    // by the DataModel — everything below must live on the activity.
    const actId = randomID(16);
    const act = {
      _id: actId,
      type: ACT_TYPES[s.wrapType] ?? "utility",
      name: ACT_NAMES[s.wrapType] ?? "Apply",
      activation: { type: s.wrapActivation ?? "action", value: null, override: true },
      effects: [{ _id: aeData._id }]
    };

    // Area target types get a measured template; individual types a target count.
    if (s.wrapTargetArea in areaTargetTypes) {
      act.target = {
        template: {
          type: s.wrapTargetArea,
          size: String(parseInt(s.wrapAreaSize) || 20),
          units: "ft"
        },
        override: true
      };
    } else {
      act.target = {
        affects: {
          count: String(parseInt(s.wrapTargetCount) || 1),
          type: s.wrapTargetArea
        },
        override: true
      };
    }

    if (s.wrapType === "attack") {
      act.attack = { ability: "str", bonus: "", flat: false, type: { value: "melee" } };
    } else if (s.wrapType === "save") {
      const dcv = String(s.wrapSaveDC).trim();
      act.save = {
        ability: [s.wrapSaveAbility],
        dc: { calculation: isNaN(dcv) ? "spellcasting" : "custom", formula: isNaN(dcv) ? "" : dcv }
      };
      act.damage = { onSave: "half" };
    }

    const formula = s.wrapDamageFormula?.trim();
    if (s.wrapType === "temphp") {
      // Temp HP must come from a heal activity: system.attributes.hp.temp is a
      // stored resource, so an AE change on it never gets consumed by damage.
      act.healing = {
        number: 0,
        denomination: 0,
        bonus: "",
        types: ["temphp"],
        custom: { enabled: true, formula: formula || "5" },
        scaling: { mode: "", number: 1, formula: "" }
      };
    } else if (formula) {
      act.damage = act.damage || {};
      act.damage.parts = [{
        custom: { enabled: true, formula },
        types: [s.wrapDamageType]
      }];
    }

    itemData.system.activities = { [actId]: act };
  }

  return itemData;
}
