# Macro-driven save→buff ability + T3-macro gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one reference ability ("Example Rally") whose midi onUse macro buffs allies-in-range with temp HP only on a target's failed save, plus a new `T3-macro` gate handler that proves both branches deterministically.

**Architecture:** Macro JS stored inline in the item JSON (`flags.dae.macro.command`), referenced via `flags.midi-qol.onUseMacroName:"[postActiveEffects]ItemMacro"` — midi-qol 13.0.63 resolves + executes it itself (no Item Macro module). The macro reads `workflow.failedSaves` (conditional) and `actor.update`s temp HP onto same-disposition ally tokens within 30 ft (cross-recipient). A new `macroCheck` handler in `verify/checks.mjs` runs caster+allies+enemy in real midi combat, forcing the save outcome.

**Tech Stack:** Foundry VTT (dnd5e 5.2.0, midi-qol 13.0.63, dae, times-up), foundryvtt-cli pack build, Playwright + xvfb gate.

**Reference spec:** `docs/superpowers/specs/2026-06-02-macro-save-buff-ability-design.md`

---

## File Structure

- **Create** `forge-content/src/packs/forge-abilities/example-rally.json` — the ability: feat, one save activity, macro flags.
- **Create** `forge-content/src/packs/forge-abilities/example-rally.expect.json` — `T3-macro` expectation (2 scenarios).
- **Modify** `forge-content/verify/checks.mjs` — add `macroCheck` handler; register `CHECKS['T3-macro']`.
- **Modify** `TODO.md` — check off; record macro-as-content-as-code finding.

No other files. The gate (`content.spec.mjs`), boot, and build tooling already dispatch on tier and pack arbitrary flags.

---

## Task 1: Author the Example Rally ability JSON

**Files:**
- Create: `forge-content/src/packs/forge-abilities/example-rally.json`

- [ ] **Step 1: Write the ability file**

The macro `command` is a single-line JS string (escaped for JSON). Distance helper
is robust to `measurePath` being absent. `_id` + activity `_id` are 16 alphanumeric.

```json
{
  "name": "Example Rally",
  "img": "icons/magic/holy/barrier-shield-winged-blue.webp",
  "type": "feat",
  "_id": "examplerally0001",
  "system": {
    "description": {
      "value": "<p>Reference ability proving macro-driven cross-recipient logic. One creature within 30 ft makes a DC 14 Dexterity save. <strong>On a failed save</strong> it takes 10 force damage, and every ally within 30 ft of you gains <strong>5 temporary hit points</strong>. Nothing happens on a success.</p>",
      "chat": ""
    },
    "activities": {
      "rallysave000001": {
        "_id": "rallysave000001",
        "type": "save",
        "activation": { "type": "action", "value": 1 },
        "range": { "value": 30, "units": "ft" },
        "target": { "affects": { "type": "creature", "count": "1" } },
        "save": { "ability": ["dex"], "dc": { "calculation": "custom", "formula": "14" } },
        "damage": { "onSave": "none", "parts": [{ "types": ["force"], "custom": { "enabled": true, "formula": "10" } }] }
      }
    },
    "identifier": "example-rally",
    "source": { "revision": 1, "rules": "2024" },
    "properties": [],
    "requirements": "",
    "type": { "value": "", "subtype": "" }
  },
  "effects": [],
  "flags": {
    "midi-qol": { "onUseMacroName": "[postActiveEffects]ItemMacro" },
    "dae": {
      "macro": {
        "name": "Example Rally",
        "type": "script",
        "command": "if (args?.[0]?.macroPass !== 'postActiveEffects') return;\nif (!workflow.failedSaves?.size) return;\nconst RADIUS = 30, TEMP = 5;\nconst me = token;\nconst ftBetween = (a, b) => canvas.grid.measurePath ? canvas.grid.measurePath([a, b]).distance : (Math.hypot(b.x - a.x, b.y - a.y) / canvas.dimensions.size) * canvas.dimensions.distance;\nconst allies = canvas.tokens.placeables.filter(t => t.id !== me.id && t.actor && t.document.disposition === me.document.disposition && ftBetween(me.center, t.center) <= RADIUS);\nfor (const ally of allies) {\n  const cur = ally.actor.system.attributes.hp.temp ?? 0;\n  await ally.actor.update({ 'system.attributes.hp.temp': Math.max(cur, TEMP) });\n}"
      }
    }
  },
  "folder": "folderexample001"
}
```

