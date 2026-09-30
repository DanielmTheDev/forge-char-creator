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
    await runTest("EffectCreatorApp: Generates correct AC Modifier Payload", this.#testEffectACModifier);
    await runTest("EffectCreatorApp: Generates correct Ability Score Modifier Payload", this.#testEffectAbilityModifier);
    await runTest("EffectCreatorApp: Generates correct Stacking Flags", this.#testEffectStacking);
    await runTest("EffectCreatorApp: Auto-Description includes Stacking, Mode, Duration, Grants", this.#testEffectAutoDescriptionAdvanced);
    await runTest("EffectCreatorApp: Generates dynamic Feature Wrapper Payloads", this.#testEffectFeatureWrapper);
    await runTest("EffectCreatorApp: Maps target type correctly (defaults to creature)", this.#testEffectTargeting);
    await runTest("EffectCreatorApp: Just Apply creates Utility Activity without Attack/Save", this.#testEffectJustApply);
    await runTest("EffectCreatorApp: Midi Damage creates Damage Activity without Attack/Save", this.#testEffectMidiDamage);
    await runTest("EffectCreatorApp: Temp HP creates a Heal Activity with healing type temphp", this.#testEffectTempHp);
    await runTest("EffectCreatorApp: Activation cost and targeting are written to the Activity", this.#testEffectActivationAndTarget);
    await runTest("EffectCreatorApp: Special duration emits DAE specialDuration flag", this.#testEffectSpecialDuration);
    await runTest("EffectCreatorApp: Attack with on-hit save chains to an automation-only save activity", this.#testAttackSaveChainPayload);
    await runTest("CharCreatorApp: Maps AC, HP, Size, Spellcasting to Actor", this.#testCharCreatorMapping);
    await runTest("CharCreatorApp: Scales Attributes dynamically via Archetype Math", this.#testCharCreatorArchetypes);
    await runTest("CharCreatorApp: Create New Feature automatically adds to selected items", this.#testCharCreatorFeatureCreation);

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
              const desc = payload.description;
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

  // ── AC Modifier Test ────────────────────────────────────────────────────
  static async #testEffectACModifier() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      
      const el = app.element;
      
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "AC Shield E2E");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='acBonus']"), "3");
      
      try {
        const payload = app._buildAEData();
        app.close();
        
        if (!payload) throw new Error("No payload was captured.");
        const change = payload.changes.find(c => c.key === "system.attributes.ac.bonus");
        if (!change) throw new Error("Missing AC bonus change in payload.");
        if (change.mode !== 2) throw new Error(`Expected mode 2 (ADD), got ${change.mode}`);
        if (change.value !== "3") throw new Error(`Expected value "3", got "${change.value}"`);
        
        // Also verify negative works
        const app2 = new EffectCreatorApp();
        await app2.render(true);
        await ForgeTestingSuite.#delay(100);
        const el2 = app2.element;
        ForgeTestingSuite.#simulateChange(el2.querySelector("[data-ef='name']"), "AC Penalty");
        ForgeTestingSuite.#simulateChange(el2.querySelector("[data-ef='acBonus']"), "-2");
        const payload2 = app2._buildAEData();
        app2.close();
        const change2 = payload2.changes.find(c => c.key === "system.attributes.ac.bonus");
        if (!change2) throw new Error("Missing AC penalty change.");
        if (change2.value !== "-2") throw new Error(`Expected "-2", got "${change2.value}"`);
        
        // Verify zero produces no change
        const app3 = new EffectCreatorApp();
        await app3.render(true);
        await ForgeTestingSuite.#delay(100);
        const el3 = app3.element;
        ForgeTestingSuite.#simulateChange(el3.querySelector("[data-ef='name']"), "No AC");
        ForgeTestingSuite.#simulateChange(el3.querySelector("[data-ef='acBonus']"), "0");
        const payload3 = app3._buildAEData();
        app3.close();
        const change3 = payload3.changes.find(c => c.key === "system.attributes.ac.bonus");
        if (change3) throw new Error("Zero AC should produce no change entry.");
        
        // Verify auto-description includes AC info
        if (!payload.description.includes("AC +3")) throw new Error("Auto-description missing AC bonus text.");
        
        resolve();
      } catch (e) {
        app.close();
        reject(e);
      }
    });
  }

  // ── Ability Score Modifier Test ─────────────────────────────────────────
  static async #testEffectAbilityModifier() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      
      const el = app.element;
      
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Bull's Strength E2E");
      
      // Add first ability modifier row
      el.querySelector("#addAbilityRow").click();
      await ForgeTestingSuite.#delay(50);
      
      // Set first row: STR +4
      let abilitySelects = el.querySelectorAll(".ability-mod-ability");
      let valueInputs = el.querySelectorAll(".ability-mod-value");
      ForgeTestingSuite.#simulateChange(abilitySelects[0], "str");
      ForgeTestingSuite.#simulateChange(valueInputs[0], "4");
      
      // Add second row: DEX -2
      el.querySelector("#addAbilityRow").click();
      await ForgeTestingSuite.#delay(50);
      
      abilitySelects = el.querySelectorAll(".ability-mod-ability");
      valueInputs = el.querySelectorAll(".ability-mod-value");
      ForgeTestingSuite.#simulateChange(abilitySelects[1], "dex");
      ForgeTestingSuite.#simulateChange(valueInputs[1], "-2");
      
      try {
        const payload = app._buildAEData();
        app.close();
        
        if (!payload) throw new Error("No payload was captured.");
        
        const strChange = payload.changes.find(c => c.key === "system.abilities.str.value");
        if (!strChange) throw new Error("Missing STR modifier change.");
        if (strChange.mode !== 2) throw new Error(`Expected mode 2 (ADD), got ${strChange.mode}`);
        if (strChange.value !== "4") throw new Error(`STR value expected "4", got "${strChange.value}"`);
        
        const dexChange = payload.changes.find(c => c.key === "system.abilities.dex.value");
        if (!dexChange) throw new Error("Missing DEX modifier change.");
        if (dexChange.value !== "-2") throw new Error(`DEX value expected "-2", got "${dexChange.value}"`);
        
        // Verify auto-description
        if (!payload.description.includes("STR +4")) throw new Error("Auto-description missing STR modifier.");
        if (!payload.description.includes("DEX -2")) throw new Error("Auto-description missing DEX modifier.");
        
        resolve();
      } catch (e) {
        app.close();
        reject(e);
      }
    });
  }

  // ── Stacking Test ───────────────────────────────────────────────────────
  static async #testEffectStacking() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      
      const el = app.element;
      
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Stackable Buff E2E");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='stackable']"), "multi");
      
      try {
        const payload = app._buildAEData();
        
        if (!payload) throw new Error("No payload was captured.");
        if (!payload.flags.dae) throw new Error("Missing DAE flags object.");
        if (payload.flags.dae.stackable !== "multi") throw new Error(`Expected stackable "multi", got "${payload.flags.dae.stackable}"`);
        if (!payload.description.includes("Stacking: Full Stack.")) throw new Error("Auto-description missing stacking text for multi.");
        
        // Verify "count" mode too
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='stackable']"), "count");
        const payload2 = app._buildAEData();
        if (payload2.flags.dae.stackable !== "count") throw new Error(`Expected stackable "count", got "${payload2.flags.dae.stackable}"`);
        
        // Verify "none" produces no dae flags
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='stackable']"), "none");
        const payload3 = app._buildAEData();
        if (payload3.flags.dae?.stackable) throw new Error("Stackable 'none' should not produce DAE flags.");
        
        app.close();
        resolve();
      } catch (e) {
        app.close();
        reject(e);
      }
    });
  }

  // ── Advanced Auto-Description Test (Stacking, Mode, Duration, Grants) ────
  static async #testEffectAutoDescriptionAdvanced() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);
      
      const el = app.element;
      
      // Leave description blank to trigger auto-gen
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Advanced Desc Test");
      
      // 1. Set Passive mode
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='appMode'][value='passive']"), true);
      
      // 2. Set fixed duration of 5 rounds
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='durationType'][value='fixed']"), true);
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='rounds']"), "5");
      
      // 3. Set stackable to count
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='stackable']"), "count");
      
      // 4. Add AC bonus
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='acBonus']"), "2");
      
      // 5. Add a grants advantage modifier
      el.querySelector("#addAdvRow").click();
      await ForgeTestingSuite.#delay(50);
      
      const typeSelect = el.querySelector(".adv-type");
      const catSelect = el.querySelector(".adv-cat");
      const grantsCheck = el.querySelector(".adv-grants");
      ForgeTestingSuite.#simulateChange(typeSelect, "advantage");
      ForgeTestingSuite.#simulateChange(catSelect, "attack.mwak");
      ForgeTestingSuite.#simulateChange(grantsCheck, true);
      
      try {
        const payload = app._buildAEData();
        const desc = payload.description;
        if (!desc) throw new Error("Description was not generated.");
        
        // Verify grants qualifier
        if (!desc.includes("grants advantage on attack.mwak")) throw new Error(`Grants qualifier missing from description. Got: ${desc}`);
        
        // Verify stacking
        if (!desc.includes("Stacking: Count Stacks.")) throw new Error(`Stacking missing from description. Got: ${desc}`);
        
        // Verify passive mode
        if (!desc.includes("Mode: Passive (always active).")) throw new Error(`Passive mode missing from description. Got: ${desc}`);
        
        // Verify duration
        if (!desc.includes("Duration: 5 rounds.")) throw new Error(`Duration missing from description. Got: ${desc}`);
        
        // Verify AC bonus is still there
        if (!desc.includes("AC +2.")) throw new Error(`AC bonus missing from description. Got: ${desc}`);
        const acChange = payload.changes.find(c => c.key === "system.attributes.ac.bonus");
        if (!acChange) throw new Error("AC value change missing from payload changes.");
        
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='appMode'][value='activation']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='activationTarget'][value='targets']"), true);
        const payload2 = app._buildAEData();
        const desc2 = payload2.description;
        if (!desc2.includes("Mode: On Activation (applies to target(s)).")) throw new Error(`Activation mode missing. Got: ${desc2}`);
        
        // Test indefinite duration
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='rounds']"), "0");
        const payload3 = app._buildAEData();
        const desc3 = payload3.description;
        if (!desc3.includes("Duration: Indefinite.")) throw new Error(`Indefinite duration missing. Got: ${desc3}`);
        
        // Test singular round
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='rounds']"), "1");
        const payload4 = app._buildAEData();
        const desc4 = payload4.description;
        if (!desc4.includes("Duration: 1 round.")) throw new Error(`Singular round missing. Got: ${desc4}`);
        
        app.close();
        resolve();
      } catch (e) {
        app.close();
        reject(e);
      }
    });
  }

  static async #testEffectTargeting() {
    return new Promise(async (resolve, reject) => {
      let captureHook = null;
      let timeoutId = null;

      try {
        const app = new EffectCreatorApp();
        await app.render(true);
        await ForgeTestingSuite.#delay(150);
        
        const el = app.element;
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Targeting E2E");
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='kind'][value='buff']"), true);
        // Leave wrapTargetArea at default (creature)
        
        captureHook = Hooks.on("createItem", async (item) => {
          if (item.name !== "Targeting E2E") return;
          Hooks.off("createItem", captureHook);
          clearTimeout(timeoutId);

          try {
            // dnd5e 5.2.5: targeting lives on the activity, not on system.target.
            const activities = item.system.activities;
            const act = activities.get(Array.from(activities.keys())[0]);
            if (act.target?.affects?.type !== "creature") {
               throw new Error(`Default target type should be 'creature', got '${act.target?.affects?.type}'`);
            }
            
            app.close();
            await item.delete(); // Cleanup
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
        }, 15000);

        const submitBtn = el.querySelector("button[data-action='createEffect']");
        if (submitBtn) submitBtn.click();
        else reject(new Error("Create button not found"));

      } catch (e) {
        if (captureHook) Hooks.off("createItem", captureHook);
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  // ── Just Apply Feature Wrapper Test ─────────────────────────────────────
  static async #testEffectJustApply() {
    return new Promise(async (resolve, reject) => {
      let captureHook = null;
      let timeoutId = null;

      try {
        const app = new EffectCreatorApp();
        await app.render(true);
        await ForgeTestingSuite.#delay(150);
        const el = app.element;
        
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Bless E2E Apply");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-status='charmed']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='kind'][value='buff']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapTargetCount']"), "3");
        
        // Verify payload structure before saving
        const payload = app._buildAEData();
        if (!payload.statuses.includes("charmed")) throw new Error("Status missing from AE payload.");
        
        captureHook = Hooks.on("createItem", async (item) => {
          if (item.name !== "Bless E2E Apply") return;
          Hooks.off("createItem", captureHook);
          clearTimeout(timeoutId);

          try {
            // D&D5e V3 Assertions
            const activities = item.system.activities;
            if (!activities) throw new Error("D&D5e V3 Activities map is missing");
            const actId = Array.from(activities.keys())[0];
            const act = activities.get(actId);
            if (act.type !== "utility") throw new Error(`V3 Activity type should be 'utility', got '${act.type}'`);
            if (!act.effects[0]?._id) throw new Error("V3 Activity did not link to the Active Effect.");
            
            // Verify no attack or save config exists
            if (act.attack) throw new Error("Just Apply should NOT have attack configuration.");
            if (act.save?.ability?.length) throw new Error("Just Apply should NOT have save configuration.");
            
            app.close();
            await item.delete();
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
          reject(new Error("Timeout waiting for Item.create to fire for Just Apply test"));
        }, 15000);

        const submitBtn = el.querySelector("button[data-action='createEffect']");
        if (submitBtn) submitBtn.click();
        else reject(new Error("Submit button not found"));

      } catch (e) {
        if (captureHook) Hooks.off("createItem", captureHook);
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  // ── Midi Damage Feature Wrapper Test ─────────────────────────────────────
  static async #testEffectMidiDamage() {
    return new Promise(async (resolve, reject) => {
      let captureHook = null;
      let timeoutId = null;

      try {
        const app = new EffectCreatorApp();
        await app.render(true);
        await ForgeTestingSuite.#delay(150);
        const el = app.element;
        
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Test Midi Damage");
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='kind'][value='save']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='saveMode'][value='none']"), true);
        el.querySelector("[data-add-row='saveDamageRows']").click();
        ForgeTestingSuite.#simulateChange(el.querySelector(".dmg-formula[data-list='saveDamageRows'][data-idx='0']"), "2d6");
        // Something to apply, so the activity links an AE (empty ones are no longer embedded).
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-status='prone']"), true);
        
        // Verify payload structure before saving
        const payload = app._buildAEData();
        if (payload.name !== "Test Midi Damage") throw new Error("AE name mismatch.");
        
        captureHook = Hooks.on("createItem", async (item) => {
          if (item.name !== "Test Midi Damage") return;
          Hooks.off("createItem", captureHook);
          clearTimeout(timeoutId);

          try {
            // D&D5e V3 Assertions
            const activities = item.system.activities;
            if (!activities) throw new Error("D&D5e V3 Activities map is missing");
            const actId = Array.from(activities.keys())[0];
            const act = activities.get(actId);
            if (act.type !== "damage") throw new Error(`V3 Activity type should be 'damage', got '${act.type}'`);
            if (!act.effects[0]?._id) throw new Error("V3 Activity did not link to the Active Effect.");
            
            // Verify damage configuration exists
            if (act.damage?.parts?.[0]?.custom?.formula !== "2d6") throw new Error("Damage formula not mapped to activity.");
            
            // Verify no attack or save config exists
            if (act.attack) throw new Error("Damage should NOT have attack configuration.");
            if (act.save?.ability?.length) throw new Error("Damage should NOT have save configuration.");

            app.close();
            await item.delete(); // cleanup
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
          reject(new Error("Timeout waiting for Item.create to fire for Midi Damage test"));
        }, 15000);

        const submitBtn = el.querySelector("button[data-action='createEffect']");
        if (submitBtn) submitBtn.click();
        else reject(new Error("Submit button not found"));

      } catch (e) {
        if (captureHook) Hooks.off("createItem", captureHook);
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  // ── Temp HP (heal activity) ─────────────────────────────────────────────
  static async #testEffectTempHp() {
    return new Promise(async (resolve, reject) => {
      let captureHook = null;
      let timeoutId = null;

      try {
        const app = new EffectCreatorApp();
        await app.render(true);
        await ForgeTestingSuite.#delay(150);
        const el = app.element;

        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Rally E2E TempHP");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='acBonus']"), "2");
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='kind'][value='buff']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='buffMode'][value='temphp']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='tempHpFormula']"), "2d4+2");

        // The Temp HP formula field is only shown in Temp HP mode.
        if (el.querySelector("#tempHpBox")?.style.display === "none") {
          throw new Error("Temp HP formula field should be visible in Temp HP mode.");
        }

        const payload = app._buildAEData();
        if (!payload.description.includes("2d4+2 temporary hit points")) {
          throw new Error(`Auto-description missing temp HP grant. Got: ${payload.description}`);
        }

        captureHook = Hooks.on("createItem", async (item) => {
          if (item.name !== "Rally E2E TempHP") return;
          Hooks.off("createItem", captureHook);
          clearTimeout(timeoutId);

          try {
            const activities = item.system.activities;
            if (!activities) throw new Error("Activities map is missing.");
            const act = activities.get(Array.from(activities.keys())[0]);
            if (act.type !== "heal") throw new Error(`Activity type should be 'heal', got '${act.type}'`);

            const types = act.healing?.types instanceof Set
              ? Array.from(act.healing.types) : (act.healing?.types ?? []);
            if (!types.includes("temphp")) throw new Error(`healing.types should contain 'temphp', got ${JSON.stringify(types)}`);
            if (act.healing.custom?.enabled !== true) throw new Error("healing.custom.enabled should be true.");
            if (act.healing.custom?.formula !== "2d4+2") throw new Error(`healing.custom.formula should be '2d4+2', got '${act.healing.custom?.formula}'`);

            // The AE (AC +2) must ride along with the temp HP grant.
            if (!act.effects[0]?._id) throw new Error("Heal activity did not link to the Active Effect.");
            const ae = item.effects.contents[0];
            if (!ae?.changes.find(c => c.key === "system.attributes.ac.bonus")) {
              throw new Error("Embedded AE lost its AC bonus change.");
            }
            // Temp HP must NOT be an AE change — dnd5e stores hp.temp, so an effect
            // change on it is never consumed by damage (see DAE's own field help).
            if (ae.changes.find(c => c.key?.includes("hp.temp"))) {
              throw new Error("Temp HP must not be emitted as an ActiveEffect change.");
            }

            app.close();
            await item.delete();
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
          reject(new Error("Timeout waiting for Item.create to fire for Temp HP test"));
        }, 15000);

        const submitBtn = el.querySelector("button[data-action='createEffect']");
        if (submitBtn) submitBtn.click();
        else reject(new Error("Submit button not found"));

      } catch (e) {
        if (captureHook) Hooks.off("createItem", captureHook);
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  // ── Activation cost + targeting land on the ACTIVITY ────────────────────
  static async #testEffectActivationAndTarget() {
    // dnd5e 5.x FeatData has no activation/target fields, so both must be written
    // to the activity or they are silently dropped by the DataModel.
    const build = (name, area, tweak) => new Promise(async (resolve, reject) => {
      let captureHook = null;
      let timeoutId = null;

      try {
        const app = new EffectCreatorApp();
        await app.render(true);
        await ForgeTestingSuite.#delay(150);
        const el = app.element;

        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), name);
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='kind'][value='buff']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapActivation']"), "bonus");
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapTargetArea']"), area);
        tweak(el);

        captureHook = Hooks.on("createItem", async (item) => {
          if (item.name !== name) return;
          Hooks.off("createItem", captureHook);
          clearTimeout(timeoutId);

          try {
            const activities = item.system.activities;
            const act = activities.get(Array.from(activities.keys())[0]);
            if (act.activation?.type !== "bonus") throw new Error(`activation.type should be 'bonus', got '${act.activation?.type}'`);
            resolve(act);
          } catch (e) {
            reject(e);
          } finally {
            app.close();
            await item.delete();
          }
        });

        timeoutId = setTimeout(() => {
          Hooks.off("createItem", captureHook);
          app.close();
          reject(new Error(`Timeout waiting for Item.create to fire for ${name}`));
        }, 15000);

        const submitBtn = el.querySelector("button[data-action='createEffect']");
        if (submitBtn) submitBtn.click();
        else reject(new Error("Submit button not found"));

      } catch (e) {
        if (captureHook) Hooks.off("createItem", captureHook);
        clearTimeout(timeoutId);
        reject(e);
      }
    });

    // Individual target type -> target.affects
    const single = await build("Activation E2E Single", "creature", el => {
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapTargetCount']"), "2");
    });
    if (String(single.target?.affects?.count) !== "2") {
      throw new Error(`target.affects.count should be 2, got '${single.target?.affects?.count}'`);
    }
    if (single.target?.affects?.type !== "creature") {
      throw new Error(`target.affects.type should be 'creature', got '${single.target?.affects?.type}'`);
    }

    // Area target type -> target.template, sized from the Size (ft) field
    const area = await build("Activation E2E Area", "sphere", el => {
      if (el.querySelector("#wrapAreaSizeBox")?.style.display === "none") {
        throw new Error("Size (ft) field should be visible for an area target type.");
      }
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapAreaSize']"), "15");
    });
    if (area.target?.template?.type !== "sphere") {
      throw new Error(`target.template.type should be 'sphere', got '${area.target?.template?.type}'`);
    }
    if (String(area.target?.template?.size) !== "15") {
      throw new Error(`target.template.size should be 15, got '${area.target?.template?.size}'`);
    }
  }

  // ── DAE special duration ("until end of next turn") ─────────────────────
  static async #testEffectSpecialDuration() {
    return new Promise(async (resolve, reject) => {
      const app = new EffectCreatorApp();
      await app.render(true);
      await ForgeTestingSuite.#delay(150);

      const el = app.element;
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Special Duration E2E");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='specialDuration']"), "turnEndSource");

      try {
        const payload = app._buildAEData();
        const sd = payload.flags?.dae?.specialDuration;
        if (!Array.isArray(sd)) throw new Error("flags.dae.specialDuration should be an array.");
        if (sd.length !== 1 || sd[0] !== "turnEndSource") {
          throw new Error(`Expected ["turnEndSource"], got ${JSON.stringify(sd)}`);
        }
        if (!payload.description.includes("Expires at the end of source's next turn.")) {
          throw new Error(`Auto-description missing expiry text. Got: ${payload.description}`);
        }
        // Indefinite should not be claimed alongside a special duration.
        if (payload.description.includes("Duration: Indefinite.")) {
          throw new Error("Description should not say Indefinite when a special duration is set.");
        }

        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='specialDuration']"), "turnEnd");
        if (app._buildAEData().flags.dae.specialDuration[0] !== "turnEnd") {
          throw new Error("specialDuration did not update to turnEnd.");
        }

        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='specialDuration']"), "none");
        const payload3 = app._buildAEData();
        if (payload3.flags.dae?.specialDuration) throw new Error("'none' should not emit a specialDuration flag.");
        if (!payload3.description.includes("Duration: Indefinite.")) {
          throw new Error(`Indefinite duration text missing once special duration is cleared. Got: ${payload3.description}`);
        }

        app.close();
        resolve();
      } catch (e) {
        app.close();
        reject(e);
      }
    });
  }

  // ── Attack → on-hit save chain (payload through the UI) ──────────────────
  static async #testAttackSaveChainPayload() {
    const app = new EffectCreatorApp();
    await app.render(true);
    await ForgeTestingSuite.#delay(150);
    const el = app.element;
    try {
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Chain T0");
      ForgeTestingSuite.#simulateChange(el.querySelector("[name='kind'][value='attack']"), true);
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='toHitFlat']"), "6");
      el.querySelector("[data-add-row='damageRows']").click();
      ForgeTestingSuite.#simulateChange(el.querySelector(".dmg-formula[data-list='damageRows'][data-idx='0']"), "1d6");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='onHitSave']"), true);
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapSaveDC']"), "12");
      ForgeTestingSuite.#simulateChange(el.querySelector("[data-status='prone']"), true);

      if (el.querySelector(".fc-step[data-step='save']").hidden) throw new Error("Save step should show once the on-hit save is ticked.");
      const item = app._buildItemData();
      const acts = Object.values(item.system.activities);
      if (acts.length !== 2) throw new Error(`Expected 2 activities, got ${acts.length}`);
      const [atk, sv] = acts;
      if (atk.type !== "attack" || sv.type !== "save") throw new Error("Expected attack + save activities.");
      if (atk.attack.flat !== true || atk.attack.bonus !== "6") throw new Error(`Flat +6 to hit expected, got ${JSON.stringify(atk.attack)}`);
      if (atk.otherActivityId !== sv._id) throw new Error("Attack must chain to the save via otherActivityId.");
      if (!sv.midiProperties?.automationOnly) throw new Error("Chained save must be automation-only.");
      if (sv.save.dc.calculation !== "" || sv.save.dc.formula !== "12") throw new Error(`Custom DC 12 expected, got ${JSON.stringify(sv.save.dc)}`);
      if (atk.effects.length || sv.effects[0]?._id !== item.effects[0]._id) throw new Error("AE must ride the save, not the attack.");
    } finally {
      app.close();
    }
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
        ForgeTestingSuite.#simulateChange(el.querySelector("#linkActorData"), true);

        // Instead of mocking, fetch a REAL spell from the internal DND5e compendium to guarantee 100% native injection schema validity
        const pack = game.packs.get("dnd5e.spells");
        if (!pack) throw new Error("dnd5e.spells compendium missing from environment");
        const realSpell = pack.index.contents[0];
        const dummyItemUuid = realSpell.uuid || `Compendium.${pack.metadata.id}.Item.${realSpell._id}`;
        app.selectedItems.set(dummyItemUuid, { name: realSpell.name, img: "icons/svg/mystery-man.svg" });
  
        captureHook = Hooks.on("createActor", async (actor) => {
          if (actor.name !== "Test Wizard E2E") return;
          Hooks.off("createActor", captureHook);
          clearTimeout(timeoutId);
          
          try {
            if (actor.system.attributes.hp.max !== 45) throw new Error(`HP mismatch, got ${actor.system.attributes.hp.max}`);
            if (actor.system.attributes.ac.flat !== 14) throw new Error(`AC mismatch, got ${actor.system.attributes.ac.flat}`);
            if (actor.system.traits.size !== "huge") throw new Error(`Size mismatch, got ${actor.system.traits.size}`);
            if (actor.prototypeToken.disposition !== 1) throw new Error(`Disposition mismatch, got ${actor.prototypeToken.disposition}`);
            if (actor.prototypeToken.actorLink !== true) throw new Error(`actorLink not set from checkbox, got ${actor.prototypeToken.actorLink}`);

            // Embedded items are created after the actor — poll instead of a fixed sleep.
            for (let i = 0; i < 40 && actor.items.size === 0; i++) await ForgeTestingSuite.#delay(250);
            const embedded = actor.items;
            if (embedded.size !== 1) throw new Error(`Incorrect number of items injected, expected 1, got ${embedded.size}`);
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
        }, 15000);
  
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
        ForgeTestingSuite.#simulateChange(el.querySelector("[name='kind'][value='save']"), true);
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='wrapTargetArea']"), "radius");
        el.querySelector("[data-add-row='saveDamageRows']").click();
        ForgeTestingSuite.#simulateChange(el.querySelector(".dmg-formula[data-list='saveDamageRows'][data-idx='0']"), "8d6");
        ForgeTestingSuite.#simulateChange(el.querySelector(".dmg-type[data-list='saveDamageRows'][data-idx='0']"), "fire");
        // Something to apply, so the activity links an AE (empty ones are no longer embedded).
        ForgeTestingSuite.#simulateChange(el.querySelector("[data-status='prone']"), true);
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
        }, 15000);

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
        }, 15000);

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

  static async #testCharCreatorFeatureCreation() {
    return new Promise(async (resolve, reject) => {
      let captureHook = null;
      let timeoutId = null;

      try {
        const charApp = new CharCreatorApp();
        await charApp.render(true);
        await ForgeTestingSuite.#delay(150);
        const charEl = charApp.element;

        // 1. Click Create New Feature
        const createBtn = charEl.querySelector("button[data-action='createNewFeature']");
        if (!createBtn) throw new Error("Create New Feature button not found.");
        createBtn.click();
        
        await ForgeTestingSuite.#delay(250); // wait for window to render

        // 2. Find the effect creator window
        const effectEl = document.querySelector(".forge-effect-creator");
        if (!effectEl) throw new Error("Effect Creator App did not render.");

        // 3. Verify it is locked to features: "Effect only" disabled, Attack preselected
        const effKind = effectEl.querySelector("[name='kind'][value='effect']");
        if (!effKind) throw new Error("Kind picker not found in builder.");
        if (!effKind.disabled) throw new Error("Effect-only kind must be disabled when locked.");
        if (!effectEl.querySelector("[name='kind'][value='attack']").checked) throw new Error("Locked builder should default to Attack.");

        // 4. Fill details
        ForgeTestingSuite.#simulateChange(effectEl.querySelector("[data-ef='name']"), "E2E Char Feature");
        ForgeTestingSuite.#simulateChange(effectEl.querySelector("[data-ef='toHitFlat']"), "4");
        effectEl.querySelector("[data-add-row='damageRows']").click();
        ForgeTestingSuite.#simulateChange(effectEl.querySelector(".dmg-formula[data-list='damageRows'][data-idx='0']"), "1d6");

        // 5. Intercept Item creation
        captureHook = Hooks.on("createItem", async (item) => {
          if (item.name !== "E2E Char Feature") return;
          Hooks.off("createItem", captureHook);
          clearTimeout(timeoutId);

          try {
            await ForgeTestingSuite.#delay(150); // wait for callback to run
            
            // 6. Verify CharApp picked it up
            const bin = charEl.querySelector("#selectedItemsBin");
            if (!bin.innerHTML.includes("E2E Char Feature")) throw new Error("Feature was not automatically added to selectedItemsBin.");
            
            if (!charApp.selectedItems.has(item.uuid)) throw new Error("Feature UUID not found in charApp.selectedItems Map.");
            if (item.system.activities.contents[0]?.type !== "attack") throw new Error("Wizard feature should be an attack.");

            await ForgeTestingSuite.#delay(600); // wait for the builder's close animation + focus hand-back
            // The effect app should have closed itself
            const effectElAfter = document.querySelector(".forge-effect-creator");
            if (effectElAfter) {
                effectElAfter.remove();
                throw new Error("Effect Creator did not auto-close.");
            }
            // Keyboard flow continues in the wizard's search box.
            if (document.activeElement !== charEl.querySelector("#itemSearchQuery")) throw new Error("Focus should return to the item search after creating a feature.");

            // 7. Create the actor: the feature must be embedded with its attack intact.
            charEl.querySelector("#charName").value = "E2E Wizard Actor";
            charEl.querySelector("[data-action='createNPC']").click();
            let actor = null;
            for (let i = 0; i < 40 && !actor; i++) { await ForgeTestingSuite.#delay(250); actor = game.actors.getName("E2E Wizard Actor"); }
            if (!actor) throw new Error("Wizard did not create the actor.");
            await ForgeTestingSuite.#delay(500);
            const owned = actor.items.getName("E2E Char Feature");
            const atk = owned?.system.activities.contents.find(a => a.type === "attack");
            if (!atk) { await actor.delete(); throw new Error("Actor is missing the created attack feature."); }
            if (atk.attack.bonus !== "4" || !atk.attack.flat) { await actor.delete(); throw new Error(`Embedded attack lost its +4: ${JSON.stringify(atk.attack)}`); }

            await actor.delete();
            await item.delete(); // cleanup
            resolve();
          } catch(e) {
            charApp.close();
            await item.delete();
            reject(e);
          }
        });

        timeoutId = setTimeout(() => {
          Hooks.off("createItem", captureHook);
          charApp.close();
          const ef = document.querySelector(".forge-effect-creator");
          if(ef) ef.remove();
          reject(new Error("Timeout waiting for Item.create to fire in Feature Creation Test"));
        }, 15000);

        const effectSubmitBtn = effectEl.querySelector("button[data-action='createEffect']");
        if (effectSubmitBtn) effectSubmitBtn.click();
        else reject(new Error("Effect Creator submit button not found"));

      } catch(e) {
        if (captureHook) Hooks.off("createItem", captureHook);
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  // Full midi combat E2E; run on its own by tests/omega-combat.spec.js (not part of runAll).
  static async testCombatEngineIntegration() {
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
          system: { attributes: { hp: { value: 100, max: 100 } }, traits: { size: "med" } },
          // Headless: an unforced GM-side NPC save opens a roll dialog and the workflow stalls.
          flags: { "midi-qol": { fail: { ability: { save: { all: 1 } } } } }
        });

        // 2. Generate the Restraining Strike feature via complete native UI actuation
        const generateFeatureViaUI = async () => {
          return new Promise(async (res, rej) => {
            const app = new EffectCreatorApp();
            await app.render(true);
            await ForgeTestingSuite.#delay(150);
            const el = app.element;
            
            ForgeTestingSuite.#simulateChange(el.querySelector("[data-ef='name']"), "Omega Strike E2E");
            ForgeTestingSuite.#simulateChange(el.querySelector("[name='kind'][value='save']"), true);
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
        combat = await Combat.create({ scene: scene.id, active: true });
        await combat.activate(); // midi only ticks OverTime for the active combat
        await combat.createEmbeddedDocuments("Combatant", [
          { tokenId: attackerToken.id, actorId: attacker.id, initiative: 20 },
          { tokenId: defenderToken.id, actorId: defender.id, initiative: 10 }
        ]);
        await combat.startCombat();

        // 5. Force Midi-QOL Execution
        canvas.tokens.setTargets([defenderToken.id]); // v13: User#updateTokenTargets is gone
        ui.notifications.info("Omega Test: Mechanically forcing Feature Execution...");
        // midi 13: activity-level use with explicit targets (the item-level/workflowOptions API is gone).
        const midiOptions = { fastForward: true, fastForwardAttack: true, fastForwardDamage: true, autoRollDamage: 'always',
          targetUuids: [defenderToken.uuid], ignoreUserTargets: true };
        await MidiQOL.completeActivityUse(embeddedFeature.system.activities.contents[0].uuid, { midiOptions });
        
        await ForgeTestingSuite.#delay(2500); // 2.5s for Midi Animations and Database resolutions
        
        // 6. Assert Effect Applications — on the token's actor: NPC tokens are unlinked, midi applies to the synthetic actor.
        const defActor = defenderToken.actor;
        const hasRestrained = defActor.effects.some(e => e.statuses.has("restrained"));
        if (!hasRestrained) throw new Error("Defender failed to inherit the Restrained status hook from the attack payload!");
        
        const hasOvertime = defActor.effects.some(e => e.changes.some(c => c.key === "flags.midi-qol.OverTime"));
        if (!hasOvertime) throw new Error("Defender failed to inherit the OverTime listener from the attack payload!");

        // 7. Assert OverTime Execution
        const initialHP = defActor.system.attributes.hp.value;
        ui.notifications.info("Omega Test: Advancing Combat turn for Overtime processing...");
        // Defender acts second and OverTime defaults to turn=end: its turn must start AND end (≤ 2 advances).
        for (let t = 0; t < 2 && defActor.system.attributes.hp.value >= initialHP; t++) {
          await combat.nextTurn();
          // Midi's OverTime workflow can take ~7 s headless to roll + apply: poll up to 12 s.
          for (let i = 0; i < 24 && defActor.system.attributes.hp.value >= initialHP; i++) await ForgeTestingSuite.#delay(500);
        }
        
        const newHP = defActor.system.attributes.hp.value;
        if (newHP >= initialHP) throw new Error(`OverTime damage hook failed to execute. HP remained ${newHP} on nextTurn()`);

        // 8. Assert Advantage Mechanics via Core Item
        const swordActId = foundry.utils.randomID();
        const [sword] = await attacker.createEmbeddedDocuments("Item", [{
          name: "Test Sword", type: "weapon",
          system: {
            actionType: "mwak", equipped: true,
            damage: { parts: [[{ custom: { enabled: true, formula: "1d8" }, types: ["slashing"] }]] }, // V3 schema compatible
            activities: { // activity ids must be 16 chars or dnd5e drops them
              [swordActId]: { _id: swordActId, type: "attack", attack: { ability: "str", flat: true } }
            }
          }
        }]);
        
        ui.notifications.info("Omega Test: Actuating secondary attack to assert Dice Advantage interpolation...");
        const swordWorkflow = await MidiQOL.completeActivityUse(sword.system.activities.get(swordActId).uuid, { midiOptions });
        
        await ForgeTestingSuite.#delay(1500);
        
        if (!swordWorkflow.advantage) throw new Error("Attacker did not gain Advantage against the Restrained target! Internal Advantage map bypassed.");

        ui.notifications.info("Omega Test: 100% Success! Destroying test artifacts...");
        console.groupEnd();
        
        // CLEANUP
        await attacker.delete();
        await defender.delete();
        await attackerToken.delete();
        await defenderToken.delete();
        if (combat) await combat.delete();
        if (compendiumItem) await compendiumItem.delete();
        canvas.tokens.setTargets([]);
        
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
        canvas.tokens.setTargets([]);
        reject(e);
      }
    });
  }
}

window.ForgeTestingSuite = ForgeTestingSuite;
