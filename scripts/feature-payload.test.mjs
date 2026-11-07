import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STATE, buildEffect, buildItem, KINDS, effectHasContent, summarize, buildLegendaryResistanceItem,
         parseDamage, allowedKind } from "./feature-payload.js";

let n = 0;
const cfg = { randomID: () => `id${String(++n).padStart(14, "0")}`, areaTargetTypes: { radius: {}, cone: {} } };
const st = (o = {}) => ({ ...structuredClone(DEFAULT_STATE), ...o });

test("passive effect has transfer + advantage flag", () => {
  const ae = buildEffect(st({ name: "Adv", appMode: "passive", advRows: [{ type: "advantage", cat: "attack.all", grants: false }] }));
  assert.equal(ae.transfer, true);
  assert.deepEqual(ae.changes[0], { key: "flags.midi-qol.advantage.attack.all", mode: 5, value: "1", priority: 20 });
});

test("overtime string", () => {
  const ae = buildEffect(st({ name: "Burn", durationType: "overtime", otDamage: "1d6", otDamageType: "fire",
    otSave: true, otSaveAbility: "dex", otSaveDC: "14", otOnSave: "halfdamage", otSuccesses: "1" }));
  assert.equal(ae.changes[0].value,
    'turn=end, damageRoll=1d6, damageType=fire, saveAbility=dex, saveDC=14, saveDamage=halfdamage, saveCount=1-, label="Burn"');
});

test("auto description keeps legacy sentences", () => {
  const ae = buildEffect(st({ name: "D", statuses: ["prone"], rounds: "5", stackable: "count", appMode: "passive" }));
  for (const s of ["Applies prone.", "Stacking: Count Stacks.", "Mode: Passive (always active).", "Duration: 5 rounds."])
    assert.ok(ae.description.includes(s), `${s} missing in: ${ae.description}`);
});

test("bare effect item (no wrap)", () => {
  const it = buildItem(st({ name: "X" }), cfg);
  assert.equal(it.name, "[AE] X");
  assert.equal(it.effects.length, 1);
  assert.equal(it.system.activities, undefined);
  assert.equal(it.effects[0]._id.length, 16);
});

const acts = it => Object.values(it.system.activities ?? {});

test("kinds list", () => assert.deepEqual(KINDS.map(k => k.id), ["attack", "save", "buff", "passive", "effect"]));

test("attack flat to-hit, damage rows, blank row dropped, no empty AE", () => {
  const it = buildItem(st({ kind: "attack", name: "Bite", toHitFlat: "+7", attackRange: "10",
    damageRows: [{ formula: "1d8+3", type: "piercing" }, { formula: " ", type: "fire" }] }), cfg);
  const [a] = acts(it);
  assert.equal(it.name, "Bite");
  assert.equal(a.type, "attack");
  assert.deepEqual(a.attack, { ability: "none", bonus: "7", flat: true, type: { value: "melee", classification: "weapon" } });
  assert.deepEqual(a.range, { value: "10", units: "ft", override: true });
  assert.equal(a.damage.parts.length, 1);
  assert.deepEqual(a.damage.parts[0], { custom: { enabled: true, formula: "1d8+3" }, types: ["piercing"] });
  assert.equal(it.effects.length, 0);
  assert.equal(a.effects.length, 0);
  assert.equal(a._id.length, 16);
});

test("attack derived to-hit", () => {
  const [a] = acts(buildItem(st({ kind: "attack", toHitMode: "derived", toHitAbility: "dex", toHitBonus: "1", attackType: "ranged" }), cfg));
  assert.deepEqual(a.attack, { ability: "dex", bonus: "1", flat: false, type: { value: "ranged", classification: "weapon" } });
});

test("attack blank to-hit → +0, blank range → 5", () => {
  const [a] = acts(buildItem(st({ kind: "attack", toHitFlat: "", attackRange: "" }), cfg));
  assert.equal(a.attack.bonus, "0");
  assert.equal(a.range.value, "5");
});

