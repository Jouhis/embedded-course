/* PID tuner on the lesson 107 heater. Load after course.js and plot.js.
 *
 *   <div class="widget pidsim"></div>
 *
 * Same model and controller as projects/0107-pid-host/solution:
 *   plant  T <- T + dt * (P * 80 - (T - 25)) / 60, dt = 1 s, 1200 steps
 *   PID    e = sp - meas; P = kp e; I += ki e dt, clamped to 0..1 (anti-windup);
 *          D = -kd (meas - last_meas) / dt, zero on the first sample; u = clamp(P + I + D, 0, 1)
 *   metrics overshoot = max(T - sp); settled = the second after the last sample outside sp ± 1 °C
 */
(function () {
  "use strict";
  const CSS = `
  .pidsim .pid-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:.4rem 1.2rem;margin:.5rem 0}
  .pidsim label{font-family:var(--sans);font-size:.85rem;display:flex;align-items:center;gap:.5rem}
  .pidsim input[type=range]{flex:1;min-width:6rem}
  .pidsim .v{font-family:var(--mono);min-width:4.2rem;text-align:right}
  .pidsim .pid-opts{display:flex;flex-wrap:wrap;gap:.3rem 1.2rem;margin:.3rem 0}
  .pidsim .pid-presets{display:flex;flex-wrap:wrap;gap:.3rem;margin:.4rem 0}
  .pidsim .pid-presets .btn{font-size:.75rem;padding:.15rem .5rem}
  .pidsim .pid-metrics{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
  .pidsim .m{background:var(--code-bg);border-radius:4px;padding:.3rem .6rem;font-family:var(--sans);font-size:.8rem}
  .pidsim .m b{font-family:var(--mono);font-size:1rem;display:block}
  .pidsim .m.bad b{color:var(--bad)} .pidsim .m.good b{color:var(--good)}
  .pidsim .pid-why{font-family:var(--sans);font-size:.88rem;margin:.3rem 0;padding-left:1.2rem}
  .pidsim select{font-family:var(--sans);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.15rem .3rem}`;

  const PRESETS = [
    ["Starter: 0.05 / 0.002 / 0", 0.05, 0.002, 0], ["Less I: 0.05 / 0.0005 / 0", 0.05, 0.0005, 0], ["Add D: 0.05 / 0.002 / 0.5", 0.05, 0.002, 0.5],
    ["0.04 / 0.002 / 0.5", 0.04, 0.002, 0.5], ["Reference: 0.04 / 0.0005 / 0.5", 0.04, 0.0005, 0.5], ["0.03 / 0.0005 / 0.5", 0.03, 0.0005, 0.5],
    ["P only: 0.05 / 0 / 0", 0.05, 0, 0], ["Too much P: 0.5 / 0 / 0", 0.5, 0, 0],
  ];

  function simulate(o) {
    const sp = o.sp, steps = 1200, rnd = window.Plot.rng(7);
    let T = 25, integral = 0, last = 0, first = true, overshoot = 0, lastOutside = -1, maxI = 0;
    const temp = [[0, T]], power = [], iterm = [], meas = [];
    for (let t = 0; t < steps; t++) {
      const amb = o.draught && t >= 600 ? 15 : 25;
      const m = T + (o.noise ? 0.3 * window.Plot.gauss(rnd) : 0);
      const e = sp - m;
      const P = o.kp * e;
      integral += o.ki * e * 1;
      if (o.clamp) integral = Math.min(1, Math.max(0, integral));
      maxI = Math.max(maxI, integral);
      const D = first ? 0 : -o.kd * (m - last) / 1;
      first = false; last = m;
      const u = Math.min(1, Math.max(0, P + integral + D));
      T = T + 1 * (u * 80 - (T - amb)) / 60;
      if (Math.abs(T - sp) > 1) lastOutside = t;
      if (T - sp > overshoot) overshoot = T - sp;
      temp.push([t + 1, T]); power.push([t, u]); iterm.push([t, integral]); if (o.noise) meas.push([t, m]);
    }
    return { temp, power, iterm, meas, overshoot, settle: lastOutside + 1 < steps ? lastOutside + 1 : -1, final: T, maxI };
  }

  function mount(box) {
    const E = window.Course.el;
    const st = { kp: 0.05, ki: 0.002, kd: 0, sp: 60, clamp: true, noise: false, draught: false, span: 600 };
    box.appendChild(E("h3", { text: box.dataset.title || "Tune the heater" }));
    const presets = E("div", { class: "pid-presets" });
    PRESETS.forEach(([t, kp, ki, kd]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { Object.assign(st, { kp, ki, kd }); sync(); render(); } })));
    const sliders = {};
    const slider = (key, label, min, max, step, dec) => {
      const r = E("input", { type: "range", min, max, step, "aria-label": label });
      const v = E("span", { class: "v" });
      r.addEventListener("input", () => { st[key] = +r.value; v.textContent = (+r.value).toFixed(dec); render(); });
      sliders[key] = [r, v, dec];
      return E("label", {}, [label, r, v]);
    };
    const check = (key, label) => { const c = E("input", { type: "checkbox" }); c.checked = st[key]; c.addEventListener("change", () => { st[key] = c.checked; render(); }); return E("label", {}, [c, label]); };
    const span = E("select", { "aria-label": "Time shown" }, [[300, "first 300 s"], [600, "first 600 s"], [1200, "all 1200 s"]].map(([v, t]) => E("option", { value: v, text: t })));
    span.value = "600"; span.addEventListener("change", () => { st.span = +span.value; render(); });
    const ctl = E("div", { class: "pid-ctl" }, [slider("kp", "kp", 0, 0.5, 0.005, 3), slider("ki", "ki", 0, 0.01, 0.0001, 4), slider("kd", "kd", 0, 3, 0.05, 2), slider("sp", "setpoint °C", 30, 90, 1, 0)]);
    const opts = E("div", { class: "pid-opts" }, [check("clamp", " anti-windup clamp on the integral"), check("noise", " sensor noise (±0.3 °C)"),
      check("draught", " a draught at 600 s: the room drops to 15 °C"), E("label", {}, ["show ", span])]);
    const metrics = E("div", { class: "pid-metrics" }), plotT = E("div"), plotU = E("div"), why = E("ul", { class: "pid-why" });
    box.append(E("p", { class: "widget-hint", text: "Gain sets from the table above:" }), presets, ctl, opts, metrics, plotT, plotU, why);

    function sync() { for (const k in sliders) { const [r, v, dec] = sliders[k]; r.value = st[k]; v.textContent = (+st[k]).toFixed(dec); } }

    function render() {
      const r = simulate(st);
      const cut = pts => pts.filter(p => p[0] <= st.span);
      const lo = Math.min(20, ...cut(r.temp).map(p => p[1])) , hi = Math.max(st.sp + 10, ...cut(r.temp).map(p => p[1]));
      plotT.innerHTML = ""; plotU.innerHTML = "";
      const series = [{ pts: cut(r.temp), cls: "s2", label: "temperature" }];
      if (st.noise) series.unshift({ pts: cut(r.meas), cls: "s5", thin: true, label: "what the sensor reports" });
      plotT.appendChild(window.Plot.chart({ w: 680, h: 230, x: [0, st.span], y: [Math.floor(lo / 5) * 5, Math.ceil(hi / 5) * 5], xlabel: "time (s)", ylabel: "°C",
        series, hlines: [{ y: st.sp, label: "setpoint" }], bands: [{ y0: st.sp - 1, y1: st.sp + 1 }], vlines: r.settle > 0 && r.settle <= st.span ? [{ x: r.settle, label: "settled" }] : [] }));
      plotU.appendChild(window.Plot.chart({ w: 680, h: 150, x: [0, st.span], y: [0, 1], xlabel: "time (s)", ylabel: "power, 0 to 1",
        series: [{ pts: cut(r.power), cls: "s1", label: "output u" }, { pts: cut(r.iterm).map(([t, v]) => [t, Math.min(1.05, v)]), cls: "s3", dash: true, label: "integral term I" }] }));
      const tol = r.final - st.sp;
      metrics.innerHTML = "";
      [["Overshoot", r.overshoot.toFixed(2) + " °C", r.overshoot > 2 ? "bad" : r.overshoot < 0.5 ? "good" : ""],
       ["Settling time (±1 °C)", r.settle < 0 ? "never" : r.settle + " s", r.settle < 0 ? "bad" : ""],
       ["At 1200 s", r.final.toFixed(2) + " °C", Math.abs(tol) > 1 ? "bad" : ""]]
        .forEach(([k, v, c]) => metrics.appendChild(E("div", { class: "m " + c }, [k, E("b", { text: v })])));
      const w = [];
      if (st.ki === 0) w.push(`With no I term the loop settles where heat loss balances kp × error: it stops ${Math.abs(tol).toFixed(2)} °C ${tol < 0 ? "below" : "above"} the setpoint. Add a little ki.`);
      if (st.kp >= 0.3 && st.kd === 0) w.push("A large kp drives the heater between full and zero power: the output saturates, and the loop behaves like an on/off thermostat.");
      if (!st.clamp && r.maxI > 1) w.push(`Without the clamp the integral reached ${r.maxI.toFixed(2)}, more than the heater can use (1.0). It must unwind through negative error, which is the extra overshoot.`);
      if (st.clamp && st.ki > 0 && r.overshoot > 2) w.push("The overshoot comes from the integral: it keeps growing while the temperature is still below the setpoint. Lower ki and watch the dashed line.");
      if (st.kd > 0 && st.noise) w.push("D reacts to how fast the measurement changes, so it turns sensor noise into a noisy output. Compare kd = 0 with kd = 1.");
      if (st.draught) w.push("At 600 s more heat leaks out. P alone cannot hold the setpoint against it; the integral slowly raises the power until the error is gone again.");
      if (!w.length) w.push("Change one gain at a time and predict the curve before you let go of the slider.");
      why.innerHTML = w.map(s => `<li>${s}</li>`).join("");
    }
    sync(); render();
  }
  window.PidSim = { simulate };
  function init() {
    if (!document.getElementById("pidsim-css")) { const s = document.createElement("style"); s.id = "pidsim-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.pidsim").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
