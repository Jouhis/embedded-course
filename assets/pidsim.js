/* PID demo for lesson 108: a cart that balances a pole (an inverted pendulum). Load after course.js.
 *
 *   <div class="widget pidsim"></div>
 *
 * The learner tunes the balance loop (kp, ki, kd), pushes the pole, and drags the target to move the
 * cart. The heater numbers of the lesson stay in its table and project; this shows the same three
 * terms on a fast, unstable plant, where a bad gain makes the pole fall in a second.
 *
 * Plant (the classic cart-pole, RK4 at 1 ms): cart 1 kg, pole 0.2 kg and 1 m long (pivot to tip),
 *   cart friction 0.2 N·s/m, g = 9.81, track ±2.4 m with end stops. The pole has fallen past 40°.
 * Balance loop, run every dt (100 Hz unless the learner picks slower): e = lean − wanted lean;
 *   F = kp e + I + D, with I += ki e dt and D = kd × (rate of change of the measured lean)
 *   (derivative on measurement); F limited to ±20 N, the motor's limit. The integral is clamped to
 *   ±20 N and stops growing while F is at the limit (anti-windup).
 * Position hold (a second, slower loop around the first, on by default): wanted lean =
 *   0.05 × (target − x) − 0.1 × cart speed, limited to ±0.1 rad. To move right the cart has to lean
 *   right first, so it starts by rolling a little to the left.
 * The motor lags its command (first order, 40 ms), and the lean sensor has ±1° of noise (on by
 *   default). Those two make large gains fail as on real hardware: high kp oscillates through the
 *   lag, high kd turns noise into force at the motor's limit. So "everything at maximum" loses.
 * Wind: a steady 3 N on the cart. With position hold and no I, the cart parks 1.5 m upwind of the
 *   target: P needs an error to push back, and the outer loop turns that into a position offset.
 * The test (TEST, runTest): 20 s on the learner's gains, with hold and noise on. A push at 1 s, the
 *   target to 1.2 m at 3 s, to -1.2 m at 7.5 s, back to 0 with the wind on at 12 s. Score 100 minus
 *   15 per degree of RMS lean error above 2.4°, 60 per metre of mean position error above 0.2 m in
 *   the hold windows, 60 per unit of the time fraction at the force limit above 3 %, and 20 for an
 *   end stop; a fall scores 0. The best score is kept in localStorage (embedded-course-pidcart-best).
 *   A live run gives the same score as runTest: both step the same code in 1 ms steps.
 * Scores checked headless: 40/0/6 42; 40/10/6 76; 45/25/7 89; 50/20/8 87; 60/10/8 71; 80/10/10 37;
 *   40/20/10 68; 250/200/25 0; 100/0/6, 40/0/3 and 40/0/0 fall.
 */
