// Per-tier functional checks. Each function is shipped to the Foundry browser
// context via page.evaluate, so it MUST be self-contained (only browser globals
// like Actor / foundry / game — no module-scope references, no outer helpers).
// Returns { ok, fails: string[] }. Add a tier => register a handler in CHECKS.
//
// SHARED SCAFFOLDING: the T3 combat handlers below duplicated ~60% setup/teardown.
// Module-scope helpers can't be shared (page.evaluate ships only the one handler
// fn), but a browser GLOBAL can — installGateHelpers() runs once after boot and
// puts the shared pieces on globalThis.__fcGate, which every handler reads like
// any other browser global (game/canvas/MidiQOL). content.spec calls it once
// before the handler loop. Keep helpers self-contained (browser globals only).

// Install the shared T3 scaffolding onto globalThis.__fcGate. Shipped to the
// browser once via page.evaluate (browser globals only — no module refs).
export function installGateHelpers() {
  // Clone a doc for embedding: drop _id/_key so Foundry mints fresh ones; keep
  // effect _ids (activity refs depend on them).
  const strip = (d) => { const c = JSON.parse(JSON.stringify(d)); delete c._id; delete c._key; for (const e of c.effects ?? []) delete e._key; return c; };
  // Fresh 1000x1000 scene, 100px/5ft grid. (The dev world's own scene has a broken
  // actor that aborts canvas.draw, so every handler builds its own.) Flagged
  // forge-content.test so isolate() sweeps it even if a finally-cleanup is skipped.
  const makeScene = (name) => Scene.create({ name, width: 1000, height: 1000, grid: { size: 100 }, padding: 0, flags: { 'forge-content': { test: true } } });
  // Linked npc actor. ac omitted => no flat AC; temp omitted => no temp-HP key.
  // Flagged forge-content.test so isolate() can sweep orphans the same way.
  const makeActor = (name, { hp = 100, ac, temp } = {}) => {
    const attributes = { hp: { value: hp, max: hp, ...(temp !== undefined ? { temp } : {}) } };
    if (ac !== undefined) attributes.ac = { calc: 'flat', flat: ac };
    return Actor.create({ name, type: 'npc', system: { attributes }, flags: { 'forge-content': { test: true } } });
  };
  // actorLink:true so the token uses the base actor (unlinked npc tokens spawn a
  // synthetic token-actor midi would mutate instead of the doc we read).
  const makeToken = (actor, scene, { x, y, disposition }) =>
    TokenDocument.create({ actorId: actor.id, name: actor.name, actorLink: true, x, y, disposition }, { parent: scene });
  // Active test combat (flagged forge-content.test so isolate() can purge it) +
  // its combatants, started. combatants: [{ tokenId, actorId, initiative }, ...].
  const makeCombat = async (scene, combatants) => {
    const combat = await Combat.create({ scene: scene.id, active: true, flags: { 'forge-content': { test: true } } });
    await combat.activate();
    await combat.createEmbeddedDocuments('Combatant', combatants);
    await combat.startCombat();
    return combat;
  };
  // Switch + render the canvas to a scene and wait for it to be ready (token
  // placeables exist + targeting populates). view()/activate() didn't switch it.
  const drawAndWait = async (scene) => {
    await canvas.draw(scene);
    for (let i = 0; i < 40 && (canvas.scene?.id !== scene.id || !canvas.ready); i++) await new Promise(r => setTimeout(r, 300));
    await new Promise(r => setTimeout(r, 800));
  };
  // Target a single token (with the manual-add fallback when setTarget didn't take).
  const targetToken = (tokDoc) => {
    const p = canvas.tokens?.get(tokDoc.id) ?? tokDoc.object;
    if (p) { p.setTarget(true, { user: game.user, releaseOthers: true }); if (!game.user.targets.size) { game.user.targets.add(p); p.isTargeted = true; } }
    return p;
  };
  const clearTargets = () => { try { game.user.targets.forEach(t => t.setTarget(false, { user: game.user, releaseOthers: false })); } catch {} };
  // Create the ability on `actor`, run its first activity through a real midi
  // workflow against targetUuids (NOT targetsToUse — midi's is broken), fully
  // fast-forwarded. opts.settle ms wait after (damage/macros/AE transfer). opts.midiOptions
  // merges into the midi call. Returns the workflow (null if midi didn't resolve).
  const useActivity = async (actor, docData, targetUuids, opts = {}) => {
    const [item] = await actor.createEmbeddedDocuments('Item', [strip(docData)]);
    const activity = [...item.system.activities][0];
    const wf = await MidiQOL.completeActivityUse(activity.uuid, {
      midiOptions: { fastForward: true, fastForwardAttack: true, fastForwardDamage: true, autoRollDamage: 'always', targetUuids, ignoreUserTargets: true, ...(opts.midiOptions ?? {}) },
    });
    if (opts.settle) await new Promise(r => setTimeout(r, opts.settle));
    return wf;
  };
  // Delete a list of docs (any order the caller passes; nulls skipped). Use in finally.
  const cleanup = async (docs) => { for (const d of docs) if (d) await d.delete().catch(() => {}); };
  globalThis.__fcGate = { strip, makeScene, makeActor, makeToken, makeCombat, drawAndWait, targetToken, clearTargets, useActivity, cleanup };
}

