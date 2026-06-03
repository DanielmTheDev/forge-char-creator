// PURE assert layer for the forge-content gate. No Foundry/browser globals — so the
// identical function is unit-tested in node (assert.test.mjs) AND shipped to the
// Foundry browser context via assertSnapshot.toString() (see content.spec.mjs).
// Self-contained: inlines its own getPath so toString() carries no dependencies.
//
// asserts: [{ at, actor?, <key>: <value>, ... }]  (one entry may carry several keys)
// snapshots: { "<label>": { __run?: { targetedCount }, "<actorName>": ActorSnap } }
// knownKeys: string[]  (array, not Set — crosses the page.evaluate boundary as JSON)
// returns: string[] failure messages (empty array = pass)
export function assertSnapshot(asserts, snapshots, knownKeys) {
  const getPath = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const RUN_KEYS = ['targetedCount'];
  const fails = [];
  for (const entry of asserts) {
    const { at, actor, ...keys } = entry;
    const snap = snapshots[at];
    if (!snap) { fails.push(`assert at "${at}": no such snapshot`); continue; }
    for (const [k, want] of Object.entries(keys)) {
      if (!knownKeys.includes(k)) { fails.push(`unknown assert key "${k}"`); continue; }
      if (RUN_KEYS.includes(k)) {
        const got = snap.__run ? snap.__run[k] : undefined;
        if (got !== want) fails.push(`${at}: ${k} expected ${want}, got ${got}`);
        continue;
      }
      const a = snap[actor];
      if (!a) { fails.push(`assert at "${at}" actor "${actor}": not in snapshot`); continue; }
      const L = `${at}/${actor}`;
      switch (k) {
        case 'hpDelta': if (a.hpDelta !== want) fails.push(`${L}: hpDelta expected ${want}, got ${a.hpDelta}`); break;
        case 'hpDeltaMin': if (a.hpDelta < want) fails.push(`${L}: hpDelta ${a.hpDelta} below min ${want}`); break;
        case 'hpDeltaMax': if (a.hpDelta > want) fails.push(`${L}: hpDelta ${a.hpDelta} above max ${want}`); break;
        case 'tempHp': if (a.tempHp !== want) fails.push(`${L}: tempHp expected ${want}, got ${a.tempHp}`); break;
        case 'acDelta': if (a.acDelta !== want) fails.push(`${L}: acDelta expected ${want}, got ${a.acDelta}`); break;
        case 'abilityDelta': {
          const got = a.abilityDelta ? a.abilityDelta[want.ability] : undefined;
          if (got !== want.delta) fails.push(`${L}: ${want.ability} delta expected ${want.delta}, got ${got}`);
          break;
        }
        case 'conditionApplied': if (!a.statuses.includes(want)) fails.push(`${L}: condition "${want}" not applied`); break;
        case 'effectApplied': if (!a.effects.includes(want)) fails.push(`${L}: effect "${want}" not applied`); break;
        case 'effectAbsent': if (a.effects.includes(want)) fails.push(`${L}: effect "${want}" should be absent`); break;
        case 'flagPresent': if (getPath({ flags: a.flags }, want) === undefined) fails.push(`${L}: flag "${want}" not present`); break;
        case 'ticks': if (a.ticks !== want) fails.push(`${L}: ticks expected ${want}, got ${a.ticks}`); break;
        case 'lastWorkflow.advantage': { const lw = a.lastWorkflow ?? {}; if (lw.advantage !== want) fails.push(`${L}: lastWorkflow.advantage expected ${want}, got ${lw.advantage}`); break; }
        case 'lastWorkflow.disadvantage': { const lw = a.lastWorkflow ?? {}; if (lw.disadvantage !== want) fails.push(`${L}: lastWorkflow.disadvantage expected ${want}, got ${lw.disadvantage}`); break; }
        case 'lastWorkflow.hit': { const lw = a.lastWorkflow ?? {}; if (lw.hit !== want) fails.push(`${L}: lastWorkflow.hit expected ${want}, got ${lw.hit}`); break; }
        case 'lastWorkflow.crit': { const lw = a.lastWorkflow ?? {}; if (lw.crit !== want) fails.push(`${L}: lastWorkflow.crit expected ${want}, got ${lw.crit}`); break; }
        default: fails.push(`unhandled assert key "${k}"`);
      }
    }
  }
  return fails;
}
