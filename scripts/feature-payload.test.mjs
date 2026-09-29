import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STATE, buildEffect, buildItem } from "./feature-payload.js";

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
