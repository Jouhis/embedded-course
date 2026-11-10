/* Small SVG line plots for the course widgets (signals and others). No dependencies.
 *
 *   const svg = Plot.chart({
 *     w: 640, h: 220, x: [0, 1200], y: [20, 70], xlabel: "time (s)", ylabel: "°C",
 *     series: [{ pts: [[x, y], ...], cls: "s1", label: "temperature", dots: false, step: false, dash: false }],
 *     hlines: [{ y: 60, label: "setpoint" }], vlines: [{ x: 105, label: "settled" }],
 *     bands: [{ y0: 59, y1: 61 }]   (optional cls: "warn" | "acc", optional label drawn inside the band at its bottom left)
 *   });
 * Series colours come from CSS classes .plot .s1 ... .s5, set from the course palette.
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const CSS = `
  .plot{width:100%;height:auto;display:block;font-family:var(--sans);font-size:11px;overflow:visible}
  .plot .ax{stroke:var(--rule);stroke-width:1} .plot .grid{stroke:var(--rule);stroke-width:.5;opacity:.6}
  .plot text{fill:var(--muted)} .plot .ln{fill:none;stroke-width:2;stroke-linejoin:round}
  .plot .hl{stroke:var(--muted);stroke-dasharray:5 4;stroke-width:1} .plot .band{fill:var(--good-soft);opacity:.7} .plot .band.warn{fill:var(--warn-soft);opacity:.8} .plot .band.acc{fill:var(--accent-soft);opacity:1} .plot .bandl{fill:var(--warn);font-size:10px}
  .plot .s1{stroke:var(--accent);fill:var(--accent)} .plot .s2{stroke:light-dark(#d9480f,#ff922b);fill:light-dark(#d9480f,#ff922b)} .plot .s3{stroke:light-dark(#7048e8,#9775fa);fill:light-dark(#7048e8,#9775fa)}
  .plot .s4{stroke:var(--good);fill:var(--good)} .plot .s5{stroke:var(--muted);fill:var(--muted)} .plot .s6{stroke:light-dark(#c2255c,#f06595);fill:light-dark(#c2255c,#f06595)}
  .plot .ln.s1,.plot .ln.s2,.plot .ln.s3,.plot .ln.s4,.plot .ln.s5,.plot .ln.s6{fill:none}
  .plot .dash{stroke-dasharray:6 4} .plot .thin{stroke-width:1.2}
  .plot .lg text{fill:var(--fg)}`;

  function css() {
    if (document.getElementById("plot-css")) return;
    const s = document.createElement("style"); s.id = "plot-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function node(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function ticks(lo, hi, n) {
    const span = hi - lo, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const fmt = v => (Math.abs(v) >= 1000 || Number.isInteger(v) ? String(Math.round(v)) : String(+v.toFixed(2)));

  function chart(o) {
    css();
    const w = o.w || 640, h = o.h || 220, L = 46, R = 10, T = o.legendTop === false ? 10 : 24, B = 30;
    const [x0, x1] = o.x, [y0, y1] = o.y;
    const X = x => L + (x - x0) / (x1 - x0) * (w - L - R), Y = y => h - B - (y - y0) / (y1 - y0) * (h - T - B);
    const svg = node("svg", { viewBox: `0 0 ${w} ${h}`, class: "plot", role: "img", "aria-label": o.label || "plot" });
    (o.bands || []).forEach(b => { node("rect", { class: "band" + (b.cls ? " " + b.cls : ""), x: L, y: Y(b.y1), width: w - L - R, height: Math.max(0, Y(b.y0) - Y(b.y1)) }, svg); if (b.label) node("text", { class: "bandl", x: L + 4, y: Y(b.y0) - 4 }, svg).textContent = b.label; });
    ticks(y0, y1, 5).forEach(v => { node("line", { class: "grid", x1: L, x2: w - R, y1: Y(v), y2: Y(v) }, svg); node("text", { x: L - 5, y: Y(v) + 4, "text-anchor": "end" }, svg).textContent = fmt(v); });
    ticks(x0, x1, 8).forEach(v => node("text", { x: X(v), y: h - B + 14, "text-anchor": "middle" }, svg).textContent = fmt(v));
    node("line", { class: "ax", x1: L, x2: w - R, y1: h - B, y2: h - B }, svg);
    node("line", { class: "ax", x1: L, x2: L, y1: T, y2: h - B }, svg);
    if (o.xlabel) node("text", { x: w - R, y: h - 3, "text-anchor": "end" }, svg).textContent = o.xlabel;
    if (o.ylabel) node("text", { x: 4, y: T - 8 }, svg).textContent = o.ylabel;
    (o.hlines || []).forEach(l => { node("line", { class: "hl", x1: L, x2: w - R, y1: Y(l.y), y2: Y(l.y) }, svg); if (l.label) node("text", { x: w - R - 2, y: Y(l.y) - 4, "text-anchor": "end" }, svg).textContent = l.label; });
    (o.vlines || []).forEach(l => { node("line", { class: "hl", x1: X(l.x), x2: X(l.x), y1: T, y2: h - B }, svg); if (l.label) node("text", { x: X(l.x) + 3, y: T + 10 }, svg).textContent = l.label; });
    const clip = v => Math.max(y0 - (y1 - y0) * 0.05, Math.min(y1 + (y1 - y0) * 0.05, v));
    let lx = Math.max(L + 4, o.ylabel ? 4 + o.ylabel.length * 6.2 + 18 : 0);
    (o.series || []).forEach(s => {
      if (!s.pts.length) return;
      if (s.dots) s.pts.forEach(([x, y]) => node("circle", { cx: X(x), cy: Y(clip(y)), r: s.r || 2.2, class: s.cls }, svg));
      if (!s.dotsOnly) {
        let d = "";
        s.pts.forEach(([x, y], i) => {
          const px = X(x).toFixed(1), py = Y(clip(y)).toFixed(1);
          if (i === 0) d = `M${px},${py}`;
          else if (s.step) d += `H${px}V${py}`;
          else d += `L${px},${py}`;
        });
        node("path", { d, class: "ln " + s.cls + (s.dash ? " dash" : "") + (s.thin ? " thin" : "") }, svg);
      }
      if (s.label && o.legendTop !== false) {
        const g = node("g", { class: "lg" }, svg);
        node("line", { x1: lx, x2: lx + 16, y1: 9, y2: 9, class: "ln " + s.cls + (s.dash ? " dash" : "") }, g);
        const t = node("text", { x: lx + 20, y: 13 }, g); t.textContent = s.label;
        lx += 30 + s.label.length * 6.2;
      }
    });
    return svg;
  }

  // A seeded random generator, so "new noise" is repeatable within a page view.
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  window.Plot = { chart, rng, gauss, node };
})();
