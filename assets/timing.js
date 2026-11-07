/* Timers and interrupts. Load after course.js and plot.js.
 *
 * 1. PWM and timer configurator (lessons 59 and 71):
 *      <div class="widget pwmcalc" data-chip="stm32"></div>      data-chip: stm32 | rp2040
 *    With data-chip, only that chip's presets show and the chip cannot be switched; without it, both.
 *    STM32 general-purpose timer: f = f_clk / ((PSC + 1)(ARR + 1)), duty = CCR / (ARR + 1), PWM mode 1.
 *    RP2040 PWM slice: f = clk_sys / (DIV × (TOP + 1)), DIV = 1.0 to 255 + 15/16, duty = CC / (TOP + 1).
 *    Shows the counter, the compare line and the output, and what forgetting the + 1 costs.
 * 2. Interrupt timeline (lesson 72), STM32F103 NVIC with 4 priority bits:
 *      <div class="widget irqtimeline"></div>
 *    Sources with a stored priority (0 to 15), split by PRIGROUP into preemption and sub-priority.
 *    A pending interrupt preempts only if its preemption value is lower than the running handler's.
 *    Equal preemption: the sub-priority, then the IRQ number, picks the next one, without preempting.
 *    A PRIMASK window (__disable_irq) holds every request pending. A request that arrives while the
 *    same source is still pending is merged: the NVIC has one pending bit per source.
 */
