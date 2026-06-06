# Image → Statblock — Iter 1 (design)

Date: 2026-06-06
Status: DONE
Plan: docs/superpowers/plans/2026-06-06-image-statblock-iter1.md

Roadmap D, sliced. Goal: feed a monster image into the EXISTING actor pipeline with
minimal manual work, producing a gate-valid `forge-npcs/<slug>.json`. D is a front-end
onto actor authoring — it emits nothing the build doesn't already consume.

## Decisions

- **Vision engine = Claude Code itself.** No API client, no key, no new deps. A skill
  (`.claude/skills/forge-image-statblock/`) directs Claude Code to Read the image and emit
  actor JSON per a documented schema. Fits the repo's all-Claude-Code workflow.
- **Match CATALOG only, stub the rest.** Statblock abilities matched against existing
  `forge-abilities` identifiers; matched → ref (+ dmg/dc/range knobs); unmatched → listed
  in `<slug>.STUBS.md` for human authoring. NO auto-generated abilities, NO macro JS.
- **Expect.json: auto-gen T2, scaffold T3.** Derivable T2 asserts written by a script;
  T3 combat damage needs a real run → only scaffolded.

## Security (why match-only)

TODO.md: "image→statblock auto-gen MUST NOT auto-run untrusted generated macros." Iter 1
generates ZERO executable content (no `flags.dae.macro.command`, no new ability JSON, no
shape knobs). The validator HARD-fails any ability ref not in `_CATALOG.json`, so nothing
un-vetted reaches Foundry. Build/commit is a deliberate human step after validate.

## What shipped

- `scripts/pack-tools/catalog.mjs` — new `buildCatalogJson(rows)` + writes
  `forge-abilities/_CATALOG.json` (machine twin of CATALOG.md) at every packs:build.
  `_`-prefixed so the doc-globs (build/loadAbilityMap/readRows) skip it.
- `forge-content/docs/statblock-schema.md` — canonical actor JSON contract + hard rules.
- `scripts/pack-tools/statblock-validate.mjs` — pure `validateStatblock(doc, catalogIds,
  iconExists, slug)`; stats ranges, `_id===genId(slug)`, icon-path existence, refs ∈ catalog
  (delegates ref/knob shape to `schema.mjs#validateActorRefs`). CLI + `content:statblock-validate`.
- `.claude/skills/forge-image-statblock/SKILL.md` — the procedure Claude Code follows.
- `scripts/pack-tools/gen-expect.mjs` — `t2ExpectFor`/`t3ScaffoldFor` (pure) + CLI; writes
  T2 expect (auto) and `--t3` scaffold; never overwrites a hand-edited expect.
- Demo fixture `forge-npcs/cave-gnoll.json` (+ `.expect.json` auto-gen, `.STUBS.md`):
  proves image-shaped authoring → validate → gen-expect → build → T2 gate, reusing
  `example-strike` (knobbed "Rending Bite") — no new mechanic (test-explosion guard).

## Verification

- `content:unit` 113 pass (95 existing + 12 validator + 3 gen-expect + 3 catalog-json).
- `packs:build forge-content` — `_CATALOG.json` (10 entries); Cave Gnoll inlines + 16-char
  re-key passes `injectKeys`.
- Validator mutation-tested: str=25 → RED, unknown ref → RED, revert → GREEN.
- `content:verify` — Cave Gnoll T2 green alongside existing 4 NPCs + 10 abilities.

## Deferred (later iters)

- D-iter2: unmatched-ability authoring loop (each gate-proven), fill T3 scaffold values.
- D-iter3: batch import, token-image generation (TODO `## Icons`), CI hook (intersects
  open C-gate: publish should be gated by B).
