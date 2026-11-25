const host = document.querySelector(".widget");
const counts = new Map();
const obs = new MutationObserver(ms => { for (const m of ms) { const el = m.target; if (el.closest && el.closest(".lan, .la-head")) continue; counts.set(el, (counts.get(el) || 0) + 1); } });
obs.observe(host, { subtree: true, attributes: true, attributeFilter: ["class"] });
await W(4000);
obs.disconnect();
const top = [...counts].filter(([, n]) => n >= 20).sort((a, b) => b[1] - a[1]).slice(0, 8)
  .map(([el, n]) => `${n}x ${el.tagName}.${(el.getAttribute("class") || "").replace(/ /g, ".")} ${(el.getAttribute("d") || el.textContent || "").slice(0, 30)}`);
log("FLICKER(4s)", top.length ? "\n  " + top.join("\n  ") : "none");
