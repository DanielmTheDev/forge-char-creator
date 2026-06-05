// PURE node-side validation for expect.json v2. Runs BEFORE the ~3.8m Foundry boot
// (content.spec.mjs) so authoring typos fail in <1s with a precise message. KNOWN_KEYS
// is the single source of the assert vocabulary, also passed into the browser-side
// assertSnapshot via the page.evaluate arg. No Foundry globals here.

export const KNOWN_KEYS = [
  'hpDelta', 'hpDeltaMin', 'hpDeltaMax', 'tempHp', 'acDelta', 'abilityDelta',
  'conditionApplied', 'effectApplied', 'effectAbsent', 'flagPresent', 'ticks',
  'lastWorkflow.advantage', 'lastWorkflow.disadvantage', 'lastWorkflow.hit', 'lastWorkflow.crit',
  'targetedCount', 'usesSpent',
];

const TOP_KEYS = ['tier', 'combat', 'actors', 'steps', 'scenarios', 'assert', 'setup'];
const RUN_KEYS = ['targetedCount'];

// expectation: a parsed expect.json. identifiers: string[] of ability identifiers in
// the suite (the dispatcher's byId keys). Returns string[] of errors (empty = valid).
export function validate(expectation, identifiers) {
  if (!expectation || typeof expectation !== 'object') return ['expectation must be a non-null object'];
  const e = expectation;
  const errs = [];
  for (const k of Object.keys(e)) if (!TOP_KEYS.includes(k)) errs.push(`unknown top-level key "${k}" (legacy? migrate to v2)`);

  const combatOn = expectation.combat !== false;
  const roster = new Set(Object.keys(e.actors ?? {}));
  if (!roster.size) errs.push('no actors defined');
  for (const s of e.setup ?? []) if (!identifiers.includes(s)) errs.push(`setup ability "${s}" not found in suite`);

  const steps = e.steps ?? [];
  const labels = new Set();
  for (const s of steps) {
    if ('snapshot' in s) { if (labels.has(s.snapshot)) errs.push(`duplicate snapshot label "${s.snapshot}"`); labels.add(s.snapshot); continue; }
    if ('cast' in s) {
      if (!roster.has(s.cast)) errs.push(`step cast actor "${s.cast}" not in roster`);
      for (const t of s.targets ?? []) if (!roster.has(t)) errs.push(`step target "${t}" not in roster`);
      if (s.ability !== 'main' && !identifiers.includes(s.ability)) errs.push(`ability "${s.ability}" not found in suite`);
    }
    if (s.onlyScenarios) {
      const scNames = new Set((expectation.scenarios ?? []).map(x => x.name));
      for (const n of s.onlyScenarios) if (!scNames.has(n)) errs.push(`step onlyScenarios references unknown scenario "${n}"`);
    }
    if ('countDamageTo' in s && !roster.has(s.countDamageTo)) errs.push(`countDamageTo "${s.countDamageTo}" not in roster`);
    if ('advanceUntil' in s && !roster.has(s.advanceUntil.actor)) errs.push(`advanceUntil actor "${s.advanceUntil.actor}" not in roster`);
    if (!combatOn && ('advanceTurns' in s || 'advanceUntil' in s)) errs.push(`step "${'advanceTurns' in s ? 'advanceTurns' : 'advanceUntil'}" requires combat but combat:false is set`);
  }

  const checkAsserts = (asserts, where) => {
    for (const a of asserts ?? []) {
      if (!labels.has(a.at)) errs.push(`${where}assert at "${a.at}" has no snapshot step`);
      const keys = Object.keys(a).filter(k => k !== 'at' && k !== 'actor');
      const needsActor = keys.some(k => !RUN_KEYS.includes(k));
      if (needsActor && !('actor' in a)) errs.push(`${where}assert missing required "actor" field`);
      else if (needsActor && !roster.has(a.actor)) errs.push(`${where}assert actor "${a.actor}" not in roster`);
      for (const k of keys) if (!KNOWN_KEYS.includes(k)) errs.push(`${where}unknown assert key "${k}"`);
    }
  };

  if (e.scenarios) {
    const names = new Set();
    for (const sc of e.scenarios) {
      if (names.has(sc.name)) errs.push(`duplicate scenario name "${sc.name}"`);
      names.add(sc.name);
      for (const an of Object.keys(sc.forces ?? {})) if (!roster.has(an)) errs.push(`scenario "${sc.name}" forces actor "${an}" not in roster`);
      checkAsserts(sc.assert, `scenario "${sc.name}": `);
    }
  } else {
    checkAsserts(e.assert, '');
  }
  return errs;
}

