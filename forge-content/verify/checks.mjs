// Gate verify helpers — shipped to the Foundry browser context via page.evaluate.
// All functions must be self-contained (only browser globals: Actor/foundry/game
// — no module-scope references). Returns { ok, fails: string[] }.
//
// Single dispatch path: installGateHelpers() once after boot (sets globalThis.__fcGate
// including the shared scene/actor/combat builders and runScene), then genericCheck()
// per ability. The 5 bespoke handlers (applyCheck/combatCheck/grantCheck/macroCheck/
// aoeCheck) and the CHECKS map were removed when all abilities moved to v2 expect.json.

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
    return { wf, item };
  };
  // Declarative scene runner. spec = { combat, actors, steps, __docs, __scenario }.
  // Builds the roster, applies per-actor forces, runs steps in order, returns
  // { snapshots, error }. Self-contained (browser globals + the other builders only).
  const runScene = async (spec) => {
    const created = []; // every doc we make, for creation-tracked cleanup (finally)
    const track = (d) => { if (d) created.push(d); return d; };
    const A = {};       // name -> actor doc
    const T = {};       // name -> token doc
    const baseHp = {};  // name -> hp at scene build (hpDelta baseline)
    const baseAc = {};  // name -> ac at scene build (acDelta baseline)
    const baseAbil = {};// name -> { abil: score } at scene build
    const lastWf = {};  // name -> last workflow this actor cast
    const lastItem = {}; // name -> last ability item this actor cast (for uses.spent)
    const tickCount = {}; // name -> DoT tick count (from advanceTurns)
    let runTargeted = 0;  // last cast's wf.targets.size (targetedCount)
    const snapshots = {};
    const combatOn = spec.combat !== false;
    const names = Object.keys(spec.actors);
    const FORCE = {
      save:    { fail: 'flags.midi-qol.fail.ability.save.all', success: 'flags.midi-qol.success.ability.save.all' },
      attack:  { hit: 'flags.midi-qol.grants.attack.success.all', miss: 'flags.midi-qol.grants.attack.fail.all' },
    };
    try {
      // Recharge force: dnd5e auto-recharge defaults to "no", so enable it (silent =
      // no chat spam) and publish the forced outcome for the rollRecharge hook
      // (installGateHelpers) to apply deterministically. Real formula kept intact —
      // rigging recovery.formula on the item copy breaks the cast workflow.
      const rechargeForce = Object.values(spec.actors).find(a => a.forces?.recharge)?.forces.recharge ?? null;
      globalThis.__fcGate._rechargeForce = rechargeForce;
      if (rechargeForce) try { await game.settings.set('dnd5e', 'autoRecharge', 'silent'); } catch {}
      const scene = combatOn ? track(await makeScene('T3 Verify Scene')) : null;
      const defaultPos = (i) => [100 + i * 100, 100];
      for (let i = 0; i < names.length; i++) {
        const n = names[i];
        const cfg = spec.actors[n];
        // Authored roster slot (Iter 4): build this actor FROM the resolved NPC doc
        // (so it carries its own inlined embedded abilities) instead of a bare makeActor.
        // hp/ac may still be overridden for the scene; otherwise the statblock's own.
        let actor;
        if (cfg.authored) {
          const data = strip(cfg.authored);
          foundry.utils.setProperty(data, 'flags.forge-content.test', true);
          if (cfg.hp !== undefined) foundry.utils.setProperty(data, 'system.attributes.hp', { value: cfg.hp, max: cfg.hp });
          if (cfg.ac !== undefined) foundry.utils.setProperty(data, 'system.attributes.ac', { calc: 'flat', flat: cfg.ac });
          actor = track(await Actor.create(data));
        } else {
          actor = track(await makeActor(`T3 ${n}`, { hp: cfg.hp ?? 100, ac: cfg.ac, temp: cfg.temp }));
        }
        A[n] = actor;
        const fr = cfg.forces ?? {};
        if (fr.save) await actor.update({ [FORCE.save[fr.save]]: 1 });
        if (fr.attack) await actor.update({ [FORCE.attack[fr.attack]]: 1 });
        if (fr.advantage) await actor.update({ 'flags.midi-qol.advantage.attack.all': 1 });
        if (fr.disadvantage) await actor.update({ 'flags.midi-qol.disadvantage.attack.all': 1 });
        if (fr.grantAdvantage) await actor.update({ 'flags.midi-qol.grants.advantage.attack.all': 1 });
        if (fr.grantDisadvantage) await actor.update({ 'flags.midi-qol.grants.disadvantage.attack.all': 1 });
        baseHp[n] = actor.system.attributes.hp.value;
        baseAc[n] = actor.system.attributes.ac.value;
        baseAbil[n] = Object.fromEntries(Object.entries(actor.system.abilities ?? {}).map(([k, v]) => [k, v.value]));
        if (combatOn) {
          const [x, y] = cfg.pos ?? defaultPos(i);
          T[n] = track(await makeToken(actor, scene, { x, y, disposition: cfg.disposition ?? (i === 0 ? 1 : -1) }));
        }
      }
      let combat = null;
      if (combatOn) {
        combat = track(await makeCombat(scene, names.map((n, i) => ({ tokenId: T[n].id, actorId: A[n].id, initiative: 30 - i }))));
        await drawAndWait(scene);
      }
      const resolveDoc = (ability) => ability === 'main' ? spec.__docs.main : spec.__docs.setup[ability];

      const snapActor = (n) => {
        const a = A[n];
        const abilNow = Object.fromEntries(Object.entries(a.system.abilities ?? {}).map(([k, v]) => [k, v.value]));
        const abilityDelta = {};
        for (const k of Object.keys(baseAbil[n])) abilityDelta[k] = (abilNow[k] ?? 0) - baseAbil[n][k];
        return {
          hp: a.system.attributes.hp.value,
          hpDelta: a.system.attributes.hp.value - baseHp[n],
          tempHp: a.system.attributes.hp.temp ?? 0,
          acDelta: a.system.attributes.ac.value - baseAc[n],
          abilityDelta,
          statuses: [...a.effects].flatMap(ef => [...(ef.statuses ?? [])]),
          effects: [...a.effects].map(ef => ef.name),
          flags: foundry.utils.deepClone(a.flags ?? {}),
          ticks: tickCount[n] ?? 0,
          usesSpent: lastItem[n]?.system?.uses?.spent ?? null,
          lastWorkflow: lastWf[n] ?? { advantage: false, disadvantage: false, hit: false, crit: false, total: null },
        };
      };

      for (const step of spec.steps) {
        if (step.onlyScenarios && !step.onlyScenarios.includes(spec.__scenario)) continue;
        if ('cast' in step || 'castOwn' in step) {
          const who = 'cast' in step ? step.cast : step.castOwn;
          const caster = A[who];
          if (!combatOn) {
            // Non-combat apply path (only the standalone-doc `cast` variant uses it).
            const docData = resolveDoc(step.ability);
            if (!docData) return { error: `ability "${step.ability}" not resolved to a doc` };
            await caster.createEmbeddedDocuments('Item', [strip(docData)]);
            await new Promise(r => setTimeout(r, 400));
          } else {
            const targetUuids = (step.targets ?? []).map(t => T[t].uuid);
            for (const t of step.targets ?? []) targetToken(T[t]);
            let wf, item;
            if ('castOwn' in step) {
              // Authored NPC casts its OWN inlined embedded ability, matched by
              // system.identifier (preserved through inlineAbility's re-key). Proves the
              // re-keyed item actually executes in real midi — actor-assembly glue.
              item = caster.items.find(it => it.system?.identifier === step.ability);
              if (!item) return { error: `castOwn: actor "${who}" holds no ability "${step.ability}"` };
              const activity = [...item.system.activities][0];
              wf = await MidiQOL.completeActivityUse(activity.uuid, { midiOptions: { fastForward: true, fastForwardAttack: true, fastForwardDamage: true, autoRollDamage: 'always', targetUuids, ignoreUserTargets: true } });
              await new Promise(r => setTimeout(r, 2500));
            } else {
              const docData = resolveDoc(step.ability);
              if (!docData) return { error: `ability "${step.ability}" not resolved to a doc` };
              ({ wf, item } = await useActivity(caster, docData, targetUuids, { settle: 2500 }));
            }
            if (!wf) return { error: `midi workflow did not run (cast ${who} ${step.ability})` };
            lastItem[who] = item;
            runTargeted = wf.targets?.size ?? 0;
            lastWf[who] = {
              advantage: !!wf.advantage, disadvantage: !!wf.disadvantage,
              hit: (wf.hitTargets?.size ?? 0) > 0, crit: !!wf.isCritical, total: wf.attackRoll?.total ?? null,
            };
            if (step.expectTargets !== undefined && runTargeted !== step.expectTargets)
              return { error: `targeted ${runTargeted} tokens, expected ${step.expectTargets}` };
            clearTargets();
          }
        } else if ('advanceTurns' in step) {
          for (let t = 0; t < step.advanceTurns; t++) {
            const who = step.countDamageTo;
            const before = who ? A[who].system.attributes.hp.value : 0;
            await combat.nextTurn();
            await new Promise(r => setTimeout(r, 2000));
            if (who && A[who].system.attributes.hp.value < before) tickCount[who] = (tickCount[who] ?? 0) + 1;
          }
        } else if ('advanceUntil' in step) {
          const { round, actor } = step.advanceUntil;
          for (let i = 0; i < 12; i++) {
            if (combat.round === round && combat.combatant?.tokenId === T[actor].id) break;
            await combat.nextTurn();
            await new Promise(r => setTimeout(r, 1500));
          }
          if (!(combat.round === round && combat.combatant?.tokenId === T[actor].id))
            return { error: `advanceUntil timed out: never reached ${actor} at round ${round}` };
        } else if ('snapshot' in step) {
          const snap = { __run: { targetedCount: runTargeted } };
          for (const n of names) snap[n] = snapActor(n);
          snapshots[step.snapshot] = snap;
        }
      }
      return { snapshots };
    } catch (err) {
      return { error: err.message };
    } finally {
      globalThis.__fcGate._rechargeForce = null;
      clearTargets();
      const order = (d) => d?.documentName === 'Combat' ? 0 : d?.documentName === 'Scene' ? 1 : 2;
      for (const d of [...created].sort((a, b) => order(a) - order(b))) await d.delete().catch(() => {});
    }
  };
  // Deterministic recharge: dnd5e rolls a real d6 on NPC turn-start (via
  // recoverUses, with autoRecharge enabled). This hook overrides the result
  // BEFORE the uses.spent update is applied — success forces a reset to 0,
  // fail forces no recovery — keyed off the per-run __fcGate._rechargeForce.
  // Item recharge updates "system.uses.spent"; activity recharge "uses.spent".
  if (!globalThis.__fcRechargeHook) {
    Hooks.on('dnd5e.rollRecharge', (rolls, { subject, updates }) => {
      const f = globalThis.__fcGate?._rechargeForce;
      if (!f) return;
      const key = subject instanceof Item ? 'system.uses.spent' : 'uses.spent';
      if (f === 'success') updates[key] = 0;
      else if (f === 'fail') delete updates[key];
    });
    globalThis.__fcRechargeHook = true;
  }
  globalThis.__fcGate = { strip, makeScene, makeActor, makeToken, makeCombat, drawAndWait, targetToken, clearTargets, useActivity, runScene, _rechargeForce: null };
}

