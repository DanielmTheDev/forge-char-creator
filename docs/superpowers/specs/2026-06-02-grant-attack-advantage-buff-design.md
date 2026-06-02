# Design — Grant Ally Attack-Advantage Buff (reference ability)

Date: 2026-06-02
Status: approved, pre-implementation

## Goal

Author a reference forge-content ability that **grants one ally advantage on
attack rolls until the end of the source actor's next turn**. Serves as the
canonical pattern for future "buff an ally" content and proves three net-new
mechanics in the pipeline:

1. A non-damage (`utility`) activity that applies an active effect to a
   **friendly** target.
2. An authored effect change that writes a midi advantage flag
   (`flags.midi-qol.advantage.attack.all`) — previously only ever test-forced.
3. The "until end of source's next turn" duration via DAE `specialDuration`.

Scope decision (locked): advantage applies to **attack rolls only**.

## What is reused (no new work)

- `feat` document shape, activities map, embedded effects array.
- The midi advantage flag key — the verify harness already sets it on an
  attacker to prove advantage resolves, so the key/path is known-good.
- `.expect.json` functional-gate convention, icon + concise-description rules.

## The ability document

File: `forge-content/src/packs/forge-abilities/example-boon.json`

- `type: "feat"`, `_id: "exampleboon00001"` (16 alphanumeric — enforced by
  `scripts/pack-tools/keys.mjs`).
- Name: **"Example Boon"** (parallels existing "Example Strike"). Rename freely;
  not load-bearing.
- `system.description.value`: concise, e.g. *"As an action, grant one ally
  advantage on attack rolls until the end of your next turn."*
- Icon: a fitting core icon, e.g.
  `icons/magic/light/explosion-star-glow-yellow.webp`.
- One activity, `type: "utility"`:
  - `activation: { type: "action", value: 1 }`
  - `range: { value: 30, units: "ft" }`
  - `target: { affects: { type: "ally", count: "1" } }`
  - `effects: [{ "_id": "<effect id>" }]`
- **Fallback** if midi will not apply effects off a `utility` activity in the
  pinned versions: switch to a `damage` activity with custom formula `"0"` (the
  proven squires-mark path). Decide at implementation time based on the verify
  result; do not pre-optimize.

## The effect

Embedded in the doc's `effects` array, id 16-alphanumeric (e.g.
`exampleboonef001`):

```jsonc
{
  "name": "Example Boon",
  "img": "icons/magic/light/explosion-star-glow-yellow.webp",
  "type": "base",
  "_id": "exampleboonef001",
  "transfer": false,
  "disabled": false,
  "duration": { "rounds": 1 },
  "flags": { "dae": { "specialDuration": ["turnEndSource"] } },
  "changes": [
    { "key": "flags.midi-qol.advantage.attack.all", "mode": 5, "value": "1", "priority": 20 }
  ],
  "statuses": []
}
```

- `duration.rounds: 1` **combined with** `specialDuration: ["turnEndSource"]` is
  the standard encoding of "until the end of your next turn": the effect
  survives the source actor's current turn-end and expires at the next one.
- `mode: 5` (OVERRIDE) sets the midi flag to `1`.
- Requires **DAE** (reads `specialDuration`) and **Times-Up** (performs the
  expiry). Both active in the test world per CLAUDE.md.

## Verify — new harness path

Gate rule: advantage = combat-active → **T3 mandatory**. The existing
`combatCheck` models one attacker + one defender with advantage forced by a
flag. A buff needs **three actors** (caster, ally, dummy) and must observe
advantage arriving from the *granted effect*, then expiring. This is net-new, so
it is a separate handler — `combatCheck` stays untouched to keep current green
tests safe.

File: `forge-content/verify/checks.mjs`

- Add handler `grantCheck({ doc, expectation, setupDocs })`.
- Register `CHECKS["T3-grant"] = grantCheck`.

Flow:

1. Create three actors: **caster** (gets the buff item embedded), **ally**
   (gets an attack item — reuse `example-strike`, named by
   `expect.allyAttack`), **dummy defender** (`expect.defender.hp/ac`). Place
   tokens; start combat with caster + ally as combatants, ordered so the caster
   acts, then the ally.
2. Caster uses the buff item targeting the ally → the effect lands on the ally.
   Assert: effect present on ally (`expect.assert.effectApplied`) and the flag
   present (`expect.assert.flagPresent`).
3. Ally uses its attack against the dummy, forcing a hit (we only read the
   advantage state, not the hit math) → assert `workflow.advantage === true`
   (`expect.assert.buffedAdvantage`).
4. Advance combat past the **caster's next turn-end** so `turnEndSource` fires
   (advance turns until the caster's second turn-end elapses). The new
   turn-advance logic is the riskiest piece — Times-Up timing.
5. Ally attacks the dummy again → assert `workflow.advantage === false`
   (`expect.assert.expiredAdvantage`) and the effect is gone from the ally.

`expect.json`
(`forge-content/src/packs/forge-abilities/example-boon.expect.json`):

```jsonc
{
  "tier": "T3-grant",
  "allyAttack": "example-strike",
  "defender": { "hp": 100, "ac": 5 },
  "assert": {
    "effectApplied": "Example Boon",
    "flagPresent": "flags.midi-qol.advantage.attack.all",
    "buffedAdvantage": true,
    "expiredAdvantage": false
  }
}
```

## Files touched

- NEW `forge-content/src/packs/forge-abilities/example-boon.json`
- NEW `forge-content/src/packs/forge-abilities/example-boon.expect.json`
- EDIT `forge-content/verify/checks.mjs` (add `grantCheck`, register tier).

## Risks (surfaced, not hidden)

- `utility`-activity effect application unproven in pinned versions → documented
  `damage`-formula-0 fallback.
- `turnEndSource` is the one version-drift / async-flake spot; step 4
  turn-advance is new harness code with the highest flake risk.
- Three-actor combat + an ally attack item is the bulk of the net-new harness
  code; expect iteration against real Foundry.

## Verification

`npm run content:verify` must report the new `example-boon` check green
(T3-grant: buffed-advantage true, expired-advantage false) before any push.
`npm run packs:build` must succeed (16-char id enforcement).