(function () {
  "use strict";
  const DEG = 180 / Math.PI;
  const CSS = `
  .pidsim .pc-scene{display:block;width:100%;aspect-ratio:680/210;touch-action:none;cursor:ew-resize;border:1px solid var(--rule);border-radius:6px;background:var(--bg)}
  .pidsim .pc-scene:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .pidsim .pc-chart{display:block;width:100%;aspect-ratio:680/170;margin-top:.4rem}
  .pidsim .pc-row{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin:.45rem 0}
  .pidsim .pc-row .btn{font-size:.78rem;padding:.2rem .55rem}
  .pidsim .pc-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.3rem 1.2rem;margin:.4rem 0}
  .pidsim label{font-family:var(--sans);font-size:.85rem;display:flex;align-items:center;gap:.45rem}
  .pidsim input[type=range]{flex:1;min-width:5rem}
  .pidsim .v{font-family:var(--mono);min-width:3.2rem;text-align:right}
  .pidsim select{font-family:var(--sans);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.15rem .3rem}
  .pidsim .pc-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(6.8rem,1fr));gap:.4rem;margin:.5rem 0}
  .pidsim .m{background:var(--code-bg);border-radius:4px;padding:.3rem .6rem;font-family:var(--sans);font-size:.78rem}
  .pidsim .m b{font-family:var(--mono);font-size:1rem;display:block}
  .pidsim .m.bad b{color:var(--bad)} .pidsim .m.good b{color:var(--good)}
  .pidsim .pc-test{min-height:6.2rem;margin:.3rem 0 .6rem;padding:.5rem .7rem;border:1px solid var(--rule);border-radius:6px;font-family:var(--sans);font-size:.86rem}
  .pidsim .pc-test-line{margin:0}
  .pidsim .pc-result{display:flex;gap:1rem;align-items:flex-start}
  .pidsim .pc-result ul{margin:.2rem 0;padding-left:1.1rem}
  .pidsim .pc-result li{margin:0}
  .pidsim .pc-score{font-family:var(--mono);font-size:2.2rem;font-weight:700;line-height:1;min-width:3.5rem;text-align:center}
  .pidsim .pc-why{font-family:var(--sans);font-size:.88rem;margin:.3rem 0;padding-left:1.2rem;min-height:4.2em}`;

  // ---------------------------------------------------------------- model
  const P = { M: 1, m: 0.2, l: 0.5, g: 9.81, b: 0.2, Fmax: 20, track: 2.4, fall: 0.7,
              kpx: 0.05, kdx: 0.1, lean: 0.1, wind: 3, noise: 0.0175, tau: 0.04 };

  function deriv(s, F) {
    const { M, m, l, g, b } = P, tot = M + m, sin = Math.sin(s[2]), cos = Math.cos(s[2]);
    const tmp = (F - b * s[1] + m * l * s[3] * s[3] * sin) / tot;
    const aTh = (g * sin - cos * tmp) / (l * (4 / 3 - m * cos * cos / tot));
    return [s[1], tmp - m * l * aTh * cos / tot, s[3], aTh];
  }
  function rng(seed) {
    let s = seed | 0;
    return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function create(th0) {
    return { s: [0, 0, th0, 0], t: 0, ms: 0, rem: 0, I: 0, last: null, u: 0, f: 0, want: 0, fell: false, hit: false, r: rng(3), meas: th0 };
  }
  /* One controller update: o = { kp, ki, kd, dt, target, hold, noise }. */
  function control(st, o) {
    const [x, v, th] = st.s;
    const m = th + (o.noise ? (o.noiseAmp || P.noise) * (2 * st.r() - 1) : 0);
    const want = o.hold ? Math.max(-P.lean, Math.min(P.lean, P.kpx * (o.target - x) - P.kdx * v)) : 0;
    const e = m - want;
    const D = st.last === null ? 0 : o.kd * (m - st.last) / o.dt;
    st.last = m;
    const raw = o.kp * e + st.I + D;
    if (Math.abs(raw) < P.Fmax) st.I = Math.max(-P.Fmax, Math.min(P.Fmax, st.I + o.ki * e * o.dt));
    st.u = Math.max(-P.Fmax, Math.min(P.Fmax, o.kp * e + st.I + D));
    st.want = want; st.meas = m; st.e = e;
  }
  /* The test: a fixed script of disturbances, run on the learner's gains. Times in ms. */
  const TEST = { ms: 20000,
    events: [[1000, "push", 1.2], [3000, "target", 1.2], [7500, "target", -1.2], [12000, "target", 0], [12000, "wind", true]],
    hold: [[5500, 7500], [10000, 12000], [16000, 20000]] };   // windows where the cart should be at its target
  function startTest(st, o) {
    Object.assign(o, { target: 0, wind: false, hold: true, noise: true });
    st.test = { i: 0, lean2: 0, err: 0, sat: 0, effort: 0, done: false };
  }
  function testStep(st, o, h) {
    const T = st.test;
    while (T.i < TEST.events.length && st.ms >= TEST.events[T.i][0]) {
      const [, what, v] = TEST.events[T.i++];
      if (what === "push") st.s[3] += v; else o[what] = v;
    }
    if (TEST.hold.some(([a, b]) => st.ms >= a && st.ms < b)) T.err += Math.abs(o.target - st.s[0]) * h;
    if (st.ms > 500) {
      T.lean2 += (st.s[2] - st.want) ** 2 * h;
      T.sat += Math.abs(st.u) >= P.Fmax - 1e-9 ? h : 0; T.effort += Math.abs(st.f) * h;
    }
    if (st.ms >= TEST.ms) T.done = true;
  }
  /* Score the test, 0 to 100, from how upright, how close to the target and how hard the motor worked. */
  function score(st) {
    const T = st.test, secs = (TEST.ms - 500) / 1000;
    if (st.fell) return { score: 0, fell: true, at: st.t };
    const held = TEST.hold.reduce((a, [x, y]) => a + (y - x) / 1000, 0);
    const lean = Math.sqrt(T.lean2 / secs) * DEG, err = T.err / held, sat = T.sat / secs, effort = T.effort / secs;
    const pen = { lean: 15 * Math.max(0, lean - 2.4), err: 60 * Math.max(0, err - 0.2),
                  sat: 60 * Math.max(0, sat - 0.03), hit: st.hit ? 20 : 0 };
    const total = Math.max(0, Math.min(100, Math.round(100 - pen.lean - pen.err - pen.sat - pen.hit)));
    return { score: total, lean, err, sat, effort, hit: st.hit, pen };
  }

  /* Advance the plant by T seconds in 1 ms steps, running the controller every o.dt. */
  function advance(st, o, T) {
    const h = 0.001, every = Math.max(1, Math.round(o.dt * 1000));
    st.rem += T;
    while (st.rem >= h && !st.fell && !(st.test && st.test.done)) {
      st.rem -= h;
      if (st.test) testStep(st, o, h);
      if (st.ms % every === 0) control(st, o);
      st.f += (st.u - st.f) * h / (o.tau === undefined ? P.tau : o.tau);   // the motor lags the command
      const F = st.f + (o.wind ? P.wind : 0), s = st.s;
      const k1 = deriv(s, F), k2 = deriv(s.map((q, j) => q + h / 2 * k1[j]), F);
      const k3 = deriv(s.map((q, j) => q + h / 2 * k2[j]), F), k4 = deriv(s.map((q, j) => q + h * k3[j]), F);
      st.s = s.map((q, j) => q + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
      if (Math.abs(st.s[0]) > P.track) { st.s[0] = Math.sign(st.s[0]) * P.track; st.s[1] = 0; st.hit = true; }
      st.ms += 1; st.t = st.ms / 1000;
      if (Math.abs(st.s[2]) > P.fall) st.fell = true;
    }
  }
  /* The whole test at once, without drawing (same steps as the live run). */
  function runTest(gains) {
    const o = Object.assign({ kp: 40, ki: 0, kd: 6, dt: 0.01 }, gains), st = create(0.05);
    startTest(st, o);
    advance(st, o, TEST.ms / 1000 + 0.01);
    return score(st);
  }

  const PRESETS = [
    ["Starter: 40 / 0 / 6", 40, 0, 6], ["Well tuned: 45 / 25 / 7", 45, 25, 7], ["P only: 40 / 0 / 0", 40, 0, 0], ["Too little D: 40 / 0 / 3", 40, 0, 3],
    ["Too weak: 20 / 0 / 4", 20, 0, 4], ["Too much P: 100 / 0 / 6", 100, 0, 6], ["Too much I: 40 / 100 / 6", 40, 100, 6],
    ["Everything at maximum", 250, 200, 25],
  ];
  const BEST_KEY = "embedded-course-pidcart-best";

  // ---------------------------------------------------------------- widget
  function mount(box) {
    const E = window.Course.el;
    const o = { kp: 40, ki: 0, kd: 6, dt: 0.01, target: 0, hold: true, noise: true, wind: false };
    let locked = false, result = null;
    let st = create(0.05), running = true, visible = true, hist = [], lastFrame = 0, upright = 0;

    box.appendChild(E("h3", { text: box.dataset.title || "Balance the cart" }));
    box.appendChild(E("p", { class: "widget-hint", text: "Drag in the picture (or use ← →) to move the target. Push the pole and watch the loop catch it." }));
    const scene = E("canvas", { class: "pc-scene", tabindex: "0", role: "img",
      "aria-label": "A cart on a track balancing an upright pole; drag to move its target" });
    const chart = E("canvas", { class: "pc-chart", role: "img", "aria-label": "The last 10 seconds of the lean angle and the motor force" });

    const btn = (text, fn, cls) => { const b = E("button", { class: "btn " + (cls || "secondary"), type: "button", text }); b.addEventListener("click", fn); return b; };
    const push = dir => () => { if (!st.fell && !locked) st.s[3] += dir * 1.2; };
    const pauseBtn = btn("Pause", () => { running = !running; pauseBtn.textContent = running ? "Pause" : "Run"; });
    const testBtn = btn("Run the test (20 s)", runUiTest, "");
    const actions = E("div", { class: "pc-row" }, [btn("← Push the pole", push(-1)), btn("Push the pole →", push(1)),
      btn("Reset", reset), pauseBtn, testBtn]);
    const testBox = E("div", { class: "pc-test", "aria-live": "polite" });

    const presets = E("div", { class: "pc-row" });
    PRESETS.forEach(([t, kp, ki, kd]) => presets.appendChild(btn(t, () => { if (locked) return; Object.assign(o, { kp, ki, kd }); sync(); reset(); })));
    const sliders = {};
    const slider = (key, label, min, max, step, dec) => {
      const r = E("input", { type: "range", min, max, step, "aria-label": label });
      const v = E("span", { class: "v" });
      r.addEventListener("input", () => { o[key] = +r.value; v.textContent = (+r.value).toFixed(dec); });
      sliders[key] = [r, v, dec];
      return E("label", {}, [label, r, v]);
    };
    const checks = {};
    const check = (key, label) => {
      const c = E("input", { type: "checkbox" }); c.checked = o[key]; checks[key] = c;
      c.addEventListener("change", () => { o[key] = c.checked; });
      return E("label", {}, [c, label]);
    };
    const rate = E("select", { "aria-label": "Controller rate" },
      [[0.01, "100 Hz"], [0.02, "50 Hz"], [0.05, "20 Hz"], [0.1, "10 Hz"]].map(([v, t]) => E("option", { value: v, text: t })));
    rate.value = "0.01";
    rate.addEventListener("change", () => { o.dt = +rate.value; });
    const ctl = E("div", { class: "pc-ctl" }, [slider("kp", "kp", 0, 250, 1, 0),
      slider("ki", "ki", 0, 200, 1, 0), slider("kd", "kd", 0, 25, 0.1, 1)]);
    const opts = E("div", { class: "pc-ctl" }, [check("hold", " hold the position (second loop)"),
      check("wind", " a steady wind: 3 N on the cart"), check("noise", " sensor noise (±1°)"),
      E("label", {}, ["controller runs at ", rate])]);
    const metrics = E("div", { class: "pc-metrics", "aria-live": "off" });
    const why = E("ul", { class: "pc-why" });
    box.append(scene, actions, testBox, E("p", { class: "widget-hint", text: "Gain sets, kp / ki / kd (force in newtons per radian of lean, per radian-second, per radian per second):" }), presets, ctl, opts, metrics, chart, why);

    function sync() {
      for (const k in sliders) { const [r, v, dec] = sliders[k]; r.value = o[k]; v.textContent = (+o[k]).toFixed(dec); r.disabled = locked; }
      for (const k in checks) { checks[k].checked = o[k]; checks[k].disabled = locked; }
      rate.disabled = locked; testBtn.disabled = locked;
      presets.querySelectorAll("button").forEach(b => { b.disabled = locked; });
    }
    function reset() {
      st = create(0.05); hist = []; upright = 0; o.target = 0; o.wind = false; locked = false; result = null;
      running = true; pauseBtn.textContent = "Pause"; sync(); showTest();
    }

    // ---- the test: the same script and steps as PidSim.runTest, played live
    function best() { try { return JSON.parse(localStorage.getItem(BEST_KEY)); } catch (e) { return null; } }
    function runUiTest() {
      st = create(0.05); hist = []; upright = 0; result = null;
      startTest(st, o); locked = true; running = true; pauseBtn.textContent = "Pause";
      sync(); showTest();
    }
    function finishTest() {
      const b = best();
      result = Object.assign(score(st), { kp: o.kp, ki: o.ki, kd: o.kd, hz: Math.round(1 / o.dt) });
      result.newBest = !b || result.score > b.score;
      if (result.newBest) { try { localStorage.setItem(BEST_KEY, JSON.stringify(result)); } catch (e) {} }
      st.test = null; locked = false; running = false; pauseBtn.textContent = "Run";
      sync(); showTest();
    }
    function showTest() {
      testBox.innerHTML = "";
      if (st.test) {
        const next = TEST.events.find(e => e[0] > st.ms);
        const say = next ? { push: "a push on the pole", target: `the target moves to ${next[2]} m`, wind: "the wind starts" }[next[1]] : "";
        testBox.appendChild(E("p", { class: "pc-test-line", text: `Test running: ${Math.floor(st.ms / 1000)} / ${TEST.ms / 1000} s.` +
          (say ? ` Next, at ${next[0] / 1000} s: ${say}.` : " Holding against the wind to the end.") }));
        return;
      }
      const b = best();
      if (!result) {
        testBox.appendChild(E("p", { class: "pc-test-line", text: "The test runs your gains for 20 s: a push, two moves, then a steady wind. " +
          "It scores how closely the pole follows the lean it is asked for, how near the cart parks to each target, and how often the motor hits its limit." +
          (b ? ` Your best so far: ${b.score} with ${b.kp} / ${b.ki} / ${b.kd}.` : "") }));
        return;
      }
      const num = E("span", { class: "pc-score", text: String(result.score) });
      num.style.color = window.Course.scoreColor(result.score / 100);
      const lines = result.fell ? [`The pole fell at ${result.at.toFixed(1)} s.`] : [
        `Balance: ${result.lean.toFixed(1)}° from the wanted lean (RMS).`,
        `Position: ${result.err.toFixed(2)} m from the target, on average, while it should hold still.`,
        `Motor: at its ±20 N limit ${Math.round(100 * result.sat)} % of the time.` + (result.hit ? " The cart hit an end stop." : "")];
      testBox.appendChild(E("div", { class: "pc-result" }, [num, E("div", {}, [
        E("strong", { text: `${result.kp} / ${result.ki} / ${result.kd} at ${result.hz} Hz` + (result.newBest && b ? ": a new best" : "") }),
        E("ul", {}, lines.map(t => E("li", { text: t }))),
        b && !result.newBest ? E("span", { class: "cp-small", text: `Your best so far: ${b.score} with ${b.kp} / ${b.ki} / ${b.kd}.` }) : ""])]));
    }

    // Colours come from the course theme; read them through a probe so light-dark() is resolved.
    const probe = E("span", { style: "display:none" });
    box.appendChild(probe);
    let col = {}, colAt = 0;
    function colours(now) {
      if (now - colAt < 500 && col.fg) return col;
      colAt = now;
      for (const k of ["fg", "muted", "rule", "accent", "good", "bad", "warn", "code-bg", "bg"]) {
        probe.style.color = `var(--${k})`; col[k] = getComputedStyle(probe).color;
      }
      return col;
    }

    // ---- pointer and keys: move the target
    const toMetres = ev => {
      const r = scene.getBoundingClientRect(), mpp = (P.track * 2 + 0.6) / r.width;
      return Math.max(-P.track + 0.2, Math.min(P.track - 0.2, (ev.clientX - r.left - r.width / 2) * mpp));
    };
    let dragging = false;
    scene.addEventListener("pointerdown", ev => { if (locked) return; dragging = true; scene.setPointerCapture(ev.pointerId); o.target = toMetres(ev); });
    scene.addEventListener("pointermove", ev => { if (dragging) o.target = toMetres(ev); });
    scene.addEventListener("pointerup", () => { dragging = false; });
    scene.addEventListener("pointercancel", () => { dragging = false; });
    scene.addEventListener("keydown", ev => {
      if (!locked && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
        o.target = Math.max(-P.track + 0.2, Math.min(P.track - 0.2, o.target + (ev.key === "ArrowLeft" ? -0.25 : 0.25)));
        ev.preventDefault();
      }
    });

    // ---- drawing
    function fit(c) {
      const dpr = window.devicePixelRatio || 1, w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return [g, c.clientWidth, c.clientHeight];
    }
    function drawScene(c) {
      const [g, W, H] = fit(scene);
      g.clearRect(0, 0, W, H);
      const ppm = W / (P.track * 2 + 0.6), cx = W / 2, rail = H - 26;
      const X = m => cx + m * ppm;
      g.font = "11px " + getComputedStyle(box).getPropertyValue("--sans");
      // track and end stops
      g.strokeStyle = c.muted; g.lineWidth = 2;
      g.beginPath(); g.moveTo(X(-P.track - 0.15), rail); g.lineTo(X(P.track + 0.15), rail); g.stroke();
      g.fillStyle = c.muted;
      [-1, 1].forEach(sgn => g.fillRect(X(sgn * (P.track + 0.15)) - (sgn > 0 ? 0 : 4), rail - 22, 4, 22));
      for (let m = -2; m <= 2; m++) { g.fillRect(X(m) - 0.5, rail + 3, 1, 5); g.fillText(`${m} m`, X(m) - 9, rail + 19); }
      // target flag
      const tx = X(o.target);
      g.strokeStyle = c.accent; g.fillStyle = c.accent; g.lineWidth = 1.5; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(tx, rail + 2); g.lineTo(tx, 16); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.moveTo(tx - 6, rail + 10); g.lineTo(tx + 6, rail + 10); g.lineTo(tx, rail + 2); g.fill();
      const tl = "target"; g.fillText(tl, Math.min(W - 40, Math.max(4, tx - g.measureText(tl).width / 2)), 12);
      // wind
      if (o.wind) {
        g.strokeStyle = c.rule; g.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { const y = 18 + i * 14, x0 = 12 + (i % 2) * 10; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 34, y); g.lineTo(x0 + 28, y - 4); g.moveTo(x0 + 34, y); g.lineTo(x0 + 28, y + 4); g.stroke(); }
        g.fillStyle = c.muted; g.fillText("wind 3 N", 12, 66);
      }
      // cart
      const [x, , th] = st.s, cw = 0.5 * ppm, ch = 0.2 * ppm, px = X(x), top = rail - ch - 8;
      g.fillStyle = c["code-bg"]; g.strokeStyle = c.fg; g.lineWidth = 1.5;
      g.fillRect(px - cw / 2, top, cw, ch); g.strokeRect(px - cw / 2, top, cw, ch);
      g.fillStyle = c.fg;
      [-1, 1].forEach(sgn => { g.beginPath(); g.arc(px + sgn * cw / 3, rail - 4, 4, 0, 2 * Math.PI); g.fill(); });
      // force arrow (the motor)
      const fx = st.u / P.Fmax * 0.6 * ppm;
      if (Math.abs(fx) > 1) {
        const y = top + ch / 2, x0 = px + Math.sign(fx) * cw / 2;
        g.strokeStyle = Math.abs(st.u) >= P.Fmax - 1e-6 ? c.bad : c.warn; g.fillStyle = g.strokeStyle; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + fx, y); g.stroke();
        g.beginPath(); g.moveTo(x0 + fx + Math.sign(fx) * 6, y); g.lineTo(x0 + fx, y - 5); g.lineTo(x0 + fx, y + 5); g.fill();
      }
      // pole (drawn lying on the cart once it has fallen)
      const shown = st.fell ? Math.sign(th) * 1.35 : th, len = 2 * P.l * ppm;
      const tipX = px + len * Math.sin(shown), tipY = top - len * Math.cos(shown);
      g.strokeStyle = st.fell ? c.bad : c.fg; g.lineWidth = 5; g.lineCap = "round";
      g.beginPath(); g.moveTo(px, top); g.lineTo(tipX, tipY); g.stroke(); g.lineCap = "butt";
      g.fillStyle = c.accent; g.beginPath(); g.arc(tipX, tipY, 6, 0, 2 * Math.PI); g.fill();
      g.fillStyle = c.fg; g.beginPath(); g.arc(px, top, 3, 0, 2 * Math.PI); g.fill();
      // status
      g.fillStyle = st.fell ? c.bad : c.muted; g.font = (st.fell ? "bold 14px " : "11px ") + getComputedStyle(box).getPropertyValue("--sans");
      const msg = st.fell ? `Fell over after ${st.t.toFixed(1)} s. Press Reset.` : running ? "" : "Paused";
      if (msg) g.fillText(msg, W - g.measureText(msg).width - 12, 22);
    }
    function drawChart(c) {
      const [g, W, H] = fit(chart);
      g.clearRect(0, 0, W, H);
      const left = 44, right = W - 8, half = (H - 22) / 2, span = 10, now = st.t;
      const X = t => right - (now - t) / span * (right - left);
      g.font = "11px " + getComputedStyle(box).getPropertyValue("--sans");
      const panel = (y0, label, lim, unit, pick, colr, extra) => {
        const Y = v => y0 + half / 2 - Math.max(-lim, Math.min(lim, v)) / lim * (half / 2 - 4);
        g.strokeStyle = c.rule; g.lineWidth = 1; g.strokeRect(left, y0, right - left, half - 2);
        g.beginPath(); g.moveTo(left, Y(0)); g.lineTo(right, Y(0)); g.stroke();
        g.fillStyle = c.muted; g.fillText(label, left + 6, y0 + 12);
        g.fillText(`+${lim}`, 4, y0 + 10); g.fillText(`−${lim}`, 4, y0 + half - 6); g.fillText(`0 ${unit}`, 4, Y(0) + 4);
        if (extra) extra(Y);
        g.strokeStyle = colr; g.lineWidth = 1.6; g.beginPath();
        hist.forEach((h, i) => { const px = X(h.t), py = Y(pick(h)); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
        g.stroke();
      };
      panel(2, "lean of the pole (°)", 30, "°", h => h.th, c.accent, Y => {
        g.strokeStyle = c.muted; g.setLineDash([4, 3]); g.beginPath();
        hist.forEach((h, i) => { const px = X(h.t), py = Y(h.want); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
        g.stroke(); g.setLineDash([]);
      });
      panel(half + 4, "motor force (N), limit ±20", 20, "N", h => h.u, c.warn);
      g.fillStyle = c.muted; g.fillText("last 10 s", right - 52, H - 4);
    }

    function updateText() {
      const recent = hist.filter(h => h.t > st.t - 5);
      const sat = recent.length ? recent.filter(h => Math.abs(h.u) >= P.Fmax - 1e-6).length / recent.length : 0;
      const swing = recent.length ? Math.max(...recent.map(h => Math.abs(h.th))) : 0;
      const off = o.target - st.s[0];
      metrics.innerHTML = "";
      [["Upright for", st.fell ? "fell" : `${upright.toFixed(0)} s`, st.fell ? "bad" : upright > 10 ? "good" : ""],
       ["Lean now", `${(st.s[2] * DEG).toFixed(1)}°`, Math.abs(st.s[2]) > 0.2 ? "bad" : ""],
       ["Swing, last 5 s", `±${swing.toFixed(1)}°`, swing > 10 ? "bad" : swing < 2 ? "good" : ""],
       ["Off the target", `${Math.abs(off).toFixed(2)} m`, o.hold && Math.abs(off) > 0.2 && Math.abs(st.s[1]) < 0.05 ? "bad" : ""],
       ["Force at limit", `${Math.round(100 * sat)} %`, sat > 0.3 ? "bad" : ""]]
        .forEach(([k, v, cl]) => metrics.appendChild(E("div", { class: "m " + cl }, [k, E("b", { text: v })])));
      const w = [];
      if (o.kd === 0 && o.kp > 0) w.push("With no D the loop only sees how far the pole leans, not how fast it is falling, so each correction comes too late and the swings grow. Add kd.");
      else if (o.kd > 0 && o.kd < 4.5 && o.kp >= 30) w.push("A little D is not enough: the swings die out slowly or not at all. D is the damping; raise it until one push settles in a swing or two.");
      if (o.kp > 0 && o.kp < 20) w.push("kp is too weak: below about 17 N/rad the push back is smaller than gravity's pull on the leaning pole, so the cart has to race along the track to stay under it.");
      if (o.kp > 70) w.push("A large kp reacts hard to every lean, but the motor needs about 40 ms to deliver the force. By then the pole has moved, so each push lands late and the swings grow until the force sits at its ±20 N limit.");
      if (o.wind && o.hold && o.ki === 0) w.push(`The wind pushes the cart and P alone needs an error to push back, so the cart parks ${Math.abs(off).toFixed(2)} m from the target. A little ki adds up that error and removes it.`);
      if (o.ki >= 60) w.push("Too much I: the integral keeps pushing after the pole is upright again, and the cart swings to and fro. The I term is slow on purpose; keep ki small.");
      if (o.noise && o.kd >= 10) w.push("D turns sensor noise into force: it reacts to how fast the reading changes, and noise changes fast. Watch the force trace shake against its limit, then lower kd.");
      if (o.dt >= 0.1) w.push("At 10 Hz the loop sees the pole only every 100 ms. The pole falls a long way between updates, so the same gains that hold it at 100 Hz now swing it hard.");
      if (!o.hold) w.push("Without position hold nothing keeps the cart near the target: the balance loop alone lets it drift until it hits an end stop.");
      if (!w.length) w.push("Change one gain at a time, push the pole, and predict what the trace will do before you look.");
      why.innerHTML = w.slice(0, 3).map(s => `<li>${s}</li>`).join("");
    }

    let frame = 0;
    function tick(now) {
      if (!box.isConnected) return;
      requestAnimationFrame(tick);
      if (!visible) { lastFrame = now; return; }
      const dt = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now;
      if (running && !st.fell) {
        const before = st.t;
        advance(st, o, dt);
        if (st.test && (st.test.done || st.fell)) finishTest();
        if (!st.fell) upright += st.t - before;
        hist.push({ t: st.t, th: st.meas * DEG, want: st.want * DEG, u: st.u });
        while (hist.length && hist[0].t < st.t - 10.5) hist.shift();
      }
      const c = colours(now);
      drawScene(c); drawChart(c);
      if (frame++ % 15 === 0) { updateText(); if (st.test) showTest(); }
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(box);
    }
    sync(); updateText(); showTest();
    requestAnimationFrame(now => { lastFrame = now; tick(now); });
  }

  window.PidSim = { P, create, control, advance, runTest, TEST };
  function init() {
    if (!document.getElementById("pidsim-css")) { const s = document.createElement("style"); s.id = "pidsim-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.pidsim").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
