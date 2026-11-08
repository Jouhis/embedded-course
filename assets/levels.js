/* Logic levels, hysteresis and pull-ups (lesson 16). Load after course.js and plot.js.
 *
 *   <div class="widget logiclevel"></div>
 *
 * Part 1: drag a voltage and read it as an RP2040 input at IOVDD = 3.3 V (VIL 0.8 V, VIH 2.0 V,
 *   RP2040 datasheet Table 625), with the output limits 0.5 V and 2.62 V and the noise margins.
 * Part 2: a slow, noisy edge read by an input with one switching point and by a Schmitt trigger with
 *   adjustable hysteresis (0.2 V to start, centred on 1.4 V). The switching points (1.4 V; 1.5 V and 1.3 V) are examples inside the band:
 *   the datasheet guarantees only the limits and the hysteresis.
 * Part 3: an open-drain line with a pull-up: devices that pull low, the current, and the rise time
 *   from the RC charge to VIH, t = -RC ln(1 - VIH/VDD).
 */
(function () {
  "use strict";
  const VDD = 3.3, VIL = 0.8, VIH = 2.0, VOL = 0.5, VOH = 2.62;
  const CSS = `
  .logiclevel h4{margin:1rem 0 .3rem;font-size:.92rem}
  .logiclevel .ll-row{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .logiclevel label{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;max-width:100%}
  .logiclevel select{font-family:var(--mono);font-size:.82rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem}
  .logiclevel input[type=range]{width:min(14rem,60vw)}
  .logiclevel .btn{font-size:.75rem;padding:.15rem .5rem}
  .logiclevel .ll-res{font-family:var(--sans);font-size:.9rem;padding:.45rem .8rem;border-radius:4px;margin:.4rem 0;border-left:4px solid var(--rule);background:var(--code-bg)}
  .logiclevel .ll-res.ok{background:var(--good-soft);border-left-color:var(--good)}
  .logiclevel .ll-res.warn{background:var(--warn-soft);border-left-color:var(--warn)}
  .logiclevel .ll-res.bad{background:var(--bad-soft);border-left-color:var(--bad)}
  .logiclevel svg.ll-bar{width:100%;height:auto;display:block;font-family:var(--sans);font-size:11px}
  .logiclevel svg text{fill:var(--fg)} .logiclevel svg .mut{fill:var(--muted)}
  .logiclevel .zlo{fill:var(--accent-soft)} .logiclevel .zun{fill:var(--warn-soft)} .logiclevel .zhi{fill:var(--good-soft)}
  .logiclevel .mk{fill:var(--fg)} .logiclevel .mkl{stroke:var(--fg);stroke-width:2}
  .logiclevel svg.ll-sch{width:100%;max-width:700px;height:auto;display:block;margin:.3rem 0;font-family:var(--sans);font-size:12px}
  .logiclevel .ll-sch .wr{fill:none;stroke:var(--fg);stroke-width:2}
  .logiclevel .ll-sch .ln{stroke-width:4}
  .logiclevel .ll-sch .dev path.ln-low{stroke-width:3.5}
  .logiclevel .ll-sch path.ln-low{stroke:var(--accent)} .logiclevel .ll-sch path.ln-high{stroke:var(--good)} .logiclevel .ll-sch path.ln-float{stroke:var(--warn);stroke-dasharray:6 4}
  .logiclevel .ll-sch text.lnlab{font-weight:700;font-size:13px} .logiclevel .ll-sch text.ln-low{fill:var(--accent)} .logiclevel .ll-sch text.ln-high{fill:var(--good)} .logiclevel .ll-sch text.ln-float{fill:var(--warn)}
  .logiclevel .ll-sch .rs{fill:var(--bg);stroke:var(--fg);stroke-width:2}
  .logiclevel .ll-sch .curt{fill:var(--accent);font-weight:700}
  .logiclevel .ll-sch .pu{cursor:pointer} .logiclevel .ll-sch .pubox{fill:transparent;stroke:var(--rule);stroke-dasharray:4 3} .logiclevel .ll-sch .pu.on .pubox{stroke:transparent} .logiclevel .ll-sch .pu:hover .pubox,.logiclevel .ll-sch .pu:focus .pubox{stroke:var(--accent)} .logiclevel .ll-sch .pu:focus{outline:none}
  .logiclevel .ll-sch .dev{cursor:pointer} .logiclevel .ll-sch .devbox{fill:var(--code-bg);stroke:var(--rule)}
  .logiclevel .ll-sch .dev.on .devbox{fill:var(--accent-soft);stroke:var(--accent)}
  .logiclevel .ll-sch .dev:focus{outline:none} .logiclevel .ll-sch .dev:hover .devbox,.logiclevel .ll-sch .dev:focus .devbox{stroke:var(--accent);stroke-width:2}
  .logiclevel .ll-res2{min-height:4rem;box-sizing:border-box}
  .logiclevel .ll-res3{min-height:5.2rem;box-sizing:border-box}
  .logiclevel .ll-tbl{min-height:13rem}
  .logiclevel tr.sel td{font-weight:700;background:var(--accent-soft)}
  .logiclevel table{border-collapse:collapse;font-size:.82rem;margin:.3rem 0} .logiclevel td,.logiclevel th{border:1px solid var(--rule);padding:.2rem .5rem;text-align:left}`;

  const fmtV = v => v.toFixed(2) + " V";
  const fmtT = s => s >= 1e-3 ? (s * 1e3).toPrecision(3) + " ms" : s >= 1e-6 ? (s * 1e6).toPrecision(3) + " µs" : (s * 1e9).toPrecision(3) + " ns";
  const fmtR = r => r >= 1000 ? +(r / 1000).toPrecision(3) + " kΩ" : r + " Ω";

  function mount(box) {
    const E = window.Course.el, P = window.Plot;
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "Logic levels, hysteresis and pull-ups" }));

    // ---- Part 1: what does the input read?
    const st = { v: 1.4, noise: 0.15, hys: 0.2, seed: 3, rpu: 4700, cpf: 100, devs: [false, false, false], pull: "ext" };
    box.appendChild(E("h4", { text: "1. What does the input read?" }));
    box.appendChild(E("p", { class: "widget-hint", text: "Drag the voltage on an RP2040 input pin at IOVDD = 3.3 V. The buttons load the worst-case output levels of another chip." }));
    const vIn = E("input", { type: "range", min: 0, max: VDD, step: 0.01, value: st.v, "aria-label": "input voltage" });
    const vOut = E("b", { text: "" });
    vIn.addEventListener("input", () => { st.v = +vIn.value; draw1(); });
    const preset = (t, v) => E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { st.v = v; vIn.value = v; draw1(); } });
    box.appendChild(E("div", { class: "ll-row" }, [E("label", {}, ["voltage", vIn, vOut])]));
    box.appendChild(E("div", { class: "ll-row" }, [preset("RP2040 output low, worst case", VOL), preset("RP2040 output high, worst case", VOH), preset("A 1.8 V chip's high", 1.8), preset("Floating, somewhere", 1.3)]));
    const bar = E("div"), res1 = E("div", { class: "ll-res" });
    box.append(bar, res1);
    function draw1() {
      const v = st.v; vOut.textContent = fmtV(v);
      const W = 640, H = 70, L = 10, R = 10, X = x => L + (x / VDD) * (W - L - R);
      let s = `<svg class="ll-bar" viewBox="0 0 ${W} ${H}" role="img" aria-label="input threshold bands">`;
      s += `<rect class="zlo" x="${X(0)}" y="18" width="${X(VIL) - X(0)}" height="22"/><rect class="zun" x="${X(VIL)}" y="18" width="${X(VIH) - X(VIL)}" height="22"/><rect class="zhi" x="${X(VIH)}" y="18" width="${X(VDD) - X(VIH)}" height="22"/>`;
      s += `<text x="${(X(0) + X(VIL)) / 2}" y="33" text-anchor="middle">reads 0</text><text x="${(X(VIL) + X(VIH)) / 2}" y="33" text-anchor="middle">not guaranteed</text><text x="${(X(VIH) + X(VDD)) / 2}" y="33" text-anchor="middle">reads 1</text>`;
      [[0, "0"], [VIL, "VIL 0.8"], [VIH, "VIH 2.0"], [VDD, "3.3 V"]].forEach(([x, t], i) => { s += `<text class="mut" x="${X(x)}" y="56" text-anchor="${i === 0 ? "start" : i === 3 ? "end" : "middle"}">${t}</text>`; });
      s += `<line class="mkl" x1="${X(v)}" x2="${X(v)}" y1="12" y2="44"/><path class="mk" d="M${X(v) - 6} 6 L${X(v) + 6} 6 L${X(v)} 13 Z"/></svg>`;
      bar.innerHTML = s;
      if (v <= VIL) { res1.className = "ll-res ok"; res1.textContent = `${fmtV(v)} reads 0. The margin to VIL is ${fmtV(VIL - v)}: noise smaller than that cannot make it read 1.` + (Math.abs(v - VOL) < 0.005 ? " This is the low noise margin, VIL − VOL = 0.8 − 0.5 = 0.30 V." : ""); }
      else if (v >= VIH) { res1.className = "ll-res ok"; res1.textContent = `${fmtV(v)} reads 1. The margin above VIH is ${fmtV(v - VIH)}.` + (Math.abs(v - VOH) < 0.005 ? " This is the high noise margin, VOH − VIH = 2.62 − 2.0 = 0.62 V." : ""); }
      else { res1.className = "ll-res warn"; res1.textContent = `${fmtV(v)} is in the band between VIL and VIH. The input may read 0 or 1, and it may change between reads.` + (Math.abs(v - 1.8) < 0.005 ? " A 1.8 V chip's high does not reach 2.0 V, so it needs a level shifter." : ""); }
    }
    draw1();

    // ---- Part 2: hysteresis
    box.appendChild(E("h4", { text: "2. A slow, noisy edge" }));
    box.appendChild(E("p", { class: "widget-hint", text: "The edge rises from 0 V to 3.3 V, with noise added. A plain input switches at one point, 1.4 V here, and every wobble across it is another edge. A Schmitt trigger has two switching points: it goes to 1 at the upper one and back to 0 only below the lower one. The gap between them is the hysteresis; drag it and watch the edge count. The switching points are examples inside the band." }));
    const nIn = E("input", { type: "range", min: 0, max: 0.4, step: 0.01, value: st.noise, "aria-label": "noise amplitude" });
    const nOut = E("b");
    nIn.addEventListener("input", () => { st.noise = +nIn.value; draw2(); });
    const hIn = E("input", { type: "range", min: 0, max: 1.2, step: 0.05, value: st.hys, "aria-label": "Schmitt hysteresis" });
    const hOut = E("b");
    hIn.addEventListener("input", () => { st.hys = +hIn.value; draw2(); });
    box.appendChild(E("div", { class: "ll-row" }, [E("label", {}, ["noise (peak)", nIn, nOut]), E("button", { class: "btn secondary", type: "button", text: "New noise", onclick: () => { st.seed++; draw2(); } })]));
    box.appendChild(E("div", { class: "ll-row" }, [E("label", {}, ["Schmitt hysteresis", hIn, hOut]), E("button", { class: "btn secondary", type: "button", text: "RP2040: 0.2 V", onclick: () => { st.hys = 0.2; hIn.value = 0.2; draw2(); } })]));
    const plot2 = E("div"), res2 = E("div", { class: "ll-res ll-res2" });
    box.append(plot2, res2);
    function draw2() {
      nOut.textContent = fmtV(st.noise);
      const up = 1.4 + st.hys / 2, dn = 1.4 - st.hys / 2;
      hOut.textContent = `${fmtV(st.hys)}: up at ${up.toFixed(2)} V, down at ${dn.toFixed(2)} V`;
      const r = P.rng(st.seed), N = 400, sig = [], plain = [], schm = [];
      let ps = 0, ss = 0, pe = 0, se = 0, nz = 0;
      for (let i = 0; i <= N; i++) {
        const t = i / N * 100;
        nz = 0.6 * nz + 0.4 * (r() * 2 - 1);                         // a little low-pass on the noise, so it wobbles
        const v = Math.min(VDD + 0.4, Math.max(-0.4, VDD * Math.min(1, Math.max(0, (t - 15) / 70)) + st.noise * 1.6 * nz));
        sig.push([t, v]);
        const pn = v > 1.4 ? 1 : 0; if (i && pn !== ps) pe++; ps = pn;
        const sn = ss ? (v < dn ? 0 : 1) : (v > up ? 1 : 0); if (i && sn !== ss) se++; ss = sn;
        plain.push([t, -1.0 + pn * 0.7]); schm.push([t, -2.1 + sn * 0.7]);
      }
      plot2.innerHTML = "";
      plot2.appendChild(P.chart({ w: 640, h: 260, x: [0, 100], y: [-2.3, 3.8], xlabel: "time", ylabel: "V",
        series: [{ pts: sig, cls: "s1", label: "pin voltage", thin: true }, { pts: plain, cls: "s2", label: "plain input reads", step: true }, { pts: schm, cls: "s4", label: "Schmitt reads", step: true }],
        hlines: st.hys > 0 ? [{ y: up, label: `Schmitt switches up at ${up.toFixed(2)} V, down at ${dn.toFixed(2)} V` }, { y: dn }] : [{ y: 1.4, label: "no hysteresis: both switch at 1.4 V" }], bands: [{ y0: VIL, y1: VIH }] }));
      const ok = se <= 1;
      res2.className = "ll-res " + (pe > 1 ? "warn" : "ok");
      res2.textContent = `The plain input saw ${pe} edge${pe === 1 ? "" : "s"}, the Schmitt trigger ${se}.` + (pe > 1 ? (ok ? ` Software would count one slow edge as several presses; ${fmtV(st.hys)} of hysteresis hides wobbles smaller than that.` : (st.hys === 0 ? " With no hysteresis the Schmitt trigger is just a plain input, and it chatters the same way." : ` This noise swings more than ${fmtV(st.hys)}, so even the Schmitt trigger chatters. Widen the hysteresis, filter the signal, or debounce in software (lesson 52).`)) : " With little noise, one edge is one edge for both.");
    }
    draw2();

    // ---- Part 3: open-drain line
    box.appendChild(E("h4", { text: "3. An open-drain line with a pull-up" }));
    box.appendChild(E("p", { class: "widget-hint", text: "Open drain means each device has only two choices: connect the line to ground (pull it low) or switch off and let go. No device can drive the line high; only the pull-up resistor does that. Click a device to switch it, and click the pull-up to remove it or fit it again." }));
    const NS = "http://www.w3.org/2000/svg";
    const S = (tag, a, txt) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt !== undefined) e.textContent = txt; return e; };
    const sch = S("svg", { class: "ll-sch", viewBox: "0 0 700 240", role: "img", "aria-label": "Open-drain line: a pull-up resistor from 3.3 V, three devices that can switch the line to ground, and the line capacitance" });
    const rIn = E("input", { type: "range", min: 0, max: 100, step: 1, "aria-label": "pull-up resistance" }), rOut = E("b");
    const cIn = E("input", { type: "range", min: 10, max: 400, step: 10, value: st.cpf, "aria-label": "line capacitance" }), cOut = E("b");
    const RVALS = [1000, 1500, 2200, 3300, 4700, 10000, 22000, 47000, 50000, 100000];
    rIn.max = RVALS.length - 1; rIn.value = RVALS.indexOf(st.rpu);
    rIn.addEventListener("input", () => { st.rpu = RVALS[+rIn.value]; draw3(); });
    cIn.addEventListener("input", () => { st.cpf = +cIn.value; draw3(); });
    box.appendChild(sch);
    box.appendChild(E("div", { class: "ll-row" }, [E("label", {}, ["pull-up", rIn, rOut]), E("label", {}, ["line capacitance", cIn, cOut])]));
    const res3 = E("div", { class: "ll-res ll-res3" }), tbl = E("div", { class: "ll-tbl" });
    box.append(res3, tbl);
    const toggle = i => { st.devs[i] = !st.devs[i]; draw3(); };
    function draw3() {
      rOut.textContent = fmtR(st.rpu); cOut.textContent = st.cpf + " pF";
      const on = st.pull === "ext";
      rIn.disabled = !on;
      const n = st.devs.filter(Boolean).length;
      const R = st.rpu, C = st.cpf * 1e-12, tau = R * C, k = -Math.log(1 - VIH / VDD), tr = tau * k;
      const state = n > 0 ? "low" : on ? "high" : "float";
      sch.innerHTML = "";
      const lc = state === "low" ? "ln-low" : state === "high" ? "ln-high" : "ln-float";
      sch.append(S("text", { x: 20, y: 16, class: "mut" }, "3.3 V"), S("path", { d: "M20 24 H120", class: "wr" }));
      const pu = S("g", { class: "pu" + (on ? " on" : ""), tabindex: 0, role: "button", "aria-pressed": String(on), "aria-label": on ? "pull-up fitted; press to remove it" : "no pull-up; press to fit one" });
      pu.append(S("rect", { x: 40, y: 30, width: 130, height: 74, rx: 6, class: "pubox" }));
      if (on) {
        pu.append(S("path", { d: "M70 24 V44", class: "wr" }), S("rect", { x: 60, y: 44, width: 20, height: 46, rx: 2, class: "rs" }),
          S("text", { x: 88, y: 60 }, "pull-up"), S("text", { x: 88, y: 76, class: "mut" }, fmtR(R)), S("path", { d: "M70 90 V110", class: "wr" }));
        if (state === "low") pu.append(S("text", { x: 88, y: 94, class: "curt" }, "↓ " + (VDD / R * 1000).toFixed(2) + " mA"));
      } else pu.append(S("text", { x: 105, y: 64, class: "mut", "text-anchor": "middle" }, "no pull-up"), S("text", { x: 105, y: 80, class: "mut", "text-anchor": "middle" }, "(click to fit)"));
      const flip = () => { st.pull = on ? "none" : "ext"; draw3(); };
      pu.addEventListener("click", flip);
      pu.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      sch.append(pu);
      sch.append(S("path", { d: "M70 110 H660", class: "wr ln " + lc }));
      sch.append(S("text", { x: 430, y: 100, class: "lnlab " + lc }, state === "low" ? "line ≈ 0 V: reads 0" : state === "high" ? "line = 3.3 V: reads 1" : "line floats: 0 or 1?"));
      st.devs.forEach((d, i) => {
        const x = 170 + i * 110, g = S("g", { class: "dev" + (d ? " on" : ""), tabindex: 0, role: "button", "aria-label": `device ${i + 1}, ${d ? "pulls low" : "let go"}` });
        g.append(S("rect", { x: x - 42, y: 122, width: 84, height: 92, rx: 6, class: "devbox" }), S("text", { x: x, y: 234, "text-anchor": "middle" }, `device ${i + 1}`),
          S("path", { d: `M${x} 110 V152`, class: "wr" + (d ? " ln-low" : "") }),
          S("path", { d: d ? `M${x} 152 V182` : `M${x} 182 L${x + 15} 156`, class: "wr" + (d ? " ln-low" : "") }),
          S("path", { d: `M${x} 182 V194 M${x - 12} 194 H${x + 12} M${x - 7} 199 H${x + 7} M${x - 2} 204 H${x + 2}`, class: "wr" }),
          S("text", { x: x + 22, y: 146, class: "mut" }, d ? "on" : "off"));
        g.addEventListener("click", () => toggle(i));
        g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } });
        sch.append(g);
      });
      const cx = 540;
      sch.append(S("path", { d: `M${cx} 110 V150 M${cx - 16} 150 H${cx + 16} M${cx - 16} 158 H${cx + 16} M${cx} 158 V182 M${cx - 12} 182 H${cx + 12} M${cx - 7} 187 H${cx + 7}`, class: "wr" }),
        S("text", { x: cx + 24, y: 152 }, "line capacitance"), S("text", { x: cx + 24, y: 168, class: "mut" }, st.cpf + " pF"));
      if (state === "float") { res3.className = "ll-res ll-res3 bad"; res3.textContent = "Every device has let go and nothing pulls up, so nothing sets the voltage: the line floats. It can sit between VIL and VIH and read 0 or 1 at random. This is why an open-drain line always needs a pull-up."; }
      else if (state === "low") { res3.className = "ll-res ll-res3 ok"; res3.textContent = `${n === 1 ? "One device connects" : n + " devices connect"} the line to ground, so it reads 0. Nothing fights: devices only ever pull down.` + (on ? ` While the line is low, 3.3 V ÷ ${fmtR(R)} = ${(VDD / R * 1000).toFixed(2)} mA flows through the pull-up into ground: the price of holding the line low.` : ""); }
      else { res3.className = "ll-res ll-res3 ok"; res3.textContent = `Every device has let go, so the pull-up resistor charges the line to 3.3 V and it reads 1. The charge flows through the resistor into the line's capacitance, so the rise takes time: the line crosses VIH = 2.0 V after ${fmtT(tr)}. That is ${k.toFixed(2)} × RC, with RC = ${fmtR(R)} × ${st.cpf} pF = ${fmtT(tau)}.`; }
      const rows = [...new Set([1000, 4700, 10000, 50000, R])].sort((x, y) => x - y);
      tbl.innerHTML = on ? `<table><tr><th>pull-up</th><th>current while low</th><th>time to reach 2.0 V at ${st.cpf} pF</th></tr>` + rows.map(r => `<tr${r === R ? ' class="sel"' : ""}><td>${fmtR(r)}${r === R ? " (selected)" : ""}</td><td>${(VDD / r * 1000).toFixed(3)} mA</td><td>${fmtT(-r * C * Math.log(1 - VIH / VDD))}</td></tr>`).join("") + `</table><p class="widget-hint">A smaller pull-up gives a faster rise but wastes more current every time the line is low. 50 kΩ is about the RP2040's internal pull-up at its weakest.</p>` : `<p class="widget-hint">Click the dashed box in the drawing to fit a pull-up, then compare the current and the rise time.</p>`;
    }
    draw3();
  }
  function init() {
    if (!document.getElementById("logiclevel-css")) { const s = document.createElement("style"); s.id = "logiclevel-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.logiclevel").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
