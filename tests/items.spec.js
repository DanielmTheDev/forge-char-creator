import { test, expect } from './helpers/fixtures.js';
import { pipeConsole } from './helpers/foundry.js';

// Weapons + armor built through the Feature Builder UI, saved to forge-items, then
// exercised on real actors. Dice fixed via randomUniform = 0.5 (d20 → 10, d8 → 4).

// Runs in the page: opens the builder, applies `steps` ([selector, value] or a click
// selector), creates, returns the saved pack doc's data. Shared by both tests.
const BUILD = async (name, steps) => {
  const { EffectCreatorApp } = await import("./modules/forge-char-creator/scripts/effect-creator.js");
  const app = new EffectCreatorApp();
  await app.render(true);
  await new Promise(r => setTimeout(r, 250));
  const el = app.element;
  const set = (sel, v) => {
    const i = el.querySelector(sel);
    if (!i) throw new Error(`missing ${sel}`);
    if (i.type === "checkbox" || i.type === "radio") i.checked = v; else i.value = v;
    i.dispatchEvent(new Event("change", { bubbles: true }));
  };
  set("[data-ef='name']", name);
  for (const s of steps) typeof s === "string" ? el.querySelector(s).click() : set(s[0], s[1]);
  const ui = { kindDisabled: [...el.querySelectorAll("[name='kind']")].filter(r => r.disabled).map(r => r.value),
               kind: el.querySelector("[name='kind']:checked")?.value,
               itemStep: !el.querySelector(".fc-step[data-step='item']").hidden };
  const doc = await new Promise((res, rej) => {
    const h = Hooks.on("createItem", i => { if (i.name !== name) return; Hooks.off("createItem", h); res(i); });
    setTimeout(() => { Hooks.off("createItem", h); rej(new Error("create timeout")); }, 20000);
    el.querySelector("button[data-action='createEffect']").click();
  });
  app.close();
  return { doc, ui };
};

const SWEEP = async (re) => {
  for (const t of canvas.scene.tokens.filter(t => re.test(t.name))) await t.delete();
  for (const a of game.actors.filter(a => re.test(a.name))) await a.delete();
  const p = game.packs.get("forge-char-creator.forge-items");
  for (const i of (await p.getIndex()).filter(i => re.test(i.name))) await (await p.getDocument(i._id)).delete();
};