// T2: instantiate the item on a throwaway actor and assert static/applied effects.
// expectation.assert: { acDelta?, abilityDelta?{ability,delta}, effectApplied? }
async function applyCheck({ doc, expectation }) {
  const data = JSON.parse(JSON.stringify(doc));
  delete data._id; delete data._key;
  for (const e of data.effects ?? []) { delete e._key; } // keep _id (activity refs)

  const get = (obj, path) => foundry.utils.getProperty(obj, path);
  const a = expectation.assert ?? {};
  let actor;
  try {
    actor = await Actor.create({ name: 'Verify Dummy', type: expectation.actor?.type ?? 'npc' });
    const abil = a.abilityDelta?.ability;
    const before = { ac: get(actor, 'system.attributes.ac.value'), ability: abil ? get(actor, `system.abilities.${abil}.value`) : null };
    const [it] = await actor.createEmbeddedDocuments('Item', [data]);
    await new Promise(res => setTimeout(res, 400)); // AE transfer + derive
    const after = { ac: get(actor, 'system.attributes.ac.value'), ability: abil ? get(actor, `system.abilities.${abil}.value`) : null };

    const fails = [];
    if (!it?.id) fails.push('Item.create returned no document (T1 load failed)');
    if (a.acDelta !== undefined && (after.ac - before.ac) !== a.acDelta)
      fails.push(`acDelta expected ${a.acDelta}, got ${after.ac - before.ac}`);
    if (a.abilityDelta && (after.ability - before.ability) !== a.abilityDelta.delta)
      fails.push(`${abil} delta expected ${a.abilityDelta.delta}, got ${after.ability - before.ability}`);
    if (a.effectApplied && !actor.appliedEffects?.some(e => e.name === a.effectApplied))
      fails.push(`effect "${a.effectApplied}" not applied to actor`);
    return { ok: fails.length === 0, fails };
  } catch (err) {
    return { ok: false, fails: [err.message] };
  } finally {
    if (actor) await actor.delete().catch(() => {});
  }
}

