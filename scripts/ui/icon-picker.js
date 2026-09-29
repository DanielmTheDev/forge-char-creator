/**
 * Searchable icon grid over Foundry's core icons/ tree.
 * The index is built once per session (BFS over FilePicker.browse) and memoized.
 * suggestTerms / matchIcons / loadIconIndex are pure so node can test them
 * (scripts/ui/icon-picker.test.mjs); IconPickerApp is the browser-only UI.
 */

// Name word → extra search words (core icon folders/files use these terms).
const KEYWORDS = {
  bite: ["bite", "fang"], fang: ["fang"], jaws: ["bite", "fang"], claw: ["claw"], talon: ["claw", "talon"],
  tail: ["tail"], horn: ["horn"], gore: ["horn"], sting: ["stinger", "sting"], stinger: ["stinger"],
  sword: ["sword"], blade: ["sword", "blade"], axe: ["axe"], mace: ["mace"], hammer: ["hammer"], spear: ["spear"],
  dagger: ["dagger"], bow: ["bow", "arrow"], arrow: ["arrow"], shot: ["arrow"], whip: ["whip"], lash: ["whip", "tentacle"],
  tentacle: ["tentacle"], slam: ["fist"], punch: ["fist"], fist: ["fist"], breath: ["breath"], roar: ["roar", "sound"],
  shield: ["shield"], heal: ["heal", "heart"], ward: ["shield", "ward"], curse: ["curse", "skull"], web: ["web"]
};
const DAMAGE_WORDS = {
  fire: ["fire", "flame"], cold: ["ice", "frost"], lightning: ["lightning"], poison: ["poison"], acid: ["acid"],
  necrotic: ["skull", "unholy"], radiant: ["holy", "light"], psychic: ["mind", "psychic"], thunder: ["thunder", "sound"],
  force: ["force", "energy"], piercing: ["pierc"], slashing: ["slash"], bludgeoning: ["blunt"]
};
const EXT = /\.(webp|png|svg|jpg|jpeg)$/i;

export function suggestTerms(name = "", damageType = "") {
  const out = new Set();
  for (const w of String(name).toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2)) {
    out.add(w);
    for (const k of KEYWORDS[w] ?? []) out.add(k);
  }
  for (const k of DAMAGE_WORDS[damageType] ?? []) out.add(k);
  return [...out];
}

export function matchIcons(paths, query, limit = 200) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const res = [];
  for (const p of paths) {
    const lp = p.toLowerCase();
    if (words.every(w => lp.includes(w))) {
      res.push(p);
      if (res.length >= limit) break;
    }
  }
  return res;
}

let indexPromise = null;
export function _resetIconIndex() { indexPromise = null; }

/**
 * @param {(dir: string) => Promise<{dirs: string[], files: string[]}>} browse
 * @param {{get: () => string[]|null, set: (files: string[]) => void}} [cache]  persisted index (optional)
 */
export function loadIconIndex(browse, cache = null) {
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    try {
      const hit = cache?.get();
      if (Array.isArray(hit) && hit.length) return hit;
    } catch { /* storage unavailable: index live */ }
    const files = [], queue = ["icons"];
    let failed = 0, ok = 0;
    const worker = async () => {
      while (queue.length) {
        const dir = queue.shift();
        try {
          const r = await browse(dir);
          ok++;
          queue.push(...(r?.dirs ?? []));
          files.push(...(r?.files ?? []).filter(f => EXT.test(f)));
        } catch { failed++; }  // unreadable dir: skip it
      }
    };
    // Workers exit when the queue is momentarily empty; loop until truly drained.
    while (queue.length) await Promise.all(Array.from({ length: 16 }, worker));
    // Nothing readable at all: don't cache the empty result, let the next open retry.
    if (!ok && failed) indexPromise = null;
    else if (files.length) try { cache?.set(files); } catch { /* quota / blocked: fine */ }
    return files;
  })();
  return indexPromise;
}

// ── UI (browser only) ───────────────────────────────────────────────────────

// Core icons only change with the Foundry version, so the index is persisted per version.
function storageCache() {
  const key = `forge-char-creator.iconIndex.${game.version}`;
  return {
    get: () => JSON.parse(localStorage.getItem(key) ?? "null"),
    set: files => localStorage.setItem(key, JSON.stringify(files))
  };
}

