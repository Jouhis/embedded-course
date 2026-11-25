// Append to shoot.py --do after a scenario. Watches class changes in the scene for 4 s and lists every element
// that changed 20+ times, or that held a state for less than 80 ms of real time 3+ times: both read as flicker.
// Analyzer lanes are skipped (they are meant to move).
const host = document.querySelector(".widget");
const rec = new Map();
const obs = new MutationObserver(ms => {
  const now = performance.now();
  for (const m of ms) {
    const el = m.target;
    if (el.closest && el.closest(".lan, .la-head")) continue;
    const r = rec.get(el) || { n: 0, short: 0, last: now };
    if (now - r.last < 80) r.short++;
    r.n++; r.last = now; rec.set(el, r);
  }
});
obs.observe(host, { subtree: true, attributes: true, attributeFilter: ["class"] });
await W(4000);
obs.disconnect();
const top = [...rec].filter(([, r]) => r.n >= 20 || r.short >= 3).sort((a, b) => b[1].n - a[1].n).slice(0, 8)
  .map(([el, r]) => `${r.n}x (${r.short} short) ${el.tagName}.${(el.getAttribute("class") || "").replace(/ /g, ".")} ${(el.getAttribute("d") || el.textContent || "").slice(0, 30)}`);
log("FLICKER(4s)", top.length ? "\n  " + top.join("\n  ") : "none");