test("attack on-hit save chain", () => {
  const it = buildItem(st({ kind: "attack", name: "Venom Bite", damageRows: [{ formula: "5", type: "piercing" }],
    onHitSave: true, wrapSaveAbility: "con", wrapSaveDC: "13", saveOnSuccess: "none",
    saveDamageRows: [{ formula: "4", type: "poison" }], statuses: ["poisoned"], rounds: "1" }), cfg);
  const [atk, sv] = acts(it);
  assert.equal(atk.type, "attack");
  assert.equal(sv.type, "save");
  assert.equal(atk.otherActivityId, sv._id);
  assert.deepEqual(sv.midiProperties, { automationOnly: true });
  assert.deepEqual(atk.effects, []);
  assert.deepEqual(sv.effects, [{ _id: it.effects[0]._id }]);
  assert.deepEqual(sv.save, { ability: ["con"], dc: { calculation: "", formula: "13" } });
  assert.equal(sv.damage.onSave, "none");
  assert.equal(sv.damage.parts[0].custom.formula, "4");
  assert.deepEqual(it.effects[0].statuses, ["poisoned"]);
});

test("attack without save: AE rides the attack (applied on hit)", () => {
  const it = buildItem(st({ kind: "attack", statuses: ["prone"] }), cfg);
  const [a] = acts(it);
  assert.deepEqual(a.effects, [{ _id: it.effects[0]._id }]);
});

test("save kind: custom DC uses empty calculation; blank DC → spellcasting", () => {
  const [a] = acts(buildItem(st({ kind: "save", wrapSaveAbility: "dex", wrapSaveDC: "16",
    saveDamageRows: [{ formula: "8d6", type: "fire" }], wrapTargetArea: "radius", wrapAreaSize: "20" }), cfg));
  assert.equal(a.type, "save");
  assert.deepEqual(a.save.dc, { calculation: "", formula: "16" });
  assert.equal(a.damage.onSave, "half");
  assert.deepEqual(a.target, { template: { type: "radius", size: "20", units: "ft" }, override: true });
  const [b] = acts(buildItem(st({ kind: "save", wrapSaveDC: "" }), cfg));
  assert.deepEqual(b.save.dc, { calculation: "spellcasting", formula: "" });
});

test("save kind, no save → damage activity", () => {
  const [a] = acts(buildItem(st({ kind: "save", saveMode: "none", saveDamageRows: [{ formula: "2d6", type: "fire" }] }), cfg));
  assert.equal(a.type, "damage");
  assert.equal(a.save, undefined);
  assert.equal(a.damage.parts[0].custom.formula, "2d6");
});

test("buff apply embeds its AE and targets self", () => {
  const it = buildItem(st({ kind: "buff", activationTarget: "wearer", acBonus: "1" }), cfg);
  const [a] = acts(it);
  assert.equal(a.type, "utility");
  assert.equal(it.effects.length, 1);
  assert.deepEqual(a.target, { affects: { type: "self" }, override: true });
  assert.deepEqual(a.range, { units: "self", override: true });
});

test("buff temp HP → heal activity", () => {
  const [a] = acts(buildItem(st({ kind: "buff", buffMode: "temphp", tempHpFormula: "2d4+2" }), cfg));
  assert.equal(a.type, "heal");
  assert.deepEqual(a.healing.types, ["temphp"]);
  assert.equal(a.healing.custom.formula, "2d4+2");
});

test("passive: no activities, AE transfer", () => {
  const it = buildItem(st({ kind: "passive", acBonus: "1" }), cfg);
  assert.equal(it.system.activities, undefined);
  assert.equal(it.effects[0].transfer, true);
});

test("recharge + per-rest uses add consumption on primary only", () => {
  const it = buildItem(st({ kind: "attack", usesMode: "recharge", rechargeOn: "5", onHitSave: true }), cfg);
  assert.deepEqual(it.system.uses, { max: "1", spent: 0, recovery: [{ period: "recharge", formula: "5" }] });
  const [atk, sv] = acts(it);
  assert.deepEqual(atk.consumption, { targets: [{ type: "itemUses", target: "", value: "1" }] });
  assert.equal(sv.consumption, undefined);
  const it2 = buildItem(st({ kind: "save", usesMode: "perRest", usesMax: "3" }), cfg);
  assert.deepEqual(it2.system.uses, { max: "3", spent: 0, recovery: [{ period: "lr", type: "recoverAll" }] });
});

test("effectHasContent", () => {
  assert.equal(effectHasContent(st()), false);
  assert.equal(effectHasContent(st({ statuses: ["prone"] })), true);
  assert.equal(effectHasContent(st({ acBonus: "2" })), true);
});

