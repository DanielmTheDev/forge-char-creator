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

// Shared step + assert grammar checker — the single source of the steps/scenarios/
// assert vocabulary, reused by ability `validate()` AND actor T3 `validateActorCombat()`.
// `e` is the expectation, `roster` a Set of actor names, `identifiers` the suite ability
// ids. Handles both `cast` (ability expects) and `castOwn` (actor T3) step variants.
function validateStepsAndAsserts(e, roster, identifiers) {
  const errs = [];
  const combatOn = e.combat !== false;
  const steps = e.steps ?? [];
  const labels = new Set();
  for (const s of steps) {
    if ('snapshot' in s) { if (labels.has(s.snapshot)) errs.push(`duplicate snapshot label "${s.snapshot}"`); labels.add(s.snapshot); continue; }
    if ('cast' in s || 'castOwn' in s) {
      const caster = 'cast' in s ? s.cast : s.castOwn;
      if (!roster.has(caster)) errs.push(`step cast actor "${caster}" not in roster`);
      for (const t of s.targets ?? []) if (!roster.has(t)) errs.push(`step target "${t}" not in roster`);
      if (s.ability !== 'main' && !identifiers.includes(s.ability)) errs.push(`ability "${s.ability}" not found in suite`);
    }
    if (s.onlyScenarios) {
      const scNames = new Set((e.scenarios ?? []).map(x => x.name));
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

// expectation: a parsed expect.json. identifiers: string[] of ability identifiers in
// the suite (the dispatcher's byId keys). Returns string[] of errors (empty = valid).
export function validate(expectation, identifiers) {
  if (!expectation || typeof expectation !== 'object') return ['expectation must be a non-null object'];
  const e = expectation;
  const errs = [];
  for (const k of Object.keys(e)) if (!TOP_KEYS.includes(k)) errs.push(`unknown top-level key "${k}" (legacy? migrate to v2)`);

  const roster = new Set(Object.keys(e.actors ?? {}));
  if (!roster.size) errs.push('no actors defined');
  for (const s of e.setup ?? []) if (!identifiers.includes(s)) errs.push(`setup ability "${s}" not found in suite`);

  errs.push(...validateStepsAndAsserts(e, roster, identifiers));
  return errs;
}

// --- Actor pack expectations (Iter 1: load + derived-stat asserts only) ---
// Distinct shape from ability expects: no scaffold actors/steps, just stat asserts
// against the single authored actor under test.
const ACTOR_TOP_KEYS = ['tier', 'assert'];
export const ACTOR_ASSERT_KEYS = ['hpMax', 'ac', 'abilities', 'hasItems'];

// Iter 4 — actor T3 combat expect. Reuses the ability `actors`/`steps`/`scenarios`/
// `assert` grammar (one shared vocab via validateStepsAndAsserts) but is gated behind
// tier:"T3" and adds two actor-glue rules: exactly one roster actor is the authored NPC
// under test (`authored:true`), and every `castOwn` step names that actor + an ability it
// actually holds (cross-check vs the SOURCE doc's `abilities` refs — validateActor runs
// pre-resolve). Test-explosion guard: this proves the inlined item fires, not the mechanic.
// Optional `load` = a T2 assert block (hpMax/ac/abilities/hasItems) run via
// actorLoadCheck BEFORE the combat scene — a T3 actor keeps its stat coverage.
const ACTOR_T3_TOP_KEYS = ['tier', 'actors', 'steps', 'scenarios', 'assert', 'setup', 'load'];

// `spellIdByName`: Map<lowercased vanilla spell name, dnd5e identifier> from the
// spell cache (loadSpellCache docs). An actor's `spells:` names extend its held
// set so castOwn can fire an inlined vanilla spell by its dnd5e identifier.
function validateActorCombat(expectation, actorDoc, idList, spellIdByName) {
  const e = expectation;
  const errs = [];
  for (const k of Object.keys(e)) if (!ACTOR_T3_TOP_KEYS.includes(k)) errs.push(`unknown top-level key "${k}" (actor T3 expect)`);
  const actors = e.actors ?? {};
  const roster = new Set(Object.keys(actors));
  if (!roster.size) { errs.push('no actors defined'); return errs; }

  const authored = Object.entries(actors).filter(([, c]) => c && c.authored === true).map(([n]) => n);
  if (authored.length !== 1) errs.push(`actor T3 expect needs exactly one actor with "authored:true" (got ${authored.length})`);

  if ('load' in e) errs.push(...validateActor({ tier: 'T2', assert: e.load }, actorDoc, idList).map(m => `load: ${m}`));

  const heldSpellIds = (Array.isArray(actorDoc?.spells) ? actorDoc.spells : [])
    .map(n => spellIdByName?.get(String(n).toLowerCase()))
    .filter(Boolean);
  const ids = [...(idList ?? []), ...heldSpellIds];
  for (const s of e.setup ?? []) if (!(idList ?? []).includes(s)) errs.push(`setup ability "${s}" not found in suite`);
  errs.push(...validateStepsAndAsserts(e, roster, ids));

  // castOwn must be the authored actor casting an ability (or vanilla spell) it
  // actually holds.
  const refs = Array.isArray(actorDoc?.abilities) ? actorDoc.abilities : [];
  const held = new Set([...refs.map(r => (typeof r === 'string' ? r : r?.ability)), ...heldSpellIds]);
  for (const s of e.steps ?? []) {
    if (!('castOwn' in s)) continue;
    if (authored.length === 1 && s.castOwn !== authored[0]) errs.push(`castOwn actor "${s.castOwn}" is not the authored actor "${authored[0]}"`);
    if (!held.has(s.ability)) errs.push(`castOwn ability "${s.ability}" not held by actor (its abilities: ${[...held].join(', ') || 'none'})`);
  }
  return errs;
}

export function validateActor(expectation, actorDoc, idList, spellIdByName) {
  if (!expectation || typeof expectation !== 'object') return ['actor expectation must be a non-null object'];
  if (expectation.tier === 'T3') return validateActorCombat(expectation, actorDoc, idList, spellIdByName);
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
// plain identifier string (Iter 2) or a knob object `{ ability, name?, img?, desc?, set }`
// (Iter 3). Pre-boot fast fail before resolve/inline, so a typo'd ref or a
// shape-changing knob is a clear message, not a mid-resolve throw. No field = no-op.
// `desc` is MANDATORY whenever `name` or `set` is present: a renamed/re-numbered
// reskin must not ship the base ability's description (exemplar text says
// "Reference ability…" and states the BASE dice/range, not the knobbed ones).
const REF_KEYS = ['ability', 'name', 'img', 'desc', 'set'];   // never-shape guard: nothing else allowed
const KNOB_KEYS = ['dmg', 'dc', 'range', 'dmgType'];
const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
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
    if ('img' in r && typeof r.img !== 'string') errs.push(`${who} (${r.ability}): "img" must be a string path`);
    if ('desc' in r && (typeof r.desc !== 'string' || !r.desc.trim())) errs.push(`${who} (${r.ability}): "desc" must be a non-empty string`);
    if (('name' in r || 'set' in r) && !('desc' in r)) errs.push(`${who} (${r.ability}): reskin (name/set override) requires "desc" — the base ability's description text/numbers no longer match`);
    if ('set' in r) {
      const s = r.set;
      if (typeof s !== 'object' || s === null || Array.isArray(s)) { errs.push(`${who} (${r.ability}): "set" must be an object`); continue; }
      for (const k of Object.keys(s)) {
        if (!KNOB_KEYS.includes(k)) { errs.push(`${who} (${r.ability}): unknown knob "${k}" (allowed: ${KNOB_KEYS.join(', ')})`); continue; }
        const v = s[k];
        if (k === 'range' && typeof v !== 'number') errs.push(`${who} (${r.ability}): knob "range" must be a number`);
        if ((k === 'dmg' || k === 'dc') && typeof v !== 'string' && typeof v !== 'number') errs.push(`${who} (${r.ability}): knob "${k}" must be a string or number`);
        if (k === 'dmgType' && !DAMAGE_TYPES.includes(v)) errs.push(`${who} (${r.ability}): knob "dmgType" must be a 5e damage type (${DAMAGE_TYPES.join('/')})`);
      }
    }
  }
  return errs;
}
