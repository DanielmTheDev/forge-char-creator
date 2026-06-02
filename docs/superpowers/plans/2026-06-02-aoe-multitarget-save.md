# AoE Multi-target (save-each) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove a save-each AoE ability (sphere, half-on-save) in a real midi-qol workflow with deterministic per-target HP asserts, demonstrating each target rolls its own save independently.

**Architecture:** Author "Example Blast" as JSON (DEX DC14, flat 12, half-on-save, 20ft-radius sphere template). Add a new self-contained gate handler `aoeCheck` (tier `T3-aoe`) in `forge-content/verify/checks.mjs`, mirroring the existing `macroCheck` (N actors, fixed positions, fresh scene, per-actor forced save). The handler runs ONE midi cast hitting 3 rigged defenders and asserts each defender's HP delta. Targeting tries midi template-auto-target first, falls back to explicit `targetUuids[N]` (the proven path) so the gate never flakes.

**Tech Stack:** Foundry VTT V13, dnd5e 5.2.5, midi-qol 13.0.63, Playwright (headed under xvfb), Node ESM. Gate runs via `npm run content:verify`.

**Key facts (verified against installed code):**
- `target.template` schema (dnd5e.mjs:9423): `{ type, size, units(required, blank:false), count, contiguous, width, height }`. `size`/`count` are `FormulaField` → **strings**. `type:"sphere"` ∈ `DND5E.areaTargetTypes` → renders a `circle`, `sizes:["radius"]`.
- Gate handlers are shipped to the browser via `page.evaluate(handler, {doc, expectation, setupDocs})` (content.spec.mjs:55) — each handler MUST be fully self-contained (inline its own `strip` helper, no outer-scope refs).
- Dispatcher routes on `expectation.tier` → `CHECKS[tier]` (content.spec.mjs:53). Unknown tier fails the gate (content.spec.mjs:41).
- Proven single-target cast: `MidiQOL.completeActivityUse(activity.uuid, {midiOptions:{fastForward,fastForwardAttack,fastForwardDamage,autoRollDamage:'always',targetUuids:[uuid],ignoreUserTargets:true}})`. midi `targetsToUse` is broken — use `targetUuids`.
- Examples folder id = `folderexample001` (src/packs/forge-abilities/_folders.json).
- All `_id`s (doc + activity) MUST be exactly 16 alphanumeric chars or `packs:build` throws (keys.mjs).

---

## File Structure

- **Create** `forge-content/src/packs/forge-abilities/example-blast.json` — the AoE ability (source of truth).
- **Create** `forge-content/src/packs/forge-abilities/example-blast.expect.json` — `T3-aoe` functional check.
- **Modify** `forge-content/verify/checks.mjs` — add `aoeCheck` handler + register `'T3-aoe': aoeCheck` in `CHECKS`.
- **Modify** `TODO.md` — mark AoE #1 done, record findings.

No changes to `combatCheck`/`macroCheck`/`content.spec.mjs`/`boot.mjs` — isolation by new handler (approach A).

---

## Task 1: Author the "Example Blast" ability

**Files:**
- Create: `forge-content/src/packs/forge-abilities/example-blast.json`

- [ ] **Step 1: Write the ability JSON**

Create `forge-content/src/packs/forge-abilities/example-blast.json`:

```json
{
  "name": "Example Blast",
  "img": "icons/magic/fire/explosion-fireball-medium-orange.webp",
  "type": "feat",
  "_id": "exampleblast0001",
  "system": {
    "description": {
      "value": "<p>Reference ability proving area-of-effect, save-each resolution. Every creature in a 20-foot-radius sphere makes a DC 14 Dexterity save, taking <strong>12 fire damage</strong>, or half as much on a success. Each target saves independently. Pattern reused by future AoE abilities.</p>",
      "chat": ""
    },
    "activities": {
      "blastaoe00000001": {
        "_id": "blastaoe00000001",
        "type": "save",
        "activation": { "type": "action", "value": 1 },
        "range": { "value": 60, "units": "ft" },
        "target": {
          "template": { "type": "sphere", "size": "20", "units": "ft" },
          "affects": { "type": "creature" }
        },
        "save": { "ability": ["dex"], "dc": { "calculation": "custom", "formula": "14" } },
        "damage": { "onSave": "half", "parts": [{ "types": ["fire"], "custom": { "enabled": true, "formula": "12" } }] }
      }
    },
    "identifier": "example-blast",
    "source": { "revision": 1, "rules": "2024" },
    "properties": [],
    "requirements": "",
    "type": { "value": "", "subtype": "" }
  },
  "effects": [],
  "flags": {},
  "folder": "folderexample001"
}
```

