/**
 * Step navigation for long forms. Sections `.fc-step[data-step][data-title]` become
 * steps; a nav is rendered into `.fc-steps-nav`, shortcut hints into `.fc-keys`.
 * Hidden sections (`hidden` attribute) are skipped by the nav, numbering and keys.
 *
 * Keys (only while focus is inside root):
 *   Alt+← / Alt+→  previous / next step   (Ctrl+arrow stays word-jump in text fields)
 *   Alt+1..9       jump to the nth visible step
 *   Ctrl+Enter     create (onCreate)
 */
const FOCUSABLE = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])";

export function attachStepper(root, { onCreate, onStepChange } = {}) {
  root.classList.add("fc-stepped");
  const nav = root.querySelector(".fc-steps-nav");
  const keys = root.querySelector(".fc-keys");
  if (keys) keys.textContent = "Alt+←/→ step · Alt+1–9 jump · Ctrl+Enter create";
  let currentId = null;

  const all = () => [...root.querySelectorAll(".fc-step")];
  const visible = () => all().filter(s => !s.hidden);

  function renderNav() {
    if (!nav) return;
    nav.innerHTML = visible().map((s, i) => `
      <button type="button" class="fc-nav-btn" data-go="${s.dataset.step}" data-tooltip="Alt+${i + 1}"
              ${s.dataset.step === currentId ? 'aria-current="step"' : ""}>${i + 1}. ${s.dataset.title}</button>`).join("");
    nav.querySelectorAll(".fc-nav-btn").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
  }

  function go(id, { focus = true } = {}) {
    const steps = visible();
    const target = steps.find(s => s.dataset.step === id) ?? steps[0];
    if (!target) return;
    currentId = target.dataset.step;
    all().forEach(s => s.classList.toggle("active", s === target));
    renderNav();
    if (focus) [...target.querySelectorAll(FOCUSABLE)].find(n => n.offsetParent !== null)?.focus();
    onStepChange?.(currentId);
  }

  const index = () => visible().findIndex(s => s.dataset.step === currentId);
  const next = () => { const v = visible(); go(v[Math.min(v.length - 1, index() + 1)]?.dataset.step); };
  const prev = () => { const v = visible(); go(v[Math.max(0, index() - 1)]?.dataset.step); };

  // Re-read hidden flags after visibility changes. If the active step vanished,
  // fall back to the nearest visible step before it.
  function refresh() {
    const steps = all();
    const cur = steps.find(s => s.dataset.step === currentId);
    if (!cur || cur.hidden) {
      const before = steps.slice(0, steps.indexOf(cur) + 1).reverse().find(s => !s.hidden);
      go(before?.dataset.step ?? visible()[0]?.dataset.step, { focus: false });
    } else renderNav();
  }

  root.addEventListener("keydown", (e) => {
    let handled = true;
    if (e.altKey && !e.ctrlKey && e.key === "ArrowRight") next();
    else if (e.altKey && !e.ctrlKey && e.key === "ArrowLeft") prev();
    else if (e.altKey && !e.ctrlKey && /^Digit[1-9]$/.test(e.code)) {
      const s = visible()[Number(e.code.slice(5)) - 1];
      if (s) go(s.dataset.step);
    }
    else if (e.ctrlKey && !e.altKey && e.key === "Enter") {
      if (!e.repeat) {
        // Fields bind on "change", which only fires on blur: flush the one being typed in.
        const a = document.activeElement;
        if (a && root.contains(a) && "value" in a) a.dispatchEvent(new Event("change", { bubbles: true }));
        onCreate?.();
      }
    }
    else handled = false;
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  });

  go(visible()[0]?.dataset.step);
  return { go, next, prev, refresh, current: () => currentId };
}
