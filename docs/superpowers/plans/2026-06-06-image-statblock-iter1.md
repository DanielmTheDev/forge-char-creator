# Image → Statblock — Iter 1 (plan)

Date: 2026-06-06
Status: DONE
Spec: docs/superpowers/specs/2026-06-06-image-statblock-iter1-design.md

Roadmap D, Iter 1: image → gate-valid `forge-npcs/<slug>.json`. Vision engine = Claude
Code itself; match CATALOG only (stub the rest); auto-gen T2 expect, scaffold T3.

## Steps (all complete)

1. `catalog.mjs` — `buildCatalogJson(rows)` + write `_CATALOG.json` (machine twin) at
   packs:build. `_`-prefixed so doc-globs skip it. +3 unit tests.
2. `forge-content/docs/statblock-schema.md` — actor JSON contract + hard security rules.
3. `scripts/pack-tools/statblock-validate.mjs` (+ `.test.mjs`, 12) — `validateStatblock`;
   reuses `schema.mjs#validateActorRefs` for ref/knob shape; checks `_id===genId(slug)`,
   stat ranges, icon-path existence, refs ∈ catalog (hard fail). npm `content:statblock-validate`.
4. `.claude/skills/forge-image-statblock/SKILL.md` — Claude-Code procedure (read image →
   match `_CATALOG.json` → emit actor + STUBS → validate → gen-expect → stop for review).
5. `scripts/pack-tools/gen-expect.mjs` (+ `.test.mjs`, 3) — `t2ExpectFor`/`t3ScaffoldFor`;
   never overwrites hand-edited expects. npm `content:gen-expect`.
6. Docs/tracking: this plan + spec, TODO `## Roadmap → D` section, memory note.

## Verification (all green)

- `npm run content:unit` → 113 pass.
- `npm run packs:build forge-content` → `_CATALOG.json` (10); Cave Gnoll demo inlines +
  16-char re-key passes injectKeys.
- Demo dry-run: hand-authored `cave-gnoll.json` (as the skill emits) → validate clean →
  `gen-expect` wrote `cave-gnoll.expect.json` with `hasItems:["Rending Bite"]` (knob rename
  resolved). `cave-gnoll.STUBS.md` lists unmatched "Pack Tactics".
- Validator mutation: str=25 → RED, unknown ref → RED, revert → GREEN.
- `npm run content:verify` → Cave Gnoll T2 green + existing suite green.

## Deferred

- D-iter2: author stubbed abilities (gate-proven), fill T3 scaffold damage from real runs.
- D-iter3: batch, token-image gen, CI (intersects open C-gate).