// --- Actor pack expectations (Iter 1: load + derived-stat asserts only) ---
// Distinct shape from ability expects: no scaffold actors/steps, just stat asserts
// against the single authored actor under test.
const ACTOR_TOP_KEYS = ['tier', 'assert'];
export const ACTOR_ASSERT_KEYS = ['hpMax', 'ac', 'abilities', 'hasItems'];

export function validateActor(expectation) {
  if (!expectation || typeof expectation !== 'object') return ['actor expectation must be a non-null object'];
  const errs = [];
  for (const k of Object.keys(expectation)) if (!ACTOR_TOP_KEYS.includes(k)) errs.push(`unknown top-level key "${k}" (actor expect)`);
  const a = expectation.assert;
  if (!a || typeof a !== 'object' || Array.isArray(a)) { errs.push('actor expect missing "assert" object'); return errs; }
  for (const k of Object.keys(a)) if (!ACTOR_ASSERT_KEYS.includes(k)) errs.push(`unknown actor assert key "${k}"`);
  if ('abilities' in a && (typeof a.abilities !== 'object' || Array.isArray(a.abilities))) errs.push('"abilities" must be an object map');
  if ('hasItems' in a && !Array.isArray(a.hasItems)) errs.push('"hasItems" must be an array');
  return errs;
}

// Validate an actor SOURCE doc's `abilities` ref field. Each entry is either a
// plain identifier string (Iter 2) or a knob object `{ ability, name?, set }`
// (Iter 3). Pre-boot fast fail before resolve/inline, so a typo'd ref or a
// shape-changing knob is a clear message, not a mid-resolve throw. No field = no-op.
const REF_KEYS = ['ability', 'name', 'set'];   // never-shape guard: nothing else allowed
const KNOB_KEYS = ['dmg', 'dc', 'range'];
export function validateActorRefs(actorDoc, idList) {
  if (!('abilities' in (actorDoc ?? {}))) return [];
  const errs = [];
  const refs = actorDoc.abilities;
  const who = `actor "${actorDoc.name}"`;
  if (!Array.isArray(refs)) { errs.push(`${who}: "abilities" must be an array of identifiers or knob objects`); return errs; }
  const known = new Set(idList);
  for (const r of refs) {
    if (typeof r === 'string') { if (!known.has(r)) errs.push(`${who} references unknown ability "${r}"`); continue; }
    if (typeof r !== 'object' || r === null || Array.isArray(r)) { errs.push(`${who}: ability ref must be a string or object, got ${Array.isArray(r) ? 'array' : typeof r}`); continue; }
    for (const k of Object.keys(r)) if (!REF_KEYS.includes(k)) errs.push(`${who}: unknown ref key "${k}" (only ${REF_KEYS.join('/')} — knobs change values, never shape)`);
    if (typeof r.ability !== 'string') { errs.push(`${who}: ref "ability" must be a string identifier`); continue; }
    if (!known.has(r.ability)) errs.push(`${who} references unknown ability "${r.ability}"`);
    if ('name' in r && typeof r.name !== 'string') errs.push(`${who} (${r.ability}): "name" must be a string`);
    if ('set' in r) {
      const s = r.set;
      if (typeof s !== 'object' || s === null || Array.isArray(s)) { errs.push(`${who} (${r.ability}): "set" must be an object`); continue; }
      for (const k of Object.keys(s)) {
        if (!KNOB_KEYS.includes(k)) { errs.push(`${who} (${r.ability}): unknown knob "${k}" (allowed: ${KNOB_KEYS.join(', ')})`); continue; }
        const v = s[k];
        if (k === 'range' && typeof v !== 'number') errs.push(`${who} (${r.ability}): knob "range" must be a number`);
        if ((k === 'dmg' || k === 'dc') && typeof v !== 'string' && typeof v !== 'number') errs.push(`${who} (${r.ability}): knob "${k}" must be a string or number`);
      }
    }
  }
  return errs;
}