- [ ] **Step 2: Verify ids are 16 chars + packs build (T1 schema/load gate)**

Run:
```bash
cd /home/muckelbauer@sinc-intern.de/git/forge-char-creator
node -e "for (const k of ['exampleblast0001','blastaoe00000001']) console.log(k, k.length, /^[A-Za-z0-9]+$/.test(k))"
npm run packs:build forge-content
```
Expected: both ids print `16 true`; `packs:build` completes WITHOUT throwing (keys.mjs id-length guard passes; LevelDB written). A wrong-length id throws here — that is the T1 gate.

- [ ] **Step 3: Commit**

```bash
git add forge-content/src/packs/forge-abilities/example-blast.json
git commit -m "feat(forge-content): Example Blast — AoE sphere save-each ability (DEX DC14, 12 fire, half-on-save)"
```

---

## Task 2: Write the T3-aoe expectation

**Files:**
- Create: `forge-content/src/packs/forge-abilities/example-blast.expect.json`

- [ ] **Step 1: Write the expect.json**

Create `forge-content/src/packs/forge-abilities/example-blast.expect.json`:

```json
{
  "tier": "T3-aoe",
  "template": { "type": "sphere", "size": "20", "units": "ft" },
  "targets": [
    { "hp": 100, "ac": 1, "force": "fail",    "assert": { "defenderHpDelta": -12 } },
    { "hp": 100, "ac": 1, "force": "fail",    "assert": { "defenderHpDelta": -12 } },
    { "hp": 100, "ac": 1, "force": "success", "assert": { "defenderHpDelta": -6  } }
  ]
}
```

Note: `targets[]` is per-defender (rigged hp/ac, forced save outcome, per-target assert). 2×fail (full −12) + 1×success (half −6) proves independent per-target saves. Do NOT commit yet — `T3-aoe` is an unknown tier until Task 3, so the gate would reject it. Commit together with the handler in Task 3.

---

## Task 3: Implement the `aoeCheck` handler

**Files:**
- Modify: `forge-content/verify/checks.mjs` (add `aoeCheck` before the `CHECKS` export at end of file; add `'T3-aoe': aoeCheck` to the `CHECKS` map)

- [ ] **Step 1: Add the `aoeCheck` handler**

In `forge-content/verify/checks.mjs`, immediately BEFORE the line `// tier -> in-browser handler. content.spec dispatches on expectation.tier.`, insert:

```javascript
// T3-aoe: a save-each AoE ability — ONE cast hits N defenders, each rolling its own
// save, taking per-target damage (half on save). Proves multi-target independence:
// forced mix of fail/success across targets yields different per-target HP deltas.
// Self-contained (shipped to the browser via page.evaluate). Targeting tries midi
// template-auto-target first, falls back to explicit targetUuids[N] (proven path)
// so the gate never flakes — logs which path ran.
//
// expectation: { template?:{type,size,units},
//   targets:[{ hp, ac, force:'fail'|'success', assert:{ defenderHpDelta?, conditionApplied?, effectApplied? } }] }
async function aoeCheck({ doc, expectation }) {
  if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  const strip = (d) => { const c = JSON.parse(JSON.stringify(d)); delete c._id; delete c._key; for (const e of c.effects ?? []) delete e._key; return c; };
  const targetCfgs = expectation.targets ?? [];
  const N = targetCfgs.length;

  let caster, casterTok, combat, scene;
  const defenders = [], defToks = [];
  let template;
  try {
    scene = await Scene.create({ name: 'T3 AoE Scene', width: 1000, height: 1000, grid: { size: 100 }, padding: 0 });
    caster = await Actor.create({ name: 'T3 Caster', type: 'npc', system: { attributes: { hp: { value: 100, max: 100 } } } });
    casterTok = await TokenDocument.create({ actorId: caster.id, name: caster.name, actorLink: true, x: 100, y: 100, disposition: 1 }, { parent: scene });

    // N defenders clustered tightly around (600,600) so a 20ft (= 1 grid square radius
    // at 5ft/square... grid.size 100 = 5ft? scene grid distance defaults to 5ft) sphere
    // covers all of them. Positions are fixed => deterministic template coverage.
    const CX = 600, CY = 600;
    for (let i = 0; i < N; i++) {
      const cfg = targetCfgs[i];
      const def = await Actor.create({ name: `T3 Def ${i}`, type: 'npc', system: { attributes: { hp: { value: cfg.hp ?? 100, max: cfg.hp ?? 100 }, ac: { calc: 'flat', flat: cfg.ac ?? 1 } } } });
      // Per-defender forced save outcome — this is what proves independence.
      if (cfg.force === 'fail') await def.update({ 'flags.midi-qol.fail.ability.save.all': 1 });
      if (cfg.force === 'success') await def.update({ 'flags.midi-qol.success.ability.save.all': 1 });
      const tok = await TokenDocument.create({ actorId: def.id, name: def.name, actorLink: true, x: CX + (i % 2) * 20, y: CY + i * 20, disposition: -1 }, { parent: scene });
      defenders.push(def); defToks.push(tok);
    }

    combat = await Combat.create({ scene: scene.id, active: true });
    await combat.activate();
    await combat.createEmbeddedDocuments('Combatant', [
      { tokenId: casterTok.id, actorId: caster.id, initiative: 30 },
      ...defToks.map((t, i) => ({ tokenId: t.id, actorId: defenders[i].id, initiative: 20 - i })),
    ]);
    await combat.startCombat();
    await canvas.draw(scene);
    for (let i = 0; i < 40 && (canvas.scene?.id !== scene.id || !canvas.ready); i++) await new Promise(r => setTimeout(r, 300));
    await new Promise(r => setTimeout(r, 800));

    // --- Targeting: primary = template auto-target; fallback = explicit targetUuids[N] ---
    game.user.targets.forEach(t => t.setTarget(false, { user: game.user, releaseOthers: false }));
    let targetingPath = 'none';
    const tcfg = expectation.template ?? { type: 'sphere', size: '20', units: 'ft' };
    try {
      const [tmpl] = await scene.createEmbeddedDocuments('MeasuredTemplate', [{
        t: 'circle', x: CX + 10, y: CY + (N * 20) / 2, distance: Number(tcfg.size) || 20, direction: 0, angle: 0, width: 0,
      }]);
      template = tmpl;
      await new Promise(r => setTimeout(r, 300));
      // midi util: tokens whose center is inside the template. API may differ across midi
      // builds — wrapped so a failure cleanly drops to the explicit fallback below.
      let under = [];
      if (typeof MidiQOL.templateTokens === 'function') under = MidiQOL.templateTokens(tmpl) ?? [];
      const underToks = under.map(u => u.object ?? u).filter(Boolean);
      if (underToks.length === N) {
        for (const pt of underToks) pt.setTarget(true, { user: game.user, releaseOthers: false });
        if (game.user.targets.size === N) targetingPath = 'template-auto';
      }
    } catch (e) { console.log('aoe auto-target attempt failed:', e.message); }

    let midiOptions;
    if (targetingPath === 'template-auto') {
      midiOptions = { fastForward: true, fastForwardAttack: true, fastForwardDamage: true, autoRollDamage: 'always', ignoreUserTargets: false };
    } else {
      // Fallback: the proven single-target path, generalized to N target UUIDs.
      game.user.targets.forEach(t => t.setTarget(false, { user: game.user, releaseOthers: false }));
      midiOptions = { fastForward: true, fastForwardAttack: true, fastForwardDamage: true, autoRollDamage: 'always', targetUuids: defToks.map(t => t.uuid), ignoreUserTargets: true };
      targetingPath = 'explicit-targetUuids';
    }
    console.log(`[T3-aoe] targeting path: ${targetingPath} (N=${N})`);

    // --- ONE cast against all N targets ---
    const [item] = await caster.createEmbeddedDocuments('Item', [strip(doc)]);
    const activity = [...item.system.activities][0];
    const hpBefore = defenders.map(d => d.system.attributes.hp.value);
    const wf = await MidiQOL.completeActivityUse(activity.uuid, { midiOptions });
    if (!wf) return { ok: false, fails: [`midi workflow did not run (targeting=${targetingPath})`] };
    await new Promise(r => setTimeout(r, 2500)); // damage + per-target saves settle

    // --- Per-target asserts (reuse the combatCheck assert key vocabulary) ---
    const fails = [];
    for (let i = 0; i < N; i++) {
      const cfg = targetCfgs[i];
      const a = cfg.assert ?? {};
      const def = defenders[i];
      const delta = def.system.attributes.hp.value - hpBefore[i];
      const statuses = [...def.effects].flatMap(e => [...(e.statuses ?? [])]);
      const effectNames = [...def.effects].map(e => e.name);
      if (a.defenderHpDelta !== undefined && delta !== a.defenderHpDelta) fails.push(`target[${i}] (${cfg.force}): hpDelta expected ${a.defenderHpDelta}, got ${delta}`);
      if (a.conditionApplied && !statuses.includes(a.conditionApplied)) fails.push(`target[${i}]: condition "${a.conditionApplied}" not applied`);
      if (a.effectApplied && !effectNames.includes(a.effectApplied)) fails.push(`target[${i}]: effect "${a.effectApplied}" not applied`);
    }
    return { ok: fails.length === 0, fails };
  } catch (err) {
    return { ok: false, fails: [err.message] };
  } finally {
    try { game.user.targets.forEach(t => t.setTarget(false, { user: game.user, releaseOthers: false })); } catch {}
    if (template) await template.delete().catch(() => {});
    if (combat) await combat.delete().catch(() => {});
    for (const t of defToks) await t.delete().catch(() => {});
    if (casterTok) await casterTok.delete().catch(() => {});
    for (const d of defenders) await d.delete().catch(() => {});
    if (caster) await caster.delete().catch(() => {});
    if (scene) await scene.delete().catch(() => {});
  }
}
```