- [ ] **Step 2: Build packs to verify ids + flags pack cleanly**

Run: `cd /home/muckelbauer@sinc-intern.de/git/forge-char-creator && npm run packs:build forge-content`
Expected: completes without throwing. No "id must be 16 alphanumeric" error from `keys.mjs`. The `flags.dae.macro` + `flags.midi-qol` survive into the compiled pack.

- [ ] **Step 3: Commit**

```bash
git add forge-content/src/packs/forge-abilities/example-rally.json
git commit -m "feat(forge-content): Example Rally ability — save + onUse macro flags"
```

---

## Task 2: Author the T3-macro expectation (the failing test)

**Files:**
- Create: `forge-content/src/packs/forge-abilities/example-rally.expect.json`

- [ ] **Step 1: Write the expect file**

```json
{
  "tier": "T3-macro",
  "defender": { "hp": 100, "ac": 1 },
  "allies": 2,
  "tempHp": 5,
  "radius": 30,
  "scenarios": [
    { "force": "fail",    "assert": { "defenderHpDelta": -10, "allyTempHp": 5 } },
    { "force": "success", "assert": { "defenderHpDelta": 0,  "allyTempHp": 0 } }
  ]
}
```

- [ ] **Step 2: Run the gate to verify it fails on the unknown tier**

Run: `cd /home/muckelbauer@sinc-intern.de/git/forge-char-creator && npm run content:verify`
Expected: FAIL early with `Unknown tier(s): Example Rally (tier=T3-macro)` (the `unknownTier` assertion in `content.spec.mjs` — proves the gate now sees the ability + expectation, and that the handler is the missing piece). It must NOT report Example Rally as "missing expect.json".

- [ ] **Step 3: Commit**

```bash
git add forge-content/src/packs/forge-abilities/example-rally.expect.json
git commit -m "test(forge-content): Example Rally T3-macro expectation (fail + success branches)"
```

---

## Task 3: Add the macroCheck handler + register the tier

**Files:**
- Modify: `forge-content/verify/checks.mjs` (add `macroCheck` before the `CHECKS` export; add the `'T3-macro'` entry)

- [ ] **Step 1: Add the `macroCheck` handler**

Insert this function immediately before the `export const CHECKS = {` line. It is
self-contained (shipped to the browser via `page.evaluate`; browser globals only),
mirroring `grantCheck`'s boot/cleanup. Three actors-types: caster + N allies (same
disposition) + enemy (opposite). Forces the save outcome, fires the ability on the
enemy, then asserts enemy HP delta AND each ally's temp HP.