test('Weapon items: calculated (+1 finesse) and fixed (statblock) attacks via real midi @combat', async ({ gmPage: page }) => {
  test.setTimeout(240000);
  pipeConsole(page);

  const res = await page.evaluate(async ([buildSrc, sweepSrc]) => {
    const BUILD = eval(buildSrc), SWEEP = eval(sweepSrc);
    const log = [];
    const made = [];
    const origRandom = CONFIG.Dice.randomUniform;
    try {
      await SWEEP(/^(Calc Blade|Fixed Blade|Duelist|AC1[678]) E2E$/);
      const calc = await BUILD("Calc Blade E2E", [
        ["[name='itemType'][value='weapon']", true], ["[data-ef='weaponType']", "martialM"],
        ["[data-wprop='fin']", true], ["[data-ef='magicBonus']", "1"],
        "[data-add-row='damageRows']",
        [".dmg-formula[data-list='damageRows'][data-idx='0']", "1d8"],
        [".dmg-type[data-list='damageRows'][data-idx='0']", "slashing"]]);
      made.push(calc.doc);
      const fixed = await BUILD("Fixed Blade E2E", [
        ["[name='itemType'][value='weapon']", true], ["[data-ef='magicBonus']", "1"],
        ["[name='toHitMode'][value='flat']", true], ["[data-ef='toHitFlat']", "7"],
        "[data-add-row='damageRows']",
        [".dmg-formula[data-list='damageRows'][data-idx='0']", "1d8+4"],
        [".dmg-type[data-list='damageRows'][data-idx='0']", "slashing"]]);
      made.push(fixed.doc);
      log.push("built");

      // DEX 16 (+3), CR 1 (prof +2). Calc: 10 + 3 + 2 + 1 = 16, 1d8+3+1 = 8. Fixed: 10 + 7 = 17, 1d8+4 = 8.
      const attacker = await Actor.create({ name: "Duelist E2E", type: "npc",
        system: { abilities: { str: { value: 10 }, dex: { value: 16 } }, details: { cr: 1 } } });
      made.push(attacker);
      const items = await attacker.createEmbeddedDocuments("Item", [calc.doc, fixed.doc].map(d => {
        const o = d.toObject(); delete o._id; delete o.folder; return o;
      }));
      const byName = n => items.find(i => i.name === n);
      const label = i => i.system.activities.find(a => a.type === "attack").labels.toHit;

      CONFIG.Dice.randomUniform = () => 0.5;
      const scene = canvas.scene;
      const tok = async (actor, x) => {
        const [t] = await scene.createEmbeddedDocuments("Token", [{ actorId: actor.id, name: actor.name, x, y: 600 }]);
        made.unshift(t);
        return t;
      };
      await tok(attacker, 100);
      const swing = async (item, ac) => {
        const target = await Actor.create({ name: `AC${ac} E2E`, type: "npc", system: {
          attributes: { hp: { value: 50, max: 50 }, ac: { calc: "flat", flat: ac } } } });
        made.push(target);
        const tt = await tok(target, 200);
        await new Promise(r => setTimeout(r, 1200));
        const atk = item.system.activities.find(a => a.type === "attack");
        await MidiQOL.completeActivityUse(atk.uuid, { midiOptions: { fastForward: true, fastForwardAttack: true,
          fastForwardDamage: true, autoRollDamage: "always", targetUuids: [tt.uuid], ignoreUserTargets: true } });
        await new Promise(r => setTimeout(r, 3000));
        const hp = tt.actor.system.attributes.hp.value;
        await tt.delete(); made.splice(made.indexOf(tt), 1);
        return hp;
      };
      const out = {
        calcToHit: label(byName("Calc Blade E2E")), fixedToHit: label(byName("Fixed Blade E2E")),
        calcHit: await swing(byName("Calc Blade E2E"), 16), calcMiss: await swing(byName("Calc Blade E2E"), 17),
        fixedHit: await swing(byName("Fixed Blade E2E"), 17), fixedMiss: await swing(byName("Fixed Blade E2E"), 18),
        calcType: calc.doc.type, calcUi: calc.ui, pack: calc.doc.pack
      };
      return { ok: true, ...out, log };
    } catch (e) {
      return { ok: false, error: e.message, log };
    } finally {
      CONFIG.Dice.randomUniform = origRandom;
      for (const d of made) await d.delete().catch(() => {});
    }
  }, [BUILD.toString(), SWEEP.toString()]);

  console.log('ITEMS RESULT: ' + JSON.stringify(res, null, 1));
  expect(res.ok, res.error).toBeTruthy();
  expect(res.pack).toBe("forge-char-creator.forge-items");
  expect(res.calcType).toBe("weapon");
  expect(res.calcUi.itemStep).toBe(true);
  expect(res.calcUi.kind).toBe("attack");
  expect(res.calcUi.kindDisabled.sort()).toEqual(["buff", "effect", "passive", "save"]);
  expect(res.calcToHit).toBe("+6");   // DEX 3 (finesse) + prof 2 + magic 1
  expect(res.fixedToHit).toBe("+7");  // statblock exact: magic NOT added again
  expect(res.calcHit).toBe(42);       // 4 + 3 + 1 (hit exactly at AC 16)
  expect(res.calcMiss).toBe(50);
  expect(res.fixedHit).toBe(42);      // 4 + 4, no auto mod / magic
  expect(res.fixedMiss).toBe(50);
});

