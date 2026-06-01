// Per-tier functional checks. Each function is shipped to the Foundry browser
// context via page.evaluate, so it MUST be self-contained (only browser globals
// like Actor / foundry / game — no module-scope references, no outer helpers).
// Returns { ok, fails: string[] }. Add a tier => register a handler in CHECKS.

// T2: instantiate the item on a throwaway actor and assert static/applied effects.
// expectation.assert: { acDelta?, abilityDelta?{ability,delta}, effectApplied? }
async function applyCheck({ doc, expectation }) {
  const data = JSON.parse(JSON.stringify(doc));
  delete data._id; delete data._key;
  for (const e of data.effects ?? []) { delete e._id; delete e._key; }

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

// T3: run the ability in a real combat via MidiQOL and assert exact outcomes.
// Determinism by construction (flat damage, rigged AC/HP) — no RNG control.
// expectation: { defender:{hp,ac}, assert:{ defenderHpDelta?, conditionApplied? } }
async function combatCheck({ doc, expectation }) {
  const data = JSON.parse(JSON.stringify(doc));
  delete data._id; delete data._key;
  for (const e of data.effects ?? []) { delete e._id; delete e._key; }

  const a = expectation.assert ?? {};
  const dcfg = expectation.defender ?? {};
  const hp = dcfg.hp ?? 100;
  let attacker, defender, atkTok, defTok, combat;
  try {
    const scene = canvas.scene;
    if (!scene) return { ok: false, fails: ['no active scene to run combat in'] };
    if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };

    attacker = await Actor.create({ name: 'T3 Attacker', type: 'npc', system: { attributes: { hp: { value: 100, max: 100 } } } });
    defender = await Actor.create({ name: 'T3 Defender', type: 'npc', system: { attributes: { hp: { value: hp, max: hp }, ac: { calc: 'flat', flat: dcfg.ac ?? 1 } } } });
    const [item] = await attacker.createEmbeddedDocuments('Item', [data]);

    // actorLink:true so the token uses the base actor (npc tokens are unlinked by
    // default => midi would damage a synthetic token-actor, not the doc we read).
    atkTok = await TokenDocument.create({ actorId: attacker.id, name: attacker.name, actorLink: true, x: 100, y: 100, disposition: 1 }, { parent: scene });
    defTok = await TokenDocument.create({ actorId: defender.id, name: defender.name, actorLink: true, x: 200, y: 100, disposition: -1 }, { parent: scene });
    combat = await Combat.create({ scene: scene.id });
    await combat.createEmbeddedDocuments('Combatant', [
      { tokenId: atkTok.id, actorId: attacker.id, initiative: 20 },
      { tokenId: defTok.id, actorId: defender.id, initiative: 10 },
    ]);
    await combat.startCombat();
    // Wait for the canvas to draw the token placeable, then set a real target
    // (midi reads game.user.targets; placeable must exist first in headless).
    await new Promise(r => setTimeout(r, 800));
    const defPlaceable = canvas.tokens?.get(defTok.id) ?? defTok.object;
    if (defPlaceable) {
      defPlaceable.setTarget(true, { user: game.user, releaseOthers: true });
      // setTarget can no-op in headless; force the target Set midi reads.
      if (!game.user.targets.size) { game.user.targets.add(defPlaceable); defPlaceable.isTargeted = true; }
    }

    const hpBefore = defender.system.attributes.hp.value;
    // dnd5e 5.2 / midi 13.x: activity-based use. Options go in config.midiOptions
    // (the old 3rd-arg workflowOptions is dead). fastForward* skips all dialogs;
    // targetUuids targets explicitly instead of relying on user targets.
    const activity = [...item.system.activities][0];
    // Pass activity by UUID (object gets deep-cloned + can fail the !activity guard).
    // midi's own canonical call uses targetsToUse: new Set([token]) (midi-qol.js
    // ~14876); targetUuids relies on getToken(uuid) which fails headless.
    const wf = await MidiQOL.completeActivityUse(activity.uuid, {
      midiOptions: {
        fastForward: true, fastForwardAttack: true, fastForwardDamage: true,
        autoRollDamage: 'always',
        targetsToUse: defPlaceable ? [defPlaceable] : undefined,
        ignoreUserTargets: true,
      },
    });
    await new Promise(r => setTimeout(r, 2500)); // midi workflow + damage application
    const hpAfter = defender.system.attributes.hp.value;

    // KNOWN BLOCKER (B3): in headless, MidiQOL.completeActivityUse returns
    // undefined — game.user.targets won't populate without a rendered canvas, so
    // midi aborts with "must target". Same fragility that makes the Omega sim
    // flake. Unresolved; see TODO B3 (options: lower-level applyTokenDamage, or
    // run verify headed via xvfb). Handler kept as scaffold.
    if (!wf) return { ok: false, fails: ['midi workflow did not run (headless targeting blocker — see TODO B3)'] };

    const fails = [];
    if (a.defenderHpDelta !== undefined && (hpAfter - hpBefore) !== a.defenderHpDelta)
      fails.push(`defenderHpDelta expected ${a.defenderHpDelta}, got ${hpAfter - hpBefore} (before ${hpBefore}, after ${hpAfter})`);
    if (a.conditionApplied && !defender.effects.some(e => e.statuses?.has(a.conditionApplied)))
      fails.push(`condition "${a.conditionApplied}" not applied to defender`);
    return { ok: fails.length === 0, fails };
  } catch (err) {
    return { ok: false, fails: [err.message] };
  } finally {
    try { game.user.targets.forEach(t => t.setTarget(false, { user: game.user, releaseOthers: false })); } catch {}
    if (combat) await combat.delete().catch(() => {});
    if (atkTok) await atkTok.delete().catch(() => {});
    if (defTok) await defTok.delete().catch(() => {});
    if (attacker) await attacker.delete().catch(() => {});
    if (defender) await defender.delete().catch(() => {});
  }
}

// tier -> in-browser handler. content.spec dispatches on expectation.tier.
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
};
