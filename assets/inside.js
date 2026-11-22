/* Look inside: the shared kit for the device demos in inside/. Load after manifest.js and course.js,
 * before the device's own script (assets/inside-<device>.js).
 *
 * How to build a demo with it is written up in .claude/skills/look-inside-demo/SKILL.md. In short:
 *
 *   const I = window.Inside;
 *   I.frame(box, { bar: [[...], [...]], scene: svg, analyzer: la });   toolbar, scene and analyzer in one card
 *   I.chip(svg, {...}); I.card(svg, {...}); I.section(svg, {...});     the MCU and the firmware card
 *   const sm = I.stateMachine(svg, {...});  sm.set(state, "A>B");      a state diagram
 *   const code = I.code(svg, {...});        code.set([2, 3]);          a few lines of C with the running ones lit
 *   const ram = I.ram(svg, x, y);           ram.set([lines]);          variables (use I.k, I.v, I.bits)
 *   const uart = I.uart(svg, {...});        uart.log(t, "text");       the newest UART lines
 *   const co = I.callouts(svg, [...]);      co.show(id); co.hot(el, id); co.update(now, mode)
 *   const la = I.analyzer({...});           la.push(t, sig); la.draw(t)
 *   I.loop({ tick, speed, step, sample, render });                     a fixed-step simulation loop
 *
 * Lesson links come from window.COURSE_MANIFEST, so a renumbered lesson keeps its link.
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const CSS = `
  .ins{padding:0;overflow:hidden}
  .ins svg{display:block;width:100%;height:auto;user-select:none;-webkit-user-select:none}
  .ins .bar{display:flex;flex-wrap:wrap;gap:.6rem 1.2rem;align-items:center;justify-content:space-between;padding:.65rem .9rem;border-bottom:1px solid var(--rule);background:var(--code-bg)}
  .ins .grp{display:inline-flex;flex-wrap:wrap;gap:.4rem;align-items:center;font-family:var(--sans);font-size:.78rem;color:var(--muted)}
  .ins .cap{font-family:var(--mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 .15rem 0 .3rem}
  .ins .fb{font-family:var(--mono);font-weight:700;font-size:.85rem;min-width:2.1rem;height:2.1rem;padding:0 .4rem;border-radius:1.05rem;border:1px solid var(--rule);background:var(--bg);color:var(--fg);cursor:pointer;transition:all .15s}
  .ins .fb:hover{border-color:var(--accent)}
  .ins .fb.lit{border-color:var(--accent);background:var(--accent);color:var(--bg);box-shadow:0 0 0 3px var(--accent-soft)}
  .ins .act{font-family:var(--sans);font-size:.8rem;font-weight:600;padding:.4rem .75rem;border-radius:6px;border:1px solid var(--rule);background:var(--bg);color:var(--fg);cursor:pointer}
  .ins .act:hover{border-color:var(--accent);color:var(--accent)}
  .ins .act.stop{border-color:var(--bad);color:var(--bad)}
  .ins .act.stop:hover{background:var(--bad);color:var(--bg)}
  .ins .act:disabled{opacity:.4;cursor:default;border-color:var(--rule);color:var(--muted);background:var(--bg)}
  .ins .seg{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden;background:var(--bg)}
  .ins .seg button{font-family:var(--mono);font-size:.72rem;padding:.3rem .55rem;border:0;border-right:1px solid var(--rule);background:none;color:var(--muted);cursor:pointer}
  .ins .seg button:last-child{border-right:0}
  .ins .seg button.on{background:var(--accent-soft);color:var(--accent);font-weight:700}
  .ins .pane{padding:.4rem .6rem}
  .ins .la-head{display:flex;flex-wrap:wrap;gap:.2rem 1rem;justify-content:space-between;align-items:baseline;padding:.55rem .9rem 0;border-top:1px solid var(--rule);font-family:var(--mono);font-size:.7rem;color:var(--muted)}
  .ins .la-head span:first-child{text-transform:uppercase;letter-spacing:.05em}
  .ins .t{fill:var(--fg);font-family:var(--mono);font-size:11px}
  .ins .t.s{font-size:9.5px;fill:var(--muted)}
  .ins .t.b{font-weight:700;font-size:12px}
  .ins .t.h{font-size:10px;fill:var(--muted);letter-spacing:.06em}
  .ins .t.big{font-weight:700;font-size:18px;fill:var(--muted)}
  .ins .t.mid{text-anchor:middle} .ins .t.end{text-anchor:end}
  .ins .t.acc{fill:var(--accent)} .ins .t.bad{fill:var(--bad)} .ins .t.good{fill:var(--good)} .ins .t.warn{fill:var(--warn)}
  .ins .w{fill:none;stroke:var(--muted);stroke-opacity:.55;stroke-width:1.4;stroke-linejoin:round;transition:stroke .2s}
  .ins .w.bus{stroke-width:2.6}
  .ins .w.on{stroke:var(--accent);stroke-opacity:1;stroke-width:2.2;stroke-dasharray:7 5;animation:ins-flow .7s linear infinite}
  .ins .w.bus.on{stroke-width:3.2}
  .ins .w.hot{stroke:var(--bad);stroke-opacity:1;stroke-width:2.2}
  @keyframes ins-flow{to{stroke-dashoffset:-12}}
  @media (prefers-reduced-motion:reduce){.ins .w.on{animation:none;stroke-dasharray:none}}
  .ins .wall{fill:none;stroke:var(--rule);stroke-width:2}
  .ins .box{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2}
  .ins .box.on{stroke:var(--accent);fill:var(--accent-soft)}
  .ins .chip{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.5}
  .ins .pin{stroke:var(--fg);stroke-width:2}
  .ins .click{cursor:pointer}
  .ins .hot{fill:transparent;cursor:help}
  .ins .co{opacity:0;transition:opacity .25s;pointer-events:none}
  .ins .co.show{opacity:1;pointer-events:auto}
  .ins .co rect{fill:var(--bg);stroke:var(--accent);stroke-width:1.2}
  .ins .co .lead{stroke:var(--accent);stroke-width:1;fill:none}
  .ins .co .ld{fill:var(--accent)}
  .ins .co .ct{fill:var(--fg);font-family:var(--sans);font-size:10.5px}
  .ins .co .ch{fill:var(--accent);font-family:var(--mono);font-size:10.5px;font-weight:700}
  .ins .co .cl{fill:var(--muted);font-family:var(--sans);font-size:9.5px}
  .ins .card{fill:var(--bg);stroke:var(--rule);stroke-width:1.2}
  .ins .sep{stroke:var(--rule);stroke-width:1}
  .ins .zoom{stroke:var(--muted);stroke-width:1;stroke-dasharray:3 4;opacity:.5}
  .ins .st rect{fill:var(--code-bg);stroke:var(--rule);stroke-width:1.2;transition:all .2s}
  .ins .st text{fill:var(--muted);font-family:var(--mono);font-size:10px;font-weight:700;text-anchor:middle}
  .ins .st.on rect{fill:var(--accent-soft);stroke:var(--accent);stroke-width:2}
  .ins .st.on text{fill:var(--accent)}
  .ins .st.stop.on rect{fill:var(--bad-soft);stroke:var(--bad)} .ins .st.stop.on text{fill:var(--bad)}
  .ins .arr{fill:none;stroke:var(--muted);stroke-opacity:.6;stroke-width:1.1}
  .ins .arr.on{stroke:var(--accent);stroke-opacity:1;stroke-width:2}
  .ins .code text{font-family:var(--mono);font-size:10.5px;fill:var(--muted)}
  .ins .code rect{fill:transparent}
  .ins .code .on rect{fill:var(--accent-soft)}
  .ins .code .on text{fill:var(--fg)}
  .ins .var{font-family:var(--mono);font-size:11px;fill:var(--fg)}
  .ins .var .k{fill:var(--muted)} .ins .var .v{fill:var(--accent);font-weight:700}
  .ins .var .b1{fill:var(--accent);font-weight:700} .ins .var .b0{fill:var(--muted)} .ins .var .bad{fill:var(--bad);font-weight:700}
  .ins .log{font-family:var(--mono);font-size:10px;fill:var(--muted)}
  .ins .log .new{fill:var(--fg)}
  .ins .lan{stroke:var(--accent);stroke-width:1.5;fill:var(--accent-soft)}
  .ins .lan.pwm{stroke:var(--warn);fill:var(--warn-soft)} .ins .lan.bad{stroke:var(--bad);fill:var(--bad-soft)} .ins .lan.good{stroke:var(--good);fill:var(--good-soft)}
  .ins .lan.ana{fill:none}
  .ins .grid{stroke:var(--rule);stroke-width:1}
  .ins a tspan{fill:var(--accent);text-decoration:underline}`;

  function S(tag, attrs, text) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function E(tag, attrs, kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "text") el.textContent = attrs[k];
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => el.append(c));
    return el;
  }
  const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  /* Set a class only when it changes, so CSS animations are not restarted every frame. */
  const cls = (el, c) => { if (el.getAttribute("class") !== c) el.setAttribute("class", c); };

  function lessonHref(n) {
    const parts = (window.COURSE_MANIFEST && window.COURSE_MANIFEST.parts) || [];
    for (const p of parts) for (const it of p.items) if (it.kind === "lesson" && it.number === n) return "../lessons/" + it.file;
    return "../index.html";
  }
  /* "lesson 52" or "lessons 52 · 57", each number a link. */
  function lessons(parent, x, y, nums, c, anchor) {
    const t = S("text", { class: c, x, y, "text-anchor": anchor || "start" });
    t.append(document.createTextNode(nums.length > 1 ? "lessons " : "lesson "));
    nums.forEach((n, i) => {
      const a = S("a", { href: lessonHref(n) });
      a.append(S("tspan", {}, String(n)));
      t.append(a);
      if (i < nums.length - 1) t.append(document.createTextNode(" · "));
    });
    parent.append(t);
    return t;
  }

  // ---------------------------------------------------------------- toolbar
  const cap = text => E("span", { class: "cap", text });
  const btn = (text, onclick, c) => E("button", { class: "act" + (c ? " " + c : ""), type: "button", text, onclick });
  const pill = (text, onclick, label) => E("button", { class: "fb", type: "button", text, onclick, "aria-label": label || text });
  function seg(opts, init, on) {
    const el = E("div", { class: "seg", role: "group" });
    opts.forEach(([v, t]) => {
      const b = E("button", { type: "button", text: t, "aria-pressed": String(v === init), onclick: () => {
        [...el.children].forEach(c => { c.classList.toggle("on", c === b); c.setAttribute("aria-pressed", String(c === b)); }); on(v); } });
      if (v === init) b.classList.add("on");
      el.append(b);
    });
    return el;
  }
  /* The widget's frame: a toolbar (groups of elements), the scene, and an optional analyzer. */
  function frame(box, o) {
    box.classList.add("ins");
    if (o.bar) box.append(E("div", { class: "bar" }, o.bar.map(g => E("div", { class: "grp" }, g))));
    box.append(E("div", { class: "pane" }, [o.scene]));
    if (o.analyzer) box.append(...o.analyzer.els);
  }

  // ---------------------------------------------------------------- scene parts
  /* The MCU: a box with pin stubs. left/right: [[y, "NAME"]]; top/bottom: [[x, "NAME"]]. */
  function chip(svg, o) {
    const { x, y, w, h } = o, g = S("g");
    g.append(S("rect", { class: "chip", x, y, width: w, height: h, rx: 8 }));
    (o.left || []).forEach(([py, n]) => g.append(S("line", { class: "pin", x1: x - 10, x2: x, y1: py, y2: py }), S("text", { class: "t s", x: x + 8, y: py + 3 }, n)));
    (o.right || []).forEach(([py, n]) => g.append(S("line", { class: "pin", x1: x + w, x2: x + w + 10, y1: py, y2: py }), S("text", { class: "t s end", x: x + w - 8, y: py + 3 }, n)));
    (o.top || []).forEach(([px, n]) => g.append(S("line", { class: "pin", x1: px, x2: px, y1: y - 10, y2: y }), S("text", { class: "t s mid", x: px, y: y + 16 }, n)));
    (o.bottom || []).forEach(([px, n]) => g.append(S("line", { class: "pin", x1: px, x2: px, y1: y + h, y2: y + h + 10 }), S("text", { class: "t s mid", x: px, y: y + h - 8 }, n)));
    const cx = o.labelAt ? o.labelAt[0] : x + w / 2, cy = o.labelAt ? o.labelAt[1] : y + h / 2;
    g.append(S("text", { class: "t b mid", x: cx, y: cy }, o.name || "MCU"));
    if (o.sub) g.append(S("text", { class: "t s mid", x: cx, y: cy + 16 }, o.sub));
    svg.append(g);
    return g;
  }
  /* The firmware card, with dashed zoom lines from the chip's right edge. */
  function card(svg, o) {
    if (o.from) {
      const c = o.from;
      svg.append(S("line", { class: "zoom", x1: c.x + c.w, y1: c.y, x2: o.x, y2: o.y + 30 }), S("line", { class: "zoom", x1: c.x + c.w, y1: c.y + c.h, x2: o.x, y2: o.y + o.h - 30 }));
    }
    svg.append(S("rect", { class: "card", x: o.x, y: o.y, width: o.w, height: o.h, rx: 10 }));
  }
  /* A titled section of the card. sep: draw a rule 24 px above the title. */
  function section(svg, o) {
    if (o.sep) svg.append(S("line", { class: "sep", x1: o.x - 8, x2: o.x2 + 6, y1: o.y - 24, y2: o.y - 24 }));
    svg.append(S("text", { class: "t h", x: o.x, y: o.y }, o.title));
    if (o.lessons) lessons(svg, o.x2, o.y, o.lessons, "t s", "end");
  }
  /* A state diagram. states: {NAME: [x, y]}; paths: {"A>B": "M.. L.."}; labels: [[text, x, y, "mid"|"end"|""]]. */
  function stateMachine(svg, o) {
    const w = o.w || 120, h = o.h || 28, id = "ins-arr-" + Math.random().toString(36).slice(2, 8);
    const defs = S("defs"), mk = S("marker", { id, viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 5, markerHeight: 5, orient: "auto" });
    mk.append(S("path", { d: "M0 0 L8 4 L0 8 z", fill: "var(--muted)" })); defs.append(mk); svg.append(defs);
    const arrows = {}, boxes = {}, stop = o.stop || [];
    for (const k in o.paths) { const p = S("path", { class: "arr", d: o.paths[k], "marker-end": `url(#${id})` }); arrows[k] = p; svg.append(p); }
    (o.labels || []).forEach(([t, x, y, a]) => svg.append(S("text", { class: "t s" + (a ? " " + a : ""), x, y }, t)));
    for (const n in o.states) {
      const [x, y] = o.states[n], g = S("g", { class: "st" + (stop.includes(n) ? " stop" : "") });
      g.append(S("rect", { x, y, width: w, height: h, rx: 6 }), S("text", { x: x + w / 2, y: y + h / 2 + 4 }, (o.names && o.names[n]) || n));
      boxes[n] = g; svg.append(g);
    }
    return {
      set(state, edge) {
        for (const n in boxes) cls(boxes[n], "st" + (stop.includes(n) ? " stop" : "") + (n === state ? " on" : ""));
        for (const k in arrows) cls(arrows[k], "arr" + (k === edge ? " on" : ""));
      } };
  }
  /* A few lines of code; set([i, j]) lights the lines that run now. */
  function code(svg, o) {
    const g = S("g", { class: "code" }), lh = o.lh || 16, rows = [];
    o.lines.forEach((l, i) => {
      const r = S("g"), y = o.y + i * lh;
      r.append(S("rect", { x: o.x - 6, y: y - lh + 4, width: o.w, height: lh, rx: 3 }), S("text", { x: o.x, y, "xml:space": "preserve" }, l));
      rows.push(r); g.append(r);
    });
    svg.append(g);
    return { set(on) { rows.forEach((r, i) => cls(r, on.includes(i) ? "on" : "")); } };
  }
  /* Variables in RAM, one <text> per line, written as markup (use k, v, bits). */
  const k = x => `<tspan class="k">${esc(x)}</tspan>`;
  const v = (x, c) => `<tspan class="${c || "v"}">${esc(x)}</tspan>`;
  const bits = (val, n, lit) => { let s = ""; for (let b = n - 1; b >= 0; b--) { const on = val >> b & 1; s += `<tspan class="b${lit === 0 ? 1 - on : on}">${on}</tspan>`; } return "0b" + s; };
  function ram(svg, x, y, lh) {
    const g = S("g", { class: "var" }); svg.append(g);
    let last = "";
    return { set(lines) { const html = lines.map((l, i) => `<text x="${x}" y="${y + i * (lh || 19)}" xml:space="preserve">${l}</text>`).join(""); if (html !== last) { g.innerHTML = html; last = html; } } };
  }
  /* The UART log: the newest n lines, each with a timestamp. fmt(t) formats the time. */
  function uart(svg, o) {
    const g = S("g", { class: "log" }), lines = [], n = o.n || 6, lh = o.lh || 17;
    const fmt = o.fmt || (t => "[" + t.toFixed(2).padStart(7, " ") + "]");
    svg.append(g);
    let dirty = true;
    function render() {
      if (!dirty) return; dirty = false;
      g.innerHTML = lines.map(([t, txt], i) => `<text x="${o.x}" y="${o.y + i * lh}" class="${i === lines.length - 1 ? "new" : ""}" xml:space="preserve">${esc(fmt(t))} ${esc(txt)}</text>`).join("")
        || `<text x="${o.x}" y="${o.y}">${esc(o.empty || "waiting…")}</text>`;
    }
    return { log(t, txt) { lines.push([t, txt]); if (lines.length > n) lines.shift(); dirty = true; }, render, clear() { lines.length = 0; dirty = true; } };
  }
  /* Callout cards. defs: [id, x, y, w, title, [lines], [lessons], target]; target is [x, y] or a function
     returning one (for parts that move). show(id, ms) keeps it up for ms; hot(el, id) shows it on hover. */
  function callouts(svg, defs) {
    const co = {};
    defs.forEach(([id, x, y, w, title, lines, les, target]) => {
      const g = S("g", { class: "co" }), h = 34 + lines.length * 13;
      const lead = S("line", { class: "lead" }), dot = S("circle", { class: "ld", r: 3 });
      g.append(lead, dot, S("rect", { x, y, width: w, height: h, rx: 6 }), S("text", { class: "ch", x: x + 8, y: y + 15 }, title));
      lines.forEach((l, i) => g.append(S("text", { class: "ct", x: x + 8, y: y + 29 + i * 13 }, l)));
      if (les && les.length) lessons(g, x + 8, y + h - 8, les, "cl", "start");
      svg.append(g);
      co[id] = { g, lead, dot, box: [x, y, w, h], target, until: 0, hover: false };
    });
    function place(c) {
      const [tx, ty] = typeof c.target === "function" ? c.target() : c.target;
      const [x, y, w, h] = c.box;
      const cx = Math.max(x, Math.min(x + w, tx)), cy = Math.max(y, Math.min(y + h, ty));
      c.lead.setAttribute("x1", cx); c.lead.setAttribute("y1", cy); c.lead.setAttribute("x2", tx); c.lead.setAttribute("y2", ty);
      c.dot.setAttribute("cx", tx); c.dot.setAttribute("cy", ty);
    }
    return {
      show(id, ms) { const c = co[id]; if (c) c.until = Math.max(c.until, performance.now() + (ms || 3500)); },
      hot(el, id) {
        el.addEventListener("pointerenter", () => { if (co[id]) co[id].hover = true; });
        el.addEventListener("pointerleave", () => { if (co[id]) co[id].hover = false; });
        return el;
      },
      update(now, mode) {
        for (const id in co) {
          const c = co[id], on = mode === "all" || (mode === "auto" && (c.hover || now < c.until));
          c.g.classList.toggle("show", on);
          if (on) place(c);
        }
      },
      raise() { for (const id in co) svg.append(co[id].g); } };       // keep the cards above parts drawn later
  }
  /* An invisible hover area. */
  const hotspot = attrs => S("rect", Object.assign({ class: "hot" }, attrs));

  // ---------------------------------------------------------------- logic analyzer
  /* lanes: [{ name, kind, key, type: "dig" | "pwm" | "ana", cls, period, max }]. Time is in the sim's unit;
     tick(t) formats an axis label for "t units ago". */
  function analyzer(o) {
    const W = o.width || 1200, x0 = 150, x1 = W - 12, lh = 28, n = o.lanes.length, secs = o.secs;
    const svg = S("svg", { viewBox: `0 0 ${W} ${n * lh + 26}`, role: "img", "aria-label": "Logic analyzer" });
    const steps = o.steps || 8;
    for (let i = 0; i <= steps; i++) {
      const x = x0 + (x1 - x0) * i / steps, ago = secs * (steps - i) / steps;
      svg.append(S("line", { class: "grid", x1: x, x2: x, y1: 6, y2: n * lh + 6, opacity: .45 }));
      svg.append(S("text", { class: "t s " + (i === 0 ? "" : i === steps ? "end" : "mid"), x, y: n * lh + 20 }, i === steps ? "now" : "−" + (o.label ? o.label(ago) : ago + " s")));
    }
    const paths = o.lanes.map((l, i) => {
      const y = 6 + i * lh;
      svg.append(S("text", { class: "t", x: 14, y: y + 14 }, l.name), S("text", { class: "t s", x: 14, y: y + 24 }, l.kind || ""));
      const p = S("path", { class: "lan" + (l.type === "ana" ? " ana" : "") + (l.cls ? " " + l.cls : "") }); svg.append(p); return p;
    });
    const hist = [];
    const head = E("div", { class: "la-head" }, [E("span", { text: o.title || "Logic analyzer" }), E("span", { text: o.note || "" })]);
    return {
      els: [head, E("div", { class: "pane" }, [svg])],
      push(t, sig) { hist.push([t, sig]); while (hist.length && hist[0][0] < t - secs * 1.1) hist.shift(); },
      clear() { hist.length = 0; },
      draw(now) {
        const X = t => x1 - (now - t) / secs * (x1 - x0);
        const vis = hist.filter(([t]) => t >= now - secs);
        o.lanes.forEach((l, i) => {
          const y0 = 6 + i * lh, hi = y0 + 4, lo = y0 + 22;
          if (!vis.length) { paths[i].setAttribute("d", ""); return; }
          let d;
          if (l.type === "ana") {
            d = vis.map(([t, s], j) => (j ? "L" : "M") + X(t).toFixed(1) + " " + (lo - (lo - hi) * Math.max(0, Math.min(1, s[l.key] / (l.max || 1)))).toFixed(1)).join(" ");
          } else {
            d = `M${X(vis[0][0]).toFixed(1)} ${lo}`;
            let prev = lo;
            for (const [t, s] of vis) {
              const val = s[l.key];
              const lvl = l.type === "pwm" ? (val > 0 && (t % l.period) / l.period < val ? hi : lo) : (val ? hi : lo);
              const x = X(t).toFixed(1);
              if (lvl !== prev) d += ` L${x} ${prev} L${x} ${lvl}`;
              prev = lvl;
            }
            d += ` L${X(now).toFixed(1)} ${prev} L${X(now).toFixed(1)} ${lo} Z`;
          }
          paths[i].setAttribute("d", d);
        });
      } };
  }

  // ---------------------------------------------------------------- simulation loop
  /* Runs step(tick) in fixed steps of `tick` sim units, `speed()` sim units per wall second, sample() every
     `every` steps, and render(now) once per frame. Frames longer than 0.1 s are clipped. */
  function loop(o) {
    let last = null, acc = 0, n = 0;
    const every = o.every || 1, maxSteps = o.maxSteps || 5000;
    function frameFn(now) {
      if (last !== null) {
        acc += Math.min(0.1, (now - last) / 1000) * o.speed();
        let c = 0;
        while (acc >= o.tick && c++ < maxSteps) {
          acc -= o.tick;
          o.step(o.tick);
          if (++n % every === 0 && o.sample) o.sample();
        }
        if (c >= maxSteps) acc = 0;
      }
      o.render(now);
      last = now;
      requestAnimationFrame(frameFn);
    }
    o.render(0);
    requestAnimationFrame(frameFn);
  }

  /* Mount: inject the CSS once (plus the device's own), then call mount(box) on every .widget.<name>. */
  function register(name, mount, extraCss) {
    function init() {
      if (!document.getElementById("ins-css")) { const st = document.createElement("style"); st.id = "ins-css"; st.textContent = CSS; document.head.appendChild(st); }
      if (extraCss && !document.getElementById("ins-css-" + name)) { const st = document.createElement("style"); st.id = "ins-css-" + name; st.textContent = extraCss; document.head.appendChild(st); }
      document.querySelectorAll(".widget." + name).forEach(mount);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  }

  window.Inside = { S, E, esc, cls, lessonHref, lessons, cap, btn, pill, seg, frame, chip, card, section, stateMachine, code,
                    k, v, bits, ram, uart, callouts, hotspot, analyzer, loop, register };
})();
