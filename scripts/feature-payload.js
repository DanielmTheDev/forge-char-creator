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

// Builder kinds — what the feature does. Drives which steps the UI shows.
export const KINDS = [
  { id: "attack",  label: "Attack",       hint: "Roll to hit. On a hit: damage, and optionally a saving throw with extra damage/conditions." },
  { id: "save",    label: "Saving Throw", hint: "Targets roll a save. On a failure: damage and/or effects. Half or no damage on a success." },
  { id: "buff",    label: "Buff / Heal",  hint: "On use, apply an effect or temporary HP to yourself or allies." },
  { id: "passive", label: "Passive",      hint: "Always on while the creature has this feature (e.g. +1 AC, advantage on saves)." },
  { id: "effect",  label: "Effect only",  hint: "A bare Active Effect saved on its own, to drag onto other items." }
];

// Default wizard state. Single source of truth for the initial state AND the
// post-create reset; deep-cloned on use so the arrays are never shared.
export const DEFAULT_STATE = {
  kind: "effect",            // attack | save | buff | passive | effect
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
  // Application mode (kind "effect" only; other kinds derive it)
  appMode: "activation",       // "passive" | "activation"
  activationTarget: "targets", // "wearer" | "targets" — also the buff's apply-to
  // Conditions
  statuses: [],
  // Adv/Disadv rows
  advRows: [],
  // Stat Modifiers
  acBonus: 0,
  abilityRows: [],      // [{ability: "str", value: 2}, ...]
  stackable: "none",    // "none" | "count" | "multi"
  // Use
  wrapActivation: "action",  // activity activation.type ("" = no cost)
  usesMode: "atwill",        // atwill | perRest | recharge
  usesMax: "1",
  rechargeOn: "5",
  wrapTargetCount: "1",
  wrapAreaSize: "20",        // template size in ft, used for area target types
  wrapTargetArea: "creature",
  // Attack
  attackType: "melee",       // melee | ranged
  attackRange: "5",
  toHitMode: "flat",         // flat (+X like a statblock) | derived (ability + prof + bonus)
  toHitFlat: "5",
  toHitAbility: "str",
  toHitBonus: "",
  damageRows: [],            // [{formula, type}] dealt on hit
  onHitSave: false,
  // Save
  saveMode: "save",          // save | none (auto damage)
  wrapSaveAbility: "dex",
  wrapSaveDC: "14",
  saveDamageRows: [],        // [{formula, type}] dealt on a failed save
  saveOnSuccess: "half",     // half | none
  // Buff
  buffMode: "apply",         // apply | temphp
  tempHpFormula: ""
};

// ── Changes ─────────────────────────────────────────────────────────────────

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
    // midi splits OverTime on commas and quotes the label: strip both from the name.
    parts.push(`label="${(s.name || "Effect").replace(/[",]/g, "").replace(/\s+/g, " ").trim() || "Effect"}"`);
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

// ── Helpers ─────────────────────────────────────────────────────────────────

const intOr = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const isNumeric = v => String(v ?? "").trim() !== "" && !isNaN(String(v).trim());
// dnd5e 5.2.5 CONFIG.DND5E.areaTargetTypes keys.
const AREA_WORDS = { circle: "circle", radius: "radius", sphere: "sphere", cone: "cone", cube: "cube",
                     cylinder: "cylinder", line: "line", square: "square", wall: "wall" };

export function effectHasContent(s) {
  return buildChanges(s).length > 0 || (s.statuses?.length ?? 0) > 0;
}

function damageParts(rows = []) {
  return rows.filter(r => r.formula?.trim())
    .map(r => ({ custom: { enabled: true, formula: r.formula.trim() }, types: [r.type] }));
}

function damageText(rows = []) {
  return rows.filter(r => r.formula?.trim()).map(r => `${r.formula.trim()} ${r.type}`).join(" + ");
}

// ── Description ─────────────────────────────────────────────────────────────