- [ ] **Step 2: Register the tier in the `CHECKS` map**

In the same file, change the `CHECKS` export from:

```javascript
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
  'T3-grant': grantCheck,
  'T3-macro': macroCheck,
};
```

to:

```javascript
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
  'T3-grant': grantCheck,
  'T3-macro': macroCheck,
  'T3-aoe': aoeCheck,
};
```

- [ ] **Step 3: Lint-parse the module (catch syntax errors before the slow boot)**

Run:
```bash
cd /home/muckelbauer@sinc-intern.de/git/forge-char-creator/forge-content
node --check verify/checks.mjs && echo "PARSE OK"
```
Expected: `PARSE OK` (no syntax error). This is cheap insurance before the multi-minute Foundry boot.

---

## Task 4: Run the gate — achieve green, resolve targeting path

**Files:** none (validation + iteration). May edit `forge-content/verify/checks.mjs` if the auto-target API needs correction.

- [ ] **Step 1: Run the full content gate**

Run:
```bash
cd /home/muckelbauer@sinc-intern.de/git/forge-char-creator
npm run content:verify 2>&1 | tee /tmp/aoe-verify.log
```
Expected (green): the run prints `✓ [T3-aoe] Example Blast` AND all pre-existing abilities stay `✓`. Look for the `[T3-aoe] targeting path: ...` console line to see whether `template-auto` or `explicit-targetUuids` ran.

- [ ] **Step 2: Interpret the result**

- If `✓ [T3-aoe] Example Blast` → green. The 3 deltas matched (−12, −12, −6). Proceed to Step 4.
- If `✘ [T3-aoe] Example Blast — target[i] ...: hpDelta expected X, got Y`:
  - `got 0` on a `fail` target → that defender was not targeted (auto-target undercounted and fallback also missed) — confirm `defToks.map(t => t.uuid)` are valid token UUIDs; verify `ignoreUserTargets:true` on the fallback path.
  - `got -12` where `-6` expected (or vice-versa) → the per-defender save flag did not stick; confirm `flags.midi-qol.fail/success.ability.save.all` set on the right actor.
  - other midi error → read `/tmp/aoe-verify.log`, apply systematic-debugging.
- If the `targeting path` line says `explicit-targetUuids` every run, auto-target didn't populate (the known #1 risk). That is acceptable — the gate is green via the proven fallback. Optionally, in Step 3, correct the `MidiQOL.templateTokens` call to the actual installed API to exercise the real-play path; if it stays flaky, leave the fallback as the asserted path and `log()` that auto-target is unproven (no silent cap).

- [ ] **Step 3: (only if not green) Fix and re-run**