// Declarative handler. Replaces all bespoke handlers. arg:
//   { doc, expectation, setupDocs, knownKeys }
// Builds a per-scenario spec, runs __fcGate.runScene, asserts via __fcGate.assertSnapshot.
// Self-contained (browser globals + __fcGate only) — shipped via page.evaluate.
export async function genericCheck({ doc, expectation, setupDocs = [], knownKeys }) {
  if (expectation.combat !== false && typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  const { runScene, assertSnapshot } = globalThis.__fcGate;
  const setupMap = {};
  (expectation.setup ?? []).forEach((id, i) => { if (setupDocs[i]) setupMap[id] = setupDocs[i]; });
  const docs = { main: doc, setup: setupMap };

  const mergeForces = (forces) => {
    const actors = JSON.parse(JSON.stringify(expectation.actors));
    for (const [name, f] of Object.entries(forces ?? {})) {
      actors[name] = actors[name] ?? {};
      actors[name].forces = { ...(actors[name].forces ?? {}), ...f };
    }
    return actors;
  };

  const runs = expectation.scenarios
    ? expectation.scenarios.map(sc => ({ label: sc.name, actors: mergeForces(sc.forces), assert: sc.assert ?? [] }))
    : [{ label: 'main', actors: expectation.actors, assert: expectation.assert ?? [] }];

  const fails = [];
  for (const run of runs) {
    const spec = { combat: expectation.combat, actors: run.actors, steps: expectation.steps, __docs: docs, __scenario: run.label };
    const r = await runScene(spec);
    if (r.error) { fails.push(`${run.label}: ${r.error}`); continue; }
    for (const msg of assertSnapshot(run.assert, r.snapshots, knownKeys)) fails.push(`${run.label}: ${msg}`);
  }
  return { ok: fails.length === 0, fails };
}

// Iter 4 actor T3 gate. The authored NPC fights in real midi combat with its OWN
// inlined embedded ability (via runScene's `authored` slot + `castOwn` step). Proves
// actor-assembly glue — the re-keyed item executes — NOT the ability mechanic (that's
// proven once by the ability's own expect; test-explosion guard). Mirrors genericCheck
// but injects the resolved NPC doc into the `authored:true` roster slot.
// arg = { doc, expectation, setupDocs, knownKeys }. Returns { ok, fails:[] }.
export async function actorCombatCheck({ doc, expectation, setupDocs = [], knownKeys }) {
  if (typeof MidiQOL === 'undefined') return { ok: false, fails: ['midi-qol inactive'] };
  const { runScene, assertSnapshot } = globalThis.__fcGate;
  const setupMap = {};
  (expectation.setup ?? []).forEach((id, i) => { if (setupDocs[i]) setupMap[id] = setupDocs[i]; });
  const docs = { main: doc, setup: setupMap };

  // Clone the roster and replace the boolean authored marker with the actual NPC doc,
  // so runScene builds that slot from the statblock (with its inlined abilities).
  const injectAuthored = (actors) => {
    const out = JSON.parse(JSON.stringify(actors));
    for (const name of Object.keys(out)) if (out[name]?.authored === true) out[name].authored = doc;
    return out;
  };
  const mergeForces = (forces) => {
    const actors = injectAuthored(expectation.actors);
    for (const [name, f] of Object.entries(forces ?? {})) {
      actors[name] = actors[name] ?? {};
      actors[name].forces = { ...(actors[name].forces ?? {}), ...f };
    }
    return actors;
  };

  const runs = expectation.scenarios
    ? expectation.scenarios.map(sc => ({ label: sc.name, actors: mergeForces(sc.forces), assert: sc.assert ?? [] }))
    : [{ label: 'main', actors: injectAuthored(expectation.actors), assert: expectation.assert ?? [] }];

  const fails = [];
  for (const run of runs) {
    const spec = { combat: true, actors: run.actors, steps: expectation.steps, __docs: docs, __scenario: run.label };
    const r = await runScene(spec);
    if (r.error) { fails.push(`${run.label}: ${r.error}`); continue; }
    for (const msg of assertSnapshot(run.assert, r.snapshots, knownKeys)) fails.push(`${run.label}: ${msg}`);
  }
  return { ok: fails.length === 0, fails };
}

// Iter 1 actor gate. Imports an authored NPC into the world (forge-content.test
// flagged -> isolate() cleans it), then asserts T1 (loads, items present) + T2
// (derived stats). Self-contained: shipped to the browser via page.evaluate.
// arg = { doc, expectation }. Returns { ok, fails:[] }.
export async function actorLoadCheck({ doc, expectation }) {
  const fails = [];
  let actor;
  try {
    const data = foundry.utils.deepClone(doc);
    delete data._key;
    foundry.utils.setProperty(data, 'flags.forge-content.test', true);
    actor = await Actor.create(data);
    if (!actor) return { ok: false, fails: ['Actor.create returned null — doc failed to load (T1)'] };

    const a = expectation.assert ?? {};
    if ('hpMax' in a) {
      const got = actor.system.attributes?.hp?.max;
      if (got !== a.hpMax) fails.push(`hpMax expected ${a.hpMax}, got ${got}`);
    }
    if ('ac' in a) {
      const got = actor.system.attributes?.ac?.value;
      if (got !== a.ac) fails.push(`ac expected ${a.ac}, got ${got}`);
    }
    if (a.abilities) {
      for (const [k, v] of Object.entries(a.abilities)) {
        const got = actor.system.abilities?.[k]?.value;
        if (got !== v) fails.push(`ability ${k} expected ${v}, got ${got}`);
      }
    }
    for (const name of a.hasItems ?? []) {
      if (!actor.items.find(i => i.name === name)) fails.push(`missing item "${name}"`);
    }
  } catch (e) {
    fails.push(`exception: ${e.message}`);
  } finally {
    if (actor) await actor.delete().catch(() => {});
  }
  return { ok: fails.length === 0, fails };
}
