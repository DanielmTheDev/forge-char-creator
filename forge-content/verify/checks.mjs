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
// Determinism by construction (flat damage / rigged AC/HP / fixed-round DoTs).
// expectation: {
//   defender:{hp,ac}, advanceTurns?,
//   assert:{ defenderHpDelta?, hpDeltaMin?, hpDeltaMax?, conditionApplied?, effectApplied?, flagPresent? },
//   negative?: { hpDeltaMin? }   // re-run WITHOUT setup; assert the combo gate holds (e.g. no bleed)
// }
// setupDocs: abilities used on the defender BEFORE the main one (combo setup).
async function combatCheck({ doc, expectation, setupDocs = [] }) {
  if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  const strip = (d) => { const c = JSON.parse(JSON.stringify(d)); delete c._id; delete c._key; for (const e of c.effects ?? []) delete e._key; return c; };
  const a = expectation.assert ?? {};
  const dcfg = expectation.defender ?? {};
  const hp = dcfg.hp ?? 100;

  // One full combat scenario (fresh scene/actors), cleans up after itself.
  // Returns { delta, conditionApplied, effectApplied, flagPresent } or { error }.
  const runScenario = async (withSetup) => {
    let attacker, defender, atkTok, defTok, combat, scene;
    try {
      // Fresh clean scene: the dev world's scene has a broken actor that aborts
      // canvas.draw (canvas.ready stays false), which breaks targeting.
      scene = await Scene.create({ name: 'T3 Verify Scene', width: 1000, height: 1000, grid: { size: 100 }, padding: 0 });
      attacker = await Actor.create({ name: 'T3 Attacker', type: 'npc', system: { attributes: { hp: { value: 100, max: 100 } } } });
      defender = await Actor.create({ name: 'T3 Defender', type: 'npc', system: { attributes: { hp: { value: hp, max: hp }, ac: { calc: 'flat', flat: dcfg.ac ?? 1 } } } });
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
      // expiry help — the ability must self-bound (via its tick-limiter macro),
      // exactly as it will in real play.
      let ticks = 0;
      for (let t = 0; t < (expectation.advanceTurns ?? 0); t++) {
        const b = defender.system.attributes.hp.value;
        await combat.nextTurn();
        await new Promise(r => setTimeout(r, 2000));
        if (defender.system.attributes.hp.value < b) ticks++;
      }

      return {
        ticks,
        bleedExpired: !defender.effects.some(e => e.changes?.some(c => c.key === 'flags.midi-qol.OverTime')),
        delta: defender.system.attributes.hp.value - hpBefore,
        conditionApplied: defender.effects.some(e => a.conditionApplied && e.statuses?.has(a.conditionApplied)),
        effectApplied: defender.effects.some(e => e.name === a.effectApplied),
        flagPresent: !!foundry.utils.getProperty(defender, a.flagPresent ?? 'nonexistent'),
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

  const m = await runScenario(true);
  if (m.error) return { ok: false, fails: [m.error] };

  const fails = [];
  if (a.defenderHpDelta !== undefined && m.delta !== a.defenderHpDelta) fails.push(`defenderHpDelta expected ${a.defenderHpDelta}, got ${m.delta}`);
  if (a.hpDeltaMin !== undefined && m.delta < a.hpDeltaMin) fails.push(`hpDelta ${m.delta} below min ${a.hpDeltaMin}`);
  if (a.hpDeltaMax !== undefined && m.delta > a.hpDeltaMax) fails.push(`hpDelta ${m.delta} above max ${a.hpDeltaMax}`);
  if (a.conditionApplied && !m.conditionApplied) fails.push(`condition "${a.conditionApplied}" not applied to defender`);
  if (a.effectApplied && !m.effectApplied) fails.push(`effect "${a.effectApplied}" not applied to defender`);
  if (a.flagPresent && !m.flagPresent) fails.push(`flag "${a.flagPresent}" not present on defender`);
  if (a.ticks !== undefined && m.ticks !== a.ticks) fails.push(`expected ${a.ticks} DoT ticks, got ${m.ticks}`);
  if (a.bleedExpired && !m.bleedExpired) fails.push(`DoT effect did not expire after its duration`);

  // Hard-combo gate: re-run WITHOUT setup; the gated effect must NOT fire.
  if (expectation.negative) {
    const n = await runScenario(false);
    if (n.error) fails.push(`negative run: ${n.error}`);
    else {
      const floor = expectation.negative.hpDeltaMin ?? 0;
      if (n.delta < floor) fails.push(`hard-gate leaked: unmarked target lost ${n.delta} HP (expected >= ${floor})`);
    }
  }
  return { ok: fails.length === 0, fails };
}

// tier -> in-browser handler. content.spec dispatches on expectation.tier.
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
};
