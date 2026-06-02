# Grant Ally Attack-Advantage Buff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reference forge-content ability ("Example Boon") that grants one ally advantage on attack rolls until the end of the source actor's next turn, proven green by a new 3-actor T3 verify path.

**Architecture:** Plain JSON document + co-located `.expect.json` under `forge-content/src/packs/forge-abilities/`. A `utility` activity applies an embedded effect to an ally; the effect writes `flags.midi-qol.advantage.attack.all` and expires via DAE `specialDuration:["turnEndSource"]` + `duration.rounds:1`. Verification is a new self-contained browser handler `grantCheck` in `forge-content/verify/checks.mjs`, registered under tier `T3-grant`, that runs a real midi combat with caster + ally + dummy.

**Tech Stack:** dnd5e 5.2.0, midi-qol 13.0.63, DAE, Times-Up, Foundry V13, Playwright (`page.evaluate` ships handlers to the browser), `@foundryvtt/foundryvtt-cli` for packing.

**Refinements vs spec (2026-06-02-grant-attack-advantage-buff-design.md):**
- The ally's attack item is supplied via the existing `setup:[...]` mechanism (resolved by identifier in `content.spec.mjs:44-54` and passed as `setupDocs`), NOT a new `allyAttack` field — no runner changes needed.
- Added a `midAdvantage` assert: after the caster's *first* turn-end the buff must still be active (proves "until end of NEXT turn", not "this turn"); `expiredAdvantage` then confirms it is gone after the caster's *second* turn-end.

---

### Task 1: Author the ability document

**Files:**
- Create: `forge-content/src/packs/forge-abilities/example-boon.json`

- [ ] **Step 1: Write the JSON document**

Create `forge-content/src/packs/forge-abilities/example-boon.json` with exactly:

```json
{
  "name": "Example Boon",
  "img": "icons/magic/light/explosion-star-glow-yellow.webp",
  "type": "feat",
  "_id": "exampleboon00001",
  "system": {
    "description": {
      "value": "<p>As an action, point out an opening to one ally within 30 ft. That ally has <strong>advantage on attack rolls</strong> until the end of your next turn. Reference ability proving ally-targeted buff grants.</p>",
      "chat": ""
    },
    "activities": {
      "boongrant0000001": {
        "_id": "boongrant0000001",
        "type": "utility",
        "activation": { "type": "action", "value": 1 },
        "range": { "value": 30, "units": "ft" },
        "target": { "affects": { "type": "ally", "count": "1" } },
        "effects": [{ "_id": "exampleboonef001" }]
      }
    },
    "identifier": "example-boon",
    "source": { "revision": 1, "rules": "2024" },
    "properties": [],
    "requirements": "",
    "type": { "value": "", "subtype": "" }
  },
  "effects": [
    {
      "name": "Example Boon",
      "img": "icons/magic/light/explosion-star-glow-yellow.webp",
      "type": "base",
      "_id": "exampleboonef001",
      "transfer": false,
      "disabled": false,
      "duration": { "rounds": 1 },
      "changes": [
        { "key": "flags.midi-qol.advantage.attack.all", "mode": 5, "value": "1", "priority": 20 }
      ],
      "statuses": [],
      "flags": { "dae": { "specialDuration": ["turnEndSource"] } }
    }
  ],
  "flags": {},
  "folder": null
}
```

Notes on each non-obvious field:
- `_id` (`exampleboon00001`), activity key/`_id` (`boongrant0000001`), effect `_id` (`exampleboonef001`) are each exactly 16 alphanumeric chars — `scripts/pack-tools/keys.mjs` throws otherwise.
- Activity `type: "utility"` with `effects:[{_id}]` applies the embedded effect to the targeted ally. `target.affects.type: "ally"`.
- Effect `mode: 5` (OVERRIDE) sets the midi advantage flag to `1` on the recipient — same flag the harness already uses to produce `workflow.advantage`.
- `duration.rounds:1` + `flags.dae.specialDuration:["turnEndSource"]` = "until the end of the source's next turn".

