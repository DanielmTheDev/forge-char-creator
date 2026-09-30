// Deletes residue that earlier (aborted) runs left in the test world. The world holds
// real campaign content, so only exact test-created names are touched.
export const TEST_NAME_RE = /\bE2E\b|^Aura Test Bot$|^Test (Advantage|Midi Damage)$|^(Auto|Advanced) Desc Test$/;
export const isTestName = n => TEST_NAME_RE.test(n ?? '');

const PACKS = ['forge-char-creator.forge-features', 'forge-char-creator.forge-effects'];

export async function sweepResidue(page) {
  return page.evaluate(async ([src, packs]) => {
    const re = new RegExp(src);
    const out = { actors: 0, tokens: 0, items: 0, packItems: 0, combats: 0 };
    // Combats only when every combatant is a test token/actor.
    for (const c of [...game.combats]) {
      if (c.combatants.size && c.combatants.every(x => re.test(x.name ?? '') || re.test(x.actor?.name ?? ''))) { await c.delete(); out.combats++; }
    }
    for (const s of game.scenes) {
      const ids = s.tokens.filter(t => re.test(t.name)).map(t => t.id);
      if (ids.length) { await s.deleteEmbeddedDocuments('Token', ids); out.tokens += ids.length; }
    }
    const actorIds = game.actors.filter(a => re.test(a.name)).map(a => a.id);
    if (actorIds.length) { await Actor.deleteDocuments(actorIds); out.actors = actorIds.length; }
    const itemIds = game.items.filter(i => re.test(i.name)).map(i => i.id);
    if (itemIds.length) { await Item.deleteDocuments(itemIds); out.items = itemIds.length; }
    for (const id of packs) {
      const pack = game.packs.get(id);
      if (!pack) continue;
      const ids = (await pack.getIndex()).filter(i => re.test(i.name)).map(i => i._id);
      if (!ids.length) continue;
      const locked = pack.locked;
      if (locked) await pack.configure({ locked: false });
      await pack.documentClass.deleteDocuments(ids, { pack: id });
      if (locked) await pack.configure({ locked: true });
      out.packItems += ids.length;
    }
    return out;
  }, [TEST_NAME_RE.source, PACKS]);
}
