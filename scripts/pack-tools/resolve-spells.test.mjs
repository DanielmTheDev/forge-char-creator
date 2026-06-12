// Pure resolution of actor spellcasting/spells -> embedded items + sheet data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveActorSpells, validateActorSpells } from "./resolve-spells.mjs";

const ID16 = /^[A-Za-z0-9]{16}$/;

function spellDoc(name, id) {
  return {
    _id: id,
    name,
    type: "spell",
    img: "icons/magic/light/projectile-flare-blue.webp",
    system: {
      level: 1,
      preparation: { mode: "prepared", prepared: false },
      activities: {
        dnd5eactivity000: {
          _id: "dnd5eactivity000",
          type: "attack",
          effects: [{ _id: "effAAAAAAAAAAAA1" }],
        },
      },
    },
    effects: [{ _id: "effAAAAAAAAAAAA1", name: `${name} base` }],
    folder: "someFolderId00000",
  };
}

const MAP = new Map([
  ["guiding bolt", spellDoc("Guiding Bolt", "phbsplGuidingBol")],
  ["light", spellDoc("Light", "phbsplLight00000")],
]);

const ACTOR = {
  _id: "HzN1NtNFb77tv5t1",
  name: "Caster",
  system: { abilities: {}, attributes: {}, details: {} },
  items: [],
  spellcasting: { ability: "cha", level: 3, slots: { 1: 2 } },
  spells: ["Guiding Bolt", "Light"],
};

test("resolveActorSpells inlines re-keyed spells + sets sheet data", () => {
  const out = resolveActorSpells(ACTOR, MAP);
  assert.equal(out.system.attributes.spellcasting, "cha");
  assert.equal(out.system.details.spellLevel, 3);
  assert.deepEqual(out.system.spells.spell1, { value: 2, max: 2, override: 2 });
  assert.equal(out.items.length, 2);
  assert.ok(!("spells" in out) && !("spellcasting" in out), "source fields consumed");

  const [gb, light] = out.items;
  assert.equal(gb.name, "Guiding Bolt");
  // Every id re-keyed to fresh deterministic 16-char ids; activity map key === _id.
  for (const item of [gb, light]) {
    assert.ok(ID16.test(item._id) && item._id !== "phbsplGuidingBol");
    for (const [aid, act] of Object.entries(item.system.activities)) {
      assert.ok(ID16.test(aid) && aid !== "dnd5eactivity000");
      assert.equal(act._id, aid);
    }
    assert.ok(!("folder" in item), "compendium folder dropped");
    assert.equal(item.system.preparation.prepared, true, "NPCs cannot toggle prepare");
  }
  // Activity effect ref follows the re-keyed embedded effect id.
  const effId = gb.effects[0]._id;
  assert.ok(ID16.test(effId) && effId !== "effAAAAAAAAAAAA1");
  assert.equal(Object.values(gb.system.activities)[0].effects[0]._id, effId);
  // Deterministic: same input -> same ids.
  assert.equal(resolveActorSpells(ACTOR, MAP).items[0]._id, gb._id);
  // Distinct spells get distinct ids.
  assert.notEqual(gb._id, light._id);
});

test("resolveActorSpells is a no-op without spell fields and never mutates input", () => {
  const plain = { _id: "AAAAAAAAAAAAAAA1", name: "NoCaster", items: [] };
  assert.deepEqual(resolveActorSpells(plain, MAP), plain);
  const before = JSON.stringify(ACTOR);
  resolveActorSpells(ACTOR, MAP);
  assert.equal(JSON.stringify(ACTOR), before);
});

test("validateActorSpells catches authoring errors", () => {
  const names = ["Guiding Bolt", "Light"];
  assert.deepEqual(validateActorSpells({ name: "X" }, names), []);
  assert.match(validateActorSpells({ name: "X", spells: ["Guiding Bolt"] }, names)[0], /requires a "spellcasting"/);
  assert.match(validateActorSpells({ name: "X", spellcasting: { ability: "cha", level: 3 } }, names)[0], /dead config/);
  const bad = validateActorSpells({ name: "X", spellcasting: { ability: "lol", level: 0, slots: { 99: -1 } }, spells: ["Wish"] }, names);
  assert.ok(bad.some(e => /not in spell-cache/.test(e)));
  assert.ok(bad.some(e => /spellcasting.ability/.test(e)));
  assert.ok(bad.some(e => /spellcasting.level/.test(e)));
  assert.ok(bad.some(e => /slot level "99"/.test(e)));
  assert.ok(bad.some(e => /slot count for level 99/.test(e)));
});

test("resolveActorSpells throws on unresolved spell name", () => {
  assert.throws(() => resolveActorSpells({ ...ACTOR, spells: ["Wish"] }, MAP), /not in spell-cache/);
});
