# Feature Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One builder app that authors statblock-style features (attack +X → damage → on-hit save → conditions/damage/effects), with step navigation, keyboard shortcuts, tooltips and a searchable icon picker, used by the char wizard.

**Architecture:** Payload logic moves out of `EffectCreatorApp` into a pure module (`scripts/feature-payload.js`) that node can unit-test. The app becomes UI-only: kind picker, steps (via a shared `scripts/ui/stepper.js`), icon picker (`scripts/ui/icon-picker.js`). The char wizard reuses the stepper.

**Tech Stack:** Foundry V13 ApplicationV2 + Handlebars, dnd5e 5.2.5 activities, midi-qol 13.0.63 (`otherActivityId` chain), node `--test` for unit, Playwright against a live Foundry for UI/E2E.

**Spec:** `docs/superpowers/specs/2026-09-29-feature-builder-design.md`

## Global Constraints
- dnd5e 5.2.5 / midi-qol 13.0.63. Activity-level data (activation, target, range, attack, save, damage, healing, consumption) lives ON THE ACTIVITY, never on `system.*` of a feat (FeatData drops it).
- Every `_id` (item, effect, activity) = exactly 16 alphanumeric chars → `randomID(16)`.
- Custom save DC = `save.dc.calculation: ""` + `formula`. (`"custom"` is truthy → dnd5e ignores the formula and uses 8+prof. Existing latent bug, fixed in Task 2.)
- Recharge / per-rest uses only work with `consumption.targets:[{type:"itemUses",target:"",value:"1"}]` on the primary activity.
- AE `description` is a plain string (not `{value}`).
- Keyboard: `Alt+→`/`Alt+←` next/prev step (NOT Ctrl+arrow: collides with word-jump in text fields), `Alt+1..9` jump, `Ctrl+Enter` create, `Esc` closes popups first. Handlers `preventDefault()` + `stopPropagation()` only when they act.
- Builder app id stays `forge-effect-creator-app`, class `forge-effect-creator`, create button `[data-action='createEffect']` (tests + char wizard depend on them).
- Code style: match surrounding code (2-space, `// ── Section ──` banners, double quotes).
- Commits: conventional subject, no attribution trailers. Never commit files containing `TOCLAUDE`.
- Temp/scratch files → `~/Downloads/claude-tmp/`.

## Review Focus
1. **Empty/invalid numeric input** (to-hit blank, `"+7"`, DC blank, range blank): expect sane defaults (flat 0 / DC→spell DC / 5 ft), never `NaN` in payload → unit tests in Task 1/2.
2. **Damage row with blank formula**: dropped, not emitted as empty part → unit test Task 2.
3. **Attack with no effect content** must not embed an empty AE (target would get a blank effect icon) → unit test Task 2.
4. **Keyboard shortcut while typing in a text field**: `Alt+→` must still step; plain arrows/Ctrl+arrow must still edit text → Playwright Task 4.
5. **Icon picker opened twice / closed mid-index**: second open reuses cache, no duplicate indexing, pick after close is a no-op → Playwright Task 5.

## File Structure
| File | Responsibility |
|---|---|
| `scripts/feature-payload.js` (new) | Constants, `DEFAULT_STATE`, `buildChanges`, `buildEffect`, `buildItem`, `summarize`. Pure. |
| `scripts/feature-payload.test.mjs` (new) | node unit tests. |
| `scripts/effect-creator.js` (modify) | UI: binding, rows, visibility, create. Imports payload. |
| `templates/effect-creator.hbs` (rewrite) | Kind picker + step panes + tooltips. |
| `scripts/ui/stepper.js` (new) | Step sidebar/keyboard/focus helper. |
| `scripts/ui/icon-picker.js` (new) | `IconPickerApp`, `suggestTerms`, index cache. |
| `scripts/ui/icon-picker.test.mjs` (new) | unit for `suggestTerms` / `matchIcons`. |
| `templates/icon-picker.hbs` (new) | picker markup. |
| `scripts/app.js`, `templates/char-creator.hbs` (modify) | Char wizard steps + stepper + builder opened as `attack` kind. |
| `styles/char-creator.css` (modify) | stepper, kind cards, icon grid, damage rows. |
| `scripts/tests/index.js` (modify) | T0 migrated to `kind`, new attack T0. |
| `tests/attack-save.spec.js`, `tests/keyboard-nav.spec.js`, `tests/icon-picker.spec.js` (new) | Playwright. |
| `tests/temphp.spec.js`, `tests/overtime.spec.js` (modify) | selector migration. |
| `package.json` (modify) | `unit` script. |

## How to run tests
- Unit: `npm run unit` (added Task 1) → `node --test scripts/*.test.mjs scripts/ui/*.test.mjs`.
- Playwright needs Foundry: either `./test.sh` (boots server, runs all specs) or start server yourself: `node FoundryVTT-Linux-13.351/resources/app/main.js --dataPath=$PWD/FoundryData &` then `npx playwright test tests/<file>`. One server per dataPath; check with `pgrep -f "[m]ain.js --dataPath"`. NEVER `pkill -f Foundry` (kills your own shell). Kill with `kill $(pgrep -f "[m]ain.js --dataPath")`.
- Native T0 suite runs inside `tests/module.spec.js`.
- Known pre-existing reds (do not chase unless your change makes them worse): Omega combat test in `module.spec` hangs at `Combat.create`; `overtime.spec` (`pack.deleteDocument` gone in v13); `search-descriptions.spec` refetch count. Record before/after.

---

### Task 1: Extract pure payload module (no behavior change)

**Files:**
- Create: `scripts/feature-payload.js`, `scripts/feature-payload.test.mjs`
- Modify: `scripts/effect-creator.js` (remove constants + `_buildAEData` body + activity-building in `_doCreate`), `package.json`