function browsePublic(dir) {
  return foundry.applications.apps.FilePicker.implementation.browse("public", dir);
}

/** Index in the background (e.g. at ready) so the first picker open is instant. */
export function warmIconIndex() {
  return loadIconIndex(browsePublic, storageCache()).catch(() => []);
}

const Base = globalThis.foundry?.applications?.api
  ? foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
  : class {};

export class IconPickerApp extends Base {
  static DEFAULT_OPTIONS = {
    id: "forge-icon-picker",
    classes: ["forge-icon-picker"],
    window: { title: "Choose Icon", icon: "fas fa-icons", resizable: true },
    position: { width: 560, height: 520 }
  };

  static PARTS = { body: { template: "./modules/forge-char-creator/templates/icon-picker.hbs" } };

  #resolve = null;
  #opts = {};
  #paths = [];
  #settled = false;

  /** Open the picker; resolves with the chosen path, or null when closed without a pick. */
  static pick(opts = {}) {
    return new Promise(resolve => {
      const app = new IconPickerApp();
      app.#opts = opts;
      app.#resolve = resolve;
      app.render(true);
    });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const el = this.element;
    const input = el.querySelector(".ip-search");
    const grid = el.querySelector(".ip-grid");
    const status = el.querySelector(".ip-status");
    const FP = foundry.applications.apps.FilePicker.implementation;

    el.querySelector(".ip-browse").addEventListener("click", () => {
      new FP({ type: "image", current: this.#opts.current, callback: p => this.#choose(p) }).render(true);
    });
    el.addEventListener("keydown", e => this.#onKey(e, grid, input));
    input.focus();

    status.textContent = "Indexing icons… (first time only)";
    this.#paths = await loadIconIndex(browsePublic, storageCache());
    if (!this.rendered) return;

    const draw = () => {
      const q = input.value.trim();
      let list;
      if (q) list = matchIcons(this.#paths, q);
      else {
        const seen = new Set();
        list = suggestTerms(this.#opts.name, this.#opts.damageType)
          .flatMap(t => matchIcons(this.#paths, t, 40))
          .filter(p => !seen.has(p) && seen.add(p));
        if (!list.length) list = this.#paths.slice(0, 200);
      }
      status.textContent = !this.#paths.length ? "No icons found."
        : q ? `${list.length}${list.length === 200 ? "+" : ""} matches`
        : "Suggestions from the name — type to search";
      grid.innerHTML = list.map(p => `
        <button type="button" class="ip-cell" data-path="${p}" data-tooltip="${p.split("/").pop()}">
          <img src="${p}" loading="lazy" alt="">
        </button>`).join("");
      grid.querySelectorAll(".ip-cell").forEach(b => b.addEventListener("click", () => this.#choose(b.dataset.path)));
    };
    let timer = null;
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(draw, 150); });
    draw();
  }

  // Search box: ↓ enters the grid, Enter picks the first hit. Grid: arrows move, Enter/Space pick (native button).
  #onKey(e, grid, input) {
    if (e.key === "Escape") {
      // Esc inside the search field would otherwise just blur it.
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }
    const cells = [...grid.querySelectorAll(".ip-cell")];
    if (!cells.length) return;
    const cur = cells.indexOf(document.activeElement);
    const cols = Math.max(1, Math.round(grid.clientWidth / (cells[0].offsetWidth || 56)));
    const move = d => { e.preventDefault(); cells[Math.max(0, Math.min(cells.length - 1, cur + d))].focus(); };
    if (document.activeElement === input) {
      if (e.key === "ArrowDown") { e.preventDefault(); cells[0].focus(); }
      else if (e.key === "Enter") { e.preventDefault(); cells[0].click(); }
      return;
    }
    if (cur < 0) return;
    if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowDown") move(cols);
    else if (e.key === "ArrowUp") {
      if (cur < cols) { e.preventDefault(); input.focus(); }
      else move(-cols);
    }
  }

  #choose(path) {
    if (this.#settled) return;
    this.#settled = true;
    this.#resolve?.(path);
    this.close();
  }

  async close(options) {
    if (!this.#settled) {
      this.#settled = true;
      this.#resolve?.(null);
    }
    return super.close(options);
  }
}