test('Armor + ring: AC from equipped items, attunement gate, statblock AC reconcile', async ({ gmPage: page }) => {
  test.setTimeout(180000);
  pipeConsole(page);

  const res = await page.evaluate(async ([buildSrc, sweepSrc]) => {
    const BUILD = eval(buildSrc), SWEEP = eval(sweepSrc);
    const made = [];
    try {
      await SWEEP(/^(Mail|Ring|Buckler|Wearer|Statblock Knight|Statblock Guard) E2E$/);
      const armor = await BUILD("Mail E2E", [
        ["[name='itemType'][value='equipment']", true], ["[data-ef='equipType']", "medium"],
        ["[data-ef='magicBonus']", "1"]]);                         // medium prefill: AC 14, max Dex 2
      const ring = await BUILD("Ring E2E", [
        ["[name='itemType'][value='equipment']", true], ["[data-ef='equipType']", "ring"],
        ["[data-ef='attunement']", "required"], ["[data-ef='acBonus']", "1"]]);
      const shield = await BUILD("Buckler E2E", [
        ["[name='itemType'][value='equipment']", true], ["[data-ef='equipType']", "shield"]]);
      made.push(armor.doc, ring.doc, shield.doc);
      const data = d => { const o = d.toObject(); delete o._id; delete o.folder; return o; };

      const a = await Actor.create({ name: "Wearer E2E", type: "npc",
        system: { abilities: { dex: { value: 16 } }, attributes: { ac: { calc: "default" } } } });
      made.push(a);
      // createEmbeddedDocuments doesn't guarantee return order → look items up by name.
      const own = (actor, n) => actor.items.getName(n);
      await a.createEmbeddedDocuments("Item", [data(armor.doc), data(ring.doc)]);
      const mail = own(a, "Mail E2E"), rg = own(a, "Ring E2E");
      const ac = () => a.system.attributes.ac.value;
      const out = { armorUi: armor.ui, ringAttuned: rg.system.attuned };
      out.unattuned = ac();                                         // never pre-attuned: ring off → 14 + 1 + 2 = 17
      await rg.update({ "system.attuned": true });  out.both = ac(); // + ring 1 = 18
      await rg.update({ "system.equipped": false }); out.ringOff = ac(); // 17
      await mail.update({ "system.equipped": false }); out.naked = ac();      // 10 + 3 = 13

      // Char wizard path: the typed statblock AC must survive the added items.
      const { CharCreatorApp } = await import("./modules/forge-char-creator/scripts/app.js");
      const knight = await Actor.create({ name: "Statblock Knight E2E", type: "npc",
        system: { abilities: { dex: { value: 16 } }, attributes: { ac: { calc: "natural", flat: 17 } } } });
      made.push(knight);
      await knight.createEmbeddedDocuments("Item", [data(armor.doc)]);
      out.knight = { how: await CharCreatorApp.reconcileAc(knight, 17), ac: knight.system.attributes.ac.value,
                     calc: knight.system.attributes.ac.calc };
      const guard = await Actor.create({ name: "Statblock Guard E2E", type: "npc",
        system: { attributes: { ac: { calc: "natural", flat: 16 } } } });
      made.push(guard);
      await guard.createEmbeddedDocuments("Item", [data(shield.doc), data(ring.doc)]);
      await own(guard, "Ring E2E").update({ "system.attuned": true });
      out.guardBefore = guard.system.attributes.ac.value;            // 16 + shield 2 + ring 1 = 19
      out.guard = { how: await CharCreatorApp.reconcileAc(guard, 16), ac: guard.system.attributes.ac.value,
                    flat: guard.system.attributes.ac.flat };
      return { ok: true, ...out };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      for (const d of made) await d.delete().catch(() => {});
    }
  }, [BUILD.toString(), SWEEP.toString()]);

  console.log('ARMOR RESULT: ' + JSON.stringify(res, null, 1));
  expect(res.ok, res.error).toBeTruthy();
  expect(res.armorUi.kind).toBe("passive");
  expect(res.armorUi.kindDisabled.sort()).toEqual(["attack", "effect", "save"]);
  expect(res.ringAttuned).toBe(false);
  expect(res.both).toBe(18);
  expect(res.unattuned).toBe(17);
  expect(res.ringOff).toBe(17);
  expect(res.naked).toBe(13);
  expect(res.knight).toEqual({ how: "armor", ac: 17, calc: "default" });
  expect(res.guardBefore).toBe(19);
  expect(res.guard).toEqual({ how: "offset", ac: 16, flat: 13 });
});
