// Per-tier functional checks. Each function is shipped to the Foundry browser
// context via page.evaluate, so it MUST be self-contained (only browser globals
// like Actor / foundry / game — no module-scope references, no outer helpers).
// Returns { ok, fails: string[] }. Add a tier => register a handler in CHECKS.

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
  const strip = (d) => { const c = JSON.parse(JSON.stringify(d)); delete c._id; delete c._key; for (const e of c.effects ?? []) delete e._key; return c; };
  const a = expectation.assert ?? {};
  const dcfg = expectation.defender ?? {};
  const hp = dcfg.hp ?? 100;

  // One full combat scenario (fresh scene/actors), cleans up after itself.
  // Returns { delta, conditionApplied, effectApplied, flagPresent } or { error }.
  const runScenario = async (withSetup, opts = {}) => {
    let attacker, defender, atkTok, defTok, combat, scene;
    try {
      // Fresh clean scene: the dev world's scene has a broken actor that aborts
      // canvas.draw (canvas.ready stays false), which breaks targeting.
      scene = await Scene.create({ name: 'T3 Verify Scene', width: 1000, height: 1000, grid: { size: 100 }, padding: 0 });
      attacker = await Actor.create({ name: 'T3 Attacker', type: 'npc', system: { attributes: { hp: { value: 100, max: 100 } } } });
      defender = await Actor.create({ name: 'T3 Defender', type: 'npc', system: { attributes: { hp: { value: hp, max: hp }, ac: { calc: 'flat', flat: dcfg.ac ?? 1 } } } });
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
      // actorLink:true so the token uses the base actor (npc tokens unlink by
      // default => midi would hit a synthetic token-actor, not the doc we read).
      atkTok = await TokenDocument.create({ actorId: attacker.id, name: attacker.name, actorLink: true, x: 100, y: 100, disposition: 1 }, { parent: scene });
      defTok = await TokenDocument.create({ actorId: defender.id, name: defender.name, actorLink: true, x: 200, y: 100, disposition: -1 }, { parent: scene });
      combat = await Combat.create({ scene: scene.id, active: true });
      await combat.activate();
      await combat.createEmbeddedDocuments('Combatant', [
        { tokenId: atkTok.id, actorId: attacker.id, initiative: 20 },
        { tokenId: defTok.id, actorId: defender.id, initiative: 10 },
      ]);
      await combat.startCombat();
      // canvas.draw switches + renders the scene (view()/activate() didn't here);
      // needed so the token placeable exists and targeting populates game.user.targets.
      await canvas.draw(scene);
      for (let i = 0; i < 40 && (canvas.scene?.id !== scene.id || !canvas.ready); i++) await new Promise(r => setTimeout(r, 300));
      await new Promise(r => setTimeout(r, 800));
      const defPlaceable = canvas.tokens?.get(defTok.id) ?? defTok.object;
      if (defPlaceable) {
        defPlaceable.setTarget(true, { user: game.user, releaseOthers: true });
        if (!game.user.targets.size) { game.user.targets.add(defPlaceable); defPlaceable.isTargeted = true; }
      }

      // Use an ability (its first activity) on the defender via a real midi workflow.
      // targetUuids (NOT targetsToUse — midi's is broken) + ignoreUserTargets; activity
      // by UUID (object would be deep-cloned + can fail midi's !activity guard).
      const use = async (docData) => {
        const [item] = await attacker.createEmbeddedDocuments('Item', [strip(docData)]);
        const activity = [...item.system.activities][0];
        const wf = await MidiQOL.completeActivityUse(activity.uuid, {
          midiOptions: { fastForward: true, fastForwardAttack: true, fastForwardDamage: true, autoRollDamage: 'always', targetUuids: [defTok.uuid], ignoreUserTargets: true },
        });
        await new Promise(r => setTimeout(r, 2000));
        return wf;
      };

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
      try { game.user.targets.forEach(t => t.setTarget(false, { user: game.user, releaseOthers: false })); } catch {}
      if (combat) await combat.delete().catch(() => {});
      if (atkTok) await atkTok.delete().catch(() => {});
      if (defTok) await defTok.delete().catch(() => {});
      if (attacker) await attacker.delete().catch(() => {});
      if (defender) await defender.delete().catch(() => {});
      if (scene) await scene.delete().catch(() => {});
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
      if (!wf) throw new Error('midi workflow returned null (no target / activity not resolved)');
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

// tier -> in-browser handler. content.spec dispatches on expectation.tier.
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
  'T3-grant': grantCheck,
};