- [ ] **Step 2: Verify the JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('forge-content/src/packs/forge-abilities/example-boon.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add forge-content/src/packs/forge-abilities/example-boon.json
git commit -m "feat(forge-content): Example Boon — grant ally attack advantage (doc)"
```

---

### Task 2: Author the functional-gate expectation

**Files:**
- Create: `forge-content/src/packs/forge-abilities/example-boon.expect.json`

- [ ] **Step 1: Write the expect.json**

Create `forge-content/src/packs/forge-abilities/example-boon.expect.json` with exactly:

```json
{
  "tier": "T3-grant",
  "setup": ["example-strike"],
  "defender": { "hp": 100, "ac": 5 },
  "assert": {
    "effectApplied": "Example Boon",
    "flagPresent": "flags.midi-qol.advantage.attack.all",
    "buffedAdvantage": true,
    "midAdvantage": true,
    "expiredAdvantage": false
  }
}
```

- `setup:["example-strike"]` resolves the existing Example Strike doc (identifier `example-strike`) and passes it as `setupDocs[0]` — `grantCheck` uses it as the ally's attack so the ally can roll an attack whose advantage state we read.
- `defender` here is the dummy the ally attacks; `ac:5` is irrelevant to the advantage read (the dummy is forced to be hit) but keeps the value explicit.
- Asserts: effect + flag land on the ally; advantage is true while buffed (`buffedAdvantage`), still true after the caster's first turn-end (`midAdvantage`), and false after the caster's second turn-end (`expiredAdvantage`).

- [ ] **Step 2: Verify the JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('forge-content/src/packs/forge-abilities/example-boon.expect.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add forge-content/src/packs/forge-abilities/example-boon.expect.json
git commit -m "feat(forge-content): Example Boon T3-grant expectation"
```

---

### Task 3: Add the `grantCheck` handler and register the `T3-grant` tier

**Files:**
- Modify: `forge-content/verify/checks.mjs` (insert handler before the `CHECKS` export at line ~196; add registry entry)

- [ ] **Step 1: Insert the `grantCheck` handler**

In `forge-content/verify/checks.mjs`, immediately BEFORE the `// tier -> in-browser handler.` comment / `export const CHECKS` block, paste this complete handler:

```js
// T3-grant: a buff ability that applies an effect to an ALLY which grants the
// ally advantage on attacks, expiring at the end of the source actor's next
// turn. Distinct from combatCheck because it needs three actors (caster, ally,
// dummy) and reads advantage off the ALLY's own attack workflow — once while
// buffed, once after the caster's first turn-end (must still be active), once
// after the caster's second turn-end (must be gone). Self-contained: shipped to
// the browser via page.evaluate, browser globals only.
//
// expectation: { setup:[<ally attack ability identifier>], defender?:{hp,ac},
//   assert:{ effectApplied?, flagPresent?, buffedAdvantage?, midAdvantage?, expiredAdvantage? } }
async function grantCheck({ doc, expectation, setupDocs = [] }) {
  if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  if (!setupDocs.length) return { ok: false, fails: ['grantCheck needs setup:[<ally attack ability>] in expect.json'] };
  const strip = (d) => { const c = JSON.parse(JSON.stringify(d)); delete c._id; delete c._key; for (const e of c.effects ?? []) delete e._key; return c; };
  const a = expectation.assert ?? {};
  const dcfg = expectation.defender ?? {};
  const hp = dcfg.hp ?? 100;
  const allyAttackDoc = setupDocs[0];

  let caster, ally, dummy, casterTok, allyTok, dummyTok, combat, scene;
  const fails = [];
  try {
    scene = await Scene.create({ name: 'T3 Grant Scene', width: 1000, height: 1000, grid: { size: 100 }, padding: 0 });
    caster = await Actor.create({ name: 'T3 Caster', type: 'npc', system: { attributes: { hp: { value: 100, max: 100 } } } });
    ally   = await Actor.create({ name: 'T3 Ally',   type: 'npc', system: { attributes: { hp: { value: 100, max: 100 } } } });
    dummy  = await Actor.create({ name: 'T3 Dummy',  type: 'npc', system: { attributes: { hp: { value: hp, max: hp }, ac: { calc: 'flat', flat: dcfg.ac ?? 5 } } } });
    // Force the ally's attacks to hit so each workflow resolves cleanly; we only read advantage.
    await dummy.update({ 'flags.midi-qol.grants.attack.success.all': 1 });

    casterTok = await TokenDocument.create({ actorId: caster.id, name: caster.name, actorLink: true, x: 100, y: 100, disposition: 1 }, { parent: scene });
    allyTok   = await TokenDocument.create({ actorId: ally.id,   name: ally.name,   actorLink: true, x: 200, y: 100, disposition: 1 }, { parent: scene });
    dummyTok  = await TokenDocument.create({ actorId: dummy.id,  name: dummy.name,  actorLink: true, x: 300, y: 100, disposition: -1 }, { parent: scene });

    combat = await Combat.create({ scene: scene.id, active: true });
    await combat.activate();
    // Initiative order: caster (30) -> ally (20) -> dummy (10).
    await combat.createEmbeddedDocuments('Combatant', [
      { tokenId: casterTok.id, actorId: caster.id, initiative: 30 },
      { tokenId: allyTok.id,   actorId: ally.id,   initiative: 20 },
      { tokenId: dummyTok.id,  actorId: dummy.id,  initiative: 10 },
    ]);
    await combat.startCombat();
    await canvas.draw(scene);
    for (let i = 0; i < 40 && (canvas.scene?.id !== scene.id || !canvas.ready); i++) await new Promise(r => setTimeout(r, 300));
    await new Promise(r => setTimeout(r, 800));

    // Use actor's freshly-created copy of an ability (first activity) against a token.
    const use = async (actor, docData, targetTok) => {
      const [item] = await actor.createEmbeddedDocuments('Item', [strip(docData)]);
      const activity = [...item.system.activities][0];
      const wf = await MidiQOL.completeActivityUse(activity.uuid, {
        midiOptions: { fastForward: true, fastForwardAttack: true, fastForwardDamage: true, autoRollDamage: 'always', targetUuids: [targetTok.uuid], ignoreUserTargets: true },
      });
      await new Promise(r => setTimeout(r, 2000));
      return wf;
    };

    // Advance combat turns until we reach the given combatant's turn in the given round.
    const advanceUntil = async (round, tokenId) => {
      for (let i = 0; i < 12; i++) {
        if (combat.round === round && combat.combatant?.tokenId === tokenId) return true;
        await combat.nextTurn();
        await new Promise(r => setTimeout(r, 1500));
      }
      return combat.round === round && combat.combatant?.tokenId === tokenId;
    };

    const startRound = combat.round;

    // 1) Caster (its turn) grants the buff to the ally.
    await use(caster, doc, allyTok);
    const effLive = [...ally.effects].map(e => e.name);
    if (a.effectApplied && !effLive.includes(a.effectApplied)) fails.push(`effect "${a.effectApplied}" not applied to ally`);
    if (a.flagPresent && !foundry.utils.getProperty({ flags: foundry.utils.deepClone(ally.flags ?? {}) }, a.flagPresent)) fails.push(`flag "${a.flagPresent}" not present on ally`);

    // 2) Buffed ally attacks — advantage should come from the granted effect.
    const wfBuffed = await use(ally, allyAttackDoc, dummyTok);
    const buffedAdv = !!wfBuffed?.advantage;
    if (a.buffedAdvantage !== undefined && buffedAdv !== a.buffedAdvantage) fails.push(`buffedAdvantage expected ${a.buffedAdvantage}, got ${buffedAdv}`);

    // 3) After the caster's FIRST turn-end (ally's turn, same round): buff must persist.
    await advanceUntil(startRound, allyTok.id);
    const wfMid = await use(ally, allyAttackDoc, dummyTok);
    const midAdv = !!wfMid?.advantage;
    if (a.midAdvantage !== undefined && midAdv !== a.midAdvantage) fails.push(`midAdvantage expected ${a.midAdvantage} (buff must survive caster's first turn-end), got ${midAdv}`);

    // 4) After the caster's SECOND turn-end (ally's turn, next round): buff must be gone.
    await advanceUntil(startRound + 1, allyTok.id);
    const effAfter = [...ally.effects].map(e => e.name);
    if (a.effectApplied && effAfter.includes(a.effectApplied)) fails.push(`effect "${a.effectApplied}" did not expire after caster's next turn`);
    const wfExpired = await use(ally, allyAttackDoc, dummyTok);
    const expiredAdv = !!wfExpired?.advantage;
    if (a.expiredAdvantage !== undefined && expiredAdv !== a.expiredAdvantage) fails.push(`expiredAdvantage expected ${a.expiredAdvantage}, got ${expiredAdv}`);

    return { ok: fails.length === 0, fails };
  } catch (err) {
    return { ok: false, fails: [err.message, ...fails] };
  } finally {
    try { game.user.targets.forEach(t => t.setTarget(false, { user: game.user, releaseOthers: false })); } catch {}
    if (combat) await combat.delete().catch(() => {});
    if (casterTok) await casterTok.delete().catch(() => {});
    if (allyTok) await allyTok.delete().catch(() => {});
    if (dummyTok) await dummyTok.delete().catch(() => {});
    if (caster) await caster.delete().catch(() => {});
    if (ally) await ally.delete().catch(() => {});
    if (dummy) await dummy.delete().catch(() => {});
    if (scene) await scene.delete().catch(() => {});
  }
}
```

- [ ] **Step 2: Register the tier**

Change the `CHECKS` export at the bottom of `forge-content/verify/checks.mjs` from:

```js
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
};
```

to:

```js
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
  'T3-grant': grantCheck,
};
```

- [ ] **Step 3: Syntax-check the module**

Run: `node --check forge-content/verify/checks.mjs`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add forge-content/verify/checks.mjs
git commit -m "feat(forge-content): T3-grant verify handler (3-actor buff/expiry)"
```