test("summary: attack with rider", () => {
  const s = summarize(st({ kind: "attack", toHitFlat: "7", damageRows: [{ formula: "1d8+3", type: "piercing" }],
    onHitSave: true, wrapSaveAbility: "con", wrapSaveDC: "13", saveDamageRows: [{ formula: "2d6", type: "poison" }],
    statuses: ["poisoned"], rounds: "1", usesMode: "recharge", rechargeOn: "5" }));
  assert.ok(s.startsWith("Melee Attack: +7 to hit, reach 5 ft, 1 target. Hit: 1d8+3 piercing. On hit: DC 13 CON save, 2d6 poison on a failure (half on success). Effects apply on a failed save."), s);
  assert.ok(s.includes("Applies poisoned."), s);
  assert.ok(s.includes("Recharge 5–6."), s);
});

test("summary: temp HP keeps legacy wording", () => {
  assert.ok(summarize(st({ kind: "buff", buffMode: "temphp", tempHpFormula: "7", wrapActivation: "bonus" }))
    .startsWith("Bonus Action: grants 7 temporary hit points."));
});

test("review: circle area is described as an area, not '1 target'", () => {
  const s = summarize(st({ kind: "save", wrapTargetArea: "circle", wrapAreaSize: "15", wrapSaveDC: "12" }));
  assert.ok(s.startsWith("15 ft circle: DC 12"), s);
});

test("review: temp HP buff with no effect content embeds no blank AE", () => {
  const it = buildItem(st({ kind: "buff", buffMode: "temphp", tempHpFormula: "5" }), cfg);
  assert.equal(it.effects.length, 0);
  assert.deepEqual(acts(it)[0].effects, []);
});

test("review: OverTime label survives quotes and commas in the name", () => {
  const ae = buildEffect(st({ name: 'Burn, "Baby"', durationType: "overtime", otDamage: "1d6" }));
  const v = ae.changes[0].value;
  assert.ok(v.endsWith('label="Burn Baby"'), v);
  assert.equal(v.split(",").length, 4, `only the 4 real key=value separators: ${v}`);
});

test("status effect is not a token overlay", () => {
  const ae = buildEffect(st({ name: "Scare", statuses: ["frightened"] }));
  assert.equal(ae.flags.core?.overlay, undefined);
});

test("legendary action: activation type + cost on every activity", () => {
  const it = buildItem(st({ kind: "attack", wrapActivation: "legendary", legendaryCost: "2", damageRows: [{ formula: "2d6", type: "slashing" }] }), cfg);
  for (const a of Object.values(it.system.activities)) assert.deepEqual(a.activation, { type: "legendary", value: 2, override: true });
});

test("legendary cost clamps to 1-3; non-legendary keeps value null", () => {
  const leg = (c) => Object.values(buildItem(st({ kind: "save", wrapActivation: "legendary", legendaryCost: c }), cfg).system.activities)[0].activation.value;
  assert.equal(leg("9"), 3);
  assert.equal(leg(""), 1);
  const plain = Object.values(buildItem(st({ kind: "save" }), cfg).system.activities)[0];
  assert.equal(plain.activation.value, null);
});

test("legendary description states the cost once", () => {
  assert.match(summarize(st({ kind: "save", wrapActivation: "legendary", legendaryCost: "2" })), /^Legendary Action \(costs 2\)\. /);
  const buff = summarize(st({ kind: "buff", wrapActivation: "legendary", legendaryCost: "1", activationTarget: "wearer" }));
  assert.equal(buff.match(/Legendary Action/g).length, 1);
  assert.match(buff, /^Legendary Action \(costs 1\)\. /);
});

test("alsoLegendary: duplicates activities as a legendary set, on-hit save relinked", () => {
  const it = buildItem(st({ kind: "attack", name: "Tail", wrapActivation: "action", alsoLegendary: true, legendaryCost: "2",
    onHitSave: true, damageRows: [{ formula: "2d8", type: "bludgeoning" }], statuses: ["prone"] }), cfg);
  const all = acts(it);
  assert.equal(all.length, 4);
  const [atk, sv, latk, lsv] = all;
  assert.deepEqual([atk.activation.type, atk.activation.value], ["action", null]);
  assert.deepEqual([latk.activation.type, latk.activation.value], ["legendary", 2]);
  assert.equal(lsv.activation.type, "legendary");
  assert.equal(atk.otherActivityId, sv._id);
  assert.equal(latk.otherActivityId, lsv._id);
  assert.notEqual(latk._id, atk._id);
  assert.match(latk.name, /Legendary/);
  assert.deepEqual(latk.attack, atk.attack);
  assert.deepEqual(lsv.effects, sv.effects);
  for (const a of all) assert.match(a._id, /^[A-Za-z0-9]{16}$/);
});

