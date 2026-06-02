# Design — Macro-driven save→buff ability + T3-macro gate

Date: 2026-06-02
Status: approved (design); pending spec review

## Goal

Introduce **macro-driven abilities** to forge-content, battle-tested in real midi
combat with a deterministic gate. Vehicle: one reference ability — a target makes a
save; **on fail** the target takes damage AND every ally within 30 ft of the caster
gains temp HP. Tier 2 (locked): allies auto-buffed, no interactive pick.

This is the foundation for all future "if X then do Y to Z" content logic.

## Key finding (overturns a TODO assumption)

TODO assumed this needs the **Item Macro module** as a new dependency. It does not.
Installed midi-qol 13.0.63 `resolveItemMacro` (midi-qol.js:14282) resolves an
`ItemMacro` reference by reading `item.flags.dae.macro` (DAE — already a dep) or
`item.flags.itemacro.macro`, and executes it itself via
`new CONFIG.Macro.documentClass(macroData)` → `macro.command`. So:

- Macro JS lives **inline in the item JSON** (`flags.dae.macro.command`) → packs +
  commits as content-as-code. Pack tooling passes arbitrary flags through untouched.
- **Zero new modules.** No deps change, no test-world change, no user install change.

Macro scope at run time (midi-qol.js:26821, `executeMacroWithScope`):
`workflow` (the MidiQOL workflow), `actor`, `token` (caster token), `item`,
`args[0]` (workflow context, incl. `macroPass`). `workflow.failedSaves` is a `Set`
of the token **placeables** that failed the save (midi-qol.js:23868) — verified.

## The ability — "Example Rally"

Reference ability in the **Examples** folder (`folderexample001`), mirroring
Example Strike / Example Boon. Named for the mechanic, not campaign lore.

- Type `feat`. `_id`, activity `_id`, any effect `_id` = exactly 16 alphanumeric.
- One **save** activity: DEX save, DC 14, range 30 ft, target 1 creature.
  Damage: flat **10 force**, `damage.onSave: "none"` (damage only on a failed save).
- `system.description.value`: concise, plain — what it does, dice, that it rallies
  allies on a failed save. (Authoring rule: every ability needs this.)
- Fitting core icon.

### Macro

Item flags:
```jsonc
"flags": {
  "midi-qol": { "onUseMacroName": "[postActiveEffects]ItemMacro" },
  "dae": { "macro": { "name": "Example Rally", "type": "script", "command": "<JS>" } }
}
```

`<JS>` (runs at `postActiveEffects`, after the activity's own damage is applied):
```js
if (args?.[0]?.macroPass !== "postActiveEffects") return;
if (!workflow.failedSaves?.size) return;        // conditional: only on a failed save
const RADIUS = 30, TEMP = 5;
const me = token;
const allies = canvas.tokens.placeables.filter(t =>
  t.id !== me.id &&
  t.actor &&
  t.document.disposition === me.document.disposition &&
  canvas.grid.measurePath([me.center, t.center]).distance <= RADIUS
);
for (const ally of allies) {
  const cur = ally.actor.system.attributes.hp.temp ?? 0;
  await ally.actor.update({ "system.attributes.hp.temp": Math.max(cur, TEMP) });
}
```

Three NEW capabilities proven here:
1. **Conditional branch on save result** — `workflow.failedSaves.size` gates the buff.
2. **Cross-recipient apply** — damage hits the enemy target; temp HP goes to a
   *different* set (allies), which one activity cannot natively do.
3. **Macro stored as content-as-code** and fired by a real midi workflow.

### Temp-HP decision (and why not an effect)

Temp HP is applied by **direct `actor.update`**, not an ActiveEffect. Rationale: in
dnd5e temp HP is a stored resource, not a derived stat — an AE override locks it on
every data-prep and reverts it to 0 on expiry, and temp HP has no native duration
(it's consumed in play). Direct update is real-play-correct, deterministic, and
keeps the macro the only new variable. (Alternative — AE-granted temp HP with a
Times-Up duration — rejected for those quirks; revisit only if a durationed temp-HP
boon is ever actually wanted.)

## The gate — new `T3-macro` handler

New handler `macroCheck` in `forge-content/verify/checks.mjs`, registered in
`CHECKS['T3-macro']`. Follows the existing per-mechanic pattern (twin of
`grantCheck`). Self-contained (shipped to the browser via `page.evaluate`; browser
globals only). Reuses the proven boot pieces: fresh `Scene.create`, `actorLink`
tokens, `canvas.draw(scene)` + ready-poll, `MidiQOL.completeActivityUse` with
`targetUuids` + `ignoreUserTargets` + fast-forward, forced save via
`flags.midi-qol.fail.ability.save.all` / `success.ability.save.all`.

Topology: caster (disp 1) + N allies (disp 1, hp 100, temp 0) + enemy (disp −1, hp
100, ac flat 1). All placed within 30 ft of the caster (enemy too — ability range is
30 ft). Allies share the caster's disposition and the enemy is opposite, so the
macro's disposition filter naturally buffs the allies only.

Two scenarios, both asserted (positive + negative branch):
- `force:"fail"` → enemy HP delta `-10` AND every ally `tempHp == 5`.
- `force:"success"` → enemy HP delta `0` (onSave none) AND every ally `tempHp == 0`
  (macro correctly skips the buff). This negative proves the conditional.

`Example Rally.expect.json`:
```jsonc
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

Determinism by construction: forced save outcome, flat damage, flat temp HP, fixed
ally count + positions in range. No RNG, no Times-Up (no duration involved).

## Risks / things to verify during implementation

- **`canvas.grid.measurePath` API** — confirm name + return shape (`.distance`) in
  this Foundry/grid version before relying on it; fall back to a manual pixel→ft
  calc if absent.
- **Macro execution context** — runs as GM in the gate (fine); confirm `await` on
  the ally `update` completes before the snapshot read (add a settle wait, as
  elsewhere in checks.mjs).
- **`flags.dae.macro` read path** — verified in source; confirm at run time the
  macro actually fires (assert allyTempHp is the proof).
- **Version drift** — macro is a midi/DAE surface; re-test on any midi/dnd5e bump.
- **Security note (future)** — we author this macro, so trusted. For future
  image→statblock auto-gen: do NOT auto-run untrusted generated macro JS.

## Out of scope

Interactive ally pick (Tier 3) — rejected, fights the deterministic gate. Durationed
boons via macro. Multiple macro passes. Anything beyond the one reference ability +
the one new gate tier.