---

### Task 4: Build packs (id-length enforcement)

**Files:** none (build only)

- [ ] **Step 1: Build forge-content packs**

Run: `npm run packs:build forge-content`
Expected: completes without throwing. A 16-char id violation would throw in `scripts/pack-tools/keys.mjs` — if it does, fix the offending `_id` in `example-boon.json` and re-run.

---

### Task 5: Run the functional gate and confirm green

**Files:** none (verification only)

- [ ] **Step 1: Run the content gate**

Run: `npm run content:verify`
Expected (in the test output stream): `✓ [T3-grant] Example Boon`, and the overall Playwright test passes. The other abilities must stay green too.

- [ ] **Step 2: If `T3-grant` fails, debug per the failure message (do NOT loosen asserts)**

The failure string names the exact assertion. Likely causes + actions:
- `effect "Example Boon" not applied to ally` → the `utility` activity is not applying effects in the pinned versions. Apply the documented fallback: in `example-boon.json` change the activity `type` from `"utility"` to `"damage"` and add `"damage": { "parts": [{ "types": ["radiant"], "custom": { "enabled": true, "formula": "0" } }] }` (the proven squires-mark path). Re-run from Task 4.
- `midAdvantage expected true ... got false` → the effect expired at the caster's FIRST turn-end (encodes "this turn", not "next turn"). The `rounds:1` is being consumed too early; raise to `"rounds": 2` (keep `turnEndSource`) and re-run.
- `expiredAdvantage expected false ... got true` → the effect never expired in the test window. Confirm Times-Up is active in the test world (`game.modules.get('times-up')?.active`); if active, the `specialDuration` value is wrong — verify it is exactly `"turnEndSource"`. Re-run.
- `buffedAdvantage expected true ... got false` → the granted flag is not producing advantage; confirm the change `key` is exactly `flags.midi-qol.advantage.attack.all` and `mode` is `5`.

Apply one change at a time, re-run `npm run content:verify`, and only proceed when `✓ [T3-grant] Example Boon` appears.

- [ ] **Step 3: Commit any fix made in Step 2**

If you changed `example-boon.json` (or other source) to get green:

```bash
git add -A
git commit -m "fix(forge-content): Example Boon — green T3-grant (adjust per verify)"
```

---

### Task 6: Update TODO + finalize

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Add a checklist line to `TODO.md`**

Read `TODO.md`, then add under the appropriate "done"/content section a line recording the new reference ability, matching the file's existing bullet style, e.g.:

```markdown
- [x] Example Boon — ally attack-advantage buff (T3-grant; utility effect-grant + turnEndSource expiry)
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: TODO — Example Boon ally-advantage buff done"
```

---

## Definition of done

- `forge-content/src/packs/forge-abilities/example-boon.json` + `.expect.json` exist and parse.
- `npm run packs:build forge-content` succeeds (id lengths valid).
- `npm run content:verify` prints `✓ [T3-grant] Example Boon` and the whole suite passes (no regressions on existing abilities).
- `checks.mjs` exports `grantCheck` under `CHECKS['T3-grant']`.
- `TODO.md` updated.