**Interfaces:**
- Produces:
  - `DAMAGE_TYPES: string[]`, `ABILITIES: [id,label][]`, `CONDITIONS: string[]`, `ADV_TYPES`, `ADV_ROLL_CATS`, `SPECIAL_DURATIONS`, `ACTIVATION_TYPES` (same shapes as today in effect-creator.js).
  - `DEFAULT_STATE` (object; today's fields, unchanged in this task).
  - `buildChanges(state) → Change[]`
  - `buildEffect(state) → aeData` (exactly today's `_buildAEData` output)
  - `buildItem(state, { randomID, areaTargetTypes }) → itemData` (exactly today's `itemData` from `_doCreate`)
  - `EffectCreatorApp#_buildAEData()` kept as thin wrapper; new `EffectCreatorApp#_buildItemData()`.

- [ ] **Step 1: Add unit script** — `package.json` scripts: `"unit": "node --test 'scripts/*.test.mjs' 'scripts/ui/*.test.mjs'"`. (node 25 auto-detects ESM in `.js`; if a `MODULE_TYPELESS_PACKAGE_JSON` warning prints, ignore it.)

- [ ] **Step 2: Write failing characterization tests** — `scripts/feature-payload.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STATE, buildEffect, buildItem } from "./feature-payload.js";

let n = 0;
const cfg = { randomID: () => `id${String(++n).padStart(14, "0")}`, areaTargetTypes: { radius: {}, cone: {} } };
const st = (o = {}) => ({ ...structuredClone(DEFAULT_STATE), ...o });

test("passive effect has transfer + advantage flag", () => {
  const ae = buildEffect(st({ name: "Adv", appMode: "passive", advRows: [{ type: "advantage", cat: "attack.all", grants: false }] }));
  assert.equal(ae.transfer, true);
  assert.deepEqual(ae.changes[0], { key: "flags.midi-qol.advantage.attack.all", mode: 5, value: "1", priority: 20 });
});

test("overtime string", () => {
  const ae = buildEffect(st({ name: "Burn", durationType: "overtime", otDamage: "1d6", otDamageType: "fire",
    otSave: true, otSaveAbility: "dex", otSaveDC: "14", otOnSave: "halfdamage", otSuccesses: "1" }));
  assert.equal(ae.changes[0].value,
    'turn=end, damageRoll=1d6, damageType=fire, saveAbility=dex, saveDC=14, saveDamage=halfdamage, saveCount=1-, label="Burn"');
});

test("auto description keeps legacy sentences", () => {
  const ae = buildEffect(st({ name: "D", statuses: ["prone"], rounds: "5", stackable: "count", appMode: "passive" }));
  for (const s of ["Applies prone.", "Stacking: Count Stacks.", "Mode: Passive (always active).", "Duration: 5 rounds."])
    assert.ok(ae.description.includes(s), `${s} missing in: ${ae.description}`);
});

test("bare effect item (no wrap)", () => {
  const it = buildItem(st({ name: "X" }), cfg);
  assert.equal(it.name, "[AE] X");
  assert.equal(it.effects.length, 1);
  assert.equal(it.system.activities, undefined);
  assert.equal(it.effects[0]._id.length, 16);
});
```

- [ ] **Step 3: Run** `npm run unit` → FAIL (`Cannot find module ./feature-payload.js`).

- [ ] **Step 4: Create `scripts/feature-payload.js`** — header comment:

```js
/**
 * Forge feature payload builder — pure. No DOM, no Foundry globals.
 * Foundry-only helpers (randomID, CONFIG.DND5E.areaTargetTypes) come in via `cfg`,
 * so node can unit-test every payload shape (scripts/feature-payload.test.mjs).
 */
```
Move VERBATIM from `effect-creator.js`: `DND5E_CONDITIONS` (export as `CONDITIONS`), `DAMAGE_TYPES`, `ABILITIES`, `ADV_TYPES`, `ADV_ROLL_CATS`, `SPECIAL_DURATIONS`, `ACTIVATION_TYPES`, `ACT_TYPES`, `ACT_NAMES`, `DEFAULT_STATE` — all `export const`. Replace the one `foundry.utils.deepClone` use with nothing (callers clone). Then:

```js
export function buildChanges(s) { /* body = the `changes` half of today's _buildAEData (OverTime, adv rows, AC, ability rows) returning `changes` */ }

export function buildEffect(s) { /* body = today's _buildAEData, with `const changes = buildChanges(s);` */ }

export function buildItem(s, { randomID, areaTargetTypes = {} }) {
  const aeData = buildEffect(s);
  aeData._id = randomID(16);
  /* body = today's _doCreate itemData construction through `itemData.system.activities = …`,
     with foundry.utils.randomID() → randomID(16) and CONFIG.DND5E.areaTargetTypes → areaTargetTypes */
  return itemData;
}
```
(Cut/paste; the only edits are the three substitutions named. `randomID(16)` also fixes activity ids to 16 chars.)

- [ ] **Step 5: Slim `effect-creator.js`** — `import { CONDITIONS, DAMAGE_TYPES, ABILITIES, ADV_TYPES, ADV_ROLL_CATS, SPECIAL_DURATIONS, ACTIVATION_TYPES, DEFAULT_STATE, buildEffect, buildItem } from "./feature-payload.js";` Replace `DND5E_CONDITIONS` refs with `CONDITIONS`. Then:

```js
  _buildAEData() { return buildEffect(this.#state); }

  _buildItemData() {
    return buildItem(this.#state, {
      randomID: foundry.utils.randomID,
      areaTargetTypes: CONFIG.DND5E?.areaTargetTypes ?? {}
    });
  }
```
In `_doCreate`: `const itemData = this._buildItemData();` replaces the inline construction; pack/import/onComplete/reset logic unchanged.

- [ ] **Step 6: Run** `npm run unit` → PASS (4). Then Foundry: `npx playwright test tests/module.spec.js tests/temphp.spec.js` → same pass/fail set as before the change (record baseline first with `git stash` if unsure).

- [ ] **Step 7: Commit** — `git add scripts/feature-payload.js scripts/feature-payload.test.mjs scripts/effect-creator.js package.json && git commit -m "refactor(builder): extract pure feature payload module"`

> Note: the uncommitted BUG-4 (temp HP) work already in the tree is part of the baseline. Before Task 1, ask the user whether to commit it separately first (recommended: yes, as `feat(effect-creator): temp HP, activation cost, special duration`).

---

### Task 2: `kind` model + attack/save/uses payloads

**Files:**
- Modify: `scripts/feature-payload.js`, `scripts/feature-payload.test.mjs`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces:
  - `KINDS: {id,label,hint}[]` — ids `attack|save|buff|passive|effect`.
  - `DEFAULT_STATE` gains: `kind:"effect"`, `buffMode:"apply"`, `tempHpFormula:""`, `saveMode:"save"`, `attackType:"melee"`, `attackRange:"5"`, `toHitMode:"flat"`, `toHitFlat:"5"`, `toHitAbility:"str"`, `toHitBonus:""`, `damageRows:[]`, `onHitSave:false`, `saveDamageRows:[]`, `saveOnSuccess:"half"`, `usesMode:"atwill"`, `usesMax:"1"`, `rechargeOn:"5"`. Removed: `wrapInFeature`, `wrapType`, `wrapDamageFormula`, `wrapDamageType`. Kept: `wrapActivation`, `wrapTargetCount`, `wrapAreaSize`, `wrapTargetArea`, `wrapSaveAbility`, `wrapSaveDC`, `appMode`, `activationTarget`.
  - `effectHasContent(state) → boolean`
  - `summarize(state) → string`
  - `buildItem` semantics per kind (below).

- [ ] **Step 1: Failing tests** — append to `scripts/feature-payload.test.mjs`:

```js
import { KINDS, effectHasContent, summarize } from "./feature-payload.js";
const acts = it => Object.values(it.system.activities ?? {});

test("kinds list", () => assert.deepEqual(KINDS.map(k => k.id), ["attack", "save", "buff", "passive", "effect"]));

test("attack flat to-hit, damage rows, blank row dropped, no empty AE", () => {
  const it = buildItem(st({ kind: "attack", name: "Bite", toHitFlat: "+7", attackRange: "10",
    damageRows: [{ formula: "1d8+3", type: "piercing" }, { formula: " ", type: "fire" }] }), cfg);
  const [a] = acts(it);
  assert.equal(it.name, "Bite");
  assert.equal(a.type, "attack");
  assert.deepEqual(a.attack, { ability: "none", bonus: "7", flat: true, type: { value: "melee", classification: "weapon" } });
  assert.deepEqual(a.range, { value: "10", units: "ft", override: true });
  assert.equal(a.damage.parts.length, 1);
  assert.deepEqual(a.damage.parts[0], { custom: { enabled: true, formula: "1d8+3" }, types: ["piercing"] });
  assert.equal(it.effects.length, 0);
  assert.equal(a.effects.length, 0);
  assert.equal(a._id.length, 16);
});

test("attack derived to-hit", () => {
  const [a] = acts(buildItem(st({ kind: "attack", toHitMode: "derived", toHitAbility: "dex", toHitBonus: "1", attackType: "ranged" }), cfg));
  assert.deepEqual(a.attack, { ability: "dex", bonus: "1", flat: false, type: { value: "ranged", classification: "weapon" } });
});

test("attack blank to-hit → +0, blank range → 5", () => {
  const [a] = acts(buildItem(st({ kind: "attack", toHitFlat: "", attackRange: "" }), cfg));
  assert.equal(a.attack.bonus, "0");
  assert.equal(a.range.value, "5");
});

test("attack on-hit save chain", () => {
  const it = buildItem(st({ kind: "attack", name: "Venom Bite", damageRows: [{ formula: "5", type: "piercing" }],
    onHitSave: true, wrapSaveAbility: "con", wrapSaveDC: "13", saveOnSuccess: "none",
    saveDamageRows: [{ formula: "4", type: "poison" }], statuses: ["poisoned"], rounds: "1" }), cfg);
  const [atk, sv] = acts(it);
  assert.equal(atk.type, "attack");
  assert.equal(sv.type, "save");
  assert.equal(atk.otherActivityId, sv._id);
  assert.deepEqual(sv.midiProperties, { automationOnly: true });
  assert.deepEqual(atk.effects, []);
  assert.deepEqual(sv.effects, [{ _id: it.effects[0]._id }]);
  assert.deepEqual(sv.save, { ability: ["con"], dc: { calculation: "", formula: "13" } });
  assert.equal(sv.damage.onSave, "none");
  assert.equal(sv.damage.parts[0].custom.formula, "4");
  assert.deepEqual(it.effects[0].statuses, ["poisoned"]);
});

test("attack without save: AE rides the attack (applied on hit)", () => {
  const it = buildItem(st({ kind: "attack", statuses: ["prone"] }), cfg);
  const [a] = acts(it);
  assert.deepEqual(a.effects, [{ _id: it.effects[0]._id }]);
});

test("save kind: custom DC uses empty calculation; blank DC → spellcasting", () => {
  const [a] = acts(buildItem(st({ kind: "save", wrapSaveAbility: "dex", wrapSaveDC: "16",
    saveDamageRows: [{ formula: "8d6", type: "fire" }], wrapTargetArea: "radius", wrapAreaSize: "20" }), cfg));
  assert.equal(a.type, "save");
  assert.deepEqual(a.save.dc, { calculation: "", formula: "16" });
  assert.equal(a.damage.onSave, "half");
  assert.deepEqual(a.target, { template: { type: "radius", size: "20", units: "ft" }, override: true });
  const [b] = acts(buildItem(st({ kind: "save", wrapSaveDC: "" }), cfg));
  assert.deepEqual(b.save.dc, { calculation: "spellcasting", formula: "" });
});

test("save kind, no save → damage activity", () => {
  const [a] = acts(buildItem(st({ kind: "save", saveMode: "none", saveDamageRows: [{ formula: "2d6", type: "fire" }] }), cfg));
  assert.equal(a.type, "damage");
  assert.equal(a.save, undefined);
  assert.equal(a.damage.parts[0].custom.formula, "2d6");
});

test("buff apply (always embeds AE) and self target", () => {
  const it = buildItem(st({ kind: "buff", activationTarget: "wearer" }), cfg);
  const [a] = acts(it);
  assert.equal(a.type, "utility");
  assert.equal(it.effects.length, 1);
  assert.deepEqual(a.target, { affects: { type: "self" }, override: true });
  assert.deepEqual(a.range, { units: "self", override: true });
});

test("buff temp HP → heal activity", () => {
  const [a] = acts(buildItem(st({ kind: "buff", buffMode: "temphp", tempHpFormula: "2d4+2" }), cfg));
  assert.equal(a.type, "heal");
  assert.deepEqual(a.healing.types, ["temphp"]);
  assert.equal(a.healing.custom.formula, "2d4+2");
});

test("passive: no activities, AE transfer", () => {
  const it = buildItem(st({ kind: "passive", acBonus: "1" }), cfg);
  assert.equal(it.system.activities, undefined);
  assert.equal(it.effects[0].transfer, true);
});

test("recharge + per-rest uses add consumption on primary only", () => {
  const it = buildItem(st({ kind: "attack", usesMode: "recharge", rechargeOn: "5", onHitSave: true }), cfg);
  assert.deepEqual(it.system.uses, { max: "1", spent: 0, recovery: [{ period: "recharge", formula: "5" }] });
  const [atk, sv] = acts(it);
  assert.deepEqual(atk.consumption, { targets: [{ type: "itemUses", target: "", value: "1" }] });
  assert.equal(sv.consumption, undefined);
  const it2 = buildItem(st({ kind: "save", usesMode: "perRest", usesMax: "3" }), cfg);
  assert.deepEqual(it2.system.uses, { max: "3", spent: 0, recovery: [{ period: "lr", type: "recoverAll" }] });
});

test("effectHasContent", () => {
  assert.equal(effectHasContent(st()), false);
  assert.equal(effectHasContent(st({ statuses: ["prone"] })), true);
  assert.equal(effectHasContent(st({ acBonus: "2" })), true);
});

test("summary: attack with rider", () => {
  const s = summarize(st({ kind: "attack", toHitFlat: "7", damageRows: [{ formula: "1d8+3", type: "piercing" }],
    onHitSave: true, wrapSaveAbility: "con", wrapSaveDC: "13", saveDamageRows: [{ formula: "2d6", type: "poison" }],
    statuses: ["poisoned"], rounds: "1", usesMode: "recharge", rechargeOn: "5" }));
  assert.ok(s.startsWith("Melee Attack: +7 to hit, reach 5 ft, 1 target. Hit: 1d8+3 piercing. On hit: DC 13 CON save, 2d6 poison on a failure (half on success). Effects apply on a failed save."), s);
  assert.ok(s.includes("Applies poisoned."), s);
  assert.ok(s.includes("Recharge 5–6."), s);
});

test("summary: temp HP keeps legacy wording", () => {
  assert.ok(summarize(st({ kind: "buff", buffMode: "temphp", tempHpFormula: "7", wrapActivation: "bonus" }))
    .startsWith("Bonus Action: grants 7 temporary hit points."));
});
```
Also update Task 1's `"bare effect item"` test: unchanged (default kind `effect`).

- [ ] **Step 2: Run** `npm run unit` → FAIL (missing exports / shapes).

- [ ] **Step 3: Implement** in `scripts/feature-payload.js`. Replace `ACT_TYPES`/`ACT_NAMES` and the Task-1 activity code with:

```js
export const KINDS = [
  { id: "attack",  label: "Attack",       hint: "Roll to hit. On a hit: damage, and optionally a saving throw with extra damage/conditions." },
  { id: "save",    label: "Saving Throw", hint: "Targets roll a save. On a failure: damage and/or effects. Half or no damage on a success." },
  { id: "buff",    label: "Buff / Heal",  hint: "On use, apply an effect or temporary HP to yourself or allies." },
  { id: "passive", label: "Passive",      hint: "Always on while the creature has this feature (e.g. +1 AC, resistances, advantage)." },
  { id: "effect",  label: "Effect only",  hint: "A bare Active Effect saved on its own, to drag onto other items." }
];

const ABIL_SHORT = id => id.toUpperCase();
const intOr = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const isNumeric = v => String(v ?? "").trim() !== "" && !isNaN(String(v).trim());

export function effectHasContent(s) {
  return buildChanges(s).length > 0 || (s.statuses?.length ?? 0) > 0;
}

function damageParts(rows = []) {
  return rows.filter(r => r.formula?.trim())
    .map(r => ({ custom: { enabled: true, formula: r.formula.trim() }, types: [r.type] }));
}

function damageText(rows = []) {
  return rows.filter(r => r.formula?.trim()).map(r => `${r.formula.trim()} ${r.type}`).join(" + ");
}

function buildUses(s) {
  if (s.usesMode === "recharge") return { max: "1", spent: 0, recovery: [{ period: "recharge", formula: String(intOr(s.rechargeOn, 5)) }] };
  if (s.usesMode === "perRest") return { max: String(Math.max(1, intOr(s.usesMax, 1))), spent: 0, recovery: [{ period: "lr", type: "recoverAll" }] };
  return null;
}

function buildTarget(s, areaTargetTypes) {
  if (s.kind === "buff" && s.activationTarget === "wearer") return { affects: { type: "self" }, override: true };
  if (s.wrapTargetArea in areaTargetTypes)
    return { template: { type: s.wrapTargetArea, size: String(intOr(s.wrapAreaSize, 20)), units: "ft" }, override: true };
  return { affects: { count: String(intOr(s.wrapTargetCount, 1)), type: s.wrapTargetArea }, override: true };
}

function saveDC(s) {
  const dcv = String(s.wrapSaveDC ?? "").trim();
  // dnd5e: any truthy `calculation` ignores `formula`; "" = custom formula.
  return isNumeric(dcv) ? { calculation: "", formula: dcv } : { calculation: "spellcasting", formula: "" };
}

function buildActivities(s, aeId, randomID, areaTargetTypes) {
  const link = aeId ? [{ _id: aeId }] : [];
  const base = (type, name) => ({
    _id: randomID(16), type, name,
    activation: { type: s.wrapActivation ?? "action", value: null, override: true },
    target: buildTarget(s, areaTargetTypes),
    effects: []
  });
  const saveAct = (name) => {
    const a = base("save", name);
    a.save = { ability: [s.wrapSaveAbility], dc: saveDC(s) };
    a.damage = { onSave: s.saveOnSuccess === "none" ? "none" : "half", parts: damageParts(s.saveDamageRows) };
    return a;
  };

  let primary, extra = [];
  if (s.kind === "attack") {
    primary = base("attack", "Attack");
    primary.attack = s.toHitMode === "derived"
      ? { ability: s.toHitAbility, bonus: String(s.toHitBonus ?? "").trim(), flat: false, type: { value: s.attackType, classification: "weapon" } }
      : { ability: "none", bonus: String(intOr(s.toHitFlat, 0)), flat: true, type: { value: s.attackType, classification: "weapon" } };
    primary.range = { value: String(intOr(s.attackRange, 5)), units: "ft", override: true };
    primary.damage = { includeBase: false, parts: damageParts(s.damageRows) };
    if (s.onHitSave) {
      // midi-qol: on hit, the "other activity" save is rolled for hit targets only.
      const sv = saveAct("On-Hit Save");
      sv.midiProperties = { automationOnly: true };
      sv.effects = link;
      primary.otherActivityId = sv._id;
      extra.push(sv);
    } else primary.effects = link;
  } else if (s.kind === "save") {
    if (s.saveMode === "none") {
      primary = base("damage", "Damage");
      primary.damage = { parts: damageParts(s.saveDamageRows) };
    } else primary = saveAct("Save");
    primary.effects = link;
  } else if (s.kind === "buff") {
    if (s.buffMode === "temphp") {
      // Temp HP must come from a heal activity: hp.temp is a stored resource,
      // so an AE change on it never gets consumed by damage.
      primary = base("heal", "Temp HP");
      primary.healing = {
        number: 0, denomination: 0, bonus: "", types: ["temphp"],
        custom: { enabled: true, formula: s.tempHpFormula?.trim() || "5" },
        scaling: { mode: "", number: 1, formula: "" }
      };
    } else primary = base("utility", "Apply");
    if (s.activationTarget === "wearer") primary.range = { units: "self", override: true };
    primary.effects = link;
  }
  if (buildUses(s)) primary.consumption = { targets: [{ type: "itemUses", target: "", value: "1" }] };
  return [primary, ...extra];
}

export function buildItem(s, { randomID, areaTargetTypes = {} }) {
  const aeData = buildEffect(s);
  aeData._id = randomID(16);
  const name = s.name?.trim() || "New Feature";
  if (s.kind === "effect") {
    return { name: `[AE] ${name}`, img: s.img || "icons/svg/aura.svg", type: "feat",
             system: { description: { value: aeData.description } }, effects: [aeData] };
  }
  const withAE = effectHasContent(s) || s.kind === "buff" || s.kind === "passive";
  const item = { name, img: s.img || "icons/svg/feature.svg", type: "feat",
                 system: { description: { value: aeData.description } }, effects: withAE ? [aeData] : [] };
  const uses = buildUses(s);
  if (uses) item.system.uses = uses;
  if (s.kind === "passive") return item;
  const acts = buildActivities(s, withAE ? aeData._id : null, randomID, areaTargetTypes);
  item.system.activities = Object.fromEntries(acts.map(a => [a._id, a]));
  return item;
}
```

In `buildEffect`: `transfer: s.kind === "passive" || (s.kind === "effect" && s.appMode === "passive")`, and `description: s.description?.trim() ? s.description : summarize(s)`. Move today's auto-description block into `summarize`:

```js
function deliverySentence(s) {
  const cost = ACTIVATION_TYPES.find(a => a.id === (s.wrapActivation ?? "action"));
  const dc = isNumeric(s.wrapSaveDC) ? `DC ${String(s.wrapSaveDC).trim()}` : "spell save DC";
  const saveTxt = () => {
    const dmg = damageText(s.saveDamageRows);
    let t = `${dc} ${ABIL_SHORT(s.wrapSaveAbility)} save`;
    if (dmg) t += `, ${dmg} on a failure${s.saveOnSuccess === "none" ? " (none on success)" : " (half on success)"}`;
    return t + ".";
  };
  const targets = s.wrapTargetArea in AREA_WORDS ? `${intOr(s.wrapAreaSize, 20)} ft ${AREA_WORDS[s.wrapTargetArea]}`
                                                : `${intOr(s.wrapTargetCount, 1)} target${intOr(s.wrapTargetCount, 1) === 1 ? "" : "s"}`;
  switch (s.kind) {
    case "attack": {
      const hit = s.toHitMode === "derived"
        ? `${ABIL_SHORT(s.toHitAbility)} + prof${String(s.toHitBonus ?? "").trim() ? ` + ${String(s.toHitBonus).trim()}` : ""}`
        : `${intOr(s.toHitFlat, 0) >= 0 ? "+" : ""}${intOr(s.toHitFlat, 0)}`;
      const reach = s.attackType === "ranged" ? "range" : "reach";
      let t = `${s.attackType === "ranged" ? "Ranged" : "Melee"} Attack: ${hit} to hit, ${reach} ${intOr(s.attackRange, 5)} ft, ${targets}.`;
      const dmg = damageText(s.damageRows);
      if (dmg) t += ` Hit: ${dmg}.`;
      if (s.onHitSave) {
        t += ` On hit: ${saveTxt()}`;
        if (effectHasContent(s)) t += " Effects apply on a failed save.";
      } else if (effectHasContent(s)) t += " Effects apply on hit.";
      return t;
    }
    case "save": {
      if (s.saveMode === "none") { const d = damageText(s.saveDamageRows); return d ? `${targets}: takes ${d}.` : ""; }
      return `${targets}: ${saveTxt()}${effectHasContent(s) ? " Effects apply on a failed save." : ""}`;
    }
    case "buff": {
      if (s.buffMode === "temphp") {
        const grant = `Grants ${s.tempHpFormula?.trim() || "5"} temporary hit points.`;
        return cost?.id ? `${cost.label}: ${grant.charAt(0).toLowerCase()}${grant.slice(1)}` : grant;
      }
      return `${cost?.id ? `${cost.label}: a` : "A"}pplies to ${s.activationTarget === "wearer" ? "self" : "target(s)"}.`;
    }
    case "passive": return "Passive (always active).";
    default:
      return s.appMode === "passive" ? "Mode: Passive (always active)."
        : `Mode: On Activation (applies to ${s.activationTarget === "wearer" ? "self" : "target(s)"}).`;
  }
}

const AREA_WORDS = { radius: "radius", sphere: "sphere", cone: "cone", cube: "cube", cylinder: "cylinder", line: "line", square: "square", wall: "wall" };

function usesSentence(s) {
  if (s.usesMode === "recharge") { const r = intOr(s.rechargeOn, 5); return r >= 6 ? "Recharge 6." : `Recharge ${r}–6.`; }
  if (s.usesMode === "perRest") return `${Math.max(1, intOr(s.usesMax, 1))}/long rest.`;
  return "";
}

export function summarize(s) {
  const parts = [deliverySentence(s)];
  /* then today's effect sentences in today's order, EXCEPT the old
     "Temp HP grant leads" block and the "Application Mode" block (both now in deliverySentence):
     statuses, overtime, modifiers, AC, ability mods, stacking, duration, special duration */
  parts.push(usesSentence(s));
  return parts.filter(Boolean).join(" ") || "A custom effect.";
}
```
Order note: for kind `effect` the legacy order had "Mode:" after stacking; the T0 tests only use `includes`, so leading with it is fine.

- [ ] **Step 4: Run** `npm run unit` → all PASS. Fix until green.

- [ ] **Step 5: Commit** — `git commit -am "feat(builder): kind model with attack, on-hit save chain, uses; fix custom save DC"` (add the test file if untracked).

---

### Task 3: Builder UI — kind picker, step panes, rows, tooltips; migrate T0 + specs; T3 E2E

**Files:**
- Rewrite: `templates/effect-creator.hbs`
- Modify: `scripts/effect-creator.js`, `styles/char-creator.css`, `scripts/tests/index.js`, `tests/temphp.spec.js`, `tests/overtime.spec.js`
- Create: `tests/attack-save.spec.js`

**Interfaces:**
- Consumes: `KINDS`, `DEFAULT_STATE`, `buildItem`, `summarize` (Task 2).
- Produces (DOM contract used by tests + Task 4/5):
  - Kind radios: `input[name='kind'][data-ef='kind'][value=<id>]`
  - Sub-modes: `[data-ef='buffMode']` radios (`apply|temphp`), `[data-ef='saveMode']` radios (`save|none`), `[data-ef='toHitMode']` radios (`flat|derived`), `[data-ef='onHitSave']` checkbox, `[data-ef='usesMode']` select (`atwill|perRest|recharge`), `[data-ef='usesMax']`, `[data-ef='rechargeOn']`, `[data-ef='attackType']` select, `[data-ef='attackRange']`, `[data-ef='toHitFlat']`, `[data-ef='toHitAbility']`, `[data-ef='toHitBonus']`, `[data-ef='tempHpFormula']`, `[data-ef='saveOnSuccess']` select.
  - Damage rows: containers `#damageRows` / `#saveDamageRows`, add buttons `[data-add-row='damageRows']` / `[data-add-row='saveDamageRows']`, row inputs `.dmg-formula[data-list][data-idx]`, `.dmg-type[data-list][data-idx]`, delete `.dmg-del`.
  - Steps: `<section class="fc-step" data-step="basics|attack|save|effects|review" data-title="…">`; `#fcSummary` (live summary text); `#efRawPreview` kept.
  - Icon button `button[data-action='pickIcon']` (wired in Task 5; renders now, opens core FilePicker until then).
  - Locked mode: `initialState.isLocked` → kind `effect` radio `disabled`.

- [ ] **Step 1: Write failing T3 E2E** — `tests/attack-save.spec.js` (copy the login/boot preamble from `tests/temphp.spec.js` lines 1–13). Body in `page.evaluate`:

```js
const log = []; const step = m => { log.push(m); console.log("SMOKE: " + m); };
const made = [];
const origRandom = CONFIG.Dice.randomUniform;
try {
  // Deterministic dice: every die face = middle → d20 = 11.
  CONFIG.Dice.randomUniform = () => 0.5;
  const { EffectCreatorApp } = await import("./modules/forge-char-creator/scripts/effect-creator.js");
  const build = async (name, extra = {}) => {
    const app = new EffectCreatorApp();
    await app.render(true); await new Promise(r => setTimeout(r, 250));
    const el = app.element;
    const set = (sel, v) => { const i = el.querySelector(sel); if (!i) throw new Error(`missing ${sel}`);
      if (i.type === "checkbox" || i.type === "radio") i.checked = v; else i.value = v;
      i.dispatchEvent(new Event("change", { bubbles: true })); i.dispatchEvent(new Event("input", { bubbles: true })); };
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
    const doc = await new Promise((res, rej) => {
      const h = Hooks.on("createItem", i => { if (i.name !== name) return; Hooks.off("createItem", h); res(i); });
      setTimeout(() => { Hooks.off("createItem", h); rej(new Error("create timeout")); }, 20000);
      el.querySelector("button[data-action='createEffect']").click();
    });
    app.close(); made.push(doc); return doc;
  };
  const packDoc = await build("Venom Bite E2E");

  const attacker = await Actor.create({ name: "Biter E2E", type: "npc" }); made.push(attacker);
  const data = packDoc.toObject(); delete data._id; delete data.folder;
  const [feature] = await attacker.createEmbeddedDocuments("Item", [data]);

  // con 1 → d20 11 - 5 = 6 < 13 fail;  con 30 → 11 + 10 = 21 ≥ 13 success.  AC 10 vs +50 hits; AC 99 misses.
  const mkTarget = async (nm, con, ac) => {
    const a = await Actor.create({ name: nm, type: "npc", system: {
      abilities: { con: { value: con } }, attributes: { hp: { value: 50, max: 50 }, ac: { calc: "flat", flat: ac } } } });
    made.push(a); return a;
  };
  const scene = canvas.scene;
  const tok = async (actor, x) => { const [t] = await scene.createEmbeddedDocuments("Token", [{ actorId: actor.id, name: actor.name, x, y: 600 }]); made.unshift(t); return t; };
  const aTok = await tok(attacker, 100);
  const run = async (target) => {
    const tt = await tok(target, 200);
    await new Promise(r => setTimeout(r, 1200));
    const atk = feature.system.activities.find(a => a.type === "attack");
    await MidiQOL.completeActivityUse(atk.uuid, { midiOptions: { fastForward: true, fastForwardAttack: true,
      fastForwardDamage: true, autoRollDamage: "always", targetUuids: [tt.uuid], ignoreUserTargets: true } });
    await new Promise(r => setTimeout(r, 3500));
    const ta = tt.actor;
    return { hp: ta.system.attributes.hp.value, poisoned: ta.statuses.has("poisoned") };
  };
  const fail = await run(await mkTarget("Weak E2E", 1, 10));   step(`fail ${JSON.stringify(fail)}`);
  const succ = await run(await mkTarget("Tough E2E", 30, 10)); step(`succ ${JSON.stringify(succ)}`);
  const miss = await run(await mkTarget("Armored E2E", 1, 99)); step(`miss ${JSON.stringify(miss)}`);
  const acts = feature.system.activities.contents.map(a => ({ type: a.type, dc: a.save?.dc?.value, auto: a.midiProperties?.automationOnly }));
  return { ok: true, fail, succ, miss, acts, log };
} catch (e) { return { ok: false, error: e.message, log }; }
finally {
  CONFIG.Dice.randomUniform = origRandom;
  for (const d of made) await d.delete().catch(() => {});
}
```
Asserts:
```js
expect(res.ok, res.error).toBeTruthy();
expect(res.acts.find(a => a.type === "save").dc, "custom DC honoured").toBe(13);
expect(res.fail).toEqual({ hp: 41, poisoned: true });   // 50 - 5 - 4
expect(res.succ).toEqual({ hp: 43, poisoned: false });  // 50 - 5 - 2 (default saveOnSuccess "half" of 4)
expect(res.miss).toEqual({ hp: 50, poisoned: false });
```

- [ ] **Step 2: Run** (server up) `npx playwright test tests/attack-save.spec.js` → FAIL (`missing [name='kind'][value='attack']`).

- [ ] **Step 3: Rewrite `templates/effect-creator.hbs`.** Structure (all existing fieldsets keep their inner markup unless noted; add `data-tooltip` per the table in Step 5):

```hbs
<form class="forge-effect-creator-content standard-form flexcol">
  <div class="fc-layout">
    <nav class="fc-steps-nav" aria-label="Steps"></nav>
    <div class="forge-form-body scrollable fc-panes">

      <section class="fc-step" data-step="basics" data-title="Basics">
        <fieldset>
          <legend>What is it?</legend>
          <div class="fc-kinds">
            {{#each kinds as |k|}}
            <label class="fc-kind" data-tooltip="{{k.hint}}">
              <input type="radio" name="kind" data-ef="kind" value="{{k.id}}"
                     {{#if (eq ../s.kind k.id)}}checked{{/if}}
                     {{#if (and ../s.isLocked (eq k.id "effect"))}}disabled{{/if}}>
              <span>{{k.label}}</span>
            </label>
            {{/each}}
          </div>
        </fieldset>
        <fieldset>
          <legend>Identity</legend>
          <div class="flexrow" style="gap:8px; align-items:center; margin-bottom:6px;">
            <input type="text" data-ef="name" placeholder="Name" value="{{s.name}}" style="flex:1; height:2rem;"
                   data-tooltip="Shown on the sheet and in chat.">
            <button type="button" class="fc-icon-btn" data-action="pickIcon" data-tooltip="Choose an icon (searchable)">
              <img id="efImgPreview" src="{{s.img}}" alt="Icon" width="36" height="36">
            </button>
            <input type="text" data-ef="img" value="{{s.img}}" style="flex:1; height:2rem; font-size:0.8em;"
                   data-tooltip="Icon file path. Use the icon button to search instead of typing.">
          </div>
          <textarea data-ef="description" placeholder="Description — leave blank to auto-generate from your choices"
                    style="width:100%; height:3.5rem; resize:vertical; font-size:0.9em;">{{s.description}}</textarea>
        </fieldset>
        <fieldset id="deliveryBasics">
          <legend>Use</legend>
          <div class="fc-row">
            <label data-tooltip="What it costs to use in combat.">Activation
              <select data-ef="wrapActivation">{{#each activationTypes as |at|}}<option value="{{at.id}}" {{#if (eq ../s.wrapActivation at.id)}}selected{{/if}}>{{at.label}}</option>{{/each}}</select>
            </label>
            <label data-tooltip="At will = unlimited. Per long rest = N uses. Recharge = roll a d6 at the start of each turn; regains its use on N–6.">Uses
              <select data-ef="usesMode">
                <option value="atwill" {{#if (eq s.usesMode "atwill")}}selected{{/if}}>At will</option>
                <option value="perRest" {{#if (eq s.usesMode "perRest")}}selected{{/if}}>X / long rest</option>
                <option value="recharge" {{#if (eq s.usesMode "recharge")}}selected{{/if}}>Recharge</option>
              </select>
            </label>
            <label id="usesMaxBox">Uses <input type="number" data-ef="usesMax" value="{{s.usesMax}}" min="1" class="fc-num"></label>
            <label id="rechargeBox" data-tooltip="Recharges when the d6 shows this number or higher.">Recharge on
              <select data-ef="rechargeOn">{{#each rechargeOpts as |r|}}<option value="{{r}}" {{#if (eq ../s.rechargeOn r)}}selected{{/if}}>{{r}}–6</option>{{/each}}</select>
            </label>
          </div>
          <div class="fc-row" id="targetRow">
            <!-- move today's wrapTargetCountBox / wrapAreaSizeBox / Area select here verbatim, add tooltips -->
          </div>
          <div class="fc-row" id="buffRow">
            <label><input type="radio" name="buffMode" data-ef="buffMode" value="apply" {{#if (eq s.buffMode "apply")}}checked{{/if}}> Apply effect</label>
            <label><input type="radio" name="buffMode" data-ef="buffMode" value="temphp" {{#if (eq s.buffMode "temphp")}}checked{{/if}}> Temp HP</label>
            <label id="tempHpBox" data-tooltip="Dice or flat number, e.g. 2d4+2. Temp HP doesn't stack: the higher value wins.">Temp HP
              <input type="text" data-ef="tempHpFormula" value="{{s.tempHpFormula}}" placeholder="2d4+2" class="fc-formula"></label>
            <span>Apply to:</span>
            <label><input type="radio" data-ef="activationTarget" name="activationTarget" value="wearer" {{#if (eq s.activationTarget "wearer")}}checked{{/if}}> Self</label>
            <label><input type="radio" data-ef="activationTarget" name="activationTarget" value="targets" {{#if (eq s.activationTarget "targets")}}checked{{/if}}> Target(s)</label>
          </div>
        </fieldset>
      </section>

      <section class="fc-step" data-step="attack" data-title="Attack">
        <fieldset>
          <legend>Attack roll</legend>
          <div class="fc-row">
            <label data-tooltip="Melee uses reach, ranged uses range.">Type
              <select data-ef="attackType">
                <option value="melee" {{#if (eq s.attackType "melee")}}selected{{/if}}>Melee</option>
                <option value="ranged" {{#if (eq s.attackType "ranged")}}selected{{/if}}>Ranged</option>
              </select></label>
            <label data-tooltip="Reach or range in feet.">Reach/Range (ft) <input type="number" data-ef="attackRange" value="{{s.attackRange}}" min="0" step="5" class="fc-num"></label>
          </div>
          <div class="fc-row">
            <label data-tooltip="Fixed: exactly the number on the statblock (+7 to hit). Doesn't change with stats.">
              <input type="radio" name="toHitMode" data-ef="toHitMode" value="flat" {{#if (eq s.toHitMode "flat")}}checked{{/if}}> Fixed</label>
            <label data-tooltip="Calculated: ability modifier + proficiency + extra bonus. Scales if the creature's stats change.">
              <input type="radio" name="toHitMode" data-ef="toHitMode" value="derived" {{#if (eq s.toHitMode "derived")}}checked{{/if}}> Calculated</label>
            <label id="toHitFlatBox">To hit + <input type="text" data-ef="toHitFlat" value="{{s.toHitFlat}}" class="fc-num" placeholder="7"></label>
            <span id="toHitDerivedBox" class="fc-row">
              <select data-ef="toHitAbility">{{#each abilities as |ab|}}<option value="{{ab.[0]}}" {{#if (eq ../s.toHitAbility ab.[0])}}selected{{/if}}>{{ab.[1]}}</option>{{/each}}</select>
              + prof + <input type="text" data-ef="toHitBonus" value="{{s.toHitBonus}}" class="fc-num" placeholder="0">
            </span>
          </div>
        </fieldset>
        <fieldset>
          <legend data-tooltip="Damage dealt on a hit. Add a row per damage type (e.g. 1d8+3 piercing + 2d6 poison).">Damage on hit</legend>
          <div id="damageRows"></div>
          <button type="button" data-add-row="damageRows"><i class="fas fa-plus"></i> Add damage</button>
        </fieldset>
        <label class="fc-row" data-tooltip="On a hit, the target also rolls a saving throw (e.g. 'DC 13 CON or be poisoned').">
          <input type="checkbox" data-ef="onHitSave" {{#if s.onHitSave}}checked{{/if}}> On hit: target makes a saving throw
        </label>
      </section>

      <section class="fc-step" data-step="save" data-title="Saving Throw">
        <fieldset>
          <legend>Saving throw</legend>
          <div class="fc-row" id="saveModeRow">
            <label><input type="radio" name="saveMode" data-ef="saveMode" value="save" {{#if (eq s.saveMode "save")}}checked{{/if}}> Save</label>
            <label data-tooltip="No roll at all: damage and effects just happen."><input type="radio" name="saveMode" data-ef="saveMode" value="none" {{#if (eq s.saveMode "none")}}checked{{/if}}> No save (auto damage)</label>
          </div>
          <div class="fc-row" id="saveParams">
            <label>Ability <select data-ef="wrapSaveAbility">{{#each abilities as |ab|}}<option value="{{ab.[0]}}" {{#if (eq ../s.wrapSaveAbility ab.[0])}}selected{{/if}}>{{ab.[1]}}</option>{{/each}}</select></label>
            <label data-tooltip="A number (e.g. 13). Leave blank to use the creature's spell save DC.">DC <input type="text" data-ef="wrapSaveDC" value="{{s.wrapSaveDC}}" class="fc-num" placeholder="spell"></label>
            <label data-tooltip="What a successful save does to the damage below. Effects never apply on a success.">On success
              <select data-ef="saveOnSuccess">
                <option value="half" {{#if (eq s.saveOnSuccess "half")}}selected{{/if}}>Half damage</option>
                <option value="none" {{#if (eq s.saveOnSuccess "none")}}selected{{/if}}>No damage</option>
              </select></label>
          </div>
        </fieldset>
        <fieldset>
          <legend data-tooltip="Damage taken on a failed save.">Damage on failure</legend>
          <div id="saveDamageRows"></div>
          <button type="button" data-add-row="saveDamageRows"><i class="fas fa-plus"></i> Add damage</button>
        </fieldset>
      </section>

      <section class="fc-step" data-step="effects" data-title="Effects">
        <p class="hint" id="effectsHint"></p>
        <!-- move today's fieldsets here verbatim, in this order: Application Mode (id="appModeFieldset", only for kind effect),
             Conditions Applied, Duration, Advantage / Disadvantage, Stat Modifiers, Effect Stacking -->
      </section>

      <section class="fc-step" data-step="review" data-title="Review">
        <fieldset><legend>Summary</legend><p id="fcSummary" class="fc-summary"></p></fieldset>
        <details><summary>🔧 Raw preview</summary><pre id="efRawPreview" class="fc-raw"></pre></details>
      </section>
    </div>
  </div>
  <footer class="form-footer">
    <span class="fc-keys"></span>
    <button type="button" data-action="createEffect"><i class="fas fa-sparkles"></i> <span id="fcCreateLabel">Create</span></button>
  </footer>
</form>
```
Delete the old Output fieldset (`wrapInFeature`, `wrapType`, `wrapFeatureOptions`, `wrapDamageRow`, `wrapSaveRow`). In Task 3, all steps render stacked (no stepper yet); `.fc-steps-nav` empty.

- [ ] **Step 4: Update `scripts/effect-creator.js`.**
  - `_prepareContext`: add `ctx.kinds = KINDS; ctx.rechargeOpts = ["2","3","4","5","6"];` keep others.
  - Register Handlebars helper `and` if absent: at module top
    ```js
    Hooks.once("init", () => { if (!Handlebars.helpers.and) Handlebars.registerHelper("and", (a, b) => a && b); });
    ```
    (module already loaded at init via main.js import). If `and` already exists in Foundry V13 (it does: core registers `and`/`or`/`eq`), skip — check with `Handlebars.helpers.and` in console first.
  - `constructor`: after `Object.assign`, if `initialState.isLocked && this.#state.kind === "effect"` → `this.#state.kind = "attack"`.
  - Replace `#renderAdvRows`-style for damage: add

    ```js
    #renderDamageRows(el, list) {
      const container = el.querySelector(`#${list}`);
      if (!container) return;
      const rows = this.#state[list];
      container.innerHTML = rows.length ? rows.map((r, idx) => `
        <div class="dmg-row flexrow">
          <input type="text" class="dmg-formula" data-list="${list}" data-idx="${idx}" value="${r.formula}" placeholder="1d8+3"
                 data-tooltip="Dice formula, e.g. 2d6 or 1d8+3">
          <select class="dmg-type" data-list="${list}" data-idx="${idx}">
            ${DAMAGE_TYPES.filter(t => t !== "healing").map(t => `<option value="${t}" ${r.type === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
          <button type="button" class="dmg-del" data-list="${list}" data-idx="${idx}" aria-label="Remove">×</button>
        </div>`).join("")
        : `<p class="notes fc-empty">No damage.</p>`;
      container.querySelectorAll(".dmg-formula").forEach(i => i.addEventListener("change", () => { rows[+i.dataset.idx].formula = i.value; this.#refresh(el); }));
      container.querySelectorAll(".dmg-type").forEach(i => i.addEventListener("change", () => { rows[+i.dataset.idx].type = i.value; this.#refresh(el); }));
      container.querySelectorAll(".dmg-del").forEach(b => b.addEventListener("click", () => { rows.splice(+b.dataset.idx, 1); this.#renderDamageRows(el, list); this.#refresh(el); }));
    }
    ```
    and in `_onRender`:
    ```js
    el.querySelectorAll("[data-add-row]").forEach(btn => btn.addEventListener("click", () => {
      const list = btn.dataset.addRow;
      this.#state[list].push({ formula: "", type: list === "damageRows" ? "slashing" : "fire" });
      this.#renderDamageRows(el, list);
      el.querySelector(`.dmg-formula[data-list='${list}'][data-idx='${this.#state[list].length - 1}']`)?.focus();
      this.#refresh(el);
    }));
    this.#renderDamageRows(el, "damageRows");
    this.#renderDamageRows(el, "saveDamageRows");
    ```
  - `#refresh(el)` = `this.#reactiveUpdate(el); this.#updateRawPreview(el);` — replace existing pairs of calls with it.
  - `#updateRawPreview`: preview `this._buildItemData()` (full item, more useful) and set `#fcSummary` textContent to `summarize(this.#state)`.
  - `#reactiveUpdate` rewrite visibility:

    ```js
    const k = s.kind;
    const isArea = s.wrapTargetArea in (CONFIG.DND5E?.areaTargetTypes ?? {});
    const stepOn = { basics: true, attack: k === "attack", save: k === "save" || (k === "attack" && s.onHitSave),
                     effects: true, review: true };
    el.querySelectorAll(".fc-step").forEach(sec => sec.hidden = !stepOn[sec.dataset.step]);
    show("deliveryBasics", k !== "effect");
    showFlex("targetRow", ["attack", "save", "buff"].includes(k) && !(k === "buff" && s.activationTarget === "wearer"));
    showFlex("buffRow", k === "buff");
    showFlex("tempHpBox", k === "buff" && s.buffMode === "temphp");
    show("usesMaxBox", s.usesMode === "perRest");
    show("rechargeBox", s.usesMode === "recharge");
    show("toHitFlatBox", s.toHitMode === "flat");
    showFlex("toHitDerivedBox", s.toHitMode === "derived");
    showFlex("saveModeRow", k === "save");
    showFlex("saveParams", !(k === "save" && s.saveMode === "none"));
    show("appModeFieldset", k === "effect");
    showFlex("wrapTargetCountBox", !isArea);
    showFlex("wrapAreaSizeBox", isArea);
    const hint = { attack: s.onHitSave ? "Applied to the target when it FAILS the on-hit save." : "Applied to the target on a HIT.",
                   save: "Applied to targets that FAIL the save.", buff: "Applied on use.", passive: "Always active on the creature that has this feature.",
                   effect: "The effect itself." }[k];
    const h = el.querySelector("#effectsHint"); if (h) h.textContent = hint;
    const lbl = el.querySelector("#fcCreateLabel"); if (lbl) lbl.textContent = k === "effect" ? "Create Effect" : "Create Feature";
    ```
    Remove the `wrapInFeature`/`wrapType` visibility lines and the `wrapDamageLabel` relabel block. Keep the `setPosition` block.
  - `_doCreate`: name check message `"Please enter a name."`; pack = `s.kind === "effect" ? "forge-effects" : "forge-features"`. Everything else unchanged. Reset uses `foundry.utils.deepClone(DEFAULT_STATE)`.

- [ ] **Step 5: Tooltips** — every label/field in the moved legacy fieldsets gets `data-tooltip`:

| field | tooltip |
|---|---|
| appMode passive | "Always active on whatever carries this effect." |
| appMode activation | "Applied only when the item is used." |
| durationType fixed | "Lasts a set number of rounds (0 = until removed)." |
| durationType overtime | "Does something every turn (damage, healing, or a save to end it)." |
| specialDuration | "Ends at a turn boundary instead of after N rounds. Needs the Times-Up module." |
| otTrigger / otWhose | "When the per-turn effect fires, and on whose turn." |
| otDamage | "Rolled each turn, e.g. 1d6. Leave blank for save-only." |
| otSave | "Target can save each turn; succeeding enough times ends the effect." |
| otSuccesses | "Number of successful saves needed to end it." |
| conditions legend | "Standard conditions applied to the target while the effect lasts." |
| adv legend | "Advantage/disadvantage on rolls. 'Grants' = rolls made AGAINST the creature." |
| acBonus | "Added to AC. Negative for a penalty." |
| ability rows legend | "Added to ability scores while active." |
| stackable | "Whether applying it again adds a second copy or refreshes the first." |

- [ ] **Step 6: CSS** — append to `styles/char-creator.css`:

```css
/* ── Feature builder ─────────────────────────────────────────────── */
.forge-effect-creator .fc-layout { display: flex; gap: 10px; min-height: 0; }
.forge-effect-creator .fc-panes { flex: 1; min-width: 0; }
.forge-effect-creator .fc-kinds { display: flex; flex-wrap: wrap; gap: 6px; }
.forge-effect-creator .fc-kind { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid var(--color-border-light-tertiary); border-radius: 4px; cursor: pointer; }
.forge-effect-creator .fc-kind:has(input:checked) { border-color: var(--color-border-highlight, #ff6400); background: rgba(255, 100, 0, 0.12); }
.forge-effect-creator .fc-row { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin-bottom: 6px; }
.forge-effect-creator .fc-num { width: 4rem; text-align: center; height: 1.8rem; }
.forge-effect-creator .fc-formula { width: 7rem; height: 1.8rem; text-align: center; }
.forge-effect-creator .dmg-row { gap: 6px; align-items: center; margin-bottom: 4px; }
.forge-effect-creator .dmg-row .dmg-formula { flex: 1; height: 1.8rem; }
.forge-effect-creator .dmg-row .dmg-type { flex: 1; height: 1.8rem; }
.forge-effect-creator .dmg-row .dmg-del { flex: 0 0 auto; width: 2rem; height: 1.8rem; color: var(--color-level-error-high); }
.forge-effect-creator .fc-icon-btn { flex: 0 0 auto; width: 44px; height: 44px; padding: 2px; }
.forge-effect-creator .fc-summary { font-size: 0.95em; line-height: 1.4; }
.forge-effect-creator .fc-raw { font-size: 0.72em; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 6px; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }
.forge-effect-creator .fc-empty { font-style: italic; font-size: 0.85em; color: var(--color-text-light-5); }
```

- [ ] **Step 7: Migrate T0 tests** in `scripts/tests/index.js` (replace each `wrapInFeature`+`wrapType` pair):
  - `[name='wrapType'][value='apply']` → `[name='kind'][value='buff']` (lines ~514, 573, 802, 1143)
  - `[value='damage']` (640) → `[name='kind'][value='save']` then `[name='saveMode'][value='none']`; replace `wrapDamageFormula` "2d6" with: click `[data-add-row='saveDamageRows']`, set `.dmg-formula[data-list='saveDamageRows'][data-idx='0']` = "2d6". Add `[data-status='prone']` = true so the `act.effects[0]._id` link assert still holds (no-content attacks/saves no longer embed an AE).
  - `[value='temphp']` (712) → `[name='kind'][value='buff']` + `[name='buffMode'][value='temphp']`; `wrapDamageFormula` → `tempHpFormula`.
  - `[value='save']` (1002, 1230) → `[name='kind'][value='save']`; `wrapDamageFormula`/`wrapDamageType` → add-row + `.dmg-formula`/`.dmg-type` on `saveDamageRows`. Fireball test: add `[data-status='prone']` true for the link assert. Omega test: it already sets statuses/adv (verify; if not, add one).
  - `#testCharCreatorFeatureCreation` (1136): replace the wrap-checkbox asserts with: `const effKind = effectEl.querySelector("[name='kind'][value='effect']"); if (!effKind.disabled) throw new Error("Effect-only kind must be disabled when locked.");` and `if (!effectEl.querySelector("[name='kind'][value='attack']").checked) throw new Error("Locked builder should default to Attack.");` then select `[name='kind'][value='buff']` as before.
  - Delete lines that only touch `wrapInFeature`.
  - Add new T0 `#testAttackSaveChainPayload`: render builder, set kind attack, toHitFlat 6, add damage row "1d6" slashing, onHitSave true, DC 12, status prone; call `app._buildItemData()`; assert 2 activities, `attack.flat === true`, `bonus === "6"`, `otherActivityId` = save id, save `dc.calculation === ""`. Register in `runAll` as `"EffectCreatorApp: Attack with on-hit save chains to an automation-only save activity"`.
- `tests/temphp.spec.js` lines 36–39: `set("[name='kind'][value='buff']", true); set("[name='buffMode'][value='temphp']", true); set("[data-ef='wrapActivation']", "bonus"); set("[data-ef='tempHpFormula']", "7");`
- `tests/overtime.spec.js` 85–97: replace wrap checkbox/radio with `[name='kind'][value='buff']` checked + change event.

- [ ] **Step 8: Run** `npm run unit`, then with server: `npx playwright test tests/attack-save.spec.js tests/temphp.spec.js tests/module.spec.js`. Expected: attack-save PASS, temphp PASS, module native suite: all T0 pass except the pre-existing Omega hang. If attack-save fails on the chain (save never rolls): use superpowers:systematic-debugging; first check `feature.system.activities.find(a=>a.type==="attack").otherActivity` resolves in console, then midi setting `autoRollDamage`/`removeChatButtons`. Don't guess.

- [ ] **Step 9: Visual check** — open builder via Forge Hub, screenshot each kind with Playwright MCP (`browser_take_screenshot`) into `~/Downloads/claude-tmp/feature-builder/`. Confirm no clipped/overlapping rows.

- [ ] **Step 10: Commit** — `git add -A templates/effect-creator.hbs scripts/effect-creator.js styles/char-creator.css scripts/tests/index.js tests/attack-save.spec.js tests/temphp.spec.js tests/overtime.spec.js && git commit -m "feat(builder): kind picker, attack/save steps, damage rows, tooltips + attack-save E2E"`

---

### Task 4: Stepper — keyboard steps for builder and char wizard

**Files:**
- Create: `scripts/ui/stepper.js`, `tests/keyboard-nav.spec.js`
- Modify: `scripts/effect-creator.js`, `scripts/app.js`, `templates/char-creator.hbs`, `styles/char-creator.css`

**Interfaces:**
- Consumes: `.fc-step[data-step][data-title]` sections, `.fc-steps-nav`, `.fc-keys` footer span (Task 3; char wizard gets the same markup here).
- Produces: `export function attachStepper(root, { onCreate, onStepChange } = {}) → { go(stepId), next(), prev(), current(), refresh() }`. Contract: visible steps = `.fc-step:not([hidden])`; exactly one visible step has class `active` and is shown, others `display:none` via CSS `.fc-stepped .fc-step:not(.active){display:none}`; nav buttons `.fc-nav-btn[data-go=<id>]` with `aria-current="step"` on active, label `"<n>. <title>"`; `root` gets class `fc-stepped`. Keys handled on `root` `keydown`: `Alt+ArrowRight/Left` next/prev, `Alt+Digit1..9` jump to nth visible, `Ctrl+Enter` → `onCreate()`. Entering a step focuses its first focusable `input:not([type=hidden]):not([disabled]), select, textarea, button` that is visible. `refresh()` re-reads hidden flags (call after visibility changes); if active became hidden, go to nearest previous visible.

- [ ] **Step 1: Failing Playwright** — `tests/keyboard-nav.spec.js` (preamble from temphp.spec). Tests:

```js
test("builder: Alt+arrows walk steps, typing keeps Ctrl+arrow for text", async ({ page }) => {
  /* boot preamble */
  await page.evaluate(async () => {
    const { EffectCreatorApp } = await import("./modules/forge-char-creator/scripts/effect-creator.js");
    const app = new EffectCreatorApp(); await app.render(true);
  });
  const root = page.locator(".forge-effect-creator");
  await root.locator("[name='kind'][value='attack']").check();
  const active = () => root.locator(".fc-step.active").getAttribute("data-step");
  expect(await active()).toBe("basics");
  await root.locator("[data-ef='name']").click();
  await page.keyboard.type("Claw");
  await page.keyboard.press("Control+ArrowLeft");           // word jump, not a step
  expect(await active()).toBe("basics");
  await page.keyboard.press("Alt+ArrowRight");
  expect(await active()).toBe("attack");
  await expect(root.locator("[data-ef='attackType']")).toBeFocused();
  await page.keyboard.press("Alt+ArrowRight");               // save step hidden (no rider) → effects
  expect(await active()).toBe("effects");
  await page.keyboard.press("Alt+1");
  expect(await active()).toBe("basics");
  await expect(root.locator(".fc-nav-btn[aria-current='step']")).toHaveText(/1\. Basics/);
  await root.locator(".fc-nav-btn", { hasText: "Review" }).click();
  expect(await active()).toBe("review");
});

test("builder: Ctrl+Enter creates", async ({ page }) => {
  /* boot; render builder; fill name "KB Create E2E", kind passive */
  const created = page.evaluate(() => new Promise(res => {
    const h = Hooks.on("createItem", i => { if (i.name === "KB Create E2E") { Hooks.off("createItem", h); res(i.uuid); i.delete(); } });
  }));
  await page.locator(".forge-effect-creator [data-ef='name']").focus();
  await page.keyboard.press("Control+Enter");
  expect(await created).toContain("Item.");
});

test("char wizard: steps + Alt+digit + search Esc does not step", async ({ page }) => {
  /* boot; new CharCreatorApp().render(true) via dynamic import of ./modules/forge-char-creator/scripts/app.js */
  const root = page.locator("#forge-char-creator-app");
  const active = () => root.locator(".fc-step.active").getAttribute("data-step");
  expect(await active()).toBe("identity");
  await expect(root.locator("#charName")).toBeFocused();
  await page.keyboard.press("Alt+3");
  expect(await active()).toBe("features");
  await expect(root.locator("#itemSearchQuery")).toBeFocused();
  await page.keyboard.type("fire");
  await page.waitForSelector("#itemSearchResults li", { timeout: 10000 });
  await page.keyboard.press("Escape");
  await expect(root.locator("#itemSearchResults")).toBeHidden();
  expect(await active()).toBe("features");
  await page.keyboard.press("Alt+ArrowLeft");
  expect(await active()).toBe("stats");
});
```
Each test ends with closing apps: `page.evaluate(() => Object.values(ui.windows).concat([...foundry.applications.instances.values()]).forEach(a => a.id?.startsWith("forge-") && a.close()))`.

- [ ] **Step 2: Run** → FAIL (no `.fc-step.active`).

- [ ] **Step 3: Implement `scripts/ui/stepper.js`:**

```js
/**
 * Step navigation for long forms. Sections `.fc-step[data-step][data-title]` become
 * steps; a nav is rendered into `.fc-steps-nav`, hints into `.fc-keys`.
 * Keys (only while focus is inside root): Alt+←/→ prev/next, Alt+1..9 jump, Ctrl+Enter create.
 */
const FOCUSABLE = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";

export function attachStepper(root, { onCreate, onStepChange } = {}) {
  root.classList.add("fc-stepped");
  const nav = root.querySelector(".fc-steps-nav");
  const keys = root.querySelector(".fc-keys");
  if (keys) keys.textContent = "Alt+←/→ step · Alt+1–9 jump · Ctrl+Enter create";
  let currentId = null;

  const visible = () => [...root.querySelectorAll(".fc-step")].filter(s => !s.hidden);

  function renderNav() {
    if (!nav) return;
    nav.innerHTML = visible().map((s, i) =>
      `<button type="button" class="fc-nav-btn" data-go="${s.dataset.step}" data-tooltip="Alt+${i + 1}"
               ${s.dataset.step === currentId ? 'aria-current="step"' : ""}>${i + 1}. ${s.dataset.title}</button>`).join("");
    nav.querySelectorAll(".fc-nav-btn").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
  }

  function go(id, { focus = true } = {}) {
    const steps = visible();
    const target = steps.find(s => s.dataset.step === id) ?? steps[0];
    if (!target) return;
    currentId = target.dataset.step;
    root.querySelectorAll(".fc-step").forEach(s => s.classList.toggle("active", s === target));
    renderNav();
    if (focus) {
      const f = [...target.querySelectorAll(FOCUSABLE)].find(n => n.offsetParent !== null);
      f?.focus();
    }
    onStepChange?.(currentId);
  }

  const index = () => visible().findIndex(s => s.dataset.step === currentId);
  const next = () => { const v = visible(); go(v[Math.min(v.length - 1, index() + 1)]?.dataset.step); };
  const prev = () => { const v = visible(); go(v[Math.max(0, index() - 1)]?.dataset.step); };

  function refresh() {
    const all = [...root.querySelectorAll(".fc-step")];
    const cur = all.find(s => s.dataset.step === currentId);
    if (!cur || cur.hidden) {
      const before = all.slice(0, all.indexOf(cur) + 1).reverse().find(s => !s.hidden);
      go(before?.dataset.step ?? visible()[0]?.dataset.step, { focus: false });
    } else renderNav();
  }

  root.addEventListener("keydown", (e) => {
    let handled = true;
    if (e.altKey && !e.ctrlKey && e.key === "ArrowRight") next();
    else if (e.altKey && !e.ctrlKey && e.key === "ArrowLeft") prev();
    else if (e.altKey && /^Digit[1-9]$/.test(e.code)) { const s = visible()[+e.code.slice(5) - 1]; if (s) go(s.dataset.step); }
    else if (e.ctrlKey && e.key === "Enter") onCreate?.();
    else handled = false;
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  });

  go(visible()[0]?.dataset.step);
  return { go, next, prev, refresh, current: () => currentId };
}
```
CSS:
```css
/* ── Stepper ─────────────────────────────────────────────────────── */
.fc-stepped .fc-step:not(.active) { display: none; }
.fc-steps-nav { display: flex; flex-direction: column; gap: 4px; flex: 0 0 9.5rem; }
.fc-steps-nav:empty { display: none; }
.fc-nav-btn { text-align: left; white-space: nowrap; }
.fc-nav-btn[aria-current="step"] { border-color: var(--color-border-highlight, #ff6400); background: rgba(255, 100, 0, 0.15); font-weight: bold; }
.fc-keys { font-size: 0.8em; color: var(--color-text-light-5); margin-right: auto; align-self: center; }
.form-footer:has(.fc-keys) { display: flex; gap: 8px; }
```

- [ ] **Step 4: Wire builder** — in `EffectCreatorApp._onRender`: `this.#stepper = attachStepper(el.querySelector("form") ?? el, { onCreate: () => this._doCreate() });` (declare `#stepper = null;`). At end of `#reactiveUpdate`: `this.#stepper?.refresh();`. Keep the current step across kind changes (refresh does that). Set `position.height` to `600` (fixed; steps make "auto" jumpy) and drop the `setPosition({height:"auto"})` block.

- [ ] **Step 5: Char wizard** — `templates/char-creator.hbs`: wrap body into
  ```hbs
  <div class="fc-layout"><nav class="fc-steps-nav"></nav><div class="forge-form-body scrollable fc-panes">
    <section class="fc-step" data-step="identity" data-title="Identity"> name, level/archetype, portrait, size+disposition blocks </section>
    <section class="fc-step" data-step="stats" data-title="Stats"> combat attributes, ability scores, spellcasting </section>
    <section class="fc-step" data-step="features" data-title="Features"> compendium search fieldset </section>
    <section class="fc-step" data-step="token" data-title="Token"> aura fieldset, link actor fieldset </section>
  </div></div>
  ```
  (moves only; markup inside unchanged except adding `data-tooltip`s: archetype "Fills stats with sensible values for the level; edit freely after.", AC/HP obvious ones, search "Type to search every compendium. ↑/↓ to move, Enter to add.", Create New "Build a new attack/ability for this creature.", disposition "Token border color / who it is hostile to.", link actor as its hint text). Footer: add `<span class="fc-keys"></span>` before the Create button. Move the `.forge-char-creator .fc-layout` rules: add `.forge-char-creator .fc-layout, .forge-effect-creator .fc-layout` selector to the Task 3 rule. Set `position: { width: 760, height: 640 }`.
  - `app.js` `_onRender`: at end, `attachStepper(this.element.querySelector("form"), { onCreate: () => this.element.querySelector("[data-action='createNPC']").click() });`. Remove the now-unused `.forge-tab-btn` switching block only if the template has no tab buttons (it has none → delete).
  - Search `keydown` Escape handler: add `e.stopPropagation()` so Foundry doesn't close the window on Esc while the dropdown is open, but only when the dropdown was visible:
    ```js
    if (e.key === "Escape") {
      if (searchResults.style.display !== "none") { e.stopPropagation(); e.preventDefault(); }
      searchResults.style.display = "none";
      return;
    }
    ```

- [ ] **Step 6: Run** `npx playwright test tests/keyboard-nav.spec.js tests/module.spec.js tests/attack-save.spec.js tests/window-scroll.spec.js tests/search-keyboard.spec.js` → keyboard-nav PASS; others same as Task 3 baseline. `window-scroll.spec` / `search-keyboard.spec` may need selector/step updates (e.g. navigate to Features step first via `Alt+3` before using search) — update them; don't weaken asserts.

- [ ] **Step 7: Commit** — `git commit -am "feat(ui): keyboard stepper for builder and char wizard"` (+ `git add scripts/ui/stepper.js tests/keyboard-nav.spec.js`).

---

### Task 5: Icon picker

**Files:**
- Create: `scripts/ui/icon-picker.js`, `scripts/ui/icon-picker.test.mjs`, `templates/icon-picker.hbs`, `tests/icon-picker.spec.js`
- Modify: `scripts/effect-creator.js` (`pickIcon` action), `styles/char-creator.css`

**Interfaces:**
- Produces:
  - `export function suggestTerms(name, damageType) → string[]` (pure)
  - `export function matchIcons(paths, query, limit = 200) → string[]` (pure; all whitespace-separated words must be substrings of the lowercased path)
  - `export async function loadIconIndex(browse) → string[]` — `browse(dir) → Promise<{dirs, files}>`; BFS from `"icons"`, concurrency 8, keeps `.webp|.png|.svg|.jpg`; memoized in module-level promise (second call returns same promise).
  - `export class IconPickerApp` (ApplicationV2, id `forge-icon-picker`), `static pick({ name, damageType, current }) → Promise<string|null>`.

- [ ] **Step 1: Failing unit** — `scripts/ui/icon-picker.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestTerms, matchIcons, loadIconIndex, _resetIconIndex } from "./icon-picker.js";

test("suggestTerms maps keywords + damage type + name words", () => {
  const t = suggestTerms("Venomous Bite", "poison");
  for (const w of ["bite", "fang", "poison", "venomous"]) assert.ok(t.includes(w), `${w} in ${t}`);
  assert.deepEqual(suggestTerms("", ""), []);
});

test("matchIcons requires all words, case-insensitive, limited", () => {
  const p = ["icons/creatures/abilities/fang-bite-red.webp", "icons/magic/fire/flame.webp", "icons/creatures/claws/claw.webp"];
  assert.deepEqual(matchIcons(p, "Fang bite"), [p[0]]);
  assert.deepEqual(matchIcons(p, "creatures", 1), [p[0]]);
  assert.deepEqual(matchIcons(p, ""), p);
});

test("loadIconIndex BFS + memo", async () => {
  _resetIconIndex();
  const tree = { icons: { dirs: ["icons/a", "icons/b"], files: ["icons/x.webp", "icons/readme.txt"] },
                 "icons/a": { dirs: [], files: ["icons/a/1.png"] }, "icons/b": { dirs: [], files: ["icons/b/2.svg"] } };
  let calls = 0;
  const browse = async d => { calls++; return tree[d]; };
  const a = await loadIconIndex(browse);
  const b = await loadIconIndex(browse);
  assert.deepEqual(a.sort(), ["icons/a/1.png", "icons/b/2.svg", "icons/x.webp"]);
  assert.equal(a, b);
  assert.equal(calls, 3);
});
```

- [ ] **Step 2: Run** `npm run unit` → FAIL.

- [ ] **Step 3: Implement `scripts/ui/icon-picker.js`:**

```js
/**
 * Searchable icon grid over Foundry's core icons/ tree.
 * The index is built once per session (BFS over FilePicker.browse) and memoized.
 */
const KEYWORDS = {
  bite: ["bite", "fang"], fang: ["fang"], claw: ["claw"], talon: ["claw", "talon"], tail: ["tail"], horn: ["horn"],
  sword: ["sword"], blade: ["sword", "blade"], axe: ["axe"], mace: ["mace"], hammer: ["hammer"], spear: ["spear"],
  dagger: ["dagger"], bow: ["bow", "arrow"], arrow: ["arrow"], shot: ["arrow"], whip: ["whip"], lash: ["whip", "tentacle"],
  tentacle: ["tentacle"], slam: ["fist"], punch: ["fist"], fist: ["fist"], breath: ["breath"], roar: ["roar", "sound"],
  shield: ["shield"], heal: ["heal", "heart"], ward: ["shield", "ward"], curse: ["curse", "skull"], web: ["web"]
};
const DAMAGE_WORDS = { fire: ["fire", "flame"], cold: ["ice", "frost"], lightning: ["lightning"], poison: ["poison"],
  acid: ["acid"], necrotic: ["skull", "unholy"], radiant: ["holy", "light"], psychic: ["mind", "psychic"],
  thunder: ["thunder", "sound"], force: ["force", "energy"], piercing: ["pierc"], slashing: ["slash"], bludgeoning: ["blunt"] };
const EXT = /\.(webp|png|svg|jpg|jpeg)$/i;

export function suggestTerms(name = "", damageType = "") {
  const words = name.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2);
  const out = new Set();
  for (const w of words) { out.add(w); for (const k of KEYWORDS[w] ?? []) out.add(k); }
  for (const k of DAMAGE_WORDS[damageType] ?? []) out.add(k);
  return [...out];
}

export function matchIcons(paths, query, limit = 200) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const res = [];
  for (const p of paths) {
    const lp = p.toLowerCase();
    if (words.every(w => lp.includes(w))) { res.push(p); if (res.length >= limit) break; }
  }
  return res;
}

let indexPromise = null;
export function _resetIconIndex() { indexPromise = null; }

export function loadIconIndex(browse) {
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    const files = [], queue = ["icons"];
    const worker = async () => {
      while (queue.length) {
        const dir = queue.shift();
        try {
          const r = await browse(dir);
          queue.push(...(r?.dirs ?? []));
          files.push(...(r?.files ?? []).filter(f => EXT.test(f)));
        } catch { /* unreadable dir: skip */ }
      }
    };
    // Workers exit when the queue is momentarily empty; loop until truly drained.
    while (queue.length) await Promise.all(Array.from({ length: 8 }, worker));
    return files;
  })();
  indexPromise.catch(() => { indexPromise = null; });
  return indexPromise;
}
```
Then (browser-only, guarded so node import doesn't touch `foundry`):

```js
const Base = globalThis.foundry?.applications?.api
  ? foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
  : class {};

export class IconPickerApp extends Base {
  static DEFAULT_OPTIONS = {
    id: "forge-icon-picker", classes: ["forge-icon-picker"], window: { title: "Choose Icon", icon: "fas fa-icons", resizable: true },
    position: { width: 560, height: 520 }
  };
  static PARTS = { body: { template: "./modules/forge-char-creator/templates/icon-picker.hbs" } };

  #resolve = null; #opts = {}; #paths = []; #picked = false;

  static pick(opts = {}) {
    return new Promise(resolve => { const app = new IconPickerApp(); app.#opts = opts; app.#resolve = resolve; app.render(true); });
  }

  async _onRender(ctx, options) {
    await super._onRender?.(ctx, options);
    const el = this.element;
    const input = el.querySelector(".ip-search"), grid = el.querySelector(".ip-grid"), status = el.querySelector(".ip-status");
    const FP = foundry.applications.apps.FilePicker.implementation;
    status.textContent = "Indexing icons… (first time only)";
    this.#paths = await loadIconIndex(d => FP.browse("public", d));
    if (!this.rendered) return;
    const draw = () => {
      const q = input.value.trim();
      let list;
      if (q) list = matchIcons(this.#paths, q);
      else {
        const seen = new Set();
        list = suggestTerms(this.#opts.name, this.#opts.damageType)
          .flatMap(t => matchIcons(this.#paths, t, 40)).filter(p => !seen.has(p) && seen.add(p));
        if (!list.length) list = this.#paths.slice(0, 200);
      }
      status.textContent = q ? `${list.length}${list.length === 200 ? "+" : ""} matches` : (list.length ? "Suggestions — type to search" : "");
      grid.innerHTML = list.map((p, i) => `<button type="button" class="ip-cell" data-path="${p}" data-idx="${i}" data-tooltip="${p.split("/").pop()}"><img src="${p}" loading="lazy" alt=""></button>`).join("");
      grid.querySelectorAll(".ip-cell").forEach(b => b.addEventListener("click", () => this.#choose(b.dataset.path)));
    };
    let t = null;
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(draw, 150); });
    el.addEventListener("keydown", e => this.#onKey(e, grid, input));
    el.querySelector(".ip-browse").addEventListener("click", () => {
      new FP({ type: "image", current: this.#opts.current, callback: p => this.#choose(p) }).render(true);
    });
    draw();
    input.focus();
  }

  #onKey(e, grid, input) {
    const cells = [...grid.querySelectorAll(".ip-cell")];
    if (!cells.length) return;
    const cur = cells.indexOf(document.activeElement);
    const cols = Math.max(1, Math.round(grid.clientWidth / (cells[0].offsetWidth || 56)));
    const move = d => { e.preventDefault(); cells[Math.max(0, Math.min(cells.length - 1, cur < 0 ? 0 : cur + d))].focus(); };
    if (e.key === "ArrowDown" && cur < 0 && document.activeElement === input) move(0);
    else if (cur >= 0 && e.key === "ArrowRight") move(1);
    else if (cur >= 0 && e.key === "ArrowLeft") move(-1);
    else if (cur >= 0 && e.key === "ArrowDown") move(cols);
    else if (cur >= 0 && e.key === "ArrowUp") { if (cur < cols) { e.preventDefault(); input.focus(); } else move(-cols); }
    else if (e.key === "Enter" && document.activeElement === input) { e.preventDefault(); cells[0].click(); }
  }

  #choose(path) {
    if (this.#picked) return;
    this.#picked = true;
    this.#resolve?.(path);
    this.close();
  }

  async close(options) {
    if (!this.#picked) { this.#picked = true; this.#resolve?.(null); }
    return super.close(options);
  }
}
```
Esc: ApplicationV2 closes on Esc natively → `close()` resolves `null`. Enter on a focused `.ip-cell` = native button click.

`templates/icon-picker.hbs`:
```hbs
<div class="ip-wrap">
  <div class="ip-bar">
    <input type="search" class="ip-search" placeholder="Search icons — e.g. fang, fire, sword" data-tooltip="All words must match the file path. ↓ to enter the grid, Enter picks.">
    <button type="button" class="ip-browse" data-tooltip="Open the standard file browser"><i class="fas fa-folder-open"></i> Browse files…</button>
  </div>
  <p class="ip-status"></p>
  <div class="ip-grid"></div>
</div>
```
CSS:
```css
/* ── Icon picker ─────────────────────────────────────────────────── */
.forge-icon-picker .ip-wrap { display: flex; flex-direction: column; height: 100%; gap: 6px; }
.forge-icon-picker .ip-bar { display: flex; gap: 6px; }
.forge-icon-picker .ip-search { flex: 1; height: 2rem; }
.forge-icon-picker .ip-status { margin: 0; font-size: 0.85em; color: var(--color-text-light-5); }
.forge-icon-picker .ip-grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap: 4px; align-content: start; }
.forge-icon-picker .ip-cell { width: 52px; height: 52px; padding: 2px; }
.forge-icon-picker .ip-cell img { width: 100%; height: 100%; object-fit: contain; border: none; }
.forge-icon-picker .ip-cell:focus { outline: 2px solid var(--color-border-highlight, #ff6400); }
```

- [ ] **Step 4: Wire builder** — `EffectCreatorApp.DEFAULT_OPTIONS.actions.pickIcon`:
```js
pickIcon: async function() {
  const s = this.#state;
  const dmg = (s.damageRows[0] ?? s.saveDamageRows[0])?.type ?? "";
  const path = await IconPickerApp.pick({ name: s.name, damageType: dmg, current: s.img });
  if (!path || !this.rendered) return;
  s.img = path;
  this.element.querySelector("[data-ef='img']").value = path;
  this.element.querySelector("#efImgPreview").src = path;
  this.#updateRawPreview(this.element);
}
```
(`#state` access inside `actions` works because Foundry binds `this` to the app.)

- [ ] **Step 5: Unit green** — `npm run unit` → PASS.

- [ ] **Step 6: Playwright** `tests/icon-picker.spec.js`:
```js
test("icon picker: suggestions, search, keyboard pick, cache", async ({ page }) => {
  /* boot preamble */
  await page.evaluate(async () => {
    const { EffectCreatorApp } = await import("./modules/forge-char-creator/scripts/effect-creator.js");
    const app = new EffectCreatorApp(); await app.render(true);
  });
  const b = page.locator(".forge-effect-creator");
  await b.locator("[data-ef='name']").fill("Venom Bite");
  await b.locator("[data-ef='name']").dispatchEvent("change");
  await b.locator("[data-action='pickIcon']").click();
  const p = page.locator("#forge-icon-picker");
  await expect(p.locator(".ip-cell").first()).toBeVisible({ timeout: 60000 });
  expect(await p.locator(".ip-cell").first().getAttribute("data-path")).toMatch(/bite|fang|venom/i);
  await p.locator(".ip-search").fill("flame");
  await page.waitForTimeout(400);
  const first = await p.locator(".ip-cell").first().getAttribute("data-path");
  expect(first).toMatch(/flame/i);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(p).toBeHidden();
  await expect(b.locator("[data-ef='img']")).toHaveValue(first);
  // Reopen: cached index → grid appears fast; Esc cancels without changing img.
  await b.locator("[data-action='pickIcon']").click();
  await expect(p.locator(".ip-cell").first()).toBeVisible({ timeout: 3000 });
  await page.keyboard.press("Escape");
  await expect(p).toBeHidden();
  await expect(b.locator("[data-ef='img']")).toHaveValue(first);
});
```
Run `npx playwright test tests/icon-picker.spec.js` → PASS. If indexing is slow (>20s), measure and report; consider persisting the index in `localStorage` keyed by `game.version` (wrap in try/catch) — only if measured slow.

- [ ] **Step 7: Commit** — `git add scripts/ui/icon-picker.js scripts/ui/icon-picker.test.mjs templates/icon-picker.hbs tests/icon-picker.spec.js && git commit -am "feat(ui): searchable icon picker with name-based suggestions"`

---

### Task 6: Char wizard integration + docs

**Files:**
- Modify: `scripts/app.js` (`#openEffectCreator`), `scripts/tests/index.js`, `TODO.md`, `README.md`

**Interfaces:**
- Consumes: builder `initialState` (`kind`, `isLocked`), `onComplete(savedItem)`.

- [ ] **Step 1: Failing T0** — extend `#testCharCreatorFeatureCreation`: after selecting kind, use `attack`, set `toHitFlat` "4", add a damage row "1d6" slashing, name "E2E Char Feature"; after `createItem` hook assert `item.system.activities.contents[0].type === "attack"` and `charApp.selectedItems.has(item.uuid)`. Then click `createNPC` with `charName` "E2E Wizard Actor"; wait up to 10s for `game.actors.getName("E2E Wizard Actor")`; assert it owns an item named "E2E Char Feature" with an attack activity whose `attack.bonus === "4"`; delete actor + pack item.

- [ ] **Step 2: Run** module suite → FAIL only if something is off (Tasks 3–4 should mostly satisfy it). Fix what fails.

- [ ] **Step 3: `#openEffectCreator`** — pass `{ kind: "attack", isLocked: true }` (drop `wrapInFeature`); window title "Create Feature for NPC". After `onComplete`, move focus back to `#itemSearchQuery` in the char wizard so keyboard flow continues.

- [ ] **Step 4: Full run** — `./test.sh` (all specs) + `npm run unit`. Compare against the recorded baseline; only pre-existing reds allowed. Paste the summary lines into the final report.

- [ ] **Step 5: Docs** — `TODO.md`: add a `FEATURE-BUILDER` done entry (date, what shipped, the `save.dc.calculation` fix, keyboard map, tests added, remaining reds). `README.md`: short "Feature Builder" section with the kinds and the keyboard map.

- [ ] **Step 6: Commit** — `git commit -am "feat(char-creator): builder opens as attack kind; docs"`

---

## Spec coverage check
- One builder / kinds → Tasks 2–3. To-hit flat default + derived → Task 2 (+UI Task 3). On-hit save chain → Tasks 2–3 (+T3 E2E). Uses/recharge → Task 2. Steps + keyboard (both apps) → Task 4. Tooltips → Tasks 3–4. Icon picker → Task 5. Storage compendium+actor → Task 6 (unchanged path, asserted). Pure payload + unit → Tasks 1–2. Keyboard map deviation (Alt+arrows instead of Ctrl+arrows) → Global Constraints; spec updated in the same commit as this plan.
