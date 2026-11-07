/* State machine stepper (lesson 56): the traffic light, table-driven. Load after course.js.
 *
 *   <div class="widget fsm"></div>
 *
 * States RED, GREEN, YELLOW (3000, 3000, 1000 ms); events TIMEOUT and REQUEST (a debounced press).
 * The learner sends events, or lets time run, and sees the diagram, the transition table and the
 * dispatch() log, which prints a line only when the state changes, as the solution does. Every cell of
 * the table can be edited, and the diagram and the generated switch code follow.
 */
(function () {
  "use strict";
  const S = ["RED", "GREEN", "YELLOW"], EV = ["TIMEOUT", "REQUEST"], DUR = [3000, 3000, 1000];
  const DEFAULT = [[1, 0], [2, 2], [0, 2]];
  const POS = [[90, 70], [410, 70], [250, 230]], COL = ["#e03131", "#2f9e44", "#f08c00"];
  const CSS = `
  .fsm .fs-top{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:1rem;align-items:start}
  @media(max-width:44rem){.fsm .fs-top{grid-template-columns:minmax(0,1fr)}}
  .fsm table{max-width:100%} .fsm .fs-tbl{overflow-x:auto}
  .fsm svg{width:100%;height:auto;display:block;font-family:var(--sans);font-size:12px}
  .fsm svg .node circle{fill:var(--code-bg);stroke:var(--rule);stroke-width:2} .fsm svg .node.on circle{stroke-width:4}
  .fsm svg .node text{font-weight:700;fill:var(--fg)}
  .fsm svg .tr path{fill:none;stroke:var(--muted);stroke-width:1.6} .fsm svg .tr text{fill:var(--muted);font-size:11px}
  .fsm svg .tr.hot path{stroke:var(--accent);stroke-width:3} .fsm svg .tr.hot text{fill:var(--accent);font-weight:700}
  .fsm svg .ah{fill:var(--muted)} .fsm svg .ah.hot{fill:var(--accent)}
  .fsm .fs-light{display:flex;flex-direction:column;gap:.35rem;align-items:center;background:#222;border-radius:10px;padding:.6rem;width:3.6rem;margin:.3rem auto}
  .fsm .fs-light span{width:2.2rem;height:2.2rem;border-radius:50%;background:#444;transition:background .15s}
  .fsm .fs-ctl{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin:.5rem 0;font-family:var(--sans);font-size:.85rem}
  .fsm .btn{font-size:.78rem;padding:.2rem .6rem}
  .fsm .fs-clock{font-family:var(--mono);font-size:.9rem}
  .fsm table{border-collapse:collapse;font-size:.82rem;margin:.4rem 0}
  .fsm th,.fsm td{padding:.25rem .5rem;border:1px solid var(--rule);text-align:left}
  .fsm td.hot{background:var(--accent-soft);outline:2px solid var(--accent)}
  .fsm td.same select{color:var(--muted)}
  .fsm select{font-family:var(--mono);font-size:.8rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.1rem .2rem}
  .fsm .fs-log{font-family:var(--mono);font-size:.8rem;background:var(--code-bg);border-radius:4px;padding:.4rem .7rem;min-height:4rem;max-height:11rem;overflow-y:auto;white-space:pre}
  .fsm .fs-log .ign{color:var(--muted)}
  .fsm .fs-code{font-family:var(--mono);font-size:.78rem;background:var(--code-bg);border-radius:4px;padding:.4rem .7rem;white-space:pre;overflow-x:auto}
  .fsm .fs-code .hot{background:var(--accent-soft);font-weight:700}
  .fsm .fs-cols{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:1rem} @media(max-width:44rem){.fsm .fs-cols{grid-template-columns:minmax(0,1fr)}}`;

  function mount(box) {
    const E = window.Course.el;
    let table = DEFAULT.map(r => r.slice()), state = 0, now = 0, deadline = DUR[0], hot = null, log = [], timer = null, script = null;
    box.appendChild(E("h3", { text: box.dataset.title || "The traffic light, one event at a time" }));
    const svgWrap = E("div"), light = E("div", { class: "fs-light" }, [E("span"), E("span"), E("span")]);
    const clock = E("span", { class: "fs-clock" });
    const runBtn = E("button", { class: "btn secondary", type: "button", text: "▶ Let time run (×4)", onclick: () => toggleRun() });
    const ctl = E("div", { class: "fs-ctl" }, [E("button", { class: "btn", type: "button", text: "Press the button (REQUEST)", onclick: () => { stopScript(); dispatch(1); } }),
      E("button", { class: "btn secondary", type: "button", text: "Jump to the timeout", onclick: () => { stopScript(); now = deadline; dispatch(0); } }), runBtn,
      E("button", { class: "btn secondary", type: "button", text: "Replay the lesson's trace", onclick: replay }),
      E("button", { class: "btn secondary", type: "button", text: "Reset", onclick: () => { stopScript(); stop(); reset(); } }), clock]);
    const tblWrap = E("div", { class: "fs-tbl" }), logEl = E("div", { class: "fs-log" }), code = E("div", { class: "fs-code" });
    box.append(E("div", { class: "fs-top" }, [svgWrap, E("div", {}, [light, E("h4", { text: "next_state[state][event]" }), tblWrap])]), ctl,
      E("div", { class: "fs-cols" }, [E("div", {}, [E("h4", { text: "Serial log" }), logEl]), E("div", {}, [E("h4", { text: "The same table, as a switch" }), code])]));

    function reset() { state = 0; now = 0; deadline = DUR[0]; hot = null; log = []; render(); }
    function dispatch(e) {
      const from = state, next = table[state][e];
      hot = [from, e];
      if (next === from) log.push({ t: now, txt: `(${EV[e]} in ${S[from]}: same state, nothing printed)`, ign: true });
      else { log.push({ t: now, txt: `STATE ${S[from]}->${S[next]}` }); state = next; deadline = now + DUR[next]; }
      render();
    }
    function stop() { if (timer) clearInterval(timer); timer = null; runBtn.textContent = "▶ Let time run (×4)"; }
    function stopScript() { script = null; }
    function toggleRun() {
      if (timer) { stop(); return; }
      runBtn.textContent = "❚❚ Pause";
      timer = setInterval(() => {
        const step = 200;
        if (script && script.length && script[0][0] <= now + step && script[0][0] < deadline) { const [t, e] = script.shift(); now = t; dispatch(e); if (!script.length) script = null; return; }
        if (deadline <= now + step) { now = deadline; dispatch(0); return; }
        now += step; render();
      }, 50);
    }
    function replay() {
      stop(); table = DEFAULT.map(r => r.slice()); state = 0; now = 0; deadline = DUR[0]; hot = null; log = [];
      script = [[4200, 1], [5800, 1]];   /* the two presses of the worked example */
      toggleRun();
      const watch = setInterval(() => { if (now >= 6000 || !timer) { clearInterval(watch); stop(); render(); } }, 60);
    }

    function render() {
      clock.textContent = `t = ${now} ms · ${S[state]} until ${deadline} ms`;
      const lamp = [0, 2, 1][state];   /* red on top, yellow in the middle, green at the bottom */
      [...light.children].forEach((el, i) => { el.style.background = i === lamp ? COL[state] : "#444"; });
      // diagram
      const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 500 300");
      const add = (p, tag, a, txt) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt !== undefined) e.textContent = txt; p.appendChild(e); return e; };
      const edges = {};
      table.forEach((row, s) => row.forEach((n, e) => { if (n === s) return; const k = s + ">" + n; (edges[k] = edges[k] || { s, n, ev: [] }).ev.push(e); }));
      Object.values(edges).forEach(ed => {
        const [x1, y1] = POS[ed.s], [x2, y2] = POS[ed.n], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
        const back = edges[ed.n + ">" + ed.s], bend = back ? 34 : 18, mx = (x1 + x2) / 2 - uy * bend, my = (y1 + y2) / 2 + ux * bend;
        const sx = x1 + ux * 38 - uy * (back ? 8 : 0), sy = y1 + uy * 38 + ux * (back ? 8 : 0);
        const ex0 = x2 - ux * 42 - uy * (back ? 8 : 0), ey0 = y2 - uy * 42 + ux * (back ? 8 : 0);
        const isHot = hot && hot[0] === ed.s && ed.ev.includes(hot[1]);
        const g = add(svg, "g", { class: "tr" + (isHot ? " hot" : "") });
        add(g, "path", { d: `M${sx},${sy} Q${mx},${my} ${ex0},${ey0}` });
        const tx = ex0 - mx, ty = ey0 - my, tl = Math.hypot(tx, ty), ax = tx / tl, ay = ty / tl;
        add(svg, "path", { class: "ah" + (isHot ? " hot" : ""), d: `M${ex0 + ax * 8},${ey0 + ay * 8} L${ex0 - ay * 5},${ey0 + ax * 5} L${ex0 + ay * 5},${ey0 - ax * 5} Z` });
        add(g, "text", { x: mx - uy * 6, y: my + ux * 6 + 4, "text-anchor": "middle" }, ed.ev.map(e => EV[e].toLowerCase()).join(", "));
      });
      S.forEach((name, i) => {
        const g = add(svg, "g", { class: "node" + (i === state ? " on" : "") });
        const c = add(g, "circle", { cx: POS[i][0], cy: POS[i][1], r: 36 });
        if (i === state) { c.setAttribute("stroke", COL[i]); c.style.stroke = COL[i]; }
        add(g, "text", { x: POS[i][0], y: POS[i][1] + 4, "text-anchor": "middle" }, name);
        add(g, "text", { x: POS[i][0], y: POS[i][1] + 18, "text-anchor": "middle", style: "font-size:10px;font-weight:400;fill:var(--muted)" }, DUR[i] + " ms");
      });
      svgWrap.innerHTML = ""; svgWrap.appendChild(svg);
      // table
      tblWrap.innerHTML = "";
      const t = E("table");
      t.appendChild(E("tr", {}, [E("th", { text: "" }), ...EV.map(e => E("th", { text: e }))]));
      S.forEach((name, s) => t.appendChild(E("tr", {}, [E("th", { text: name }), ...EV.map((_, e) => {
        const sel = E("select", { "aria-label": `${name} ${EV[e]}` }, S.map((n, k) => E("option", { value: k, text: n })));
        sel.value = table[s][e]; sel.addEventListener("change", () => { table[s][e] = +sel.value; hot = [s, e]; render(); });
        return E("td", { class: (hot && hot[0] === s && hot[1] === e ? "hot" : "") + (table[s][e] === s ? " same" : "") }, [sel]);
      })])));
      tblWrap.appendChild(t);
      logEl.innerHTML = log.length ? log.map(l => `<div class="${l.ign ? "ign" : ""}">${String(l.t).padStart(5)} ms  ${l.txt}</div>`).join("") : '<div class="ign">(no state change yet)</div>';
      logEl.scrollTop = logEl.scrollHeight;
      const lines = ["static state_t on_event(state_t s, event_t e) {", "    switch (s) {"];
      const hotLine = [];
      S.forEach((name, s) => {
        lines.push(`        case ST_${name}:`);
        const groups = {};
        EV.forEach((ev, e) => { if (table[s][e] !== s) (groups[table[s][e]] = groups[table[s][e]] || []).push(e); });
        Object.entries(groups).forEach(([n, evs]) => { if (hot && hot[0] === s && evs.includes(hot[1])) hotLine.push(lines.length); lines.push(`            if (${evs.map(e => "e == EV_" + EV[e]).join(" || ")}) return ST_${S[n]};`); });
        if (hot && hot[0] === s && table[s][hot[1]] === s) hotLine.push(lines.length);
        lines.push("            return s;" + (EV.some((_, e) => table[s][e] === s) ? `   /* ${EV.filter((_, e) => table[s][e] === s).map(x => x.toLowerCase()).join(", ")} ignored */` : ""));
      });
      lines.push("    }", "    return s;", "}");
      code.innerHTML = lines.map((l, i) => `<div class="${hotLine.includes(i) ? "hot" : ""}">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;") || " "}</div>`).join("");
    }
    render();
  }
  function init() {
    if (!document.getElementById("fsm-css")) { const s = document.createElement("style"); s.id = "fsm-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.fsm").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
