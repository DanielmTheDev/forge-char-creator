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
      const app = new CharCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      
      const mockData = {
        charName: "Test Wizard",
        hp: "45",
        ac: "14",
        size: "huge",
        disposition: "1",
        spellcasting: "int",
        spellLevel: "5"
      };
      
      // Inject dummy selected item
      const dummyItemUuid = "Compendium.dnd5e.spells.Item.4d5ZqB5V5aA1d6k"; // Any standard UUID, just mock the fetch
      app.selectedItems.set(dummyItemUuid, { name: "Dummy Spell", img: "icons/svg/mystery-man.svg" });
      
      let capturedPayload = null;
      let capturedEmbedded = null;
      
      const origActorCreate = Actor.create;
      Actor.create = async function(data) {
        capturedPayload = data;
        Actor.create = origActorCreate;
        return { 
          id: "mock_actor_id", 
          createEmbeddedDocuments: async (type, docs) => {
            capturedEmbedded = docs;
          } 
        }; 
      };

      // Mock fromUuid to return a dummy item doc that stringifies to an object cleanly
      const origFromUuid = globalThis.fromUuid;
      globalThis.fromUuid = async (uuid) => {
        return { toObject: () => ({ name: "Dummy Spell", type: "spell", system: {} }) };
      };

      try {
        await app._createNPC(mockData);
        app.close();
        globalThis.fromUuid = origFromUuid;
        
        if (!capturedPayload) throw new Error("No Actor payload was captured.");
        if (capturedPayload.name !== "Test Wizard") throw new Error("Name mismatch");
        if (capturedPayload.system.attributes.hp.max !== "45") throw new Error("HP mismatch");
        if (capturedPayload.system.attributes.ac.flat !== "14") throw new Error("AC mismatch");
        if (capturedPayload.system.traits.size !== "huge") throw new Error("Size mismatch");
        if (capturedPayload.prototypeToken.disposition !== 1) throw new Error("Disposition mismatch");
        
        // Check Item injection
        if (!capturedEmbedded) throw new Error("createEmbeddedDocuments was never called!");
        if (capturedEmbedded.length !== 1) throw new Error("Incorrect number of items injected");
        if (capturedEmbedded[0].name !== "Dummy Spell") throw new Error("Item payload name mismatch");
        
        resolve();
      } catch (e) {
        Actor.create = origActorCreate;
        globalThis.fromUuid = origFromUuid;
        app.close();
        reject(e);
      }
    });
  }

  static async #testEffectFeatureWrapper() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      const el = app.element;
      
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Giant Fireball");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapInFeature']"), true);
      ForgeTestingSuite.#simulateChange(el.querySelector("[name='wrapType'][value='save']"), true);
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapTargetArea']"), "radius");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapDamageFormula']"), "8d6");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapDamageType']"), "fire");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapSaveAbility']"), "dex");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapSaveDC']"), "16");
      
      let capturedItem = null;
      const origItemCreate = Item.create;
      Item.create = async function(data, context) {
        capturedItem = data;
        Item.create = origItemCreate;
        return { id: "mock_feat_id", toObject: ()=>data };
      };
      
      const origGet = game.packs.get;
      game.packs.get = function(key) {
        if (key === "forge-char-creator.forge-features") return { locked: false, importDocument: async ()=>{} };
        return origGet.call(game.packs, key);
      };
      
      try {
        await app._doCreate();
        await ForgeTestingSuite.#delay(50);
        
        Item.create = origItemCreate;
        game.packs.get = origGet;
        
        if (!capturedItem) throw new Error("Feature Item payload not captured");
        if (capturedItem.system.activation.type !== "action") throw new Error("Missing activation cost");
        if (capturedItem.system.target.type !== "radius") throw new Error("Target area not set to radius");
        if (capturedItem.system.target.value !== 20) throw new Error("Target radius size not 20");
        if (capturedItem.system.actionType !== "save") throw new Error("ActionType not set to save");
        if (capturedItem.system.save.ability !== "dex") throw new Error("Save ability mismatch");
        if (capturedItem.system.save.dc !== 16) throw new Error("Save DC mismatch");
        if (capturedItem.system.damage.parts[0][0] !== "8d6") throw new Error("Damage formula mismatch");
        if (capturedItem.system.damage.parts[0][1] !== "fire") throw new Error("Damage type mismatch");
        
        app.close();
        resolve();
      } catch (e) {
        Item.create = origItemCreate;
        game.packs.get = origGet;
        app.close();
        reject(e);
      }
    });
  }

  static async #testCharCreatorArchetypes() {
    return new Promise(async (resolve, reject) => {
      const app = new CharCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      const el = app.element;
      
      ForgeTestingSuite.#simulateChange(el.querySelector("#charLevel"), "10");
      ForgeTestingSuite.#simulateChange(el.querySelector("#charArchetype"), "warrior");
      
      try {
        if (el.querySelector("#ac").value !== "18") throw new Error("AC scaling failed for Warrior Lvl 10");
        if (el.querySelector("#hp").value !== "90") throw new Error("HP scaling failed for Warrior Lvl 10");
        if (el.querySelector("#ability-str").value !== "18") throw new Error("STR scaling failed for Warrior Lvl 10");
        
        ForgeTestingSuite.#simulateChange(el.querySelector("#charArchetype"), "mage_int");
        if (el.querySelector("#ac").value !== "14") throw new Error("AC scaling failed for Mage Lvl 10");
        if (el.querySelector("#hp").value !== "56") throw new Error("HP scaling failed for Mage Lvl 10");
        if (el.querySelector("#ability-int").value !== "19") throw new Error("INT scaling failed for Mage Lvl 10");
        if (el.querySelector("#spellcasting").value !== "int") throw new Error("Spellcasting ability not set for Int Mage");
        
        app.close();
        resolve();
      } catch(e) { app.close(); reject(e); }
    });
  }
}

window.ForgeTestingSuite = ForgeTestingSuite;