Edit `forge-content/verify/checks.mjs` per the Step-2 diagnosis. Re-run Step 1. Repeat until green.

- [ ] **Step 4: Confirm determinism — run the gate a second time**

Run:
```bash
cd /home/muckelbauer@sinc-intern.de/git/forge-char-creator
npm run content:verify 2>&1 | grep -E "T3-aoe|targeting path"
```
Expected: `✓ [T3-aoe] Example Blast` again (2× green = deterministic, same discipline as prior abilities).

- [ ] **Step 5: Commit ability handler + expect + ability together**

```bash
git add forge-content/verify/checks.mjs forge-content/src/packs/forge-abilities/example-blast.expect.json
git commit -m "feat(forge-content): T3-aoe gate — aoeCheck multi-target save-each handler + Example Blast expectation"
```

(Example Blast JSON was already committed in Task 1; this commit adds the handler + its expectation.)

---

## Task 5: Document + close out

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Update TODO.md**

In `TODO.md`, under the `## NEXT UP — boss-combat mechanics` section, mark item **1. Multi-target / AoE** as DONE with findings. Replace the `### 1. Multi-target / AoE (save-each) ...` heading block's status by adding a `DONE ✅` line at its top and a short findings list. Add exactly this block immediately after the `### 1. Multi-target / AoE (save-each)` heading line:

```markdown
**DONE ✅** Example Blast (Examples folder): DEX DC14, 20ft sphere, flat 12 fire, half-on-save. New `T3-aoe` tier (`aoeCheck` in checks.mjs) — ONE cast vs 3 rigged defenders, forced 2 fail (−12) + 1 success (−6), per-target HP asserts prove independent saves. Green 2×.
- Template schema (dnd5e 5.2.5): `target.template:{type:"sphere",size:"20"(string!),units:"ft"(required)}`; `type:"sphere"`→circle radius. `affects:{type:"creature"}` no count = all-in-area.
- Targeting: handler tries template-auto-target (`MidiQOL.templateTokens` + `ignoreUserTargets:false`); falls back to explicit `targetUuids[N]` (proven path) when `game.user.targets.size !== N`. Asserted path logged via `[T3-aoe] targeting path: ...`. <RECORD WHICH PATH RAN GREEN HERE during execution>.
- expect shape: `{ tier:"T3-aoe", template, targets:[{hp,ac,force,assert:{defenderHpDelta|conditionApplied|effectApplied}}] }`.
- Determinism: flat dmg + rigged per-target HP/AC + forced per-defender save flags + fixed token positions. No RNG.
- Risk carried: auto-target nondeterminism under xvfb (fallback-covered). midi/dnd5e drift (pin dnd5e 5.2.5 / midi 13.0.63).
```

Replace `<RECORD WHICH PATH RAN GREEN HERE during execution>` with the actual `targeting path` value observed in Task 4 (`template-auto` or `explicit-targetUuids`).

- [ ] **Step 2: Commit + push**

```bash
git add TODO.md
git commit -m "docs: AoE multi-target save-each done (Example Blast + T3-aoe gate)"
git push
```

---

## Self-Review notes

- **Spec coverage:** Reference ability (Task 1) · expect shape (Task 2) · `aoeCheck`/`T3-aoe` handler with auto-target + fallback (Task 3) · per-target independent-save asserts + 2× determinism (Tasks 3–4) · TODO close-out + drift note (Task 5). All spec sections mapped.
- **Targeting honesty:** auto-target is the spec's primary but runtime-unproven; the handler degrades to the proven `targetUuids[N]` path and logs which ran — green is guaranteed by the fallback, real-play proof is best-effort (matches spec risk section).
- **No silent cap:** `console.log` records the targeting path every run; if auto-target never fires, that is surfaced, not hidden.
- **Type consistency:** handler name `aoeCheck`, tier string `'T3-aoe'`, expect keys `targets[].{hp,ac,force,assert}`, assert keys `defenderHpDelta|conditionApplied|effectApplied` — identical across Tasks 2, 3, 5.
- **Grid caveat to watch (Task 4):** default scene grid distance is 5ft/square (grid.size 100px). Token cluster spans ~40px (<1 square) around (600,600); a `distance:20` (ft) circle = 4 squares radius → covers all 3. If auto-target undercounts, first suspect grid distance units, not the geometry.
