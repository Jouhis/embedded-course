/* Logic sandbox: gates you can click, for the digital logic lessons (22 to 25). Load after course.js.
 *
 *   <div class="widget logicsim" data-title="XOR from four gates">
 *     <script type="application/json">
 *     { "width": 480, "height": 160,
 *       "inputs":  [{ "id": "A", "x": 10, "y": 25 }, { "id": "B", "x": 10, "y": 115 }],
 *       "gates":   [{ "id": "or1", "type": "OR", "x": 120, "y": 30, "in": ["A", "B"], "label": "A OR B" },
 *                   { "id": "n1", "type": "NOT", "x": 200, "y": 100, "in": [{ "from": "or1", "via": 190 }] }],
 *       "outputs": [{ "id": "Y", "from": "n1", "x": 390, "y": 65, "label": "Y" }],
 *       "probes":  ["or1"] }
 *     </script>
 *   </div>
 *
 * Coordinates are SVG pixels; each part's x, y is its top-left corner.
 *   inputs   a switch, 40 x 30; output pin at (x + 40, y + 15). Click it to toggle.
 *   gates    AND, OR, XOR, NAND, NOR, NOT, BUF: 60 x 40; inputs at y + 10 and y + 30 (one input: y + 20),
 *            output at (x + 60, y + 20).
 *            DFF (edge-triggered) and LATCH (level-sensitive): 60 x 60; "in" is [D, CLK or EN];
 *            inputs at y + 15 and y + 45, output Q at (x + 60, y + 15). Q starts at 0.
 *   outputs  a lamp; its pin is at (x, y + 15).
 * A wire runs from its source pin right to x = "via", then vertically, then right to the pin. "via" defaults
 * to halfway. For a feedback wire, give "path": the corner points, e.g. [[280, 65], [280, 8], [85, 8], [85, 30]].
 * A dot marks where a signal branches.
 *
 * Without flip-flops or latches the widget shows a truth table: input columns, "probes" (gate outputs
 * worth seeing, titled by the gate's "label") and the outputs. Output cells stay "?" until that row has
 * been tried, so the learner predicts before clicking. With flip-flops or latches it shows a timing
 * diagram of the "trace" ids (default: inputs and outputs) instead, one step per click. It keeps the
 * last "history" steps (default 24). "auto": { "input": "CLK", "ms": 400 } adds a Run button that
 * toggles that input every "ms" milliseconds, so a clock runs by itself; click again to pause.
 */
