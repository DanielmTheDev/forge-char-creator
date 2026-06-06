# Cave Gnoll — unmatched statblock abilities (needs human authoring)

These statblock entries had NO match in `forge-abilities/CATALOG.json`, so they were
NOT auto-authored (security: image→statblock never invents abilities/macros). Author
each as a gate-proven forge-ability, then add its identifier to `cave-gnoll.json`'s
`abilities` array.

## Pack Tactics (trait)
> The gnoll has advantage on an attack roll against a creature if at least one of the
> gnoll's allies is within 5 feet of the creature and the ally isn't incapacitated.

Needs: a conditional grant-advantage trait. Closest existing pattern = `example-boon`
(grants advantage) but trigger differs (ally-adjacency, not on-cast). Author as a new
ability + T3 gate before referencing.
