import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestTerms, matchIcons, loadIconIndex, _resetIconIndex } from "./icon-picker.js";

test("suggestTerms maps keywords + damage type + name words", () => {
  const t = suggestTerms("Venomous Bite", "poison");
  for (const w of ["bite", "fang", "poison", "venomous"]) assert.ok(t.includes(w), `${w} in ${t}`);
  assert.deepEqual(suggestTerms("", ""), []);
});

test("matchIcons requires all words, case-insensitive, limited", () => {
  const p = ["icons/creatures/abilities/fang-bite-red.webp", "icons/magic/fire/flame.webp", "icons/creatures/claws/claw.webp"];
  assert.deepEqual(matchIcons(p, "Fang bite"), [p[0]]);
  assert.deepEqual(matchIcons(p, "creatures", 1), [p[0]]);
  assert.deepEqual(matchIcons(p, ""), p);
});

test("loadIconIndex BFS keeps images only, memoized", async () => {
  _resetIconIndex();
  const tree = { icons: { dirs: ["icons/a", "icons/b"], files: ["icons/x.webp", "icons/readme.txt"] },
                 "icons/a": { dirs: [], files: ["icons/a/1.png"] }, "icons/b": { dirs: [], files: ["icons/b/2.svg"] } };
  let calls = 0;
  const browse = async d => { calls++; return tree[d]; };
  const a = await loadIconIndex(browse);
  const b = await loadIconIndex(browse);
  assert.deepEqual([...a].sort(), ["icons/a/1.png", "icons/b/2.svg", "icons/x.webp"]);
  assert.equal(a, b);
  assert.equal(calls, 3);
});

test("loadIconIndex skips unreadable dirs and retries after a total failure", async () => {
  _resetIconIndex();
  const bad = async () => { throw new Error("nope"); };
  assert.deepEqual(await loadIconIndex(bad), []);
  _resetIconIndex();
  const tree = { icons: { dirs: ["icons/a", "icons/broken"], files: [] }, "icons/a": { dirs: [], files: ["icons/a/1.webp"] } };
  const browse = async d => { if (!tree[d]) throw new Error("403"); return tree[d]; };
  assert.deepEqual(await loadIconIndex(browse), ["icons/a/1.webp"]);
});

test("loadIconIndex uses a persisted cache and writes one after indexing", async () => {
  _resetIconIndex();
  let stored = null, calls = 0;
  const cache = { get: () => stored, set: v => { stored = v; } };
  const browse = async () => { calls++; return { dirs: [], files: ["icons/a.webp"] }; };
  assert.deepEqual(await loadIconIndex(browse, cache), ["icons/a.webp"]);
  assert.deepEqual(stored, ["icons/a.webp"]);
  _resetIconIndex();
  assert.deepEqual(await loadIconIndex(browse, cache), ["icons/a.webp"]);
  assert.equal(calls, 1, "second session reads the cache, no browsing");
});

test("loadIconIndex ignores a broken cache", async () => {
  _resetIconIndex();
  const cache = { get: () => { throw new Error("storage blocked"); }, set: () => { throw new Error("quota"); } };
  const browse = async () => ({ dirs: [], files: ["icons/b.webp"] });
  assert.deepEqual(await loadIconIndex(browse, cache), ["icons/b.webp"]);
});