(function () {
  "use strict";

  const CSS = `
  .logicsim svg{width:100%;height:auto;display:block;max-width:var(--ls-w);margin:.5rem 0}
  .logicsim .w{fill:none;stroke:var(--muted);stroke-width:2;opacity:.55}
  .logicsim .w.v1{stroke:var(--good);stroke-width:3.2;opacity:1}
  .logicsim .dot{fill:var(--muted)} .logicsim .dot.v1{fill:var(--good)}
  .logicsim .g path,.logicsim .g circle,.logicsim .g rect{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.6}
  .logicsim .g .lead{fill:none;stroke:var(--fg);stroke-width:1.6}
  .logicsim text{font-family:var(--mono);font-size:10px;fill:var(--muted)}
  .logicsim text.nm{font-family:var(--sans);font-weight:700;font-size:12px;fill:var(--fg)}
  .logicsim .sw{cursor:pointer}
  .logicsim .sw rect{fill:var(--bg);stroke:var(--fg);stroke-width:1.6}
  .logicsim .sw.v1 rect{fill:var(--good);stroke:var(--good)}
  .logicsim .sw text.val{font-size:14px;font-weight:700;fill:var(--fg)}
  .logicsim .sw.v1 text.val{fill:var(--bg)}
  .logicsim .sw:focus{outline:none} .logicsim .sw:focus rect{stroke:var(--accent);stroke-width:3}
  .logicsim .lamp circle{fill:var(--bg);stroke:var(--fg);stroke-width:1.6}
  .logicsim .lamp.v1 circle{fill:#f5b400;stroke:#c98f00;filter:drop-shadow(0 0 6px #f5b400)}
  .logicsim .ls-note{font-family:var(--sans);font-size:.85rem;color:var(--muted);margin:.25rem 0}
  .logicsim table.tt{font-family:var(--mono);font-size:.85rem;margin:.5rem 0}
  .logicsim table.tt td,.logicsim table.tt th{text-align:center;padding:.15rem .6rem}
  .logicsim table.tt tr.cur td{background:var(--accent-soft);font-weight:700}
  .logicsim table.tt td.unk{color:var(--muted)}
  .logicsim table.tt th.out{color:var(--accent)}
  .logicsim .tm path{fill:none;stroke:var(--accent);stroke-width:2}
  .logicsim .tm .grid{stroke:var(--rule);stroke-width:1}
  .logicsim .tm text{font-size:11px;fill:var(--fg)}`;

  const BODY = {
    AND:  { d: "M6 0 H27 A20 20 0 0 1 27 40 H6 Z", lead: 6, end: 47 },
    NAND: { d: "M6 0 H27 A20 20 0 0 1 27 40 H6 Z", lead: 6, end: 47, bubble: true },
    OR:   { d: "M2 0 Q18 20 2 40 Q34 40 47 20 Q34 0 2 0 Z", lead: 8, end: 47 },
    NOR:  { d: "M2 0 Q18 20 2 40 Q34 40 47 20 Q34 0 2 0 Z", lead: 8, end: 47, bubble: true },
    XOR:  { d: "M8 0 Q24 20 8 40 Q36 40 47 20 Q36 0 8 0 Z", extra: "M2 0 Q18 20 2 40", lead: 8, end: 47 },
    NOT:  { d: "M6 2 L43 20 L6 38 Z", lead: 6, end: 43, bubble: true, one: true },
    BUF:  { d: "M6 2 L47 20 L6 38 Z", lead: 6, end: 47, one: true },
  };
  const FN = {
    AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b,
    NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b), NOT: a => 1 - a, BUF: a => a,
  };
  const NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function injectCss() {
    if (document.getElementById("logicsim-css")) return;
    const s = document.createElement("style");
    s.id = "logicsim-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function mount(box) {
    const E = window.Course.el;
    const src = box.querySelector('script[type="application/json"]');
    let spec;
    try { spec = JSON.parse(src.textContent); }
    catch (e) { box.appendChild(E("p", { text: "logicsim: bad JSON: " + e.message })); return; }
    const inputs = spec.inputs || [], gates = spec.gates || [], outputs = spec.outputs || [];
    const isFF = g => g.type === "DFF" || g.type === "LATCH";
    const sequential = gates.some(isFF);
    const byId = {};
    inputs.forEach(p => { byId[p.id] = { kind: "in", p }; });
    gates.forEach(g => { byId[g.id] = { kind: "gate", p: g }; g.in = g.in.map(s => (typeof s === "string" ? { from: s } : s)); });

    // ---- state and evaluation
    const val = {}, q = {};
    inputs.forEach(p => { val[p.id] = p.value ? 1 : 0; });
    gates.forEach(g => { val[g.id] = 0; if (isFF(g)) q[g.id] = 0; });
    const v = id => val[id] || 0;
    function settle() {
      for (let pass = 0; pass < 32; pass++) {
        let changed = false;
        gates.forEach(g => {
          let out;
          if (g.type === "DFF") out = q[g.id];
          else if (g.type === "LATCH") { if (v(g.in[1].from)) q[g.id] = v(g.in[0].from); out = q[g.id]; }
          else out = FN[g.type](v(g.in[0].from), g.in[1] ? v(g.in[1].from) : 0);
          if (out !== val[g.id]) { val[g.id] = out; changed = true; }
        });
        if (!changed) return;
      }
    }
    function toggle(id) {
      const dffs = gates.filter(g => g.type === "DFF");
      const clkBefore = dffs.map(g => v(g.in[1].from)), dBefore = dffs.map(g => v(g.in[0].from));
      val[id] = 1 - val[id];
      settle();
      let edge = false;
      dffs.forEach((g, i) => { if (!clkBefore[i] && v(g.in[1].from)) { q[g.id] = dBefore[i]; edge = true; } });
      if (edge) settle();
      record();
      render();
    }

    // ---- drawing
    const pinOut = id => {
      const n = byId[id];
      if (!n) throw new Error(`logicsim: unknown source "${id}"`);
      const p = n.p;
      if (n.kind === "in") return [p.x + 40, p.y + 15];
      return [p.x + 60, p.y + (isFF(p) ? 15 : 20)];
    };
    const pinIn = (g, i) => {
      if (isFF(g)) return [g.x, g.y + (i ? 45 : 15)];
      if (BODY[g.type].one) return [g.x, g.y + 20];
      return [g.x, g.y + (i ? 30 : 10)];
    };

    box.style.setProperty("--ls-w", (spec.width || 480) * 1.5 + "px");
    box.appendChild(E("h3", { text: box.dataset.title || "Logic sandbox" }));
    const svg = svgEl("svg", { viewBox: `0 0 ${spec.width || 480} ${spec.height || 160}`, role: "img",
      "aria-label": box.dataset.title || "Logic circuit" });
    const wireLayer = svgEl("g", {}, svg), partLayer = svgEl("g", {}, svg);
    const wires = [];   // {el, src}

    // wires, grouped by source so branches get a dot
    const fan = {};
    const allSinks = [];
    gates.forEach(g => g.in.forEach((s, i) => allSinks.push({ src: s.from, via: s.via, path: s.path, to: pinIn(g, i) })));
    outputs.forEach(o => allSinks.push({ src: o.from, via: o.via, path: o.path, to: [o.x, o.y + 15] }));
    allSinks.forEach(s => (fan[s.src] = fan[s.src] || []).push(s));
    Object.entries(fan).forEach(([src, sinks]) => {
      const [fx, fy] = pinOut(src);
      sinks.forEach(s => {
        const [tx, ty] = s.to;
        let d;
        if (s.path) {          // explicit route: corner points between the two pins
          s.vx = s.path[0][1] === fy ? s.path[0][0] : fx;
          d = `M${fx} ${fy} ` + s.path.map(([x, y]) => `L${x} ${y}`).join(" ") + ` L${tx} ${ty}`;
        } else {
          s.vx = s.via !== undefined ? s.via : Math.round((fx + tx) / 2);
          d = ty === fy ? `M${fx} ${fy} H${tx}` : `M${fx} ${fy} H${s.vx} V${ty} H${tx}`;
        }
        wires.push({ el: svgEl("path", { class: "w", d }, wireLayer), src });
      });
      if (sinks.length > 1) {
        const far = Math.max(...sinks.map(s => (s.to[1] === fy ? s.to[0] : s.vx)));
        sinks.forEach(s => {
          if (s.to[1] !== fy && s.vx < far) wires.push({ el: svgEl("circle", { class: "dot", cx: s.vx, cy: fy, r: 3.2 }, wireLayer), src });
        });
      }
    });

    gates.forEach(g => {
      const grp = svgEl("g", { class: "g", transform: `translate(${g.x} ${g.y})` }, partLayer);
      if (isFF(g)) {
        svgEl("rect", { x: 0, y: 0, width: 60, height: 60, rx: 3 }, grp);
        svgEl("text", { x: 5, y: 19 }, grp).textContent = "D";
        if (g.type === "DFF") svgEl("path", { class: "lead", d: "M0 39 L9 45 L0 51" }, grp);
        svgEl("text", { x: g.type === "DFF" ? 12 : 5, y: 49 }, grp).textContent = g.type === "DFF" ? "CLK" : "EN";
        svgEl("text", { x: 46, y: 19 }, grp).textContent = "Q";
        const t = svgEl("text", { x: 30, y: 74, "text-anchor": "middle" }, grp);
        t.textContent = g.label || (g.type === "DFF" ? "D flip-flop" : "D latch");
        return;
      }
      const b = BODY[g.type];
      if (!b) throw new Error(`logicsim: unknown gate type "${g.type}"`);
      (b.one ? [20] : [10, 30]).forEach(y => svgEl("path", { class: "lead", d: `M0 ${y} H${b.lead}` }, grp));
      if (b.extra) svgEl("path", { class: "lead", d: b.extra }, grp);
      svgEl("path", { d: b.d }, grp);
      let end = b.end;
      if (b.bubble) { svgEl("circle", { cx: end + 4, cy: 20, r: 4 }, grp); end += 8; }
      svgEl("path", { class: "lead", d: `M${end} 20 H60` }, grp);
      const t = svgEl("text", { x: 24, y: 24, "text-anchor": "middle", "font-size": 9 }, grp);
      t.textContent = g.type;
      if (b.one) t.setAttribute("x", 20);
      if (g.type === "XOR") t.setAttribute("x", 29);
    });

    const switches = inputs.map(p => {
      const grp = svgEl("g", { class: "sw", transform: `translate(${p.x} ${p.y})`, tabindex: 0, role: "switch",
        "aria-label": `input ${p.id}` }, partLayer);
      svgEl("rect", { x: 0, y: 0, width: 40, height: 30, rx: 6 }, grp);
      svgEl("text", { class: "val", x: 20, y: 20, "text-anchor": "middle" }, grp);
      svgEl("text", { class: "nm", x: 20, y: -5, "text-anchor": "middle" }, grp).textContent = p.label || p.id;
      grp.addEventListener("click", () => toggle(p.id));
      grp.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(p.id); } });
      return { grp, p };
    });
    const lamps = outputs.map(o => {
      const grp = svgEl("g", { class: "lamp", transform: `translate(${o.x} ${o.y})` }, partLayer);
      svgEl("circle", { cx: 12, cy: 15, r: 11 }, grp);
      const t = svgEl("text", { class: "nm", x: 28, y: 19 }, grp);
      t.textContent = o.label || o.id;
      return { grp, o };
    });
    box.appendChild(svg);
    if (spec.auto) {   // a Run button that toggles one input on a timer, e.g. a free-running clock
      const ms = spec.auto.ms || 400;
      let timer = null;
      const btn = E("button", { class: "btn secondary", type: "button", text: `Run ${spec.auto.input}` });
      const stop = () => { clearInterval(timer); timer = null; btn.textContent = `Run ${spec.auto.input}`; };
      btn.addEventListener("click", () => {
        if (timer) { stop(); return; }
        timer = setInterval(() => { if (!box.isConnected) stop(); else toggle(spec.auto.input); }, ms);
        btn.textContent = "Pause";
      });
      box.appendChild(btn);
    }
    box.appendChild(E("p", { class: "ls-note", text: sequential
      ? "Click the inputs (or Tab to one and press Space). Green wires carry 1. Each click adds a step to the timing diagram."
      : "Click the inputs (or Tab to one and press Space). Green wires carry 1. Predict each row's output before you try it." }));

    // ---- truth table (combinational) or timing diagram (sequential)
    const extra = E("div");
    box.appendChild(extra);
    const visited = new Set();
    const history = [];
    const traceIds = spec.trace || [...inputs.map(p => p.id), ...outputs.map(o => o.id)];
    const sigVal = id => { const o = outputs.find(x => x.id === id); return v(o ? o.from : id); };
    const sigName = id => {
      const o = outputs.find(x => x.id === id) || inputs.find(x => x.id === id) || gates.find(x => x.id === id);
      return (o && o.label) || id;
    };
    function record() {
      if (sequential) { history.push(traceIds.map(sigVal)); if (history.length > (spec.history || 24)) history.shift(); }
      else visited.add(inputs.map(p => v(p.id)).join(""));
    }

    function renderTable() {
      const probes = (spec.probes || []).map(id => gates.find(g => g.id === id));
      const head = [...inputs.map(p => ["", p.label || p.id]), ...probes.map(g => ["", g.label || g.id]),
                    ...outputs.map(o => ["out", o.label || o.id])];
      const t = E("table", { class: "tt" });
      t.appendChild(E("tr", {}, head.map(([c, h]) => E("th", { class: c, text: h }))));
      const n = inputs.length, cur = inputs.map(p => v(p.id)).join("");
      for (let row = 0; row < 1 << n; row++) {
        const bits = [...Array(n)].map((_, i) => (row >> (n - 1 - i)) & 1);
        const key = bits.join("");
        // evaluate this row without disturbing the live circuit
        const saved = Object.assign({}, val);
        inputs.forEach((p, i) => { val[p.id] = bits[i]; });
        settle();
        const seen = visited.has(key);
        const cells = [...bits.map(b => E("td", { text: String(b) })),
          ...probes.map(g => E("td", { class: seen ? "" : "unk", text: seen ? String(v(g.id)) : "?" })),
          ...outputs.map(o => E("td", { class: seen ? "" : "unk", text: seen ? String(v(o.from)) : "?" }))];
        Object.assign(val, saved);
        t.appendChild(E("tr", { class: key === cur ? "cur" : "" }, cells));
      }
      settle();
      extra.innerHTML = "";
      extra.appendChild(t);
      extra.appendChild(E("p", { class: "ls-note", text: `Rows tried: ${visited.size} of ${1 << n}.` }));
    }

    function renderTiming() {
      extra.innerHTML = "";
      extra.appendChild(E("h4", { text: "Timing diagram (one step per click, newest on the right)" }));
      // a fixed width, sized for the longest history, so the diagram never resizes as it fills
      const cap = spec.history || 24, left = 90, rowH = 30, step = Math.min(26, Math.floor(630 / cap)), steps = cap;
      const W = left + steps * step + 10, H = traceIds.length * rowH + 10;
      const s = svgEl("svg", { class: "tm", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Timing diagram" });
      s.style.maxWidth = W * 1.4 + "px";
      for (let i = 0; i <= steps; i++) svgEl("path", { class: "grid", d: `M${left + i * step} 4 V${H - 4}` }, s);
      traceIds.forEach((id, r) => {
        const y1 = 8 + r * rowH, y0 = y1 + 18;
        svgEl("text", { x: 4, y: y0 - 4 }, s).textContent = sigName(id);
        if (!history.length) return;
        let d = "";
        history.forEach((h, i) => {
          const y = h[r] ? y1 : y0, x = left + i * step;
          d += i ? ` V${y} H${x + step}` : `M${x} ${y} H${x + step}`;
        });
        svgEl("path", { d }, s);
      });
      extra.appendChild(s);
      const reset = E("button", { class: "btn secondary", type: "button", text: "Clear diagram" });
      reset.addEventListener("click", () => { history.length = 0; record(); render(); });
      extra.appendChild(reset);
    }

    function render() {
      wires.forEach(w => w.el.classList.toggle("v1", !!v(w.src)));
      switches.forEach(({ grp, p }) => {
        grp.classList.toggle("v1", !!v(p.id));
        grp.querySelector(".val").textContent = String(v(p.id));
        grp.setAttribute("aria-checked", v(p.id) ? "true" : "false");
      });
      lamps.forEach(({ grp, o }) => grp.classList.toggle("v1", !!v(o.from)));
      if (sequential) renderTiming(); else renderTable();
    }

    settle();
    record();
    render();
  }

  function init() {
    injectCss();
    document.querySelectorAll(".widget.logicsim").forEach(box => {
      try { mount(box); } catch (e) { box.appendChild(document.createTextNode(e.message)); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
