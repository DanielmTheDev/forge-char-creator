import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STATE, buildEffect, buildItem, KINDS, effectHasContent, summarize } from "./feature-payload.js";

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