```js
// T3-macro: an onUse-macro ability — target makes a save; on FAIL the target takes
// damage AND every ally within `radius` ft of the caster gains temp HP (applied by
// the item's inline macro, not a native activity). Proves conditional + cross-
// recipient macro logic. Self-contained: shipped to the browser via page.evaluate.
//
// expectation: { defender?:{hp,ac}, allies?:int, tempHp?:int, radius?:int,
//   scenarios:[{ force:'fail'|'success', assert:{ defenderHpDelta?, allyTempHp? } }] }
async function macroCheck({ doc, expectation }) {
  if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  const strip = (d) => { const c = JSON.parse(JSON.stringify(d)); delete c._id; delete c._key; for (const e of c.effects ?? []) delete e._key; return c; };
  const dcfg = expectation.defender ?? {};
  const hp = dcfg.hp ?? 100;
  const allyCount = expectation.allies ?? 2;
  const scenarios = expectation.scenarios ?? [];

  const runScenario = async (force, assert) => {
    let caster, defender, casterTok, defTok, combat, scene;
    const allies = [], allyToks = [];
    try {
      scene = await Scene.create({ name: 'T3 Macro Scene', width: 1000, height: 1000, grid: { size: 100 }, padding: 0 });
      caster = await Actor.create({ name: 'T3 Caster', type: 'npc', system: { attributes: { hp: { value: 100, max: 100 } } } });
      defender = await Actor.create({ name: 'T3 Defender', type: 'npc', system: { attributes: { hp: { value: hp, max: hp }, ac: { calc: 'flat', flat: dcfg.ac ?? 1 } } } });
      // Force the defender's save outcome deterministically.
      if (force === 'fail') await defender.update({ 'flags.midi-qol.fail.ability.save.all': 1 });
      if (force === 'success') await defender.update({ 'flags.midi-qol.success.ability.save.all': 1 });
      // actorLink so midi reads the base actor, not a synthetic token-actor.
      casterTok = await TokenDocument.create({ actorId: caster.id, name: caster.name, actorLink: true, x: 100, y: 100, disposition: 1 }, { parent: scene });
      defTok = await TokenDocument.create({ actorId: defender.id, name: defender.name, actorLink: true, x: 200, y: 100, disposition: -1 }, { parent: scene });
      for (let i = 0; i < allyCount; i++) {
        // Allies share the caster's disposition (1) and sit within 30 ft (<= 2 squares).
        const al = await Actor.create({ name: `T3 Ally ${i}`, type: 'npc', system: { attributes: { hp: { value: 100, max: 100, temp: 0 } } } });
        const at = await TokenDocument.create({ actorId: al.id, name: al.name, actorLink: true, x: 100, y: 200 + i * 100, disposition: 1 }, { parent: scene });
        allies.push(al); allyToks.push(at);
      }
      combat = await Combat.create({ scene: scene.id, active: true });
      await combat.activate();
      await combat.createEmbeddedDocuments('Combatant', [
        { tokenId: casterTok.id, actorId: caster.id, initiative: 30 },
        { tokenId: defTok.id, actorId: defender.id, initiative: 10 },
        ...allyToks.map((t, i) => ({ tokenId: t.id, actorId: allies[i].id, initiative: 20 - i })),
      ]);
      await combat.startCombat();
      // canvas.draw switches + renders the scene so token placeables exist and the
      // macro's canvas.tokens.placeables scan + targeting work.
      await canvas.draw(scene);
      for (let i = 0; i < 40 && (canvas.scene?.id !== scene.id || !canvas.ready); i++) await new Promise(r => setTimeout(r, 300));
      await new Promise(r => setTimeout(r, 800));
      const defPlaceable = canvas.tokens?.get(defTok.id) ?? defTok.object;
      if (defPlaceable) {
        defPlaceable.setTarget(true, { user: game.user, releaseOthers: true });
        if (!game.user.targets.size) { game.user.targets.add(defPlaceable); defPlaceable.isTargeted = true; }
      }

      const [item] = await caster.createEmbeddedDocuments('Item', [strip(doc)]);
      const activity = [...item.system.activities][0];
      const hpBefore = defender.system.attributes.hp.value;
      const wf = await MidiQOL.completeActivityUse(activity.uuid, {
        midiOptions: { fastForward: true, fastForwardAttack: true, fastForwardDamage: true, autoRollDamage: 'always', targetUuids: [defTok.uuid], ignoreUserTargets: true },
      });
      if (!wf) return ['midi workflow did not run (no target / activity not resolved)'];
      await new Promise(r => setTimeout(r, 2500)); // damage + macro + ally updates settle

      const f = [];
      const delta = defender.system.attributes.hp.value - hpBefore;
      if (assert.defenderHpDelta !== undefined && delta !== assert.defenderHpDelta) f.push(`defenderHpDelta expected ${assert.defenderHpDelta}, got ${delta}`);
      if (assert.allyTempHp !== undefined) {
        for (const al of allies) {
          const t = al.system.attributes.hp.temp ?? 0;
          if (t !== assert.allyTempHp) f.push(`${al.name} tempHp expected ${assert.allyTempHp}, got ${t}`);
        }
      }
      return f;
    } catch (err) {
      return [err.message];
    } finally {
      try { game.user.targets.forEach(t => t.setTarget(false, { user: game.user, releaseOthers: false })); } catch {}
      if (combat) await combat.delete().catch(() => {});
      for (const t of allyToks) await t.delete().catch(() => {});
      if (casterTok) await casterTok.delete().catch(() => {});
      if (defTok) await defTok.delete().catch(() => {});
      for (const al of allies) await al.delete().catch(() => {});
      if (caster) await caster.delete().catch(() => {});
      if (defender) await defender.delete().catch(() => {});
      if (scene) await scene.delete().catch(() => {});
    }
  };

  const fails = [];
  for (const sc of scenarios) {
    const r = await runScenario(sc.force, sc.assert ?? {});
    for (const msg of r) fails.push(`scenario[${sc.force}]: ${msg}`);
  }
  return { ok: fails.length === 0, fails };
}
```

- [ ] **Step 2: Register the tier**

