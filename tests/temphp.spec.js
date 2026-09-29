import { test, expect } from '@playwright/test';

test('Temp HP feature built by the wizard grants temp HP to a target via a real midi workflow', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('http://localhost:30000');
  await page.waitForSelector('select[name="userid"]', { timeout: 15000 });
  await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
  await page.click('button[name="join"]');
  await page.waitForNavigation({ timeout: 20000 });
  await page.waitForSelector('#ui-middle', { timeout: 30000 });
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60000 });
  await page.waitForTimeout(3000);

  page.on('console', m => { const t = m.text(); if (/SMOKE|Error/.test(t)) console.log(`[Foundry] ${t}`); });

  const res = await page.evaluate(async () => {
    const log = [];
    const step = (m) => { log.push(m); console.log('SMOKE: ' + m); };
    let caster, target, casterTok, targetTok, packDoc;
    try {
      // 1. Build the feature through the wizard UI (real payload path).
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
      set("[data-ef='name']", "Temp HP Rally E2E");
      set("[data-ef='acBonus']", "2");
      set("[name='kind'][value='buff']", true);
      set("[name='buffMode'][value='temphp']", true);
      set("[data-ef='wrapActivation']", "bonus");
      set("[data-ef='tempHpFormula']", "7");            // flat => deterministic
      set("[data-ef='wrapTargetCount']", "1");
      set("[data-ef='wrapTargetArea']", "creature");
      set("[data-ef='specialDuration']", "turnEndSource");

      packDoc = await new Promise((res2, rej2) => {
        const h = Hooks.on("createItem", (item) => {
          if (item.name !== "Temp HP Rally E2E") return;
          Hooks.off("createItem", h); res2(item);
        });
        setTimeout(() => { Hooks.off("createItem", h); rej2(new Error("timeout creating feature")); }, 20000);
        el.querySelector("button[data-action='createEffect']").click();
      });
      app.close();
      step("feature created");

      // 2. Caster + target with 0 temp HP.
      step("creating actors");
      caster = await Actor.create({ name: "Temp HP Caster E2E", type: "npc",
        system: { attributes: { hp: { value: 30, max: 30, temp: 0 } } } });
      target = await Actor.create({ name: "Temp HP Target E2E", type: "npc",
        system: { attributes: { hp: { value: 30, max: 30, temp: 0 } } } });

      const itemData = packDoc.toObject();
      delete itemData._id; delete itemData.folder;
      const [feature] = await caster.createEmbeddedDocuments("Item", [itemData]);

      step("creating tokens");
      const scene = canvas.scene;
      casterTok = await TokenDocument.create({ actorId: caster.id, name: caster.name, x: 100, y: 600, disposition: 1 }, { parent: scene });
      targetTok = await TokenDocument.create({ actorId: target.id, name: target.name, x: 200, y: 600, disposition: 1 }, { parent: scene });
      await new Promise(r => setTimeout(r, 1500));
      for (let i = 0; i < 20 && !canvas.tokens?.get(targetTok.id); i++) await new Promise(r => setTimeout(r, 300));

      // 3. Sanity: sheet-visible activation label.
      const act = feature.system.activities.contents[0];
      step(`activity type=${act.type} activation=${act.activation.type} label=${feature.labels?.activation ?? "?"}`);

      // 4. Real midi use against the target.
      step("calling completeActivityUse");
      const use = async () => {
        const p = canvas.tokens?.get(targetTok.id) ?? targetTok.object;
        if (!p) throw new Error("target token has no canvas placeable");
        p.setTarget(true, { user: game.user, releaseOthers: true });
        if (!game.user.targets.size) { game.user.targets.add(p); p.isTargeted = true; }
        const activity = [...feature.system.activities][0];
        const wf = await MidiQOL.completeActivityUse(activity.uuid, {
          midiOptions: { fastForward: true, fastForwardAttack: true, fastForwardDamage: true,
                         autoRollDamage: 'always', targetUuids: [targetTok.uuid], ignoreUserTargets: true }
        });
        await new Promise(r => setTimeout(r, 2500));
        return wf;
      };
      const wf1 = await use();
      if (!wf1?.hitTargets?.size) throw new Error("midi workflow reached no targets");

      const tActor = targetTok.actor;
      const temp1 = tActor.system.attributes.hp.temp;
      const hp1 = tActor.system.attributes.hp.value;
      const ae = tActor.effects.find(e => e.name === "Temp HP Rally E2E");
      step(`after use temp=${temp1} hp=${hp1} ae=${!!ae} aeSpecialDuration=${JSON.stringify(ae?.flags?.dae?.specialDuration)}`);

      // 5. Max-not-add semantics: a second, smaller grant must not lower it.
      await feature.update({ [`system.activities.${act.id}.healing.custom.formula`]: "3" });
      await use();
      const temp2 = targetTok.actor.system.attributes.hp.temp;
      step(`after smaller grant temp=${temp2}`);

      return { ok: true, temp1, hp1, temp2, aeApplied: !!ae,
               specialDuration: ae?.flags?.dae?.specialDuration ?? null,
               acChange: !!ae?.changes.find(c => c.key === "system.attributes.ac.bonus"), log };
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
  expect(res.temp1, 'target should have 7 temp HP').toBe(7);
  expect(res.hp1, 'temp HP must not touch current HP').toBe(30);
  expect(res.temp2, 'a smaller grant must not lower temp HP (max semantics)').toBe(7);
  expect(res.aeApplied, 'the AE should ride along with the temp HP grant').toBeTruthy();
  expect(res.acChange, 'AE should carry the AC bonus').toBeTruthy();
  expect(res.specialDuration).toEqual(['turnEndSource']);
});
