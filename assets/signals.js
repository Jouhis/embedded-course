/* Signal widgets. Load after course.js and plot.js.
 *
 * 1. Debounce lab (lesson 52):          <div class="widget debounce"></div>
 *    A bouncing, active-low button sampled every SAMPLE_MS by the lesson's integrator
 *    (climb while pressed, fall while released, clamped to 0..DEBOUNCE_SAMPLES). Shows the raw pin, the
 *    counter and the debounced state, and counts presses the naive edge detector and the integrator see.
 * 2. ADC chain (lesson 58):             <div class="widget adcchain"></div>
 *    Temperature → NTC resistance (beta 3950, 10 kΩ at 25 °C) → divider (10 kΩ fixed on the supply side)
 *    → pin voltage → 12-bit code (ratio × 4095) → back to °C with the lesson's formula. Noise on each
 *    sample, and averaging of N samples, which shrinks the noise by about √N.
 * 3. Filter lab (lesson 106):           <div class="widget filterlab"></div>
 *    The lesson's three filters on the same input: moving average with a running sum, the fixed-point
 *    EMA (state × 256, α = 1/2^k, primed with the first sample, rounded output) and the median of three.
 *    Inputs: a step, a noisy step, a spike, a slow wave with noise, and an undersampled sine (aliasing).
 */