(function () {
  "use strict";
  const CSS = `
  .pwmcalc .pw-row,.irqtimeline .iq-row{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .pwmcalc label,.irqtimeline label{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;max-width:100%}
  .pwmcalc select,.irqtimeline select{max-width:100%}
  .pwmcalc input,.pwmcalc select,.irqtimeline input,.irqtimeline select{font-family:var(--mono);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem}
  .pwmcalc input{width:5.6rem} .irqtimeline input{width:4rem}
  .pwmcalc .pw-presets,.irqtimeline .iq-presets{display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0}
  .pwmcalc .btn,.irqtimeline .btn{font-size:.75rem;padding:.15rem .5rem}
  .pwmcalc .pw-res{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
  .pwmcalc .m{background:var(--code-bg);border-radius:4px;padding:.3rem .6rem;font-family:var(--sans);font-size:.8rem}
  .pwmcalc .m b{font-family:var(--mono);font-size:1rem;display:block}
  .pwmcalc .pw-math{font-family:var(--mono);font-size:.82rem;background:var(--code-bg);border-radius:4px;padding:.45rem .7rem;white-space:pre-wrap;margin:.4rem 0}
  .pwmcalc .pw-warn{font-family:var(--sans);font-size:.88rem;color:var(--bad);margin:.3rem 0}
  .pwmcalc .pw-note{font-family:var(--sans);font-size:.88rem;background:var(--warn-soft);border-left:4px solid var(--warn);border-radius:4px;padding:.4rem .7rem;margin:.4rem 0}
  .irqtimeline table{font-size:.82rem;border-collapse:collapse;margin:.4rem 0}
  .irqtimeline th,.irqtimeline td{padding:.2rem .4rem;border-bottom:1px solid var(--rule);text-align:left} .irqtimeline th{font-size:.78rem;vertical-align:bottom}
  .irqtimeline .iq-scroll{overflow-x:auto}
  .irqtimeline svg{width:100%;min-width:560px;height:auto;display:block;font-family:var(--sans);font-size:11px}
  .irqtimeline svg text{fill:var(--fg)} .irqtimeline svg .mut{fill:var(--muted)} .irqtimeline svg .grid{stroke:var(--rule);stroke-width:.6}
  .irqtimeline svg .pend{fill:var(--warn);opacity:.35} .irqtimeline svg .stk{fill:none;stroke:var(--muted);stroke-dasharray:3 3}
  .irqtimeline svg .mask{fill:var(--bad);opacity:.12} .irqtimeline svg .lost{fill:var(--bad);font-weight:700}
  .irqtimeline .iq-legend{display:flex;flex-wrap:wrap;gap:.2rem 1rem;font-family:var(--sans);font-size:.75rem;color:var(--muted);margin:.2rem 0}
  .irqtimeline .iq-legend i{display:inline-block;width:1.4rem;height:.7rem;vertical-align:-1px;margin-right:.3rem;border-radius:2px}
  .irqtimeline .iq-log{font-family:var(--mono);font-size:.78rem;max-height:13rem;overflow-y:auto;background:var(--code-bg);border-radius:4px;padding:.4rem .7rem;white-space:pre}
  .irqtimeline .iq-sum{font-family:var(--sans);font-size:.9rem;padding:.5rem .8rem;border-radius:4px;margin:.4rem 0;background:var(--accent-soft);border-left:4px solid var(--accent)}
  .irqtimeline .iq-sum.bad{background:var(--bad-soft);border-left-color:var(--bad)}
  .irqtimeline .iq-code{font-family:var(--mono);font-size:.8rem;background:var(--code-bg);border-radius:4px;padding:.4rem .7rem;white-space:pre;overflow-x:auto}`;

  // The arrow buttons of a number input move it by its step. Typed values may be finer than the step.
  // "log" inputs step by about a tenth of their size, so 1000 Hz moves by 100 and 50 Hz by 1.
  const arrowStep = (v, min) => Math.max(min, Math.pow(10, Math.floor(Math.log10(Math.max(Math.abs(v), 1e-9))) - 1));
  const fmtHz = f => (f >= 1e6 ? +(f / 1e6).toFixed(4) + " MHz" : f >= 1e3 ? +(f / 1e3).toFixed(4) + " kHz" : +f.toFixed(3) + " Hz");
  const fmtT = s => (s >= 1e-3 ? +(s * 1e3).toFixed(4) + " ms" : +(s * 1e6).toFixed(3) + " µs");

  // ---------------------------------------------------------------- PWM
  const PW_PRESETS = [
    ["Lesson 71: 1 kHz, 25 % on the Blue Pill", { chip: "stm32", clk: 8, psc: 7, arr: 999, ccr: 250 }],
    ["The plus-one bug: ARR = 1000", { chip: "stm32", clk: 8, psc: 7, arr: 1000, ccr: 250 }],
    ["A 50 Hz servo frame, 1.5 ms pulse (STM32)", { chip: "stm32", clk: 8, psc: 7, arr: 19999, ccr: 1500 }],
    ["Capstone fan: 25 kHz, 50 %", { chip: "stm32", clk: 8, psc: 7, arr: 39, ccr: 20 }],
    ["Lesson 59: the servo on the Pico", { chip: "rp2040", clk: 125, div: 125, frac: 0, top: 19999, cc: 1500 }],
    ["Lesson 59: the starter's TOP = 1999", { chip: "rp2040", clk: 125, div: 125, frac: 0, top: 1999, cc: 1500 }],
    ["A 1 kHz LED dimmer on the Pico", { chip: "rp2040", clk: 125, div: 1, frac: 0, top: 62499, cc: 15625 }],
  ];
  function mountPwm(box) {
    const E = window.Course.el;
    const st = { chip: box.dataset.chip === "rp2040" ? "rp2040" : "stm32", clk: 8, psc: 7, arr: 999, ccr: 250, div: 125, frac: 0, top: 19999, cc: 1500, target: 1000, duty: 25 };
    if (st.chip === "rp2040") st.clk = 125;
    box.appendChild(E("h3", { text: box.dataset.title || "Timer and PWM configurator" }));
    const presets = E("div", { class: "pw-presets" });
    // A lesson about one chip shows only that chip's presets, and no chip selector.
    const fixed = !!box.dataset.chip;
    PW_PRESETS.filter(([, p]) => !fixed || p.chip === st.chip).forEach(([t, p]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { Object.assign(st, p); build(); } })));
    const inputs = E("div", { class: "pw-row" }), solver = E("div", { class: "pw-row" }), res = E("div", { class: "pw-res" }), math = E("div", { class: "pw-math" }), warn = E("div"), plots = E("div"), note = E("div", { class: "pw-note" });
    box.append(presets, inputs, solver, res, plots, math, warn, note);
    // kind: "int" (registers, step 1), "dec" (decimals may be typed, the arrows step by 1), "log" (the arrows step by a tenth of the size)
    const num = (key, label, min, max, kind) => {
      const stepOf = v => (kind === "log" ? arrowStep(v, 0.01) : 1);
      const i = E("input", { type: "number", min: kind === "log" ? 0 : min, max, step: stepOf(st[key]), value: st[key], "aria-label": label });   /* the arrows step from min, so a log input steps from 0 */
      i.addEventListener("change", () => { let v = +i.value; if (!Number.isFinite(v)) v = min; st[key] = Math.min(max, Math.max(min, kind === "int" || !kind ? Math.round(v) : +v.toPrecision(10))); i.value = st[key]; i.step = stepOf(st[key]); render(); });
      return E("label", {}, [label, i]);
    };
    function build() {
      inputs.innerHTML = ""; solver.innerHTML = "";
      const chip = E("select", { "aria-label": "Chip" }, [["stm32", "STM32 timer"], ["rp2040", "RP2040 PWM slice"]].map(([v, t]) => E("option", { value: v, text: t })));
      chip.value = st.chip; chip.addEventListener("change", () => { st.chip = chip.value; st.clk = st.chip === "rp2040" ? 125 : 8; build(); });
      if (!fixed) inputs.appendChild(chip);
      if (st.chip === "stm32") inputs.append(num("clk", "timer clock (MHz)", 1, 72, "dec"), num("psc", "PSC", 0, 65535), num("arr", "ARR", 0, 65535), num("ccr", "CCR1", 0, 65536));
      else inputs.append(num("clk", "clk_sys (MHz)", 1, 133, "dec"), num("div", "DIV integer", 1, 255), num("frac", "DIV fraction (/16)", 0, 15), num("top", "TOP", 0, 65535), num("cc", "CC", 0, 65536));
      solver.append(num("target", "target frequency (Hz)", 0.01, 1e7, "log"), num("duty", "duty (%)", 0, 100, "dec"), E("button", { class: "btn", type: "button", text: st.chip === "stm32" ? "Find PSC, ARR and CCR" : "Find DIV, TOP and CC", onclick: solve }));
      render();
    }
    function solve() {
      const clk = st.clk * 1e6, f = st.target;
      if (st.chip === "stm32") {
        let psc = Math.max(0, Math.ceil(clk / (f * 65536)) - 1);
        // prefer a round tick: try a prescaler that gives a whole number of microseconds per tick
        for (let p = psc; p < Math.min(65536, psc + 2000); p++) { const tick = clk / (p + 1); if (Number.isInteger(tick / f) && tick / f - 1 <= 65535) { psc = p; break; } }
        const arr = Math.min(65535, Math.max(0, Math.round(clk / ((psc + 1) * f)) - 1));
        Object.assign(st, { psc, arr, ccr: Math.round(st.duty / 100 * (arr + 1)) });
      } else {
        let d = clk / (f * 65536); d = Math.max(1, Math.ceil(d * 16) / 16);
        if (d > 255 + 15 / 16) d = 255 + 15 / 16;
        const top = Math.min(65535, Math.max(0, Math.round(clk / (d * f)) - 1));
        Object.assign(st, { div: Math.floor(d), frac: Math.round((d - Math.floor(d)) * 16), top, cc: Math.round(st.duty / 100 * (top + 1)) });
      }
      build();
    }
    function render() {
      const clk = st.clk * 1e6;
      let div, period, cmp, f, tick, name;
      if (st.chip === "stm32") { div = st.psc + 1; period = st.arr + 1; cmp = st.ccr; name = ["PSC", "ARR", "CCR1"]; }
      else { div = st.div + st.frac / 16; period = st.top + 1; cmp = st.cc; name = ["DIV", "TOP", "CC"]; }
      tick = clk / div; f = tick / period;
      const duty = Math.min(cmp, period) / period, high = Math.min(cmp, period) / tick;
      res.innerHTML = "";
      [["counter tick", fmtHz(tick) + "  (" + fmtT(1 / tick) + ")"], ["PWM frequency", fmtHz(f)], ["period", fmtT(1 / f)], ["duty", +(duty * 100).toFixed(3) + " %"], ["high time", fmtT(high)]]
        .forEach(([k, v]) => res.appendChild(E("div", { class: "m" }, [k, E("b", { text: v })])));
      math.textContent = st.chip === "stm32"
        ? `tick = ${st.clk} MHz ÷ (PSC + 1) = ${st.clk} MHz ÷ ${div} = ${fmtHz(tick)}\nf    = tick ÷ (ARR + 1) = ${fmtHz(tick)} ÷ ${period} = ${fmtHz(f)}\nduty = CCR1 ÷ (ARR + 1) = ${cmp} ÷ ${period} = ${+(duty * 100).toFixed(3)} %`
        : `f    = clk_sys ÷ (DIV × (TOP + 1)) = ${st.clk} MHz ÷ (${div} × ${period}) = ${fmtHz(f)}\nduty = CC ÷ (TOP + 1) = ${cmp} ÷ ${period} = ${+(duty * 100).toFixed(3)} %\nregisters: DIV_INT = ${st.div}, DIV_FRAC = ${st.frac}, TOP = ${st.top}, CC = ${cmp}`;
      const w = [];
      if (cmp > period) w.push(`${name[2]} is above ${name[1]} + 1: the output stays high all the time (100 %).`);
      if (cmp === 0) w.push(`${name[2]} = 0 keeps the output low all the time (0 %).`);
      if (st.chip === "rp2040" && st.clk > 133) w.push("clk_sys above 133 MHz is overclocking.");
      warn.innerHTML = w.map(x => `<div class="pw-warn">${x}</div>`).join("");
      const fWrong = tick / (period + 1), fGood = tick / period;
      note.innerHTML = `<b>The plus-one rule.</b> The counter runs from 0 up to ${name[1]} inclusive, so one period is ${name[1]} + 1 = ${period} ticks. ` +
        `If you had wanted ${period} ticks and written ${name[1]} = ${period} instead of ${period - 1}, the period would be ${period + 1} ticks: ${fmtHz(fWrong)} instead of ${fmtHz(fGood)}, an error of ${((fGood - fWrong) / fGood * 100).toFixed(3)} %. A scope shows it; an LED does not.`;
      // plots: two periods, counter and output
      plots.innerHTML = "";
      const P = 1 / f, us = P * 1e6, unit = us >= 2000 ? 1e3 : 1, ul = unit === 1e3 ? "ms" : "µs", Pu = us / unit, hu = high * 1e6 / unit;
      const ramp = [], out = [];
      for (let k = 0; k < 2; k++) { ramp.push([k * Pu, 0], [(k + 1) * Pu - Pu / period, period - 1], [(k + 1) * Pu - 1e-9, period - 1]); out.push([k * Pu, cmp > 0 ? 1 : 0], [k * Pu + Math.min(hu, Pu), duty >= 1 ? 1 : 0]); }
      out.push([2 * Pu, 0]);
      const rampPts = []; ramp.forEach((p, i) => { rampPts.push(p); if (i % 3 === 2) rampPts.push([p[0] + 1e-9, 0]); });
      plots.appendChild(window.Plot.chart({ w: 680, h: 160, x: [0, 2 * Pu], y: [0, Math.max(period, cmp) * 1.05], xlabel: `time (${ul})`, ylabel: "counter",
        series: [{ pts: rampPts, cls: "s1", label: "CNT" }], hlines: [{ y: Math.min(cmp, period * 1.04), label: `${name[2]} = ${cmp}` }, { y: period - 1, label: `${name[1]} = ${period - 1}` }] }));
      plots.appendChild(window.Plot.chart({ w: 680, h: 110, x: [0, 2 * Pu], y: [-0.1, 1.2], xlabel: `time (${ul})`, ylabel: "output", series: [{ pts: out, cls: "s2", step: true, label: "PWM output: high while CNT < " + name[2] }] }));
    }
    build();
  }

  // ---------------------------------------------------------------- IRQ timeline
  const GROUPS = { 3: [4, 0], 4: [3, 1], 5: [2, 2], 6: [1, 3], 7: [0, 4] };
  const IQ_PRESETS = {
    lesson: { title: "Lesson 72: a slow button handler and a fast timer", group: 3, T: 40, mask: null, src: [
      { name: "TIM2", irq: 28, prio: 0, first: 4, every: 10, dur: 0.3, sw: false }, { name: "EXTI0", irq: 6, prio: 2, first: 1, every: 0, dur: 30, sw: true }] },
    same: { title: "The same, with both at priority 2", group: 3, T: 40, mask: null, src: [
      { name: "TIM2", irq: 28, prio: 2, first: 4, every: 10, dur: 0.3, sw: false }, { name: "EXTI0", irq: 6, prio: 2, first: 1, every: 0, dur: 30, sw: true }] },
    sub: { title: "Grouping 5: a better sub-priority does not preempt", group: 5, T: 40, mask: null, src: [
      { name: "TIM2", irq: 28, prio: 4, first: 4, every: 10, dur: 0.3, sw: false }, { name: "EXTI0", irq: 6, prio: 5, first: 1, every: 0, dur: 30, sw: true }] },
    mask: { title: "A long critical section in main()", group: 3, T: 20, mask: [2, 9], src: [
      { name: "TIM2", irq: 28, prio: 0, first: 4, every: 10, dur: 0.3, sw: false }, { name: "EXTI0", irq: 6, prio: 2, first: 3, every: 0, dur: 1, sw: false }] },
  };
  const IQ_LABELS = [["lesson", "Lesson 72 example"], ["same", "Equal priorities"], ["sub", "Sub-priority only"], ["mask", "Interrupts disabled"]];
  const IQ_COL = ["#d9480f", "#1c7ed6", "#7048e8", "#2f9e44"];

  function simIrq(sc) {
    const dt = 0.1, N = Math.round(sc.T / dt), [pb, sb] = GROUPS[sc.group];
    const src = sc.src.map((s, i) => ({ ...s, i, pre: s.prio >> sb, sub: s.prio & ((1 << sb) - 1), pending: false, reqAt: null, lat: [], lost: [], reqs: [] }));
    const stack = [], rows = src.map(() => new Array(N).fill(null)), main = new Array(N).fill(false), log = [];
    const L = (t, s) => log.push(`t=${t.toFixed(1).padStart(5)} ms  ${s}`);
    const better = (a, b) => (a.pre !== b.pre ? a.pre < b.pre : a.sub !== b.sub ? a.sub < b.sub : a.irq < b.irq);
    let lastEnd = -1;
    for (let k = 0; k < N; k++) {
      const t = +(k * dt).toFixed(1);
      const masked = sc.mask && t >= sc.mask[0] && t < sc.mask[1];
      src.forEach(s => {
        const due = s.every ? t >= s.first && Math.abs(((t - s.first) / s.every) - Math.round((t - s.first) / s.every)) < 1e-6 : Math.abs(t - s.first) < 1e-6;
        if (!due) return;
        s.reqs.push(t);
        if (s.pending) { s.lost.push(t); L(t, `${s.name} requests again while still pending: merged with the first, one interrupt is lost`); return; }
        s.pending = true; s.reqAt = t;
        const top = stack[stack.length - 1];
        if (masked) L(t, `${s.name} requested: PRIMASK is set, so it stays pending`);
        else if (top && top.s !== s && !(s.pre < top.s.pre)) L(t, `${s.name} requested: its preemption level ${s.pre} is not lower than ${top.s.name}'s ${top.s.pre}, so it waits`);
      });
      if (sc.mask && Math.abs(t - sc.mask[0]) < 1e-6) L(t, "main() calls __disable_irq(): PRIMASK = 1");
      if (sc.mask && Math.abs(t - sc.mask[1]) < 1e-6) L(t, "main() calls __enable_irq(): pending interrupts may start");
      // finish handlers whose work is done
      for (let g = 0; g < 10; g++) {
        const top = stack[stack.length - 1];
        if (top && (top.s.sw ? t - top.start >= top.s.dur - 1e-9 : top.rem <= 1e-9)) {
          stack.pop(); lastEnd = t;
          L(t, `${top.s.name} returns` + (stack.length ? `, and ${stack[stack.length - 1].s.name} resumes where it was` : ""));
          continue;
        }
        if (masked) break;
        const cand = src.filter(s => s.pending && !stack.some(a => a.s === s)).sort((a, b) => (better(a, b) ? -1 : 1))[0];
        if (!cand) break;
        const cur = stack[stack.length - 1];
        if (cur && !(cand.pre < cur.s.pre)) break;
        cand.pending = false; const lat = +(t - cand.reqAt).toFixed(1); cand.lat.push(lat);
        L(t, `${cand.name} starts` + (cur ? `, preempting ${cur.s.name} (preemption ${cand.pre} < ${cur.s.pre}): a new frame is stacked` : Math.abs(lastEnd - t) < 1e-6 ? ": tail-chained, the frame is not popped and pushed again" : "") + `. Latency ${lat} ms` + (lat === 0 ? " plus the 12-cycle entry, 1.5 µs at 8 MHz" : ""));
        stack.push({ s: cand, start: t, rem: cand.dur });
      }
      const top = stack[stack.length - 1];
      stack.forEach(a => { rows[a.s.i][k] = a === top ? "run" : "stk"; });
      src.forEach(s => { if (s.pending && !rows[s.i][k]) rows[s.i][k] = "pend"; });
      if (!top) main[k] = true;
      if (top && !top.s.sw) top.rem -= dt;
    }
    return { src, rows, main, log, N, dt };
  }

  function mountIrq(box) {
    const E = window.Course.el;
    let sc = JSON.parse(JSON.stringify(IQ_PRESETS.lesson));
    box.appendChild(E("h3", { text: box.dataset.title || "Who runs when: the NVIC" }));
    const presets = E("div", { class: "iq-presets" });
    IQ_LABELS.forEach(([k, t]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { sc = JSON.parse(JSON.stringify(IQ_PRESETS[k])); build(); } })));
    const head = E("h4"), opts = E("div", { class: "iq-row" }), table = E("div", { class: "iq-scroll" }), code = E("div", { class: "iq-code" }), chart = E("div", { class: "iq-scroll" }), sum = E("div", { class: "iq-sum" }), log = E("div", { class: "iq-log" });
    const fold = (t, el) => E("details", {}, [E("summary", { text: t, style: "font-family:var(--sans);font-size:.85rem;cursor:pointer;margin:.4rem 0" }), el]);
    box.append(presets, head, opts, table, fold("The CMSIS calls for these priorities", code), E("div", { class: "iq-legend", html: '<span><i style="background:#1c7ed6"></i>running</span><span><i style="border:1px dashed var(--muted)"></i>preempted, its frame on the stack</span><span><i style="background:var(--warn);opacity:.45"></i>pending</span><span><i style="background:var(--bad);opacity:.2"></i>PRIMASK set</span><span>▼ request · <b style="color:var(--bad)">✗</b> request lost</span>' }), chart, sum, fold("What the NVIC did, event by event", log));
    function build() {
      head.textContent = sc.title;
      opts.innerHTML = "";
      const g = E("select", { "aria-label": "Priority grouping" }, Object.entries(GROUPS).map(([k, [p, s]]) => E("option", { value: k, text: `grouping ${k}: ${p} preemption bit${p === 1 ? "" : "s"}, ${s} sub-priority bit${s === 1 ? "" : "s"}` })));
      g.value = sc.group; g.addEventListener("change", () => { sc.group = +g.value; build(); });
      const m = E("input", { type: "checkbox" }); m.checked = !!sc.mask; m.addEventListener("change", () => { sc.mask = m.checked ? [2, 9] : null; build(); });
      opts.append(E("label", {}, ["NVIC_SetPriorityGrouping(): ", g]), E("label", { style: "flex-wrap:nowrap;align-items:flex-start" }, [m, "main() disables interrupts from 2 to 9 ms"]));
      table.innerHTML = "";
      const [pb, sb] = GROUPS[sc.group];
      const t = E("table");
      t.appendChild(E("tr", {}, ["source", "priority (0–15)", "preempt / sub", "first (ms)", "every (ms, 0 = once)", "takes (ms)"].map(h => E("th", { text: h }))));
      sc.src.forEach((s, i) => {
        // times keep 0.1 ms resolution when typed; the arrows move by 1 ms, or by 0.1 ms below 2 ms
        const n = (key, min, max, fine) => { const x = E("input", { type: "number", min, max, step: fine ? (s[key] < 2 ? 0.1 : 1) : 1, value: s[key] }); x.addEventListener("change", () => { let v = +x.value; if (!Number.isFinite(v)) v = min; s[key] = Math.min(max, Math.max(min, fine ? Math.round(v * 10) / 10 : Math.round(v))); build(); }); return x; };
        t.appendChild(E("tr", {}, [E("td", { html: `<b style="color:${IQ_COL[i]}">${s.name}</b>` }), E("td", {}, [n("prio", 0, 15)]), E("td", { text: `${s.prio >> sb} / ${sb ? s.prio & ((1 << sb) - 1) : "–"}` }),
          E("td", {}, [n("first", 0, sc.T, true)]), E("td", {}, [n("every", 0, sc.T, true)]), E("td", {}, [n("dur", 0.1, sc.T, true)])]));
      });
      table.appendChild(t);
      code.textContent = `NVIC_SetPriorityGrouping(${sc.group});\n` + sc.src.map(s => `NVIC_SetPriority(${s.name}_IRQn, NVIC_EncodePriority(${sc.group}, ${s.prio >> sb}, ${sb ? s.prio & ((1 << sb) - 1) : 0}));   /* stored value ${s.prio} = ${s.prio.toString(2).padStart(4, "0")}b */`).join("\n");
      draw();
    }
    function draw() {
      const r = simIrq(sc), W = 760, Lx = 70, R = 10, rowH = 30, top = 14, n = r.src.length + 1, H = top + n * rowH + 22;
      const X = t => Lx + t / sc.T * (W - Lx - R);
      const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const add = (tag, a, txt) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt !== undefined) e.textContent = txt; svg.appendChild(e); return e; };
      if (sc.mask) add("rect", { class: "mask", x: X(sc.mask[0]), y: top - 4, width: X(sc.mask[1]) - X(sc.mask[0]), height: n * rowH + 4 });
      const step = sc.T <= 20 ? 2 : 5;
      for (let t = 0; t <= sc.T; t += step) { add("line", { class: "grid", x1: X(t), x2: X(t), y1: top - 4, y2: top + n * rowH }); add("text", { class: "mut", x: X(t), y: H - 6, "text-anchor": "middle" }, t + (t === sc.T ? " ms" : "")); }
      const rowsAll = [r.main.map(v => (v ? "run" : null)), ...r.rows], names = ["main()", ...r.src.map(s => s.name)], cols = ["#868e96", ...IQ_COL];
      rowsAll.forEach((row, k) => {
        const y = top + k * rowH;
        add("text", { x: 4, y: y + 19, "font-weight": "600" }, names[k]);
        let s = 0;
        for (let i = 1; i <= r.N; i++) {
          if (i < r.N && row[i] === row[s]) continue;
          const st = row[s], x = X(s * r.dt), w = X(i * r.dt) - X(s * r.dt);
          if (st === "run") add("rect", { x, y: y + 5, width: Math.max(w, 1.5), height: rowH - 10, fill: cols[k], rx: 1 });
          if (st === "stk") add("rect", { class: "stk", x, y: y + 8, width: w, height: rowH - 16 });
          if (st === "pend") add("rect", { class: "pend", x, y: y + 8, width: w, height: rowH - 16 });
          s = i;
        }
      });
      r.src.forEach((s, k) => {
        s.reqs.forEach(t => add("text", { x: X(t), y: top + (k + 1) * rowH + 6, "text-anchor": "middle", fill: IQ_COL[k], "font-size": "9" }, "▼"));
        s.lost.forEach(t => add("text", { class: "lost", x: X(t), y: top + (k + 1) * rowH + 21, "text-anchor": "middle" }, "✗"));
      });
      chart.innerHTML = ""; chart.appendChild(svg);
      const lost = r.src.reduce((a, s) => a + s.lost.length, 0), worst = r.src.map(s => `${s.name} ${s.lat.length ? Math.max(...s.lat) : "–"} ms`).join(", ");
      sum.className = "iq-sum" + (lost || r.src.some(s => s.lat.some(l => l > 1)) ? " bad" : "");
      sum.innerHTML = `Worst latency: ${worst}` + (lost ? `. <b>${lost} request${lost > 1 ? "s" : ""} lost</b>: the source fired again before its first request was served, and the NVIC keeps only one pending bit per source.` : ".") +
        (r.src.some(s => s.lat.some(l => l > 1)) ? " A short handler waited behind a long one: only a lower preemption value lets an interrupt in, and PRIMASK keeps every one out." : " The urgent handler's latency is just the entry, because its preemption level is lower than the long handler's.");
      log.textContent = r.log.join("\n");
    }
    build();
  }

  window.Timing = { simIrq, IQ_PRESETS };
  function init() {
    if (!document.getElementById("timing-css")) { const s = document.createElement("style"); s.id = "timing-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.pwmcalc").forEach(mountPwm);
    document.querySelectorAll(".widget.irqtimeline").forEach(mountIrq);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
