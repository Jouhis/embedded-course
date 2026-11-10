/* Budget calculators. Load after course.js.
 *
 *   <div class="widget powerbudget"></div>   duty-cycled average current and battery life (lesson 75)
 *   <div class="widget dmaring"></div>       a UART into a circular DMA buffer with HT and TC interrupts (lesson 74)
 *
 * Lesson 75: awake 50 ms of 1000 ms at 10 mA, asleep at 0.005 mA, 2000 mAh:
 *   I_avg = 0.05 × 10 + 0.95 × 0.005 = 0.50475 mA, life 3962.4 h = 165.1 days.
 * Lesson 74: 115200 baud, 10 bits a byte: 86.8 µs a byte; a 256-byte buffer has 128-byte halves,
 *   11.11 ms each. A half-transfer handler must finish its half before the DMA comes back to it.
 */
(function () {
  "use strict";
  const CSS = `
  .powerbudget .pb-row,.dmaring .dr-row{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .powerbudget label,.dmaring label{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;max-width:100%}
  .powerbudget input,.dmaring input,.dmaring select{font-family:var(--mono);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem;width:6.5rem;max-width:100%}
  .powerbudget .btn,.dmaring .btn{font-size:.75rem;padding:.15rem .5rem}
  .powerbudget .pb-calc{font-family:var(--mono);font-size:.8rem;white-space:pre;overflow-x:auto;background:var(--code-bg);border-radius:4px;padding:.4rem .6rem;margin:.4rem 0}
  .powerbudget .pb-bar{display:flex;height:1.6rem;border-radius:4px;overflow:hidden;border:1px solid var(--rule);margin:.3rem 0;font-family:var(--sans);font-size:.72rem}
  .powerbudget .pb-bar div{display:flex;align-items:center;justify-content:center;color:#fff;white-space:nowrap;overflow:hidden;min-width:2px}
  .powerbudget .pb-bar .aw{background:#d9480f} .powerbudget .pb-bar .sl{background:var(--accent)}
  .powerbudget table,.dmaring table{border-collapse:collapse;font-size:.8rem;margin:.4rem 0} .powerbudget td,.powerbudget th,.dmaring td,.dmaring th{border:1px solid var(--rule);padding:.2rem .5rem;text-align:left}
  .powerbudget td.best{background:var(--good-soft);font-weight:700}
  .powerbudget .pb-res,.dmaring .dr-res{font-family:var(--sans);font-size:.88rem;padding:.45rem .8rem;border-radius:4px;margin:.4rem 0;border-left:4px solid var(--rule);background:var(--code-bg)}
  .dmaring .dr-res.ok{background:var(--good-soft);border-left-color:var(--good)} .dmaring .dr-res.bad{background:var(--bad-soft);border-left-color:var(--bad)}
  .dmaring svg{width:100%;height:auto;display:block;font-family:var(--sans);font-size:11px}
  .dmaring svg text{fill:var(--fg)} .dmaring svg .mut{fill:var(--muted)}
  .dmaring .hA{fill:var(--accent);opacity:.75} .dmaring .hB{fill:light-dark(#7048e8,#9775fa);opacity:.75} .dmaring .ov{fill:var(--bad)} .dmaring .ev{stroke:var(--muted);stroke-width:1;stroke-dasharray:3 3}`;

  // ---------------- power budget ----------------
  function mountPower(box) {
    const E = window.Course.el;
    const L = { period: 1000, awake: 50, ia: 10, is: 5, cap: 2000 };
    const st = Object.assign({}, L);
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "The power budget of a duty-cycled sensor" }));
    box.appendChild(E("p", { class: "widget-hint", text: "The device wakes once per period, works, and sleeps for the rest. The currents are the lesson's example values, not datasheet figures. Change one number at a time and watch which term of the average moves." }));
    const inputs = {};
    const num = (k, label, min, max, step) => { const i = E("input", { type: "number", min, max, step, value: st[k], "aria-label": label }); i.addEventListener("change", () => { let v = +i.value; if (!Number.isFinite(v)) v = min; st[k] = Math.min(max, Math.max(min, v)); if (k === "period" || k === "awake") st.awake = Math.min(st.awake, st.period); render(); }); inputs[k] = i; return E("label", {}, [label, i]); };
    box.append(E("div", { class: "pb-row" }, [num("period", "period (ms)", 1, 3600000, 10), num("awake", "awake (ms)", 0, 3600000, 1), num("ia", "awake current (mA)", 0, 500, 0.5), num("is", "sleep current (µA)", 0, 10000, 0.5), num("cap", "battery (mAh)", 1, 100000, 100)]),
      E("div", { class: "pb-row" }, [E("button", { class: "btn secondary", type: "button", text: "Lesson values", onclick: () => { Object.assign(st, L); render(); } }), E("button", { class: "btn secondary", type: "button", text: "Awake for 10 ms", onclick: () => { Object.assign(st, L, { awake: 10 }); render(); } }), E("button", { class: "btn secondary", type: "button", text: "Sleep current 50 µA (a leaky regulator)", onclick: () => { Object.assign(st, L, { is: 50 }); render(); } })]));
    const calc = E("div", { class: "pb-calc" }), bar = E("div", { class: "pb-bar" }), sens = E("div"), res = E("div", { class: "pb-res" });
    box.append(calc, E("div", { class: "pb-row", text: "Share of the average current:" }), bar, sens, res);
    const f = (v, n) => +v.toFixed(n) + "";
    const life = s => { const d = s.awake / s.period, I = d * s.ia + (1 - d) * s.is / 1000; return { d, I, aw: d * s.ia, sl: (1 - d) * s.is / 1000, h: s.cap / I }; };
    function render() {
      Object.entries(inputs).forEach(([k, i]) => { i.value = st[k]; });
      const r = life(st), days = r.h / 24;
      calc.textContent = `d     = ${st.awake} ms ÷ ${st.period} ms = ${f(r.d, 6)}\nI_avg = d × I_awake + (1 − d) × I_sleep\n      = ${f(r.d, 6)} × ${st.ia} mA + ${f(1 - r.d, 6)} × ${f(st.is / 1000, 6)} mA\n      = ${f(r.aw, 6)} mA + ${f(r.sl, 6)} mA = ${f(r.I, 6)} mA\nlife  = ${st.cap} mAh ÷ ${f(r.I, 6)} mA = ${r.h.toFixed(1)} h = ${days.toFixed(1)} days` + (days > 365 ? ` (${(days / 365).toFixed(1)} years)` : "");
      const pa = r.I ? r.aw / r.I * 100 : 0;
      bar.innerHTML = `<div class="aw" style="width:${pa}%">${pa > 12 ? "awake " + pa.toFixed(1) + " %" : ""}</div><div class="sl" style="width:${100 - pa}%">${100 - pa > 12 ? "asleep " + (100 - pa).toFixed(1) + " %" : ""}</div>`;
      const opts = [["halve the awake time", { awake: st.awake / 2 }], ["halve the awake current", { ia: st.ia / 2 }], ["halve the sleep current", { is: st.is / 2 }], ["double the period", { period: st.period * 2 }]].map(([t, p]) => [t, life(Object.assign({}, st, p)).h / 24]);
      const best = Math.max(...opts.map(o => o[1]));
      sens.innerHTML = `<table><tr><th>if you…</th><th>life</th><th>gain</th></tr>` + opts.map(([t, d]) => `<tr><td>${t}</td><td class="${d === best ? "best" : ""}">${d.toFixed(1)} days</td><td>${((d / days - 1) * 100).toFixed(0)} %</td></tr>`).join("") + "</table>";
      res.textContent = pa > 50 ? `The awake term is ${pa.toFixed(0)} % of the average, so shorten the awake time or lower the awake current first. Halving the sleep current gains almost nothing.` : `The sleep term is now ${(100 - pa).toFixed(0)} % of the average, so the sleep current matters most: look for leakage, pull-ups and the regulator's quiescent current.`;
    }
    render();
  }

  // ---------------- DMA ring ----------------
  function mountDma(box) {
    const E = window.Course.el;
    const st = { baud: 115200, n: 256, lat: 0.1, proc: 2, isr: 3 };
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "Can the handler keep up with the DMA?" }));
    box.appendChild(E("p", { class: "widget-hint", text: "The DMA writes received bytes round a circular buffer. At half full it raises HT and the handler reads the first half; at full it raises TC and wraps. Each handler has until the DMA comes back to its half. Make the handler slower, or the buffer smaller, until the DMA overwrites bytes that have not been read." }));
    const sel = (k, label, vals, fmt) => { const s = E("select", { "aria-label": label }, vals.map(v => E("option", { value: v, text: fmt ? fmt(v) : String(v) }))); s.value = st[k]; s.addEventListener("change", () => { st[k] = +s.value; render(); }); return E("label", {}, [label, s]); };
    const num = (k, label, min, max, step) => { const i = E("input", { type: "number", min, max, step, value: st[k], "aria-label": label }); i.addEventListener("change", () => { let v = +i.value; if (!Number.isFinite(v)) v = min; st[k] = Math.min(max, Math.max(min, v)); i.value = st[k]; render(); }); return E("label", {}, [label, i]); };
    box.append(E("div", { class: "dr-row" }, [sel("baud", "baud", [9600, 19200, 57600, 115200, 460800, 921600]), sel("n", "buffer (bytes)", [16, 32, 64, 128, 256, 512, 1024]), num("lat", "delay before the handler starts (ms)", 0, 100, 0.1), num("proc", "handler time per half (ms)", 0, 200, 0.5)]));
    const svgBox = E("div"), res = E("div", { class: "dr-res" }), cmp = E("div");
    box.append(svgBox, res, E("h4", { text: "Against one interrupt per byte (lesson 70)", style: "margin:.8rem 0 .2rem;font-size:.9rem" }), E("div", { class: "dr-row" }, [num("isr", "cost of one interrupt, entry to exit (µs)", 0.5, 50, 0.5)]), cmp);
    function render() {
      const tb = 10 / st.baud * 1000, half = st.n / 2 * tb; // ms
      const ev = []; let cpu = 0, over = null;
      for (let k = 1; k <= 8; k++) {
        const t = k * half, h = (k - 1) % 2, start = Math.max(t + st.lat, cpu), end = start + st.proc;
        const due = t + half;  // the DMA starts writing this half again
        ev.push({ t, h, start, end, due, late: end > due + 1e-9 }); cpu = end;
        if (end > due + 1e-9 && over === null) over = { k, h, end, due };
      }
      const span = Math.max(9 * half, ev[ev.length - 1].end) * 1.02, W = 680, Lm = 90, Rm = 10, X = t => Lm + t / span * (W - Lm - Rm);
      let s = `<svg viewBox="0 0 ${W} 132" role="img" aria-label="DMA and handler timeline">`;
      s += `<text x="4" y="34">DMA writes</text><text x="4" y="74">handler</text>`;
      for (let k = 0; k * half < span; k++) { const a = k * half, b = Math.min(span, a + half); s += `<rect class="${k % 2 ? "hB" : "hA"}" x="${X(a)}" y="20" width="${X(b) - X(a)}" height="22"/>`; if (X(b) - X(a) > 34) s += `<text x="${(X(a) + X(b)) / 2}" y="35" text-anchor="middle" style="fill:#fff">half ${k % 2 ? "B" : "A"}</text>`; }
      ev.forEach(e => {
        s += `<line class="ev" x1="${X(e.t)}" x2="${X(e.t)}" y1="14" y2="92"/><text class="mut" x="${X(e.t) + 2}" y="12">${e.h ? "TC" : "HT"}</text>`;
        if (X(e.end) <= W) s += `<rect class="${e.h ? "hB" : "hA"}" x="${X(e.start)}" y="60" width="${Math.max(1.5, X(Math.min(e.end, span)) - X(e.start))}" height="22"/>`;
        if (e.late && X(e.due) <= W) s += `<rect class="ov" x="${X(e.due)}" y="86" width="${Math.max(2, X(Math.min(e.end, span)) - X(e.due))}" height="6"/>`;
      });
      s += `<text class="mut" x="${Lm}" y="112">0</text><text class="mut" x="${W - Rm}" y="112" text-anchor="end">${span.toFixed(span < 10 ? 2 : 1)} ms</text>`;
      s += `<text class="mut" x="${Lm}" y="128">colour = which half; a red bar marks a handler still reading after the DMA came back to its half</text></svg>`;
      svgBox.innerHTML = s;
      const budget = half - st.lat;
      if (over) { res.className = "dr-res bad"; res.textContent = `Overrun. One byte takes ${(tb * 1000).toFixed(1)} µs, so a half of ${st.n / 2} bytes fills in ${half.toFixed(2)} ms. The handler needs ${st.lat} + ${st.proc} = ${(st.lat + st.proc).toFixed(2)} ms after its interrupt, which is more than that, so the DMA writes over bytes that have not been read. Use a bigger buffer, or do less in the handler.`; }
      else { res.className = "dr-res ok"; res.textContent = `It keeps up. One byte takes ${(tb * 1000).toFixed(1)} µs, so a half of ${st.n / 2} bytes fills in ${half.toFixed(2)} ms. That is the handler's deadline, measured from its interrupt; it uses ${(st.lat + st.proc).toFixed(2)} ms, leaving ${(budget - st.proc).toFixed(2)} ms.`; }
      const perByte = st.isr / (tb * 1000) * 100, perHalf = st.isr / 1000 / half * 100;
      cmp.innerHTML = `<table><tr><th>design</th><th>interrupts per second</th><th>CPU time in entry and exit</th></tr><tr><td>one interrupt per byte</td><td>${Math.round(st.baud / 10).toLocaleString("en-US")}</td><td>${perByte.toFixed(1)} %${perByte >= 100 ? " (it cannot keep up)" : ""}</td></tr><tr><td>DMA, HT and TC</td><td>${(1000 / half).toFixed(1)}</td><td>${perHalf.toFixed(3)} %</td></tr></table>`;
    }
    render();
  }

  function init() {
    if (!document.getElementById("budget-css")) { const s = document.createElement("style"); s.id = "budget-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.powerbudget").forEach(mountPower);
    document.querySelectorAll(".widget.dmaring").forEach(mountDma);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