function deliverySentence(s) {
  const cost = ACTIVATION_TYPES.find(a => a.id === (s.wrapActivation ?? "action"));
  const dc = isNumeric(s.wrapSaveDC) ? `DC ${String(s.wrapSaveDC).trim()}` : "spell save DC";
  const saveTxt = () => {
    const dmg = damageText(s.saveDamageRows);
    let t = `${dc} ${s.wrapSaveAbility.toUpperCase()} save`;
    if (dmg) t += `, ${dmg} on a failure${s.saveOnSuccess === "none" ? " (none on success)" : " (half on success)"}`;
    return t + ".";
  };
  const count = intOr(s.wrapTargetCount, 1);
  const targets = s.wrapTargetArea in AREA_WORDS ? `${intOr(s.wrapAreaSize, 20)} ft ${AREA_WORDS[s.wrapTargetArea]}`
                                                : `${count} target${count === 1 ? "" : "s"}`;
  switch (s.kind) {
    case "attack": {
      const bonus = String(s.toHitBonus ?? "").trim();
      const flat = intOr(s.toHitFlat, 0);
      const hit = s.toHitMode === "derived"
        ? `${s.toHitAbility.toUpperCase()} + prof${bonus ? ` + ${bonus}` : ""}`
        : `${flat >= 0 ? "+" : ""}${flat}`;
      const ranged = s.attackType === "ranged";
      let t = `${ranged ? "Ranged" : "Melee"} Attack: ${hit} to hit, ${ranged ? "range" : "reach"} ${intOr(s.attackRange, 5)} ft, ${targets}.`;
      const dmg = damageText(s.damageRows);
      if (dmg) t += ` Hit: ${dmg}.`;
      if (s.onHitSave) {
        t += ` On hit: ${saveTxt()}`;
        if (effectHasContent(s)) t += " Effects apply on a failed save.";
      } else if (effectHasContent(s)) t += " Effects apply on hit.";
      return t;
    }
    case "save": {
      if (s.saveMode === "none") { const d = damageText(s.saveDamageRows); return d ? `${targets}: takes ${d}.` : ""; }
      return `${targets}: ${saveTxt()}${effectHasContent(s) ? " Effects apply on a failed save." : ""}`;
    }
    case "buff": {
      if (s.buffMode === "temphp") {
        const grant = `Grants ${s.tempHpFormula?.trim() || "5"} temporary hit points.`;
        return cost?.id ? `${cost.label}: ${grant.charAt(0).toLowerCase()}${grant.slice(1)}` : grant;
      }
      return `${cost?.id ? `${cost.label}: a` : "A"}pplies to ${s.activationTarget === "wearer" ? "self" : "target(s)"}.`;
    }
    case "passive": return "Passive (always active).";
    default:
      return s.appMode === "passive" ? "Mode: Passive (always active)."
        : `Mode: On Activation (applies to ${s.activationTarget === "wearer" ? "self" : "target(s)"}).`;
  }
}

function effectSentences(s) {
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
    summaries.push(`Modifiers: ${s.advRows.map(r => `${r.grants ? "grants " : ""}${r.type} on ${r.cat}`).join(", ")}.`);
  }

  // AC Modifier
  const acDescVal = parseInt(s.acBonus);
  if (acDescVal && acDescVal !== 0) summaries.push(`AC ${acDescVal > 0 ? "+" : ""}${acDescVal}.`);

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
    summaries.push(`Stacking: ${s.stackable === "multi" ? "Full Stack" : "Count Stacks"}.`);
  }

  // Duration — only meaningful when there is an effect to last.
  if (effectHasContent(s) || s.kind === "effect" || s.kind === "passive" || (s.kind === "buff" && s.buffMode === "apply")) {
    const durationRounds = parseInt(s.rounds);
    if (s.durationType === "fixed" && durationRounds > 0) {
      summaries.push(`Duration: ${durationRounds} round${durationRounds !== 1 ? "s" : ""}.`);
    } else if (s.durationType === "fixed" && !durationRounds && (!s.specialDuration || s.specialDuration === "none")) {
      summaries.push("Duration: Indefinite.");
    }
    if (s.specialDuration && s.specialDuration !== "none") {
      const sd = SPECIAL_DURATIONS.find(d => d.id === s.specialDuration);
      if (sd) summaries.push(`Expires at the ${sd.label.replace(/^(End|Start)/, m => m.toLowerCase())}.`);
    }
  }
  return summaries;
}

function usesSentence(s) {
  if (s.usesMode === "recharge") { const r = intOr(s.rechargeOn, 5); return r >= 6 ? "Recharge 6." : `Recharge ${r}–6.`; }
  if (s.usesMode === "perRest") return `${Math.max(1, intOr(s.usesMax, 1))}/long rest.`;
  return "";
}

export function summarize(s) {
  return [deliverySentence(s), ...effectSentences(s), usesSentence(s)].filter(Boolean).join(" ") || "A custom effect.";
}

// ── Effect ──────────────────────────────────────────────────────────────────

export function buildEffect(s) {
  const aeData = {
    name: s.name || "New Effect",
    img: s.img || "icons/svg/aura.svg",
    description: s.description?.trim() ? s.description : summarize(s),
    transfer: s.kind === "passive" || (s.kind === "effect" && s.appMode === "passive"),
    statuses: [...(s.statuses || [])],
    duration: s.durationType === "fixed" ? { rounds: parseInt(s.rounds) || 0 } : {},
    changes: buildChanges(s),
    // No core.overlay: that draws the icon full-size over the whole token.
    flags: {
      dae: { showIcon: true }
    }
  };

  // Stacking (DAE)
  if (s.stackable && s.stackable !== "none") aeData.flags.dae.stackable = s.stackable;

  // Special duration (DAE) — expired by Times-Up, e.g. end of the target's next turn
  if (s.specialDuration && s.specialDuration !== "none") aeData.flags.dae.specialDuration = [s.specialDuration];

  return aeData;
}

// ── Item ────────────────────────────────────────────────────────────────────

