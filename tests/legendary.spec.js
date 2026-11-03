import { test, expect } from './helpers/fixtures.js';
import { openWizard, openBuilder, closeForgeApps, pipeConsole } from './helpers/foundry.js';

test.describe('Legendary actions + resistances', () => {
  test.setTimeout(180000);

  test('actor builder writes legendary action + resistance counts', async ({ gmPage: page }) => {
    try {
      const root = await openWizard(page);
      await page.keyboard.press("Alt+Shift+2");
      await root.locator("#legact").fill("3");
      await root.locator("#legres").fill("2");
      await page.keyboard.press("Alt+Shift+1");
      await root.locator("#charName").fill("E2E Legendary Actor");
      await root.locator("[data-action='createNPC']").click();
      await expect.poll(() => page.evaluate(() => {
        const a = game.actors.getName("E2E Legendary Actor");
        const r = a?.system.resources;
        return r ? { legact: r.legact.max, legactLeft: r.legact.value, legres: r.legres.max, legresLeft: r.legres.value,
                     lrItem: !!a.items.getName("Legendary Resistance") } : null;
      })).toEqual({ legact: 3, legactLeft: 3, legres: 2, legresLeft: 2, lrItem: true });
    } finally {
      await page.evaluate(() => game.actors.getName("E2E Legendary Actor")?.delete());
      await closeForgeApps(page);
    }
  });

  test('feature builder: cost picker shows for legendary / + Legendary only', async ({ gmPage: page }) => {
    try {
      const root = await openBuilder(page, { kind: "save" });
      const cost = root.locator("#legendaryCostBox");
      const also = root.locator("#alsoLegendaryBox");
      await expect(cost).toBeHidden();
      await expect(also).toBeVisible();
      await root.locator("[data-ef='alsoLegendary']").check();
      await expect(cost).toBeVisible();
      await root.locator("[data-ef='alsoLegendary']").uncheck();
      await root.locator("[data-ef='wrapActivation']").selectOption("legendary");
      await expect(cost).toBeVisible();
      await expect(also).toBeHidden();
    } finally {
      await closeForgeApps(page);
    }
  });

  test('action + legendary feature: legendary use spends legact by cost, action use does not @combat', async ({ gmPage: page }) => {
    pipeConsole(page, /SMOKE|Error/);
    const res = await page.evaluate(async () => {
      const log = [];
      const step = (m) => { log.push(m); console.log('SMOKE: ' + m); };
      let caster, target, casterTok, targetTok, packDoc;
      try {
        const { EffectCreatorApp } = await import("./modules/forge-char-creator/scripts/effect-creator.js");
        const app = new EffectCreatorApp();
        await app.render(true);
        await new Promise(r => setTimeout(r, 250));
        const el = app.element;
        const set = (sel, v) => {
          const i = el.querySelector(sel);
          if (!i) throw new Error(`missing field ${sel}`);
          if (i.type === "checkbox" || i.type === "radio") i.checked = v; else i.value = v;
          i.dispatchEvent(new Event("change", { bubbles: true }));
          i.dispatchEvent(new Event("input", { bubbles: true }));
        };
        set("[data-ef='name']", "Legendary Rally E2E");
        set("[name='kind'][value='buff']", true);
        set("[name='buffMode'][value='temphp']", true);
        set("[data-ef='wrapActivation']", "action");
        set("[data-ef='alsoLegendary']", true);
        set("[data-ef='legendaryCost']", "2");
        set("[data-ef='tempHpFormula']", "7");
        set("[data-ef='wrapTargetCount']", "1");
        set("[data-ef='wrapTargetArea']", "creature");

        packDoc = await new Promise((res2, rej2) => {
          const h = Hooks.on("createItem", (item) => {
            if (item.name !== "Legendary Rally E2E") return;
            Hooks.off("createItem", h); res2(item);
          });
          setTimeout(() => { Hooks.off("createItem", h); rej2(new Error("timeout creating feature")); }, 20000);
          el.querySelector("button[data-action='createEffect']").click();
        });
        app.close();

        caster = await Actor.create({ name: "Legendary Caster E2E", type: "npc",
          system: { resources: { legact: { max: 3, spent: 0 } } } });
        target = await Actor.create({ name: "Legendary Target E2E", type: "npc",
          system: { attributes: { hp: { value: 30, max: 30, temp: 0 } } } });
        const itemData = packDoc.toObject();
        delete itemData._id; delete itemData.folder;
        const [feature] = await caster.createEmbeddedDocuments("Item", [itemData]);

        const scene = canvas.scene;
        casterTok = await TokenDocument.create({ actorId: caster.id, name: caster.name, x: 100, y: 600, disposition: 1 }, { parent: scene });
        targetTok = await TokenDocument.create({ actorId: target.id, name: target.name, x: 200, y: 600, disposition: 1 }, { parent: scene });
        await new Promise(r => setTimeout(r, 1500));
        for (let i = 0; i < 20 && !canvas.tokens?.get(targetTok.id); i++) await new Promise(r => setTimeout(r, 300));

        const acts = [...feature.system.activities];
        const actionAct = acts.find(a => a.activation.type === "action");
        const legAct = acts.find(a => a.activation.type === "legendary");
        step(`activities: ${acts.map(a => `${a.name}=${a.activation.type}/${a.activation.value}`).join(", ")}`);

        const use = async (activity) => {
          const p = canvas.tokens?.get(targetTok.id) ?? targetTok.object;
          p.setTarget(true, { user: game.user, releaseOthers: true });
          const all = [];
          const h = Hooks.on("renderApplicationV2", (a) => { all.push(a.constructor.name); });
          const wf = await Promise.race([
            MidiQOL.completeActivityUse(activity.uuid, {
              midiOptions: { fastForward: true, fastForwardAttack: true, fastForwardDamage: true,
                             autoRollDamage: 'always', targetUuids: [targetTok.uuid], ignoreUserTargets: true }
            }).catch(e => { step(`use threw: ${e.message}`); return null; }),
            new Promise(r => setTimeout(() => r("timeout"), 15000))
          ]);
          Hooks.off("renderApplicationV2", h);
          step(`use ${activity.name}: ${wf === "timeout" ? "TIMEOUT" : "done"} apps=${all.join(",")}`);
          await new Promise(r => setTimeout(r, 2000));
          return wf;
        };
        const spent = () => caster.system.resources.legact.spent;

        await use(legAct);
        const afterLeg = spent();
        const temp = targetTok.actor.system.attributes.hp.temp;
        // Needs 2, only 1 left → dnd5e refuses and midi opens its usage dialog with the warning.
        const dialogs = [];
        const h = Hooks.on("renderApplicationV2", (a) => { dialogs.push(a.constructor.name); a.close(); });
        await use(legAct);
        Hooks.off("renderApplicationV2", h);
        const afterRefused = spent();
        await use(actionAct);              // action cost → legact untouched
        const afterAction = spent();
        step(`spent leg=${afterLeg} refused=${afterRefused} action=${afterAction} temp=${temp}`);

        return { ok: true, refusedDialog: dialogs.some(d => /UsageDialog/.test(d)), count: acts.length, legValue: legAct?.activation.value, afterLeg, afterRefused, afterAction, temp,
                 desc: feature.system.description.value, log };
      } catch (e) {
        return { ok: false, error: e.message, log };
      } finally {
        for (const t of Array.from(game.user.targets ?? [])) t.setTarget(false, { releaseOthers: false });
        if (casterTok) await casterTok.delete().catch(() => {});
        if (targetTok) await targetTok.delete().catch(() => {});
        if (caster) await caster.delete().catch(() => {});
        if (target) await target.delete().catch(() => {});
        if (packDoc) await packDoc.delete().catch(() => {});
      }
    });

    console.log('SMOKE RESULT: ' + JSON.stringify(res, null, 1));
    expect(res.ok, res.error).toBeTruthy();
    expect(res.count, 'action set + legendary set').toBe(2);
    expect(res.legValue).toBe(2);
    expect(res.temp, 'legendary use still applies the feature').toBe(7);
    expect(res.afterLeg, 'legendary use spends its cost').toBe(2);
    expect(res.afterRefused, 'not enough legendary actions left → not spent').toBe(2);
    expect(res.refusedDialog, 'refused use surfaces the usage dialog').toBeTruthy();
    expect(res.afterAction, 'action use leaves legendary actions alone').toBe(2);
    expect(res.desc).toContain("Also a Legendary Action (costs 2).");
  });

  test('wizard Legendary Resistance: failed save → midi prompt → succeeds, spends one legres @combat', async ({ gmPage: page }) => {
    const root = await openWizard(page);
    await page.keyboard.press("Alt+Shift+2");
    await root.locator("#hp").fill("50");
    await root.locator("#legres").fill("2");
    await page.keyboard.press("Alt+Shift+1");
    await root.locator("#charName").fill("E2E Resist Boss");
    await root.locator("[data-action='createNPC']").click();
    await expect.poll(() => page.evaluate(() => !!game.actors.getName("E2E Resist Boss"))).toBe(true);

    pipeConsole(page, /SMOKE|Error/);
    const res = await page.evaluate(async () => {
      const boss = game.actors.getName("E2E Resist Boss");
      const made = [boss];
      try {
        // Forced fail: an unforced GM save opens a roll dialog headless.
        await boss.update({ flags: { "midi-qol": { fail: { ability: { save: { all: 1 } } } } } });
        const caster = await Actor.create({ name: "Resist Caster E2E", type: "npc" });
        made.push(caster);
        const [it] = await caster.createEmbeddedDocuments("Item", [{ name: "Fire Save E2E", type: "feat", system: { activities: {
          abcdefghijklmnop: { _id: "abcdefghijklmnop", type: "save", name: "Save", activation: { type: "action", override: true },
            target: { affects: { type: "creature", count: "1" } }, save: { ability: ["dex"], dc: { calculation: "", formula: "15" } },
            damage: { onSave: "half", parts: [{ custom: { enabled: true, formula: "10" }, types: ["fire"] }] } } } } }]);
        const toks = await canvas.scene.createEmbeddedDocuments("Token", [
          { actorId: caster.id, name: caster.name, x: 100, y: 600 }, { actorId: boss.id, name: boss.name, x: 200, y: 600 }]);
        made.unshift(...toks);
        await new Promise(r => setTimeout(r, 1500));

        // Answer midi's optional prompt by clicking the Legendary Resistance button.
        const prompts = [];
        const h = Hooks.on("renderApplicationV2", (app, el) => {
          const b = [...el.querySelectorAll("button")].find(b => /Legendary Resistance/.test(b.textContent));
          if (b) { prompts.push(app.title); setTimeout(() => b.click(), 300); }
        });
        await Promise.race([
          MidiQOL.completeActivityUse(it.system.activities.get("abcdefghijklmnop").uuid, { midiOptions: { fastForward: true,
            fastForwardAttack: true, fastForwardDamage: true, autoRollDamage: "always", targetUuids: [toks[1].uuid], ignoreUserTargets: true } }),
          new Promise(r => setTimeout(r, 20000))
        ]);
        await new Promise(r => setTimeout(r, 2500));
        Hooks.off("renderApplicationV2", h);
        const ta = toks[1].actor;   // unlinked token: midi updates the synthetic actor
        return { ok: true, prompts: prompts.length, legresSpent: ta.system.resources.legres.spent, hp: ta.system.attributes.hp.value };
      } catch (e) {
        return { ok: false, error: e.message };
      } finally {
        for (const d of made) await d.delete().catch(() => {});
      }
    });
    await closeForgeApps(page);
    console.log('SMOKE RESULT: ' + JSON.stringify(res));
    expect(res.ok, res.error).toBeTruthy();
    expect(res.prompts, 'midi offers Legendary Resistance on the failed save').toBe(1);
    expect(res.legresSpent, 'one legendary resistance spent').toBe(1);
    expect(res.hp, 'save turned into a success → half of 10 fire').toBe(45);
  });
});