test("alsoLegendary ignored when the main cost is already legendary; described", () => {
  const one = buildItem(st({ kind: "save", wrapActivation: "legendary", alsoLegendary: true }), cfg);
  assert.equal(acts(one).length, 1);
  const d = summarize(st({ kind: "save", wrapActivation: "action", alsoLegendary: true, legendaryCost: "3" }));
  assert.match(d, /Also a Legendary Action \(costs 3\)\./);
});

test("alsoLegendary: recharge/uses consumption on both sets", () => {
  const it = buildItem(st({ kind: "save", alsoLegendary: true, usesMode: "recharge", rechargeOn: "5" }), cfg);
  for (const a of acts(it)) assert.equal(a.consumption?.targets?.[0]?.type, "itemUses");
});

test("legendary resistance item: midi optional save-fail → success, spends actor legres", () => {
  const it = buildLegendaryResistanceItem(3);
  assert.equal(it.name, "Legendary Resistance");
  assert.equal(it.type, "feat");
  assert.match(it.system.description.value, /3\/Day/);
  const [ae] = it.effects;
  assert.equal(ae.transfer, true);
  const ch = Object.fromEntries(ae.changes.map(c => [c.key, c.value]));
  assert.equal(ch["flags.midi-qol.optional.LegRes.save.fail.all"], "success");
  assert.equal(ch["flags.midi-qol.optional.LegRes.count"], "@resources.legres.value");
  assert.equal(ch["flags.midi-qol.optional.LegRes.label"], "Legendary Resistance");
});

// ── Items (weapon / equipment) ──────────────────────────────────────────────

const sword = (o = {}) => st({ itemType: "weapon", kind: "attack", name: "Blade", weaponType: "martialM",
  damageRows: [{ formula: "1d8", type: "slashing" }], ...o });

test("feature stays a feat (default item type)", () => {
  const it = buildItem(st({ kind: "attack", name: "Claw", damageRows: [{ formula: "5", type: "slashing" }] }), cfg);
  assert.equal(it.type, "feat");
  assert.equal(it.system.equipped, undefined);
});

test("kind is coerced to what the item type allows", () => {
  assert.equal(allowedKind("weapon", "save"), "attack");
  assert.equal(allowedKind("equipment", "attack"), "passive");
  assert.equal(allowedKind("equipment", "buff"), "buff");
  assert.equal(allowedKind("feat", "effect"), "effect");
  assert.equal(buildItem(sword({ kind: "effect" }), cfg).type, "weapon"); // never an [AE] bare effect
});

test("parseDamage: dice, dice+bonus, flat → custom", () => {
  assert.deepEqual([parseDamage("1d8", "slashing").number, parseDamage("1d8", "slashing").denomination], [1, 8]);
  assert.equal(parseDamage("2d6 + 1", "fire").bonus, "1");
  assert.equal(parseDamage("1d4-1", "fire").bonus, "-1");
  assert.deepEqual(parseDamage("5", "piercing").custom, { enabled: true, formula: "5" });
  assert.equal(parseDamage("", "fire"), null);
});

test("weapon, calculated: base damage on the item, includeBase, weapon picks ability, magic +1", () => {
  const it = buildItem(sword({ toHitMode: "derived", toHitAbility: "", magicBonus: "1", weaponProps: ["fin", "ver", "bogus"],
    versatileDamage: "1d10", damageRows: [{ formula: "1d8", type: "slashing" }, { formula: "1d6", type: "fire" }] }), cfg);
  assert.equal(it.type, "weapon");
  assert.equal(it.img, "icons/svg/sword.svg");
  assert.equal(it.system.type.value, "martialM");
  assert.equal(it.system.magicalBonus, 1);
  assert.deepEqual(it.system.properties.sort(), ["fin", "mgc", "ver"]);
  assert.equal(it.system.equipped, true);
  assert.equal(it.system.damage.base.denomination, 8);
  assert.equal(it.system.damage.versatile.denomination, 10);
  const [a] = acts(it);
  assert.deepEqual([a.attack.flat, a.attack.ability, a.attack.type.value], [false, "", "melee"]);
  assert.equal(a.damage.includeBase, true);
  assert.equal(a.damage.parts.length, 1, "only the extra (fire) row; base row lives on the item");
  assert.equal(a.damage.parts[0].types[0], "fire");
  assert.ok(it.system.description.value.includes("+ mod + 1 slashing"), it.system.description.value);
});