function buildUses(s) {
  if (s.usesMode === "recharge")
    return { max: "1", spent: 0, recovery: [{ period: "recharge", formula: String(intOr(s.rechargeOn, 5)) }] };
  if (s.usesMode === "perRest")
    return { max: String(Math.max(1, intOr(s.usesMax, 1))), spent: 0, recovery: [{ period: "lr", type: "recoverAll" }] };
  return null;
}

function buildTarget(s, areaTargetTypes) {
  if (s.kind === "buff" && s.activationTarget === "wearer") return { affects: { type: "self" }, override: true };
  if (s.wrapTargetArea in areaTargetTypes)
    return { template: { type: s.wrapTargetArea, size: String(intOr(s.wrapAreaSize, 20)), units: "ft" }, override: true };
  return { affects: { count: String(intOr(s.wrapTargetCount, 1)), type: s.wrapTargetArea }, override: true };
}

function saveDC(s) {
  const dcv = String(s.wrapSaveDC ?? "").trim();
  // dnd5e: any truthy `calculation` ignores `formula`; "" = custom formula.
  return isNumeric(dcv) ? { calculation: "", formula: dcv } : { calculation: "spellcasting", formula: "" };
}

// dnd5e 5.x keeps activation / target / damage / save on the ACTIVITY.
// FeatData has no such fields, so item-level writes are silently dropped.
function buildActivities(s, aeId, randomID, areaTargetTypes) {
  const link = aeId ? [{ _id: aeId }] : [];
  const base = (type, name) => ({
    _id: randomID(16), type, name,
    activation: { type: s.wrapActivation ?? "action", value: null, override: true },
    target: buildTarget(s, areaTargetTypes),
    effects: []
  });
  const saveAct = (name) => {
    const a = base("save", name);
    a.save = { ability: [s.wrapSaveAbility], dc: saveDC(s) };
    a.damage = { onSave: s.saveOnSuccess === "none" ? "none" : "half", parts: damageParts(s.saveDamageRows) };
    return a;
  };

  let primary;
  const extra = [];
  if (s.kind === "attack") {
    primary = base("attack", "Attack");
    const type = { value: s.attackType, classification: "weapon" };
    primary.attack = s.toHitMode === "derived"
      ? { ability: s.toHitAbility, bonus: String(s.toHitBonus ?? "").trim(), flat: false, type }
      : { ability: "none", bonus: String(intOr(s.toHitFlat, 0)), flat: true, type };
    primary.range = { value: String(intOr(s.attackRange, 5)), units: "ft", override: true };
    primary.damage = { includeBase: false, parts: damageParts(s.damageRows) };
    if (s.onHitSave) {
      // midi-qol: on a hit, the "other activity" save is rolled for the hit targets only.
      const sv = saveAct("On-Hit Save");
      sv.midiProperties = { automationOnly: true };
      sv.effects = link;
      primary.otherActivityId = sv._id;
      extra.push(sv);
    } else primary.effects = link;
  } else if (s.kind === "save") {
    if (s.saveMode === "none") {
      primary = base("damage", "Damage");
      primary.damage = { parts: damageParts(s.saveDamageRows) };
    } else primary = saveAct("Save");
    primary.effects = link;
  } else {
    if (s.buffMode === "temphp") {
      // Temp HP must come from a heal activity: hp.temp is a stored resource,
      // so an AE change on it never gets consumed by damage.
      primary = base("heal", "Temp HP");
      primary.healing = {
        number: 0, denomination: 0, bonus: "", types: ["temphp"],
        custom: { enabled: true, formula: s.tempHpFormula?.trim() || "5" },
        scaling: { mode: "", number: 1, formula: "" }
      };
    } else primary = base("utility", "Apply");
    if (s.activationTarget === "wearer") primary.range = { units: "self", override: true };
    primary.effects = link;
  }
  // Without consumption, recharge / per-rest uses never get spent (no-op).
  if (buildUses(s)) primary.consumption = { targets: [{ type: "itemUses", target: "", value: "1" }] };
  return [primary, ...extra];
}

export function buildItem(s, { randomID, areaTargetTypes = {} }) {
  const aeData = buildEffect(s);
  aeData._id = randomID(16);
  const name = s.name?.trim() || "New Feature";
  if (s.kind === "effect") {
    return { name: `[AE] ${name}`, img: s.img || "icons/svg/aura.svg", type: "feat",
             system: { description: { value: aeData.description } }, effects: [aeData] };
  }

  // Nothing to apply → no AE (else targets get a blank effect icon that never expires).
  const withAE = effectHasContent(s) || s.kind === "passive";
  const item = { name, img: s.img || "icons/svg/feature.svg", type: "feat",
                 system: { description: { value: aeData.description } }, effects: withAE ? [aeData] : [] };
  const uses = buildUses(s);
  if (uses) item.system.uses = uses;
  if (s.kind === "passive") return item;

  const acts = buildActivities(s, withAE ? aeData._id : null, randomID, areaTargetTypes);
  item.system.activities = Object.fromEntries(acts.map(a => [a._id, a]));
  return item;
}
