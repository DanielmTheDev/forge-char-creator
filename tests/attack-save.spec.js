import { test, expect } from './helpers/fixtures.js';
import { pipeConsole } from './helpers/foundry.js';

// Builds "attack → on hit CON save → poisoned + extra damage" through the builder UI,
// then runs real midi workflows with fixed dice (every die = middle face, d20 = 11).
test('Attack with on-hit save: hit damage, save fail/success, miss — via a real midi workflow', async ({ gmPage: page }) => {
  test.setTimeout(240000);

  pipeConsole(page);

  const res = await page.evaluate(async () => {
    const log = [];
    const step = m => { log.push(m); console.log("SMOKE: " + m); };
    const made = [];
    const origRandom = CONFIG.Dice.randomUniform;
    try {
      // Sweep leftovers of an aborted earlier run (same names).
      const ours = /^(Venom Bite E2E|Biter E2E|Weak E2E|Tough E2E|Armored E2E)$/;
      for (const t of canvas.scene.tokens.filter(t => ours.test(t.name))) await t.delete();
      for (const a of game.actors.filter(a => ours.test(a.name))) await a.delete();
      const fp = game.packs.get("forge-char-creator.forge-features");
      for (const i of (await fp.getIndex()).filter(i => ours.test(i.name))) await (await fp.getDocument(i._id)).delete();

      CONFIG.Dice.randomUniform = () => 0.5;
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
        i.dispatchEvent(new Event("input", { bubbles: true }));
      };
      const name = "Venom Bite E2E";
      set("[data-ef='name']", name);
      set("[name='kind'][value='attack']", true);
      set("[data-ef='toHitFlat']", "50");
      el.querySelector("[data-add-row='damageRows']").click();
      set(".dmg-formula[data-list='damageRows'][data-idx='0']", "5");
      set(".dmg-type[data-list='damageRows'][data-idx='0']", "piercing");
      set("[data-ef='onHitSave']", true);
      set("[data-ef='wrapSaveAbility']", "con");
      set("[data-ef='wrapSaveDC']", "13");
      el.querySelector("[data-add-row='saveDamageRows']").click();
      set(".dmg-formula[data-list='saveDamageRows'][data-idx='0']", "4");
      set(".dmg-type[data-list='saveDamageRows'][data-idx='0']", "poison");
      set("[data-status='poisoned']", true);
      set("[data-ef='rounds']", "10");
      const packDoc = await new Promise((res, rej) => {
        const h = Hooks.on("createItem", i => { if (i.name !== name) return; Hooks.off("createItem", h); res(i); });
        setTimeout(() => { Hooks.off("createItem", h); rej(new Error("create timeout")); }, 20000);
        el.querySelector("button[data-action='createEffect']").click();
      });
      app.close();
      made.push(packDoc);
      step("feature created");

      const attacker = await Actor.create({ name: "Biter E2E", type: "npc" });
      made.push(attacker);
      const data = packDoc.toObject(); delete data._id; delete data.folder;
      const [feature] = await attacker.createEmbeddedDocuments("Item", [data]);

      // +50 to hit (d20 = 11) hits AC 10 and misses AC 99. The save outcome is forced with midi's
      // fail/success flags (as the content gate does): an unforced GM save opens a roll dialog headless.
      const mkTarget = async (nm, save, ac) => {
        const a = await Actor.create({ name: nm, type: "npc", system: {
          attributes: { hp: { value: 50, max: 50 }, ac: { calc: "flat", flat: ac } } },
          flags: { "midi-qol": { [save]: { ability: { save: { all: 1 } } } } } });
        made.push(a);
        return a;
      };
      const scene = canvas.scene;
      const tok = async (actor, x) => {
        const [t] = await scene.createEmbeddedDocuments("Token", [{ actorId: actor.id, name: actor.name, x, y: 600 }]);
        made.unshift(t);
        return t;
      };
      await tok(attacker, 100);
      const run = async (target) => {
        const tt = await tok(target, 200);
        await new Promise(r => setTimeout(r, 1200));
        const atk = feature.system.activities.find(a => a.type === "attack");
        await MidiQOL.completeActivityUse(atk.uuid, { midiOptions: { fastForward: true, fastForwardAttack: true,
          fastForwardDamage: true, autoRollDamage: "always", targetUuids: [tt.uuid], ignoreUserTargets: true } });
        await new Promise(r => setTimeout(r, 3500));
        const ta = tt.actor;
        const out = { hp: ta.system.attributes.hp.value, poisoned: ta.statuses.has("poisoned") };
        await tt.delete();
        made.splice(made.indexOf(tt), 1);
        return out;
      };
      const fail = await run(await mkTarget("Weak E2E", "fail", 10));    step(`fail ${JSON.stringify(fail)}`);
      const succ = await run(await mkTarget("Tough E2E", "success", 10));  step(`succ ${JSON.stringify(succ)}`);
      const miss = await run(await mkTarget("Armored E2E", "fail", 99)); step(`miss ${JSON.stringify(miss)}`);
      const acts = feature.system.activities.contents.map(a => ({ type: a.type, dc: a.save?.dc?.value ?? null,
        auto: a.midiProperties?.automationOnly ?? null }));
      return { ok: true, fail, succ, miss, acts, log };
    } catch (e) {
      return { ok: false, error: e.message, log };
    } finally {
      CONFIG.Dice.randomUniform = origRandom;
      for (const d of made) await d.delete().catch(() => {});
    }
  });

  console.log('SMOKE RESULT: ' + JSON.stringify(res, null, 1));
  expect(res.ok, res.error).toBeTruthy();
  expect(res.acts.find(a => a.type === "save").dc, "custom DC honoured").toBe(13);
  expect(res.acts.find(a => a.type === "save").auto, "save is automation-only").toBe(true);
  expect(res.fail).toEqual({ hp: 41, poisoned: true });   // 50 - 5 - 4
  expect(res.succ).toEqual({ hp: 43, poisoned: false });  // 50 - 5 - 2 (default saveOnSuccess "half" of 4)
  expect(res.miss).toEqual({ hp: 50, poisoned: false });
});