// T3: run the ability in a real combat via MidiQOL and assert outcomes.
// Determinism by construction (flat damage / rigged AC/HP / fixed-round DoTs /
// forced save outcomes). Architecture: runScenario() produces a raw snapshot;
// assertResult() is the single place that judges any assert key; combatCheck
// normalizes every expectation shape into a uniform scenario list.
//
// expectation (one of):
//   { assert, defender?, advanceTurns?, negative?:{hpDeltaMin?} }  // main (+ optional combo setup + negative re-run)
//   { saveScenarios:[{force:'fail'|'success', assert}], defender? }  // one run per forced save outcome
//   { attackScenarios:[{force:'hit'|'miss', advantage?, disadvantage?, grantAdvantage?, grantDisadvantage?, assert}], defender? }
//     // one run per forced to-hit outcome. advantage/disadvantage = on the ATTACKER;
//     // grantAdvantage/grantDisadvantage = on the DEFENDER (attacks AGAINST it get adv/disadv).
//     // keep force:'hit' alongside an adv/disadv flag so the HP delta stays deterministic.
// assert keys (all optional): defenderHpDelta, hpDeltaMin, hpDeltaMax,
//   conditionApplied, effectApplied, flagPresent, ticks, attackHit, attackCrit, attackAdvantage, attackDisadvantage.
// setupDocs: abilities used on the defender BEFORE the main one (combo setup).
async function combatCheck({ doc, expectation, setupDocs = [] }) {
  if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  const { makeScene, makeActor, makeToken, makeCombat, drawAndWait, targetToken, clearTargets, useActivity, cleanup } = globalThis.__fcGate;
  const a = expectation.assert ?? {};
  const dcfg = expectation.defender ?? {};
  const hp = dcfg.hp ?? 100;

  // One full combat scenario (fresh scene/actors), cleans up after itself.
  // Returns { delta, conditionApplied, effectApplied, flagPresent } or { error }.
  const runScenario = async (withSetup, opts = {}) => {
    let attacker, defender, atkTok, defTok, combat, scene;
    try {
      scene = await makeScene('T3 Verify Scene');
      attacker = await makeActor('T3 Attacker');
      defender = await makeActor('T3 Defender', { hp, ac: dcfg.ac ?? 1 });
      // Deterministically force the defender's save outcome via midi flags.
      if (opts.forceSave === 'fail') await defender.update({ 'flags.midi-qol.fail.ability.save.all': 1 });
      if (opts.forceSave === 'success') await defender.update({ 'flags.midi-qol.success.ability.save.all': 1 });
      // Deterministically force the attack to-hit outcome via midi grants flags.
      if (opts.forceAttack === 'hit') await defender.update({ 'flags.midi-qol.grants.attack.success.all': 1 });
      if (opts.forceAttack === 'miss') await defender.update({ 'flags.midi-qol.grants.attack.fail.all': 1 });
      // Adv/disadv on the ATTACKER's own roll.
      if (opts.advantage) await attacker.update({ 'flags.midi-qol.advantage.attack.all': 1 });
      if (opts.disadvantage) await attacker.update({ 'flags.midi-qol.disadvantage.attack.all': 1 });
      // Grants: attacks AGAINST the defender get adv/disadv (flags live on the defender).
      if (opts.grantAdvantage) await defender.update({ 'flags.midi-qol.grants.advantage.attack.all': 1 });
      if (opts.grantDisadvantage) await defender.update({ 'flags.midi-qol.grants.disadvantage.attack.all': 1 });
      atkTok = await makeToken(attacker, scene, { x: 100, y: 100, disposition: 1 });
      defTok = await makeToken(defender, scene, { x: 200, y: 100, disposition: -1 });
      combat = await makeCombat(scene, [
        { tokenId: atkTok.id, actorId: attacker.id, initiative: 20 },
        { tokenId: defTok.id, actorId: defender.id, initiative: 10 },
      ]);
      await drawAndWait(scene);
      targetToken(defTok);

      const use = (docData) => useActivity(attacker, docData, [defTok.uuid], { settle: 2000 });
      if (withSetup) for (const s of setupDocs) await use(s); // combo setup (e.g. Derek marks)
      const hpBefore = defender.system.attributes.hp.value;
      const wf = await use(doc);
      if (!wf) return { error: 'midi workflow did not run (no target / activity not resolved)' };
      // Advance turns; count turns that actually dealt damage (DoT ticks). NO
      // expiry help — the ability must self-bound (via Times-Up native duration),
      // exactly as in real play.
      let ticks = 0;
      for (let t = 0; t < (expectation.advanceTurns ?? 0); t++) {
        const b = defender.system.attributes.hp.value;
        await combat.nextTurn();
        await new Promise(r => setTimeout(r, 2000));
        if (defender.system.attributes.hp.value < b) ticks++;
      }

      // Raw, un-judged snapshot — assertResult() interprets it. Captured before
      // cleanup since the actor is deleted in finally.
      return {
        delta: defender.system.attributes.hp.value - hpBefore,
        ticks,
        statuses: [...defender.effects].flatMap(e => [...(e.statuses ?? [])]),
        effectNames: [...defender.effects].map(e => e.name),
        flags: foundry.utils.deepClone(defender.flags ?? {}),
        attack: { total: wf.attackRoll?.total ?? null, crit: !!wf.isCritical, fumble: !!wf.isFumble, advantage: !!wf.advantage, disadvantage: !!wf.disadvantage, hit: (wf.hitTargets?.size ?? 0) > 0 },
      };
    } catch (err) {
      return { error: err.message };
    } finally {
      clearTargets();
      await cleanup([combat, atkTok, defTok, attacker, defender, scene]);
    }
  };

  // Single uniform assert layer: maps an assert spec against a scenario snapshot.
  // Every scenario (main / save / negative / future attack) routes through this.
  const assertResult = (spec, r) => {
    const f = [];
    if (spec.defenderHpDelta !== undefined && r.delta !== spec.defenderHpDelta) f.push(`hpDelta expected ${spec.defenderHpDelta}, got ${r.delta}`);
    if (spec.hpDeltaMin !== undefined && r.delta < spec.hpDeltaMin) f.push(`hpDelta ${r.delta} below min ${spec.hpDeltaMin}`);
    if (spec.hpDeltaMax !== undefined && r.delta > spec.hpDeltaMax) f.push(`hpDelta ${r.delta} above max ${spec.hpDeltaMax}`);
    if (spec.conditionApplied && !r.statuses.includes(spec.conditionApplied)) f.push(`condition "${spec.conditionApplied}" not applied`);
    if (spec.effectApplied && !r.effectNames.includes(spec.effectApplied)) f.push(`effect "${spec.effectApplied}" not applied`);
    if (spec.flagPresent && !foundry.utils.getProperty({ flags: r.flags }, spec.flagPresent)) f.push(`flag "${spec.flagPresent}" not present`);
    if (spec.ticks !== undefined && r.ticks !== spec.ticks) f.push(`expected ${spec.ticks} DoT ticks, got ${r.ticks}`);
    if (spec.attackHit !== undefined && r.attack.hit !== spec.attackHit) f.push(`attackHit expected ${spec.attackHit}, got ${r.attack.hit}`);
    if (spec.attackCrit !== undefined && r.attack.crit !== spec.attackCrit) f.push(`attackCrit expected ${spec.attackCrit}, got ${r.attack.crit}`);
    if (spec.attackAdvantage !== undefined && r.attack.advantage !== spec.attackAdvantage) f.push(`attackAdvantage expected ${spec.attackAdvantage}, got ${r.attack.advantage}`);
    if (spec.attackDisadvantage !== undefined && r.attack.disadvantage !== spec.attackDisadvantage) f.push(`attackDisadvantage expected ${spec.attackDisadvantage}, got ${r.attack.disadvantage}`);
    return f;
  };

  // Normalize all expectation shapes into one list of {label, opts, assert}.
  const scenarios = [];
  if (expectation.saveScenarios) {
    for (const s of expectation.saveScenarios) scenarios.push({ label: `save[${s.force}]`, opts: { withSetup: false, forceSave: s.force }, assert: s.assert ?? {} });
  } else if (expectation.attackScenarios) {
    for (const s of expectation.attackScenarios) scenarios.push({ label: `attack[${s.force}${s.advantage ? '+adv' : ''}${s.disadvantage ? '+dis' : ''}${s.grantAdvantage ? '+grantAdv' : ''}${s.grantDisadvantage ? '+grantDis' : ''}]`, opts: { withSetup: false, forceAttack: s.force, advantage: s.advantage, disadvantage: s.disadvantage, grantAdvantage: s.grantAdvantage, grantDisadvantage: s.grantDisadvantage }, assert: s.assert ?? {} });
  } else {
    scenarios.push({ label: 'main', opts: { withSetup: true }, assert: a });
    if (expectation.negative) scenarios.push({ label: 'negative', opts: { withSetup: false }, assert: { hpDeltaMin: expectation.negative.hpDeltaMin ?? 0 } });
  }

  const fails = [];
  for (const sc of scenarios) {
    const r = await runScenario(sc.opts.withSetup, sc.opts);
    if (r.error) { fails.push(`${sc.label}: ${r.error}`); continue; }
    for (const msg of assertResult(sc.assert, r)) fails.push(`${sc.label}: ${msg}`);
  }
  return { ok: fails.length === 0, fails };
}

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
  const { makeScene, makeActor, makeToken, makeCombat, drawAndWait, clearTargets, useActivity, cleanup } = globalThis.__fcGate;
  const a = expectation.assert ?? {};
  const dcfg = expectation.defender ?? {};
  const hp = dcfg.hp ?? 100;
  const allyAttackDoc = setupDocs[0];

  let caster, ally, dummy, casterTok, allyTok, dummyTok, combat, scene;
  const fails = [];
  try {
    scene = await makeScene('T3 Grant Scene');
    caster = await makeActor('T3 Caster');
    ally   = await makeActor('T3 Ally');
    dummy  = await makeActor('T3 Dummy', { hp, ac: dcfg.ac ?? 5 });
    // Force the ally's attacks to hit so each workflow resolves cleanly; we only read advantage.
    await dummy.update({ 'flags.midi-qol.grants.attack.success.all': 1 });

    casterTok = await makeToken(caster, scene, { x: 100, y: 100, disposition: 1 });
    allyTok   = await makeToken(ally,   scene, { x: 200, y: 100, disposition: 1 });
    dummyTok  = await makeToken(dummy,  scene, { x: 300, y: 100, disposition: -1 });

    // Initiative order: caster (30) -> ally (20) -> dummy (10).
    combat = await makeCombat(scene, [
      { tokenId: casterTok.id, actorId: caster.id, initiative: 30 },
      { tokenId: allyTok.id,   actorId: ally.id,   initiative: 20 },
      { tokenId: dummyTok.id,  actorId: dummy.id,  initiative: 10 },
    ]);
    await drawAndWait(scene);

    // Use actor's freshly-created copy of an ability (first activity) against a token.
    const use = async (actor, docData, targetTok) => {
      const wf = await useActivity(actor, docData, [targetTok.uuid], { settle: 2000 });
      if (!wf) throw new Error('midi workflow returned null (no target / activity not resolved)');
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
    if (!await advanceUntil(startRound, allyTok.id)) { fails.push('advanceUntil(mid) timed out — never reached ally turn in round 1'); return { ok: false, fails }; }
    const wfMid = await use(ally, allyAttackDoc, dummyTok);
    const midAdv = !!wfMid?.advantage;
    if (a.midAdvantage !== undefined && midAdv !== a.midAdvantage) fails.push(`midAdvantage expected ${a.midAdvantage} (buff must survive caster's first turn-end), got ${midAdv}`);

    // 4) After the caster's SECOND turn-end (ally's turn, next round): buff must be gone.
    if (!await advanceUntil(startRound + 1, allyTok.id)) { fails.push('advanceUntil(expired) timed out — never reached ally turn in round 2'); return { ok: false, fails }; }
    const effAfter = [...ally.effects].map(e => e.name);
    if (a.effectApplied && effAfter.includes(a.effectApplied)) fails.push(`effect "${a.effectApplied}" did not expire after caster's next turn`);
    const wfExpired = await use(ally, allyAttackDoc, dummyTok);
    const expiredAdv = !!wfExpired?.advantage;
    if (a.expiredAdvantage !== undefined && expiredAdv !== a.expiredAdvantage) fails.push(`expiredAdvantage expected ${a.expiredAdvantage}, got ${expiredAdv}`);

    return { ok: fails.length === 0, fails };
  } catch (err) {
    return { ok: false, fails: [err.message, ...fails] };
  } finally {
    clearTargets();
    await cleanup([combat, casterTok, allyTok, dummyTok, caster, ally, dummy, scene]);
  }
}

