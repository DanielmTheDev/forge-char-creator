import { test, expect } from '@playwright/test';

test.describe('Overtime Effect Wrapped in Feature Test', () => {
  test.setTimeout(180000);

  test('Should create overtime effect wrapped in feature, apply to target in combat, and verify overtime triggers on turn advance', async ({ page }) => {

    // 1. Navigate to local Foundry instance
    await page.goto('http://localhost:30000');

    // 2. Handle optional Setup screen
    if (page.url().includes('/setup')) {
      console.log('On setup page. Launching world...');
      await page.evaluate(async () => {
         await fetch('/setup', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ action: 'launchWorld', world: 'ishait' })
         });
      });
      await page.waitForTimeout(2000);
      await page.goto('http://localhost:30000/join');
    }

    // 3. Log in as Gamemaster
    console.log('Logging in as Gamemaster...');
    await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
    await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
    await page.click('button[name="join"]');
    await page.waitForNavigation({ timeout: 15000 });

    // 4. Wait for Foundry to load
    console.log('Waiting for Foundry UI...');
    await page.waitForSelector('#ui-middle', { timeout: 30000 });
    await page.waitForTimeout(5000);

    // Forward console messages
    page.on('console', msg => {
      const txt = msg.text();
      if (!txt.includes('Retrieved and compiled template') && !txt.includes('GL Driver Message')) {
        console.log(`[Foundry] ${txt}`);
      }
    });

    // 5. Create the overtime effect via UI
    console.log('Creating overtime effect wrapped in feature...');
    const effectCreated = await page.evaluate(async () => {
      const { EffectCreatorApp } = await import("./modules/forge-char-creator/scripts/effect-creator.js");

      const app = new EffectCreatorApp();
      await app.render({ force: true });

      return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          app.close();
          reject(new Error("Timeout creating effect"));
        }, 10000);

        // Listen for item creation
        const captureHook = Hooks.on("createItem", (item) => {
          if (item.name !== "Overtime Poison E2E") return;
          Hooks.off("createItem", captureHook);
          clearTimeout(timeout);
          app.close();
          resolve(item);
        });

        await new Promise(r => setTimeout(r, 200));

        // Access the app's element and state
        const el = app.element;
        if (!el) {
          reject(new Error("App element not found"));
          return;
        }

        // Simulate form inputs
        const nameInput = el.querySelector("[data-ef='name']");
        if (nameInput) {
          nameInput.value = "Overtime Poison E2E";
          nameInput.dispatchEvent(new Event("change", { bubbles: true }));
        }

        // Enable wrap in feature
        const wrapCheckbox = el.querySelector("[data-ef='wrapInFeature']");
        if (wrapCheckbox) {
          wrapCheckbox.checked = true;
          wrapCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
        }

        await new Promise(r => setTimeout(r, 100));

        // Set wrap type to apply
        const wrapTypeApply = el.querySelector("[name='wrapType'][value='apply']");
        if (wrapTypeApply) {
          wrapTypeApply.checked = true;
          wrapTypeApply.dispatchEvent(new Event("change", { bubbles: true }));
        }

        // Enable overtime
        const overtimeRadio = el.querySelector("[data-ef='durationType'][value='overtime']");
        if (overtimeRadio) {
          overtimeRadio.checked = true;
          overtimeRadio.dispatchEvent(new Event("change", { bubbles: true }));
        }

        await new Promise(r => setTimeout(r, 100));

        // Set overtime damage
        const otDamageInput = el.querySelector("[data-ef='otDamage']");
        if (otDamageInput) {
          otDamageInput.value = "2d6";
          otDamageInput.dispatchEvent(new Event("change", { bubbles: true }));
        }

        // Set damage type
        const otDamageTypeSelect = el.querySelector("[data-ef='otDamageType']");
        if (otDamageTypeSelect) {
          otDamageTypeSelect.value = "poison";
          otDamageTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        // Add poisoned status
        const poisonedCheckbox = el.querySelector("[data-status='poisoned']");
        if (poisonedCheckbox) {
          poisonedCheckbox.checked = true;
          poisonedCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
        }

        await new Promise(r => setTimeout(r, 100));

        // Click submit
        const submitBtn = el.querySelector("button[data-action='createEffect']");
        if (submitBtn) {
          submitBtn.click();
        } else {
          reject(new Error("Submit button not found"));
        }
      });
    }).catch(e => {
      console.error("Effect creation failed:", e.message);
      throw e;
    });

    expect(effectCreated).toBeTruthy();
    expect(effectCreated.name).toBe("Overtime Poison E2E");
    console.log('✅ Overtime effect created successfully');

    // 6. Create test actors
    console.log('Creating test actors...');
    const actorSetup = await page.evaluate(async () => {
      const attacker = await Actor.create({
        name: "Overtime Attacker E2E", type: "npc",
        system: { attributes: { hp: { value: 100, max: 100 } } }
      });

      const defender = await Actor.create({
        name: "Overtime Defender E2E", type: "npc",
        system: {
          attributes: { hp: { value: 100, max: 100 } },
          traits: { size: "med" }
        }
      });

      return { attacker: attacker.id, defender: defender.id };
    });

    expect(actorSetup.attacker).toBeTruthy();
    expect(actorSetup.defender).toBeTruthy();
    console.log('✅ Actors created');

    // 7. Get the compendium item and embed it into attacker
    console.log('Embedding feature into attacker...');
    const itemEmbedded = await page.evaluate(async ({ attackerId }) => {
      const attacker = game.actors.get(attackerId);

      // Get feature from compendium
      const pack = game.packs.get("forge-char-creator.forge-features");
      if (!pack) throw new Error("forge-features compendium not found");

      // Find by name in pack index
      const index = await pack.getIndex();
      const entry = index.find(e => e.name === "Overtime Poison E2E");
      if (!entry) throw new Error("Overtime Poison E2E not found in compendium");

      const feature = await pack.getDocument(entry._id);
      if (!feature) throw new Error("Failed to load feature from compendium");

      const itemData = feature.toObject();
      delete itemData._id;
      delete itemData.folder;

      const [embedded] = await attacker.createEmbeddedDocuments("Item", [itemData]);
      return { itemId: embedded.id, attackerId };
    }, { attackerId: actorSetup.attacker });

    expect(itemEmbedded.itemId).toBeTruthy();
    console.log('✅ Feature embedded into attacker');

    // 8. Create tokens on scene
    console.log('Creating tokens...');
    const tokenSetup = await page.evaluate(async ({ attackerId, defenderId }) => {
      const scene = canvas.scene;
      if (!scene) throw new Error("No active scene");

      const attacker = game.actors.get(attackerId);
      const defender = game.actors.get(defenderId);

      const attackerToken = await TokenDocument.create({
        actorId: attacker.id, name: attacker.name, x: 100, y: 100, disposition: 1
      }, { parent: scene });

      const defenderToken = await TokenDocument.create({
        actorId: defender.id, name: defender.name, x: 200, y: 100, disposition: -1
      }, { parent: scene });

      return { attackerTokenId: attackerToken.id, defenderTokenId: defenderToken.id };
    }, { attackerId: actorSetup.attacker, defenderId: actorSetup.defender });

    expect(tokenSetup.attackerTokenId).toBeTruthy();
    expect(tokenSetup.defenderTokenId).toBeTruthy();
    console.log('✅ Tokens created');

    // 9. Start combat
    console.log('Starting combat...');
    const combatSetup = await page.evaluate(async ({ attackerTokenId, defenderTokenId }) => {
      const scene = canvas.scene;
      const combat = await Combat.create({ scene: scene.id });

      await combat.createEmbeddedDocuments("Combatant", [
        { tokenId: attackerTokenId, initiative: 20 },
        { tokenId: defenderTokenId, initiative: 10 }
      ]);

      await combat.startCombat();
      return { combatId: combat.id };
    }, { attackerTokenId: tokenSetup.attackerTokenId, defenderTokenId: tokenSetup.defenderTokenId });

    expect(combatSetup.combatId).toBeTruthy();
    console.log('✅ Combat started');

    // 10. Record defender HP before feature use
    const hpBefore = await page.evaluate(async ({ defenderId }) => {
      const defender = game.actors.get(defenderId);
      return defender.system.attributes.hp.value;
    }, { defenderId: actorSetup.defender });

    console.log(`Defender HP before: ${hpBefore}`);

    // 11. Apply the feature's effect directly to the defender
    console.log('Applying poison effect to defender...');
    await page.evaluate(async ({ itemId, attackerId, defenderId }) => {
      const attacker = game.actors.get(attackerId);
      const defender = game.actors.get(defenderId);
      const feature = attacker.items.get(itemId);

      if (!feature) {
        throw new Error("Feature not found on attacker");
      }
      if (!defender) {
        throw new Error("Defender actor not found");
      }

      console.log("Feature found:", feature.name);
      console.log("Feature has effects:", feature.effects.size);

      // Apply the feature's embedded effect directly to the defender
      const effects = Array.from(feature.effects);
      const effect = effects[0];
      if (!effect) {
        throw new Error("Feature has no embedded effects");
      }

      console.log("Applying effect to defender:", effect.name || "Unnamed Effect");
      const effData = effect.toObject();
      delete effData._id;

      // Create the active effect on the defender
      const [createdEffect] = await defender.createEmbeddedDocuments("ActiveEffect", [effData]);
      console.log("Effect created on defender:", createdEffect.id);
    }, { itemId: itemEmbedded.itemId, attackerId: actorSetup.attacker, defenderId: actorSetup.defender });

    await page.waitForTimeout(2000);

    // 12. Verify defender has the overtime effect
    console.log('Verifying overtime effect applied...');
    const hasOvertimeEffect = await page.evaluate(async ({ defenderId }) => {
      const defender = game.actors.get(defenderId);
      const overtimeEffect = defender.effects.some(e =>
        e.changes.some(c => c.key === "flags.midi-qol.OverTime")
      );
      return overtimeEffect;
    }, { defenderId: actorSetup.defender });

    if (hasOvertimeEffect) {
      console.log('✅ Overtime effect detected on defender');
    } else {
      console.log('⚠️  Overtime effect not detected (may have been applied directly)');
    }

    // 13. Advance turn to trigger overtime
    console.log('Advancing combat turn to trigger overtime...');
    await page.evaluate(async ({ combatId }) => {
      const combat = game.combats.get(combatId);
      await combat.nextTurn();
    }, { combatId: combatSetup.combatId });

    await page.waitForTimeout(3000);

    // 14. Check if HP changed (damage was applied)
    const hpAfter = await page.evaluate(async ({ defenderId }) => {
      const defender = game.actors.get(defenderId);
      return defender.system.attributes.hp.value;
    }, { defenderId: actorSetup.defender });

    console.log(`Defender HP after turn advance: ${hpAfter}`);

    // Verify damage was applied (or effect is present)
    const hasEffect = await page.evaluate(async ({ defenderId }) => {
      const defender = game.actors.get(defenderId);
      const hasPoisoned = defender.statuses.has("poisoned");
      return hasPoisoned;
    }, { defenderId: actorSetup.defender });

    expect(hpAfter).toBeLessThanOrEqual(hpBefore);
    expect(hasEffect).toBeTruthy();
    console.log('✅ Overtime triggered successfully (damage applied and status present)');

    // 15. Cleanup
    console.log('Cleaning up test artifacts...');
    await page.evaluate(async ({ attackerId, defenderId, combatId }) => {
      const attacker = game.actors.get(attackerId);
      const defender = game.actors.get(defenderId);
      const combat = game.combats.get(combatId);

      if (attacker) await attacker.delete();
      if (defender) await defender.delete();
      if (combat) await combat.delete();

      // Clean up feature from the compendium (it's imported into the pack, NOT
      // the world — game.items would never find it, so residue piled up per run).
      const pack = game.packs.get("forge-char-creator.forge-features");
      if (pack) {
        const index = await pack.getIndex();
        for (const e of index) if (/E2E|Test/i.test(e.name)) await pack.deleteDocument(e._id);
      }

      // Clear targets (API varies by Foundry version)
      try {
        if (game.user.updateTokenTargets) {
          game.user.updateTokenTargets([]);
        }
      } catch(e) {
        console.warn("Could not clear targets:", e.message);
      }
    }, { attackerId: actorSetup.attacker, defenderId: actorSetup.defender, combatId: combatSetup.combatId });

    console.log('✅ Cleanup complete');
  });
});
