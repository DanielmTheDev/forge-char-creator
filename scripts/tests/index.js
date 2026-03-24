/**
 * Forge Character & Effect Creator - Automated Test Suite
 * Defines an in-module testing framework to guarantee payloads continually match expectations.
 */

import { EffectCreatorApp } from "../effect-creator.js";
import { CharCreatorApp } from "../app.js";

class ForgeTestingSuite {
  
  static async runAll() {
    console.group("🧪 Forge Creator Test Suite");
    
    let passed = 0;
    let failed = 0;
    
    const runTest = async (name, fn) => {
      console.group(`Test: ${name}`);
      try {
        await fn();
        console.log(`✅ Passed`);
        passed++;
      } catch (err) {
        console.error(`❌ Failed:`, err);
        failed++;
      }
      console.groupEnd();
    };

    await runTest("EffectCreatorApp: Generates correct Passive Advantage Payload", this.#testEffectPassiveAdvantage);
    await runTest("EffectCreatorApp: Generates correct OverTime Payload", this.#testEffectOverTime);
    await runTest("EffectCreatorApp: Generates correct OverTime Save-Only Payload", this.#testEffectOverTimeSaveOnly);
    await runTest("EffectCreatorApp: Generates dynamic Auto-Destription string", this.#testEffectAutoDescription);
    await runTest("EffectCreatorApp: Generates dynamic Feature Wrapper Payloads", this.#testEffectFeatureWrapper);
    await runTest("CharCreatorApp: Maps AC, HP, Size, Spellcasting to Actor", this.#testCharCreatorMapping);
    await runTest("CharCreatorApp: Scales Attributes dynamically via Archetype Math", this.#testCharCreatorArchetypes);
    await runTest("Midi-QOL Integration: Omega Combat Simulator (E2E Feature -> Combat -> Advantage -> Overtime)", this.#testCombatEngineIntegration);

    console.log(`%c🧪 Test Run Complete! ${passed} Passed, ${failed} Failed.`, `color: ${failed > 0 ? 'red' : 'green'}; font-size: 1.2em; font-weight: bold;`);
    console.groupEnd();
    
    if (failed > 0) throw new Error("Some tests failed.");
  }

  static async #delay(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static #simulateChange(input, value) {
    if (!input) { console.error("simulateChange: input is null"); return; }
    if (input.type === "checkbox" || input.type === "radio") {
      input.checked = value;
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // ── Tests ──────────────────────────────────────────────────────────────────

  static async #testEffectPassiveAdvantage() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      
      const el = app.element;
      
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Test Advantage");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='appMode'][value='passive']"), true);
      el.querySelector("#addAdvRow").click();
      
      setTimeout(() => {
        const typeSelect = el.querySelector(".adv-type");
        const catSelect = el.querySelector(".adv-cat");
        
        ForgeTestingSuite.#simulateChange(typeSelect, "advantage");
        ForgeTestingSuite.#simulateChange(catSelect, "attack.all");
        
        try {
          const payload = app._buildAEData();
          app.close();
          
          if (!payload) throw new Error("No payload was captured.");
          if (payload.name !== "Test Advantage") throw new Error("Name mismatch.");
          if (!payload.transfer) throw new Error("Passive effect must have transfer: true.");
          
          const change = payload.changes.find(c => c.key === "flags.midi-qol.advantage.attack.all");
          if (!change) throw new Error("Missing midi-qol advantage flag.");
          if (change.mode !== 5) throw new Error(`Expected mode 5 (OVERRIDE), got ${change.mode}`);
          if (change.value !== "1") throw new Error("Advantage value should be 1");
          
          resolve();
        } catch (e) {
          app.close();
          reject(e);
        }
      }, 50);
    });
  }

  static async #testEffectOverTime() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      
      const el = app.element;
      
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Poison Nova");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='durationType'][value='overtime']"), true);
      
      setTimeout(() => {
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otDamage']"), "2d6");
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='otRollType'][value='damage']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otDamageType']"), "poison");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otSave']"), true);
        
        setTimeout(() => {
          ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otSaveAbility']"), "con");
          ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otSaveDC']"), "15");
          
          try {
            const payload = app._buildAEData();
            app.close();
            
            if (!payload) throw new Error("No payload was captured.");
            const change = payload.changes.find(c => c.key === "flags.midi-qol.OverTime");
            if (!change) throw new Error("Missing OverTime flag.");
            
            const val = change.value;
            if (!val.includes("damageRoll=2d6")) throw new Error("Missing damageRoll");
            if (!val.includes("saveDC=15")) throw new Error("Missing saveDC");
            if (!val.includes("saveAbility=con")) throw new Error("Missing saveAbility");
            if (!val.includes("damageType=poison")) throw new Error("Missing damageType");
            if (!val.includes("label=\"Poison Nova\"")) throw new Error("Missing label inside OverTime flag");
            
            resolve();
          } catch (e) {
            app.close();
            reject(e);
          }
        }, 50);
      }, 50);
    });
  }

  static async #testEffectOverTimeSaveOnly() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      
      const el = app.element;
      
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Restraining Web");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='durationType'][value='overtime']"), true);
      
      setTimeout(() => {
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otSave']"), true);
        
        setTimeout(() => {
          ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otSaveAbility']"), "str");
          ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otSaveDC']"), "12");
          
          try {
            const payload = app._buildAEData();
            app.close();
            
            if (!payload) throw new Error("No payload was captured.");
            const change = payload.changes.find(c => c.key === "flags.midi-qol.OverTime");
            if (!change) throw new Error("Missing OverTime flag for save-only effect.");
            
            const val = change.value;
            if (val.includes("damageRoll")) throw new Error("Should not contain damage roll");
            if (!val.includes("saveDC=12")) throw new Error("Missing saveDC");
            if (!val.includes("saveAbility=str")) throw new Error("Missing saveAbility");
            if (!val.includes("label=\"Restraining Web\"")) throw new Error("Missing label inside OverTime flag");
            
            resolve();
          } catch (e) {
            app.close();
            reject(e);
          }
        }, 50);
      }, 50);
    });
  }

  static async #testEffectAutoDescription() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      
      const el = app.element;
      
      // We leave description blank to trigger auto-gen
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Auto Desc Test");
      
      // 1. Add Statuses
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-status='prone']"), true);
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-status='poisoned']"), true);
      
      // 2. Add OverTime (End, Target, 2d6 poison, CON 14, half)
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='durationType'][value='overtime']"), true);
      
      setTimeout(() => {
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otDamage']"), "2d6");
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='otRollType'][value='damage']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otDamageType']"), "poison");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otSave']"), true);
        
        setTimeout(() => {
          ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otSaveAbility']"), "con");
          ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otSaveDC']"), "14");
          ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otOnSave']"), "halfdamage");
          
          // 3. Add Modifier (Disadvantage on All Attacks)
          el.querySelector("#addAdvRow").click();
          
          setTimeout(() => {
            const typeSelect = el.querySelector(".adv-type");
            const catSelect = el.querySelector(".adv-cat");
            ForgeTestingSuite.#simulateChange(typeSelect, "disadvantage");
            ForgeTestingSuite.#simulateChange(catSelect, "attack.all");
            
            try {
              const payload = app._buildAEData();
              app.close();
              
              if (!payload) throw new Error("No payload was captured.");
              const desc = payload.description?.value;
              if (!desc) throw new Error("Description was not generated.");
              
              if (!desc.includes("Applies prone, poisoned.")) throw new Error("Statuses missing from description.");
              if (!desc.includes("At the end of the target's turn, make a DC 14 CON save (half damage on success). Takes 2d6 poison.")) throw new Error("Overtime string malformed.");
              if (!desc.includes("Modifiers: disadvantage on attack.all.")) throw new Error("Modifiers missing from description.");
              
              resolve();
            } catch (e) {
              app.close();
              reject(e);
            }
          }, 50);
        }, 50);
      }, 50);
    });
  }

  static async #testCharCreatorMapping() {
    return new Promise(async (resolve, reject) => {
      let captureHook = null;
      let timeoutId = null;
      
      try {
        const app = new CharCreatorApp();
        await app.render(true);
        await ForgeTestingSuite.#delay(150);
        
        const el = app.element;
        
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='charName']"), "Test Wizard E2E");
        ForgeTestingSuite.#simulateChange(el.querySelector("#hp"), "45");
        ForgeTestingSuite.#simulateChange(el.querySelector("#ac"), "14");
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='disposition'][value='1']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='size'][value='huge']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("#spellcasting"), "int");
        ForgeTestingSuite.#simulateChange(el.querySelector("#spellLevel"), "5");
        
        // Instead of mocking, fetch a REAL spell from the internal DND5e compendium to guarantee 100% native injection schema validity
        const pack = game.packs.get("dnd5e.spells");
        if (!pack) throw new Error("dnd5e.spells compendium missing from environment");
        const realSpell = pack.index.contents[0];
        const dummyItemUuid = `Compendium.dnd5e.spells.Item.${realSpell._id}`;
        app.selectedItems.set(dummyItemUuid, { name: realSpell.name, img: "icons/svg/mystery-man.svg" });
  
        captureHook = Hooks.on("createActor", async (actor) => {
          if (actor.name !== "Test Wizard E2E") return;
          Hooks.off("createActor", captureHook);
          clearTimeout(timeoutId);
          globalThis.fromUuid = origFromUuid;
          
          try {
            if (actor.system.attributes.hp.max !== 45) throw new Error(`HP mismatch, got ${actor.system.attributes.hp.max}`);
            if (actor.system.attributes.ac.flat !== 14) throw new Error(`AC mismatch, got ${actor.system.attributes.ac.flat}`);
            if (actor.system.traits.size !== "huge") throw new Error(`Size mismatch, got ${actor.system.traits.size}`);
            if (actor.prototypeToken.disposition !== 1) throw new Error(`Disposition mismatch, got ${actor.prototypeToken.disposition}`);
            
            // Wait an extra tick for embedded documents to finish executing
            await ForgeTestingSuite.#delay(100);
            const embedded = actor.items;
            if (embedded.size !== 1) throw new Error("Incorrect number of items injected");
            if (embedded.contents[0].name !== realSpell.name) throw new Error("Item payload name mismatch");
            
            await actor.delete(); // Cleanup test artifact
            resolve();
          } catch(e) {
            await actor.delete();
            reject(e);
          }
        });
  
        timeoutId = setTimeout(() => {
          Hooks.off("createActor", captureHook);
          app.close();
          reject(new Error("Timeout waiting for Actor.create to fire in local DB"));
        }, 3000);
  
        // Fire physical submit action
        el.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        // Alternatively click the button directly:
        const submitBtn = el.querySelector("button[data-action='createNPC']");
        if (submitBtn) submitBtn.click();
        
      } catch (e) {
        if (captureHook) Hooks.off("createActor", captureHook);
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  static async #testEffectFeatureWrapper() {
    return new Promise(async (resolve, reject) => {
      let captureHook = null;
      let timeoutId = null;

      try {
        const app = new EffectCreatorApp();
        await app.render(true);
        await ForgeTestingSuite.#delay(150);
        const el = app.element;
        
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Giant Fireball E2E");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapInFeature']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='wrapType'][value='save']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapTargetArea']"), "radius");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapDamageFormula']"), "8d6");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapDamageType']"), "fire");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapSaveAbility']"), "dex");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapSaveDC']"), "16");
        
        captureHook = Hooks.on("createItem", async (item) => {
          if (item.name !== "Giant Fireball E2E") return;
          Hooks.off("createItem", captureHook);
          clearTimeout(timeoutId);

          try {
            // D&D5e V3 Modern Assertions for physical Document instances
            const activities = item.system.activities;
            if (!activities) throw new Error("D&D5e V3 Activities map is missing");
            const actId = Array.from(activities.keys())[0];
            const act = activities.get(actId);
            if (act.type !== "save") throw new Error("V3 Activity type not save");
            if (act.save.ability.first() !== "dex") throw new Error("V3 Activity save ability mismatch");
            if (act.save.dc.formula !== "16") throw new Error("V3 Activity save DC mismatch");
            if (act.damage.parts[0].custom.formula !== "8d6") throw new Error("V3 Activity damage formula mismatch");
            const damageTypes = Array.from(act.damage.parts[0].types || []);
            if (damageTypes[0] !== "fire") throw new Error("V3 Activity damage type mismatch");
            if (!act.effects[0]?._id) throw new Error("V3 Activity did not dynamically link to the Active Effect ID");
            
            app.close();
            await item.delete(); // Cleanup test artifact
            resolve();
          } catch (e) {
            app.close();
            await item.delete();
            reject(e);
          }
        });

        timeoutId = setTimeout(() => {
          Hooks.off("createItem", captureHook);
          app.close();
          reject(new Error("Timeout waiting for Item.create to fire in local DB"));
        }, 3000);

        // Click create button
        const submitBtn = el.querySelector("button[data-action='createEffect']");
        if (submitBtn) submitBtn.click();

      } catch (e) {
        if (captureHook) Hooks.off("createItem", captureHook);
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  static async #testCharCreatorArchetypes() {
    return new Promise(async (resolve, reject) => {
      let captureHook = null;
      let timeoutId = null;

      try {
        const app = new CharCreatorApp();
        await app.render(true);
        await ForgeTestingSuite.#delay(150);
        const el = app.element;
        
        ForgeTestingSuite.#simulateChange(el.querySelector("#charLevel"), "10");
        ForgeTestingSuite.#simulateChange(el.querySelector("#charArchetype"), "warrior");
        
        if (el.querySelector("#ac").value !== "18") throw new Error("AC scaling failed for Warrior Lvl 10");
        if (el.querySelector("#hp").value !== "90") throw new Error("HP scaling failed for Warrior Lvl 10");
        if (el.querySelector("#ability-str").value !== "18") throw new Error("STR scaling failed for Warrior Lvl 10");
        
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='charName']"), "Test Warrior E2E");

        captureHook = Hooks.on("createActor", async (actor) => {
          if (actor.name !== "Test Warrior E2E") return;
          Hooks.off("createActor", captureHook);
          clearTimeout(timeoutId);
          try {
            if (actor.system.attributes.hp.max !== 90) throw new Error(`Actor DB HP failed, got ${actor.system.attributes.hp.max}`);
            if (actor.system.abilities.str.value !== 18) throw new Error(`Actor DB STR failed, got ${actor.system.abilities.str.value}`);
            
            app.close();
            await actor.delete(); // Cleanup test artifact
            resolve();
          } catch(e) {
            app.close();
            await actor.delete();
            reject(e);
          }
        });

        timeoutId = setTimeout(() => {
          Hooks.off("createActor", captureHook);
          app.close();
          reject(new Error("Timeout waiting for Actor.create to fire in local DB"));
        }, 3000);

        // Fire physical submit action
        el.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        const submitBtn = el.querySelector("button[data-action='createNPC']");
        if (submitBtn) submitBtn.click();

      } catch(e) {
        if (captureHook) Hooks.off("createActor", captureHook);
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  static async #testCombatEngineIntegration() {
    return new Promise(async (resolve, reject) => {
      let attacker, defender, attackerToken, defenderToken, combat, compendiumItem;
      const scene = canvas.scene;
      
      if (!scene) return reject(new Error("No active scene available for combat test!"));
      if (typeof MidiQOL === "undefined") return reject(new Error("Midi-QOL module is missing or inactive!"));

      try {
        console.group("Omega Combat Sequence");
        ui.notifications.info("Omega Test: Spawning DB Actors...");
        
        // 1. Database level Actor instantiation (We verified UI injection elsewhere, need speed here)
        attacker = await Actor.create({
          name: "Test Attacker E2E", type: "npc",
          system: { attributes: { hp: { value: 100, max: 100 } } }
        });
        defender = await Actor.create({
          name: "Test Defender E2E", type: "npc",
          system: { attributes: { hp: { value: 100, max: 100 } }, traits: { size: "med" } }
        });

        // 2. Generate the Restraining Strike feature via complete native UI actuation
        const generateFeatureViaUI = async () => {
          return new Promise(async (res, rej) => {
            const app = new EffectCreatorApp();
            await app.render(true);
            await ForgeTestingSuite.#delay(150);
            const el = app.element;
            
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Omega Strike E2E");
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapInFeature']"), true);
            ForgeTestingSuite.#simulateChange(el.querySelector("[name='wrapType'][value='save']"), true);
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapTargetCount']"), "1");
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapTargetArea']"), "creature");
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapSaveAbility']"), "dex");
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapSaveDC']"), "20"); // High to force fail
            
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-status='restrained']"), true);

            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='durationType'][value='overtime']"), true);
            await ForgeTestingSuite.#delay(50);
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otDamage']"), "10");
            ForgeTestingSuite.#simulateChange(el.querySelector("[name='otRollType'][value='damage']"), true);
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='otDamageType']"), "fire");

            const captureHook = Hooks.on("createItem", (item) => {
              if (item.name !== "Omega Strike E2E") return;
              Hooks.off("createItem", captureHook);
              app.close();
              res(item);
            });

            setTimeout(() => { Hooks.off("createItem", captureHook); app.close(); rej(new Error("Timeout creating feature")); }, 4000);
            const submitBtn = el.querySelector("button[data-action='createEffect']");
            if (submitBtn) submitBtn.click();
            else rej(new Error("Submit button not found"));
          });
        };

        ui.notifications.info("Omega Test: Actuating Engine UI to build Item Payload...");
        compendiumItem = await generateFeatureViaUI();
        const itemData = compendiumItem.toObject();
        delete itemData._id;
        delete itemData.folder;
        
        // Inject into attacker
        const [embeddedFeature] = await attacker.createEmbeddedDocuments("Item", [itemData]);

        // 3. Drop physical Tokens onto the Tracker
        ui.notifications.info("Omega Test: Dropping Tokens onto Scene...");
        attackerToken = await TokenDocument.create({ actorId: attacker.id, name: attacker.name, x: 100, y: 100, disposition: 1 }, { parent: scene });
        defenderToken = await TokenDocument.create({ actorId: defender.id, name: defender.name, x: 200, y: 100, disposition: -1 }, { parent: scene });

        // 4. Instantiate Foundry Combat Sequence
        ui.notifications.info("Omega Test: Initializing Combat Encounter...");
        combat = await Combat.create({ scene: scene.id });
        await combat.createEmbeddedDocuments("Combatant", [
          { tokenId: attackerToken.id, actorId: attacker.id, initiative: 20 },
          { tokenId: defenderToken.id, actorId: defender.id, initiative: 10 }
        ]);
        await combat.startCombat();

        // 5. Force Midi-QOL Execution
        game.user.updateTokenTargets([defenderToken.id]);
        ui.notifications.info("Omega Test: Mechanically forcing Feature Execution...");
        const workflow = await MidiQOL.completeItemUse(embeddedFeature, 
          { showFullCard: false, createWorkflow: true }, 
          { workflowOptions: { autoRollDamage: 'always', autoFastDamage: true, autoRollSave: 'always', autoFastSave: true, targetConfirmation: 'none' }}
        );
        
        await ForgeTestingSuite.#delay(2500); // 2.5s for Midi Animations and Database resolutions
        
        // 6. Assert Effect Applications
        const hasRestrained = defender.effects.some(e => e.statuses.has("restrained"));
        if (!hasRestrained) throw new Error("Defender failed to inherit the Restrained status hook from the attack payload!");
        
        const hasOvertime = defender.effects.some(e => e.changes.some(c => c.key === "flags.midi-qol.OverTime"));
        if (!hasOvertime) throw new Error("Defender failed to inherit the OverTime listener from the attack payload!");

        // 7. Assert OverTime Execution
        const initialHP = defender.system.attributes.hp.value;
        ui.notifications.info("Omega Test: Advancing Combat turn for Overtime processing...");
        await combat.nextTurn();
        await ForgeTestingSuite.#delay(2500); // 2.5s for Midi Overtime macro to fire, roll, and apply
        
        const newHP = defender.system.attributes.hp.value;
        if (newHP >= initialHP) throw new Error(`OverTime damage hook failed to execute. HP remained ${newHP} on nextTurn()`);

        // 8. Assert Advantage Mechanics via Core Item
        const [sword] = await attacker.createEmbeddedDocuments("Item", [{
          name: "Test Sword", type: "weapon",
          system: {
            actionType: "mwak", equipped: true,
            damage: { parts: [[{ custom: { enabled: true, formula: "1d8" }, types: ["slashing"] }]] }, // V3 schema compatible
            activities: {
              act1: { type: "attack", attack: { ability: "str", flat: true } }
            }
          }
        }]);
        
        ui.notifications.info("Omega Test: Actuating secondary attack to assert Dice Advantage interpolation...");
        const swordWorkflow = await MidiQOL.completeItemUse(sword, 
          { showFullCard: false, createWorkflow: true }, 
          { workflowOptions: { autoRollDamage: 'always', autoFastDamage: true, targetConfirmation: 'none' }}
        );
        
        await ForgeTestingSuite.#delay(1500);
        
        if (!swordWorkflow.advantage) throw new Error("Attacker did not gain Advantage against the Restrained target! Internal Advantage map bypassed.");

        ui.notifications.info("Omega Test: 100% Success! Destroying test artifacts...");
        console.groupEnd();
        
        // CLEANUP
        Hooks.off("createActor", captureHook); // Purge any stray hooks
        await attacker.delete();
        await defender.delete();
        await attackerToken.delete();
        await defenderToken.delete();
        if (combat) await combat.delete();
        if (compendiumItem) await compendiumItem.delete();
        game.user.updateTokenTargets([]);
        
        // Extra cleanup for hung artifacts
        game.actors.filter(a => a.name.includes("E2E")).forEach(a => a.delete());
        game.items.filter(i => i.name.includes("E2E")).forEach(i => i.delete());
        
        resolve();

      } catch(e) {
        console.groupEnd();
        // Emergency Cleanup
        if (attacker) await attacker.delete().catch(console.error);
        if (defender) await defender.delete().catch(console.error);
        if (attackerToken) await attackerToken.delete().catch(console.error);
        if (defenderToken) await defenderToken.delete().catch(console.error);
        if (combat) await combat.delete().catch(console.error);
        if (compendiumItem) await compendiumItem.delete().catch(console.error);
        game.user.updateTokenTargets([]);
        reject(e);
      }
    });
  }
}

window.ForgeTestingSuite = ForgeTestingSuite;