(function () {
  "use strict";
  const CSS = `
  .debounce .sg-row,.adcchain .sg-row,.filterlab .sg-row{display:flex;flex-wrap:wrap;gap:.4rem 1.1rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .debounce label,.adcchain label,.filterlab label{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;max-width:100%}
  .debounce select,.adcchain select,.filterlab select{max-width:100%}
  .debounce input[type=range],.adcchain input[type=range],.filterlab input[type=range]{width:min(8rem,38vw)}
  .debounce select,.adcchain select,.filterlab select{font-family:var(--sans);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.15rem .3rem}
  .debounce .v,.adcchain .v,.filterlab .v{font-family:var(--mono);min-width:3rem}
  .debounce .btn,.adcchain .btn,.filterlab .btn{font-size:.75rem;padding:.15rem .5rem}
  .sg-metrics{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
  .sg-metrics .m{background:var(--code-bg);border-radius:4px;padding:.3rem .6rem;font-family:var(--sans);font-size:.8rem}
  .sg-metrics .m b{font-family:var(--mono);font-size:1rem;display:block} .sg-metrics .m.bad b{color:var(--bad)} .sg-metrics .m.good b{color:var(--good)}
  .sg-why{font-family:var(--sans);font-size:.88rem;margin:.3rem 0;padding-left:1.2rem}
  .adcchain .ad-chain{display:flex;flex-wrap:wrap;gap:.3rem;align-items:stretch;margin:.5rem 0}
  .adcchain .st{border:1px solid var(--rule);border-radius:6px;padding:.35rem .55rem;background:var(--code-bg);font-family:var(--sans);font-size:.78rem;min-width:6.5rem}
  .adcchain .st b{display:block;font-family:var(--mono);font-size:.95rem} .adcchain .st small{color:var(--muted)}
  .adcchain .arr{align-self:center;color:var(--muted)}
  .filterlab table{font-size:.8rem;border-collapse:collapse;margin:.4rem 0} .filterlab td,.filterlab th{padding:.2rem .45rem;border-bottom:1px solid var(--rule);text-align:right;font-family:var(--mono)} .filterlab th{font-family:var(--sans)}
  .filterlab .sg-scroll{overflow-x:auto}`;
  const css = () => { if (!document.getElementById("signals-css")) { const s = document.createElement("style"); s.id = "signals-css"; s.textContent = CSS; document.head.appendChild(s); } };
  const slider = (E, label, min, max, step, val, on, fmt) => {
    const r = E("input", { type: "range", min, max, step, value: val, "aria-label": label }), v = E("span", { class: "v", text: fmt ? fmt(val) : String(val) });
    r.addEventListener("input", () => { v.textContent = fmt ? fmt(+r.value) : r.value; on(+r.value); });
    return E("label", {}, [label, r, v]);
  };
  const metric = (E, k, v, c) => E("div", { class: "m " + (c || "") }, [k, E("b", { text: v })]);

  // ---------------------------------------------------------------- debounce
  function bounceWave(o) {
    const r = window.Plot.rng(o.seed), dt = 0.1, N = Math.round(o.T / dt), raw = new Array(N).fill(1);
    const toggles = (t0, len, from, to) => {
      const out = []; let t = t0, lvl = from;
      if (len <= 0) return [[t0, to]];
      while (t < t0 + len) { lvl = 1 - lvl; out.push([t, lvl]); t += 0.5 + r() * Math.min(1.5, len / 2); }
      out.push([t0 + len, to]);
      return out;
    };
    const ev = [...toggles(o.press, o.bounce, 1, 0), ...toggles(o.press + o.hold, o.bounce * 0.7, 0, 1)];
    if (o.glitch) ev.push([o.glitchAt, 0], [o.glitchAt + 0.6, 1]);
    ev.sort((a, b) => a[0] - b[0]);
    let lvl = 1, j = 0;
    for (let i = 0; i < N; i++) { const t = i * dt; while (j < ev.length && ev[j][0] <= t + 1e-9) { lvl = ev[j][1]; j++; } raw[i] = lvl; }
    return { raw, dt };
  }
  function runDebounce(o) {
    const { raw, dt } = bounceWave(o);
    let edges = 0; for (let i = 1; i < raw.length; i++) if (raw[i] !== raw[i - 1]) edges++;
    let integ = 0, stable = false, naive = 0, prev = false, presses = [], firstContact = null;
    const samples = [], ints = [], stab = [];
    for (let t = 0; t < o.T; t += o.sample) {
      const lvl = raw[Math.min(raw.length - 1, Math.round(t / dt))], pressed = lvl === 0;
      if (pressed && firstContact === null) firstContact = t;
      if (pressed && !prev) naive++;
      prev = pressed;
      if (pressed) { if (integ < o.N) integ++; } else if (integ > 0) integ--;
      if (!stable && integ === o.N) { stable = true; presses.push(t); }
      if (stable && integ === 0) stable = false;
      samples.push([t, lvl]); ints.push([t, integ]); stab.push([t, stable ? 1 : 0]);
    }
    return { raw, dt, edges, naive, presses, samples, ints, stab, firstContact };
  }
  function mountDebounce(box) {
    const E = window.Course.el;
    const st = { T: 120, press: 10, hold: 60, bounce: 4, N: 10, sample: 1, seed: 3, glitch: false, glitchAt: 100 };
    box.appendChild(E("h3", { text: box.dataset.title || "Debounce lab" }));
    const row1 = E("div", { class: "sg-row" }, [slider(E, "bounce lasts (ms)", 0, 12, 0.5, st.bounce, v => { st.bounce = v; render(); }),
      slider(E, "press held (ms)", 2, 100, 1, st.hold, v => { st.hold = v; render(); }),
      E("button", { class: "btn secondary", type: "button", text: "Another bounce", onclick: () => { st.seed = (st.seed * 7 + 11) % 997; render(); } })]);
    const sampleSel = E("select", { "aria-label": "Sample period" }, [1, 2, 5].map(v => E("option", { value: v, text: v + " ms" })));
    sampleSel.addEventListener("change", () => { st.sample = +sampleSel.value; render(); });
    const g = E("input", { type: "checkbox" }); g.addEventListener("change", () => { st.glitch = g.checked; render(); });
    const row2 = E("div", { class: "sg-row" }, [slider(E, "DEBOUNCE_SAMPLES", 1, 30, 1, st.N, v => { st.N = v; render(); }), E("label", {}, ["SAMPLE_MS ", sampleSel]), E("label", {}, [g, " a 0.6 ms noise spike at 100 ms"])]);
    const metrics = E("div", { class: "sg-metrics" }), p1 = E("div"), p2 = E("div"), p3 = E("div"), why = E("ul", { class: "sg-why" });
    box.append(row1, row2, metrics, p1, p2, p3, why);
    function render() {
      const r = runDebounce(st);
      metrics.innerHTML = "";
      metrics.append(metric(E, "edges on the pin", String(r.edges)), metric(E, "naive edge detector", r.naive + " press" + (r.naive === 1 ? "" : "es"), r.naive === 1 ? "good" : "bad"),
        metric(E, "integrator", r.presses.length + " press" + (r.presses.length === 1 ? "" : "es"), r.presses.length === 1 ? "good" : "bad"),
        metric(E, "reported after first contact", r.presses.length && r.firstContact !== null ? (r.presses[0] - r.firstContact) + " ms" : "–"));
      const raw = r.raw.map((v, i) => [i * r.dt, v]);
      const vl = r.presses.map(t => ({ x: t, label: "press" }));
      p1.innerHTML = ""; p2.innerHTML = ""; p3.innerHTML = "";
      p1.appendChild(window.Plot.chart({ w: 680, h: 130, x: [0, st.T], y: [-0.2, 1.3], ylabel: "GP14 pin (1 = released)", series: [{ pts: raw, cls: "s5", step: true, thin: true, label: "raw pin" }, { pts: r.samples, cls: "s1", dots: true, dotsOnly: true, r: 1.8, label: "samples the loop reads" }] }));
      p2.appendChild(window.Plot.chart({ w: 680, h: 130, x: [0, st.T], y: [0, st.N * 1.15 + 0.5], ylabel: "integrator", series: [{ pts: r.ints, cls: "s3", step: true, label: "counter" }], hlines: [{ y: st.N, label: "DEBOUNCE_SAMPLES" }] }));
      p3.appendChild(window.Plot.chart({ w: 680, h: 110, x: [0, st.T], y: [-0.2, 1.3], xlabel: "time (ms)", ylabel: "stable_pressed", series: [{ pts: r.stab, cls: "s4", step: true, label: "debounced" }], vlines: vl }));
      const w = [], win = st.N * st.sample;
      if (r.naive > 1) w.push(`Every bounce is a real edge on the pin, so the naive detector counts ${r.naive} presses for one click.`);
      if (st.N === 1) w.push("A window of one sample is no filter at all: the integrator becomes the naive detector.");
      if (!r.presses.length) w.push(`The press lasted ${st.hold} ms, shorter than the ${win} ms window, so the counter never reached the top: the press is lost. The window must be shorter than the fastest press.`);
      else if (r.presses.length === 1) w.push(`The counter climbs during the bounce, drops back a little at each release, and reaches ${st.N} once the contact has settled: one press, reported ${win} ms or more after the first contact.`);
      if (st.glitch) w.push(st.N > 1 ? "The noise spike moves the counter up by one or two and then back: it never reaches the top, so it is not a press." : "The spike is counted as a press: one sample is enough to pass a window of one.");
      if (st.sample > 1) w.push(`At ${st.sample} ms per sample the window is ${win} ms, and a bounce faster than the sample period can fall between two samples.`);
      why.innerHTML = w.map(s => `<li>${s}</li>`).join("");
    }
    render();
  }

  // ---------------------------------------------------------------- ADC chain
  const B = 3950, R0 = 10000, RF = 10000, T0 = 298.15;
  const rNtc = c => R0 * Math.exp(B * (1 / (c + 273.15) - 1 / T0));
  const toCode = c => { const r = rNtc(c); return Math.round(r / (RF + r) * 4095); };
  const toC = a => (a <= 0 || a >= 4095 ? NaN : 1 / (Math.log(1 / (4095 / a - 1)) / B + 1 / T0) - 273.15);
  function mountAdc(box) {
    const E = window.Course.el;
    const st = { c: 24, sigma: 6, N: 1, seed: 5 };
    box.appendChild(E("h3", { text: box.dataset.title || "From temperature to code, and back" }));
    const nSel = E("select", { "aria-label": "Samples averaged" }, [1, 4, 16, 64].map(v => E("option", { value: v, text: v === 1 ? "1 (no averaging)" : String(v) })));
    nSel.addEventListener("change", () => { st.N = +nSel.value; render(); });
    box.append(E("div", { class: "sg-row" }, [slider(E, "temperature (°C)", -20, 80, 0.5, st.c, v => { st.c = v; render(); }), slider(E, "noise (codes, rms)", 0, 20, 0.5, st.sigma, v => { st.sigma = v; render(); }), E("label", {}, ["average of ", nSel, " samples"])]));
    const chain = E("div", { class: "ad-chain" }), metrics = E("div", { class: "sg-metrics" }), plot = E("div"), why = E("ul", { class: "sg-why" });
    box.append(chain, metrics, plot, why);
    function render() {
      const r = rNtc(st.c), ratio = r / (RF + r), v = ratio * 3.3, code = toCode(st.c), back = toC(code);
      const step = E => E; void step;
      chain.innerHTML = "";
      [["NTC", `${Math.round(r).toLocaleString("en-US")} Ω`, `beta equation at ${st.c} °C`], ["divider", ratio.toFixed(4), "R_NTC ÷ (10 kΩ + R_NTC)"], ["pin", v.toFixed(3) + " V", "ratio × 3.3 V"],
       ["ADC code", String(code), "ratio × 4095, 12 bits"], ["back to °C", Number.isNaN(back) ? "invalid" : back.toFixed(2) + " °C", "the lesson's formula"]]
        .forEach(([k, b, s], i) => { if (i) chain.appendChild(E("span", { class: "arr", text: "→" })); chain.appendChild(E("div", { class: "st" }, [k, E("b", { text: b }), E("small", { text: s })])); });
      const perCode = Math.abs(toC(code + 1) - toC(code));
      const rnd = window.Plot.rng(st.seed), reads = [], singles = [];
      for (let i = 0; i < 60; i++) {
        let s = 0;
        for (let k = 0; k < st.N; k++) { const x = Math.max(0, Math.min(4095, Math.round(code + st.sigma * window.Plot.gauss(rnd)))); s += x; if (k === 0) singles.push(x); }
        reads.push([i, s / st.N]);
      }
      const sd = a => { const m = a.reduce((p, q) => p + q, 0) / a.length; return Math.sqrt(a.reduce((p, q) => p + (q - m) * (q - m), 0) / a.length); };
      const sdAvg = sd(reads.map(p => p[1])), sdOne = sd(singles);
      metrics.innerHTML = "";
      metrics.append(metric(E, "1 LSB", "0.806 mV"), metric(E, "1 code at this point", perCode.toFixed(3) + " °C"),
        metric(E, "noise of one sample", sdOne.toFixed(1) + " codes ≈ " + (sdOne * perCode).toFixed(2) + " °C"));
      if (st.N > 1) metrics.append(metric(E, `noise after averaging ${st.N}`, sdAvg.toFixed(1) + " codes ≈ " + (sdAvg * perCode).toFixed(2) + " °C", "good"));
      const span = Math.max(10, st.sigma * 4);
      plot.innerHTML = "";
      plot.appendChild(window.Plot.chart({ w: 680, h: 200, x: [0, 59], y: [code - span, code + span], xlabel: "reading number", ylabel: "code",
        series: [{ pts: singles.map((v2, i) => [i, v2]), cls: "s5", dots: true, dotsOnly: true, r: 2, label: "single samples" }, { pts: reads, cls: "s1", label: st.N > 1 ? `average of ${st.N}` : "readings" }],
        hlines: [{ y: code, label: `true code ${code}` }] }));
      const w = [];
      if (Math.abs(st.c - 24) < 0.01) w.push("This is the lesson's worked example: 10 456 Ω, a ratio of 0.5111 and code 2093.");
      w.push(st.N > 1 ? `Averaging ${st.N} samples should cut the noise by about √${st.N} = ${Math.sqrt(st.N).toFixed(0)}: ${sdOne.toFixed(1)} → ${sdAvg.toFixed(1)} codes here.` : "Now average 4 or 16 samples and watch the line flatten. The noise should shrink by about the square root of the number averaged.");
      if (st.sigma < 0.5 && st.N > 1) w.push("With no noise every sample is the same code, so averaging gains nothing: averaging only helps while the noise is larger than one step.");
      if (st.c < 0 || st.c > 60) w.push(`Far from 25 °C the curve flattens: one code is ${perCode.toFixed(3)} °C here, so the same noise in codes means more noise in degrees.`);
      why.innerHTML = w.map(s => `<li>${s}</li>`).join("");
    }
    render();
  }

  // ---------------------------------------------------------------- filters
  function inputSignal(kind, n, seed) {
    const r = window.Plot.rng(seed), x = [];
    for (let i = 0; i < n; i++) {
      if (kind === "step") x.push(i < 10 ? 0 : 1000);
      if (kind === "noisy") x.push(Math.max(0, Math.round((i < 10 ? 0 : 1000) + 40 * window.Plot.gauss(r))));
      if (kind === "spike") x.push(i === 30 ? 1000 : i === 55 ? 900 : 200);
      if (kind === "wave") x.push(Math.max(0, Math.round(500 + 300 * Math.sin(2 * Math.PI * i / 40) + 50 * window.Plot.gauss(r))));
    }
    return x;
  }
  function ma(x, N) { const buf = new Array(N).fill(0); let sum = 0, idx = 0; return x.map(v => { sum += v - buf[idx]; buf[idx] = v; idx = (idx + 1) % N; return Math.trunc(sum / N); }); }
  function ema(x, k) { let st = 0, primed = false; return x.map(v => { const t = v * 256; if (!primed) { st = t; primed = true; } else st += (t - st) >> k; return (st + 128) >> 8; }); }
  function med3(x) { const h = [0, 0, 0]; let c = 0; return x.map(v => { h[0] = h[1]; h[1] = h[2]; h[2] = v; if (c < 2) { c++; return v; } const [a, b, d] = h; return Math.max(Math.min(a, b), Math.min(Math.max(a, b), d)); }); }

  function mountFilter(box) {
    const E = window.Course.el;
    const st = { kind: "step", N: 4, k: 3, useMa: true, useEma: true, useMed: false, seed: 9, fs: 10, f: 9 };
    box.appendChild(E("h3", { text: box.dataset.title || "Filter lab" }));
    const kinds = [["step", "a step, 0 to 1000"], ["noisy", "a noisy step"], ["spike", "spikes on a steady 200"], ["wave", "a slow wave with noise"], ["alias", "aliasing: a fast sine, sampled"]];
    const kSel = E("select", { "aria-label": "Input" }, kinds.map(([v, t]) => E("option", { value: v, text: t })));
    kSel.addEventListener("change", () => { st.kind = kSel.value; build(); });
    const ctl = E("div", { class: "sg-row" }), metrics = E("div", { class: "sg-metrics" }), plot = E("div"), tbl = E("div", { class: "sg-scroll" }), why = E("ul", { class: "sg-why" });
    box.append(E("div", { class: "sg-row" }, [E("label", {}, ["input: ", kSel])]), ctl, metrics, plot, tbl, why);
    const chk = (key, label) => { const c = E("input", { type: "checkbox" }); c.checked = st[key]; c.addEventListener("change", () => { st[key] = c.checked; render(); }); return E("label", {}, [c, label]); };
    function build() {
      ctl.innerHTML = "";
      if (st.kind === "alias") {
        ctl.append(slider(E, "signal (Hz)", 1, 30, 0.5, st.f, v => { st.f = v; render(); }), slider(E, "sample rate (Hz)", 5, 100, 1, st.fs, v => { st.fs = v; render(); }));
      } else {
        const nSel = E("select", { "aria-label": "Window" }, [2, 4, 8, 16, 32].map(v => E("option", { value: v, text: "N = " + v }))); nSel.value = st.N; nSel.addEventListener("change", () => { st.N = +nSel.value; render(); });
        const kS = E("select", { "aria-label": "EMA shift" }, [0, 1, 2, 3, 4, 5, 6].map(v => E("option", { value: v, text: `k = ${v} (α = 1/${2 ** v})` }))); kS.value = st.k; kS.addEventListener("change", () => { st.k = +kS.value; render(); });
        ctl.append(chk("useMa", " moving average"), nSel, chk("useEma", " EMA"), kS, chk("useMed", " median of 3"));
        if (st.kind === "noisy" || st.kind === "wave") ctl.appendChild(E("button", { class: "btn secondary", type: "button", text: "New noise", onclick: () => { st.seed = (st.seed * 13 + 5) % 991; render(); } }));
      }
      render();
    }
    function render() {
      plot.innerHTML = ""; tbl.innerHTML = ""; metrics.innerHTML = "";
      if (st.kind === "alias") {
        const T = 2, dense = [], smp = [];
        for (let i = 0; i <= 800; i++) { const t = i / 400; dense.push([t, Math.sin(2 * Math.PI * st.f * t)]); }
        for (let t = 0; t <= T + 1e-9; t += 1 / st.fs) smp.push([t, Math.sin(2 * Math.PI * st.f * t)]);
        const nyq = st.fs / 2, alias = Math.abs(st.f - Math.round(st.f / st.fs) * st.fs);
        plot.appendChild(window.Plot.chart({ w: 680, h: 220, x: [0, T], y: [-1.2, 1.2], xlabel: "time (s)", ylabel: "signal",
          series: [{ pts: dense, cls: "s5", thin: true, label: `the real ${st.f} Hz signal` }, { pts: smp, cls: "s2", dots: true, r: 3.2, label: "what the ADC sees" }] }));
        metrics.append(metric(E, "Nyquist frequency", nyq + " Hz"), metric(E, "the samples look like", +alias.toFixed(2) + " Hz", st.f > nyq ? "bad" : "good"));
        why.innerHTML = `<li>${st.f > nyq ? `The signal is above half the sample rate (${nyq} Hz), so it folds down: the samples trace a ${+alias.toFixed(2)} Hz wave that was never there. No digital filter can remove it afterwards, because the samples are all the filter gets.` : `${st.f} Hz is below the Nyquist frequency of ${nyq} Hz, so the samples follow the real signal.`}</li><li>The fix is before the ADC: sample faster, or put an RC low-pass filter (lesson 13) in front of the pin.</li>`;
        return;
      }
      const n = 80, x = inputSignal(st.kind, n, st.seed);
      const outs = [];
      if (st.useMa) outs.push({ name: `moving average, N = ${st.N}`, y: ma(x, st.N), cls: "s1" });
      if (st.useEma) outs.push({ name: `EMA, α = 1/${2 ** st.k}`, y: ema(x, st.k), cls: "s3", dash: true });
      if (st.useMed) outs.push({ name: "median of 3", y: med3(x), cls: "s4" });
      const lo = Math.min(0, ...x), hi = Math.max(1000, ...x);
      plot.appendChild(window.Plot.chart({ w: 680, h: 240, x: [0, n - 1], y: [lo - 20, hi + 60], xlabel: "sample number", ylabel: "code",
        series: [{ pts: x.map((v, i) => [i, v]), cls: "s5", dots: true, dotsOnly: true, r: 2.2, label: "input" }, ...outs.map(o => ({ pts: o.y.map((v, i) => [i, v]), cls: o.cls, dash: o.dash, label: o.name }))] }));
      const w = [];
      if (st.kind === "step" || st.kind === "noisy") {
        outs.forEach(o => {
          const s63 = o.y.findIndex((v, i) => i >= 10 && v >= 630), s99 = o.y.findIndex((v, i) => i >= 10 && v >= 990);
          metrics.appendChild(metric(E, o.name, `63 % after ${s63 < 0 ? "–" : s63 - 9}, 99 % after ${s99 < 0 ? "> 70" : s99 - 9} samples`));
        });
        if (st.kind === "step") {
          const t = document.createElement("table");
          t.innerHTML = `<tr><th>sample after the step</th>${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<th>${i}</th>`).join("")}</tr>` + outs.map(o => `<tr><th>${o.name}</th>${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<td>${o.y[9 + i]}</td>`).join("")}</tr>`).join("");
          tbl.appendChild(t);
          w.push("Compare the table with the lesson's: the moving average with N = 4 gives 250, 500, 750, 1000, and the EMA with k = 3 gives 125, 234, 330, 414, …");
        }
        if (st.kind === "noisy") {
          const sd = a => { const m = a.reduce((p, q) => p + q, 0) / a.length; return Math.sqrt(a.reduce((p, q) => p + (q - m) ** 2, 0) / a.length); };
          metrics.appendChild(metric(E, "input noise after the step", sd(x.slice(45)).toFixed(1) + " codes rms"));
          outs.forEach(o => metrics.appendChild(metric(E, o.name + " noise", sd(o.y.slice(45)).toFixed(1) + " codes rms", "good")));
          w.push("More smoothing means more lag: a longer window or a smaller α removes more noise and takes longer to follow the step.");
        }
      }
      if (st.kind === "spike") {
        outs.forEach(o => metrics.appendChild(metric(E, o.name + ": the biggest output", Math.max(...o.y) + " (input 200)", Math.max(...o.y) > 260 ? "bad" : "good")));
        w.push("A moving average spreads a spike over its whole window, and the EMA follows it at α of its size and decays slowly. The median of three removes a lone spike completely.");
      }
      if (st.kind === "wave") w.push("A filter that is too slow flattens and delays the wave itself, not only the noise. Try N = 32 or k = 6.");
      if (st.useEma && st.k === 0) w.push("k = 0 is α = 1: the output is the input, no filtering.");
      why.innerHTML = w.map(s => `<li>${s}</li>`).join("");
    }
    build();
  }

  window.Signals = { runDebounce, toCode, toC, ma, ema, med3 };
  function init() {
    css();
    document.querySelectorAll(".widget.debounce").forEach(mountDebounce);
    document.querySelectorAll(".widget.adcchain").forEach(mountAdc);
    document.querySelectorAll(".widget.filterlab").forEach(mountFilter);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
