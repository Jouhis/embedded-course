/* Light / dark theme switch. Loaded in <head> right after course.css, so the saved choice is
 * applied before the page is drawn (no flash of the wrong theme).
 *
 * Dark is the default. Light, or Auto (follow the system setting), is saved in localStorage and
 * set as <html data-theme="light|auto">; course.css picks its colours through light-dark().
 * The button goes into the top bar (.course-nav) when the page has one, else top right. */
(function () {
  "use strict";
  const KEY = "embedded-course-theme";
  const MODES = ["dark", "light", "auto"];
  const LOOK = { auto: ["◐", "Auto"], light: ["☀", "Light"], dark: ["☾", "Dark"] };
  const root = document.documentElement;

  function saved() {
    try { const v = localStorage.getItem(KEY); return MODES.includes(v) ? v : "dark"; }
    catch (e) { return "dark"; }
  }
  function apply(mode) {
    if (mode === "dark") delete root.dataset.theme; else root.dataset.theme = mode;
  }
  apply(saved());

  let btn = null;
  function label(mode) {
    if (!btn) return;
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    btn.textContent = `${LOOK[mode][0]} ${LOOK[mode][1]}`;
    btn.title = `Theme: ${LOOK[mode][1]}${mode === "auto" ? " (follows your system)" : ""}. Click for ${LOOK[next][1]}.`;
    btn.setAttribute("aria-label", btn.title);
  }

  function mount() {
    if (btn) return;
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-btn";
    btn.addEventListener("click", () => {
      const mode = MODES[(MODES.indexOf(saved()) + 1) % MODES.length];
      try { if (mode === "dark") localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch (e) {}
      apply(mode);
      label(mode);
    });
    const nav = document.querySelector(".course-nav");
    if (nav) nav.appendChild(btn);
    else { btn.classList.add("floating"); document.body.appendChild(btn); }
    label(saved());
  }
  // After course.js has built the lesson top bar (it does so on DOMContentLoaded too).
  const later = () => setTimeout(mount, 0);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", later);
  else later();

  // Another tab changed the theme.
  window.addEventListener("storage", e => { if (e.key === KEY) { apply(saved()); label(saved()); } });
})();