In the `CHECKS` map at the bottom of `checks.mjs`, add the `T3-macro` entry:

```js
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
  'T3-grant': grantCheck,
  'T3-macro': macroCheck,
};
```

- [ ] **Step 3: Run the gate — Example Rally must pass both scenarios**

Run: `cd /home/muckelbauer@sinc-intern.de/git/forge-char-creator && npm run content:verify`
Expected: PASS. Console shows `✓ [T3-macro] Example Rally`. All other abilities stay green. If `scenario[fail]: ... tempHp expected 5, got 0` appears, the macro did not fire — debug per the verify checklist below before claiming done.

- [ ] **Step 4: Commit**

```bash
git add forge-content/verify/checks.mjs
git commit -m "feat(forge-content): T3-macro gate handler — assert macro buffs allies on failed save"
```

---

## Task 4: Update TODO + memory

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Mark the macro item done + record the finding**

In `TODO.md`, move the "NEXT UP — macros in pipeline" block to a DONE section.
Add a "## Macro-driven abilities — DONE ✅" block recording:
- Macro is content-as-code via `flags.dae.macro.command` + `flags.midi-qol.onUseMacroName:"[postActiveEffects]ItemMacro"`. **No Item Macro module** — midi-qol resolveItemMacro reads `flags.dae.macro` (DAE dep) and executes itself. (Overturns the old prereq assumption.)
- Example Rally (Examples folder): DEX DC14 save, flat 10 force on fail (`onSave:"none"`); macro buffs same-disposition allies within 30 ft with 5 temp HP via direct `actor.update`.
- New `T3-macro` gate handler `macroCheck`: caster + N allies + enemy; force fail → enemy −10 + allies tempHp 5; force success → enemy 0 + allies tempHp 0 (negative proves the conditional). Determinism: forced save, flat damage, flat temp HP, fixed ally positions in range.
- `workflow.failedSaves` (Set of failed token placeables), macro scope `{workflow, token, actor, args[0].macroPass}` — verified in midi 13.0.63.
- Next testable: multi-pass macros, macro-granted *durationed* effects (Times-Up), template/AoE-targeted macros.

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: macro-driven save->buff ability done (Example Rally + T3-macro gate)"
```

- [ ] **Step 3: Save the macro-storage finding to memory**

Write `forge-content-macro-storage.md` to the memory dir (type: reference) recording
that forge-content macros store in `flags.dae.macro.command` + `flags.midi-qol.onUseMacroName`,
no Item Macro module needed (midi-qol resolveItemMacro reads it), macro scope vars,
and link `[[times-up-duration-expiry]]`. Add the one-line pointer to `MEMORY.md`.

---

## Verify-failure debug checklist (if Task 3 Step 3 is red)

- `scenario[fail]: ... tempHp expected 5, got 0` → macro never fired or filtered out allies. Check: (a) `flags.midi-qol.onUseMacroName` present on the *created* item (`caster.items` copy), (b) macro `macroPass` guard — is the pass really `postActiveEffects`? add a `console.log` in the command, (c) `canvas.grid.measurePath` exists (the fallback covers it but confirm), (d) ally tokens drawn (`canvas.tokens.placeables.length`).
- `scenario[success]: ... tempHp expected 0, got 5` → conditional broken; macro buffed on success. Check `workflow.failedSaves?.size` guard.
- `scenario[fail]: defenderHpDelta expected -10, got 0` → save not actually failing or `onSave` wrong. Confirm `flags.midi-qol.fail.ability.save.all` on defender + `damage.onSave:"none"`.
- `midi workflow did not run` → targeting/canvas not ready; this is the known boot-flake surface — generous waits already in place; re-run once.

---

## Self-Review notes

- **Spec coverage:** macro-as-content-as-code (Task 1), conditional branch + cross-recipient (Task 1 macro + Task 3 assertions), T3-macro handler (Task 3), temp-HP-via-direct-update (Task 1 macro + Task 3 `allyTempHp` assert), risks/measurePath fallback (Task 1 macro). All spec sections mapped.
- **No new deps** — confirmed; no module.json / test-world change tasks (intentional).
- **Type consistency:** `macroCheck`/`CHECKS['T3-macro']`; expect keys `scenarios`/`force`/`assert`/`defenderHpDelta`/`allyTempHp`/`allies`/`tempHp` used identically in Task 2 (expect.json) and Task 3 (handler).