// T3-macro: an onUse-macro ability — target makes a save; on FAIL the target takes
// damage AND every ally within `radius` ft of the caster gains temp HP (applied by
// the item's inline macro, not a native activity). Proves conditional + cross-
// recipient macro logic. Self-contained: shipped to the browser via page.evaluate.
//
// NOTE: the macro's own RADIUS/TEMP are hardcoded inside its inline command (the
// macro is shipped on the item, not parameterized from here), so assert.allyTempHp
// must mirror the macro's TEMP. Only `allies` (count) is read from expectation.
//
// `outOfRangeAllies` places that many same-disposition allies OUTSIDE the macro's
// RADIUS (30 ft); they must ALWAYS keep tempHp 0 — this is what actually exercises
// the macro's distance filter (without one, an unfiltered "buff every ally" macro
// would still pass). Caster sits at (100,100); in-range allies at (100,200+i*100)
// (5-10 ft away); out-of-range allies at (800,100+i*100) (35 ft away, >RADIUS).
//
// expectation: { defender?:{hp,ac}, allies?:int, outOfRangeAllies?:int,
//   scenarios:[{ force:'fail'|'success', assert:{ defenderHpDelta?, allyTempHp? } }] }
async function macroCheck({ doc, expectation }) {
  if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  const { makeScene, makeActor, makeToken, makeCombat, drawAndWait, targetToken, clearTargets, useActivity, cleanup } = globalThis.__fcGate;
  const dcfg = expectation.defender ?? {};
  const hp = dcfg.hp ?? 100;
  const allyCount = expectation.allies ?? 2;
  const outCount = expectation.outOfRangeAllies ?? 0;
  const scenarios = expectation.scenarios ?? [];

  const runScenario = async (force, assert) => {
    let caster, defender, casterTok, defTok, combat, scene;
    const allies = [], allyToks = [], outAllies = [], outToks = [];
    try {
      scene = await makeScene('T3 Macro Scene');
      caster = await makeActor('T3 Caster');
      defender = await makeActor('T3 Defender', { hp, ac: dcfg.ac ?? 1 });
      // Force the defender's save outcome deterministically.
      if (force === 'fail') await defender.update({ 'flags.midi-qol.fail.ability.save.all': 1 });
      if (force === 'success') await defender.update({ 'flags.midi-qol.success.ability.save.all': 1 });
      casterTok = await makeToken(caster, scene, { x: 100, y: 100, disposition: 1 });
      defTok = await makeToken(defender, scene, { x: 200, y: 100, disposition: -1 });
      for (let i = 0; i < allyCount; i++) {
        // Allies share the caster's disposition (1) and sit within 30 ft (<= 2 squares).
        const al = await makeActor(`T3 Ally ${i}`, { temp: 0 });
        const at = await makeToken(al, scene, { x: 100, y: 200 + i * 100, disposition: 1 });
        allies.push(al); allyToks.push(at);
      }
      for (let i = 0; i < outCount; i++) {
        // Same disposition but ~35 ft from caster (x=800) => outside RADIUS=30.
        const al = await makeActor(`T3 OutAlly ${i}`, { temp: 0 });
        const at = await makeToken(al, scene, { x: 800, y: 100 + i * 100, disposition: 1 });
        outAllies.push(al); outToks.push(at);
      }
      combat = await makeCombat(scene, [
        { tokenId: casterTok.id, actorId: caster.id, initiative: 30 },
        { tokenId: defTok.id, actorId: defender.id, initiative: 10 },
        ...allyToks.map((t, i) => ({ tokenId: t.id, actorId: allies[i].id, initiative: 20 - i })),
        ...outToks.map((t, i) => ({ tokenId: t.id, actorId: outAllies[i].id, initiative: 5 - i })),
      ]);
      await drawAndWait(scene);
      targetToken(defTok);

      const hpBefore = defender.system.attributes.hp.value;
      // settle 2500: damage + macro + ally updates need longer than a plain hit.
      const wf = await useActivity(caster, doc, [defTok.uuid], { settle: 2500 });
      if (!wf) return ['midi workflow did not run (no target / activity not resolved)'];

      const f = [];
      const delta = defender.system.attributes.hp.value - hpBefore;
      if (assert.defenderHpDelta !== undefined && delta !== assert.defenderHpDelta) f.push(`defenderHpDelta expected ${assert.defenderHpDelta}, got ${delta}`);
      if (assert.allyTempHp !== undefined) {
        for (const al of allies) {
          const t = al.system.attributes.hp.temp ?? 0;
          if (t !== assert.allyTempHp) f.push(`${al.name} tempHp expected ${assert.allyTempHp}, got ${t}`);
        }
      }
      // Out-of-range allies must NEVER get temp HP — proves the RADIUS filter works.
      for (const al of outAllies) {
        const t = al.system.attributes.hp.temp ?? 0;
        if (t !== 0) f.push(`${al.name} (out of range) tempHp expected 0, got ${t}`);
      }
      return f;
    } catch (err) {
      return [err.message];
    } finally {
      clearTargets();
      await cleanup([combat, ...allyToks, ...outToks, casterTok, defTok, ...allies, ...outAllies, caster, defender, scene]);
    }
  };

  const fails = [];
  for (const sc of scenarios) {
    const r = await runScenario(sc.force, sc.assert ?? {});
    for (const msg of r) fails.push(`scenario[${sc.force}]: ${msg}`);
  }
  return { ok: fails.length === 0, fails };
}

