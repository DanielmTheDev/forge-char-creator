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
  let attacker, defender, atkTok, defTok, combat, scene;
  try {
    if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
    // Fresh clean scene: the dev world's existing scene has a broken actor that
    // aborts canvas.draw (canvas.ready stays false), which breaks targeting.
    scene = await Scene.create({ name: 'T3 Verify Scene', width: 1000, height: 1000, grid: { size: 100 }, padding: 0 });

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
    // Activate the scene AFTER tokens exist so the canvas switches to it + draws
    // their placeables (view() alone didn't switch the canvas). Wait until the
    // canvas is actually on our scene and ready, then a tick to render placeables.
    await canvas.draw(scene);
    for (let i = 0; i < 40 && (canvas.scene?.id !== scene.id || !canvas.ready); i++) await new Promise(r => setTimeout(r, 300));
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
    // Use targetUuids (NOT targetsToUse — midi's targetsToUse handling is broken:
    // Array trips its not-a-Set guard, Set crashes on .map). targetUuids resolves
    // via getToken(uuid), which needs the full canvas (headed/xvfb).
    const wf = await MidiQOL.completeActivityUse(activity.uuid, {
      midiOptions: {
        fastForward: true, fastForwardAttack: true, fastForwardDamage: true,
        autoRollDamage: 'always',
        targetUuids: [defTok.uuid], ignoreUserTargets: true,
      },
    });
    await new Promise(r => setTimeout(r, 2500)); // midi workflow + damage application
    const hpAfter = defender.system.attributes.hp.value;

    if (!wf) return { ok: false, fails: ['midi workflow did not run (no target / activity not resolved)'] };

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
    if (scene) await scene.delete().catch(() => {});
  }
}

// tier -> in-browser handler. content.spec dispatches on expectation.tier.
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
};