test("weapon, fixed: statblock-exact — flat to-hit, no base damage, no auto mod", () => {
  const it = buildItem(sword({ toHitMode: "flat", toHitFlat: "7", magicBonus: "1", damageRows: [{ formula: "1d8+4", type: "slashing" }] }), cfg);
  const [a] = acts(it);
  assert.deepEqual([a.attack.flat, a.attack.bonus], [true, "7"]);
  assert.equal(a.damage.includeBase, false);
  assert.equal(a.damage.parts[0].custom.formula, "1d8+4");
  assert.equal(it.system.damage, undefined);
});

test("weapon type decides melee/ranged; ranged range + long", () => {
  const it = buildItem(sword({ weaponType: "martialR", attackType: "melee", attackRange: "150", attackRangeLong: "600" }), cfg);
  assert.equal(acts(it)[0].attack.type.value, "ranged");
  assert.deepEqual(it.system.range, { value: 150, long: 600, units: "ft" });
  const nat = buildItem(sword({ weaponType: "natural", attackType: "ranged" }), cfg);
  assert.equal(acts(nat)[0].attack.type.value, "ranged");
});

test("weapon on-hit rider still applies via the effect", () => {
  const it = buildItem(sword({ statuses: ["prone"] }), cfg);
  assert.equal(it.effects.length, 1);
  assert.equal(it.effects[0].transfer, false);
  assert.deepEqual(acts(it)[0].effects, [{ _id: it.effects[0]._id }]);
});

test("armor: base AC, dex cap, magic bonus, stealth, no empty AE, no activities", () => {
  const it = buildItem(st({ itemType: "equipment", kind: "passive", name: "Plate", equipType: "medium",
    armorValue: "14", armorDex: "2", magicBonus: "1", stealthDis: true, rarity: "rare" }), cfg);
  assert.equal(it.type, "equipment");
  assert.deepEqual(it.system.armor, { value: 14, dex: 2, magicalBonus: 1 });
  assert.deepEqual(it.system.properties.sort(), ["mgc", "stealthDisadvantage"]);
  assert.equal(it.effects.length, 0);
  assert.equal(it.system.activities, undefined);
  assert.ok(it.system.description.value.startsWith("Medium Armor, AC 15 + Dex (max 2)"), it.system.description.value);
  assert.ok(!it.system.description.value.includes("Indefinite"));
});

test("heavy armor ignores dex; shield is a bonus", () => {
  const h = buildItem(st({ itemType: "equipment", kind: "passive", name: "H", equipType: "heavy", armorValue: "18", armorDex: "" }), cfg);
  assert.equal(h.system.armor.dex, null);
  assert.ok(h.system.description.value.startsWith("Heavy Armor, AC 18."), h.system.description.value);
  const sh = buildItem(st({ itemType: "equipment", kind: "passive", name: "S", equipType: "shield", armorValue: "2", magicBonus: "1" }), cfg);
  assert.ok(sh.system.description.value.startsWith("Shield, +3 AC"), sh.system.description.value);
});

test("wearable with a passive effect: transfer AE (active only while equipped/attuned)", () => {
  const it = buildItem(st({ itemType: "equipment", kind: "passive", name: "Ring", equipType: "ring", acBonus: 1, attunement: "required" }), cfg);
  assert.equal(it.system.armor.value, null);
  assert.equal(it.system.attuned, false, "never pre-attuned: slot limit is the owner's call");
  assert.ok(it.system.properties.includes("mgc"));
  assert.equal(it.effects.length, 1);
  assert.equal(it.effects[0].transfer, true);
  assert.ok(it.system.description.value.includes("requires attunement"));
});

test("wearable with a use: activity + uses (e.g. 1/long rest temp HP)", () => {
  const it = buildItem(st({ itemType: "equipment", kind: "buff", name: "Brooch", equipType: "wondrous",
    buffMode: "temphp", tempHpFormula: "10", usesMode: "perRest", usesMax: "1", activationTarget: "wearer" }), cfg);
  assert.equal(acts(it)[0].type, "heal");
  assert.equal(it.system.uses.max, "1");
  assert.ok(acts(it)[0].consumption);
});
