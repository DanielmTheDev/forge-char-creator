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

// T3 combat scenarios: TODO (B3). Will mirror the Omega sim — Combat + combatants
// + targets + forced MidiQOL workflow, asserting HP delta / save / duration.
async function combatCheck({ expectation }) {
  return { ok: false, fails: [`tier "${expectation.tier}" (combat) not implemented yet (B3)`] };
}

// tier -> in-browser handler. content.spec dispatches on expectation.tier.
export const CHECKS = {
  'T2-apply': applyCheck,
  'T3-combat': combatCheck,
};