// T3-aoe: a save-each multi-target ability — ONE cast hits N defenders, each rolling
// its own save, taking per-target damage (half on save). Proves multi-target
// independence: forced mix of fail/success across targets yields different per-target
// HP deltas. Self-contained (shipped to the browser via page.evaluate).
//
// Targeting = explicit targetUuids[N] on a NO-TEMPLATE ability (affects.count, no
// target.template). This deliberately avoids midi's area-template path: (1) a RANGED
// template can't run headless — it needs the interactive "Place Template" click and
// aborts otherwise (workflowOptions.templateUuid can't fix it — the Workflow ctor resets
// templateUuids=[] after the setter, midi-qol.js ~24287); (2) a self-emanation DOES
// auto-place headless but leaks template/targeting state into the NEXT handler's combat
// (broke Example Boon's round-based buff). No-template + targetUuids is structurally
// identical to the proven combatCheck/macroCheck handlers, which sequence cleanly.
//
// expectation: { targets:[{ hp, ac, force:'fail'|'success',
//   assert:{ defenderHpDelta?, conditionApplied?, effectApplied? } }] }
async function aoeCheck({ doc, expectation }) {
  if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  const { makeScene, makeActor, makeToken, makeCombat, drawAndWait, clearTargets, useActivity, cleanup } = globalThis.__fcGate;
  const targetCfgs = expectation.targets ?? [];
  const N = targetCfgs.length;

  let caster, casterTok, combat, scene;
  const defenders = [], defToks = [];
  const fails = [];
  try {
    scene = await makeScene('T3 AoE Scene');
    caster = await makeActor('T3 Caster');
    casterTok = await makeToken(caster, scene, { x: 300, y: 300, disposition: 1 });

    // N defenders in a row near the caster, all within the ability's 30ft range (=600px
    // at 100px/5ft) of the caster's center (350,350). Fixed positions => deterministic.
    for (let i = 0; i < N; i++) {
      const cfg = targetCfgs[i];
      const def = await makeActor(`T3 Def ${i}`, { hp: cfg.hp ?? 100, ac: cfg.ac ?? 1 });
      // Per-defender forced save outcome — this is what proves independence.
      if (cfg.force === 'fail') await def.update({ 'flags.midi-qol.fail.ability.save.all': 1 });
      if (cfg.force === 'success') await def.update({ 'flags.midi-qol.success.ability.save.all': 1 });
      const tok = await makeToken(def, scene, { x: 150 + i * 150, y: 150, disposition: -1 });
      defenders.push(def); defToks.push(tok);
    }

    combat = await makeCombat(scene, [
      { tokenId: casterTok.id, actorId: caster.id, initiative: 30 },
      ...defToks.map((t, i) => ({ tokenId: t.id, actorId: defenders[i].id, initiative: 20 - i })),
    ]);
    await drawAndWait(scene);

    // --- Targeting: explicit targetUuids for all N defenders (NOT targetsToUse — midi's
    // is broken). ignoreUserTargets:true so midi uses exactly these N, no template. Clear
    // any stray targets first. Same path as combatCheck/macroCheck, generalized to N.
    clearTargets();

    // --- ONE cast against all N explicit targets. settle:0 so we can read wf.targets
    // for the hard invariant BEFORE the post-cast settle (done manually below). ---
    const hpBefore = defenders.map(d => d.system.attributes.hp.value);
    const wf = await useActivity(caster, doc, defToks.map(t => t.uuid), { settle: 0 });
    if (!wf) return { ok: false, fails: ['midi workflow did not run (no targets / activity not resolved)'] };
    const targeted = wf.targets?.size ?? 0;
    console.log(`[T3-aoe] midi targeted ${targeted} tokens (expected ${N})`);
    // Hard invariant: midi must have hit exactly N. Without this, a target that asserts
    // ONLY conditionApplied/effectApplied (no negative HP delta) could false-pass when
    // midi short-targets it. Caught here regardless of which assert keys are used.
    if (targeted !== N) fails.push(`targeted ${targeted} tokens, expected ${N}`);
    await new Promise(r => setTimeout(r, 2500)); // damage + per-target saves settle

    // --- Per-target asserts (reuse the combatCheck assert key vocabulary) ---
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
    return { ok: false, fails: [err.message, ...fails] };
  } finally {
    clearTargets();
    await cleanup([combat, ...defToks, casterTok, ...defenders, caster, scene]);
  }
}

// tier -> in-browser handler. content.spec dispatches on expectation.tier.
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
  'T3-grant': grantCheck,
  'T3-macro': macroCheck,
  'T3-aoe': aoeCheck,
};
