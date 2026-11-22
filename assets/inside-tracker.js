/* Look inside a fitness tracker (inside/tracker.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget tracker"></div>
 *
 * The MCU sleeps with WFI and wakes only on interrupts. Two ways to read the accelerometer (50 samples/s):
 *   poll: a timer interrupt every 20 ms, read one sample over I2C (1 ms awake);
 *   FIFO: the sensor stores samples and raises INT1 at 25, the MCU reads all 25 (3 ms awake) twice a second.
 * Average current is the lesson 75 formula, I_avg = d × I_awake + (1 − d) × I_sleep, with lesson 75's example
 * currents: 10 mA awake and 5 µA asleep. Everything else is illustrative: the 6 mA display, the 20 mA vibration
 * motor, the 100 mAh battery, the wake times, the 5 s display timeout, the step threshold, a goal every 100
 * steps, and a display redraw (2 ms awake) every 100 ms while it is on. The sensor's own current is left out.
 * Time is in seconds.
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .tracker .case{fill:var(--bg);stroke:var(--fg);stroke-width:1.8}
  .tracker .strap{fill:var(--code-bg);stroke:var(--rule);stroke-width:1.2}
  .tracker .scr{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2}
  .tracker .scr.on{fill:var(--accent-soft);stroke:var(--accent)}
  .tracker .big{fill:var(--fg);font-family:var(--mono);font-size:30px;font-weight:700;text-anchor:middle}
  .tracker .mid2{fill:var(--accent);font-family:var(--mono);font-size:15px;font-weight:700;text-anchor:middle}
  .tracker .fifo{fill:var(--accent)}
  .tracker .cell{fill:var(--good-soft);stroke:var(--good);stroke-width:1.2}
  .tracker .lvl{fill:var(--good)}
  .tracker .vib{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2} .tracker .vib.on{stroke:var(--warn);fill:var(--warn-soft)}
  .tracker .side{fill:var(--bg);stroke:var(--muted);stroke-width:1.5;cursor:pointer} .tracker .side:hover{stroke:var(--accent)} .tracker .side.on{fill:var(--accent);stroke:var(--accent)}
  .tracker .read{fill:var(--fg);font-family:var(--mono);font-size:12px}
  .tracker .read .v{fill:var(--accent);font-weight:700}`;

  const W = 1200, H = 640;
  const CHIP = { x: 640, y: 200, w: 160, h: 260 };
  const CARD = { x: 840, y: 16, w: 350, h: 608 };
  const SX = CARD.x + 20, RX = CARD.x + CARD.w - 18;
  const P = { tick: 0.0005, rate: 0.02, wm: 25, Iawake: 10, Isleep: 0.005, Idisp: 6, Ivib: 20, cap: 100,
              pollAwake: 0.001, fifoAwake: 0.003, btnAwake: 0.001, drawAwake: 0.002, dispOn: 5, goal: 100 };

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "The inside of a fitness tracker wired to its microcontroller, and the firmware inside it" });
    const dyn = {};

    // ---- wires first
    dyn.busW = S("path", { class: "w bus", d: `M430 200 H580 V340 M290 340 H580 M580 300 H${CHIP.x - 10}` });
    dyn.intW = S("path", { class: "w", d: `M290 370 H${CHIP.x - 10}` });
    dyn.btnW = S("path", { class: "w", d: `M482 172 H615 V250 H${CHIP.x - 10}` });
    dyn.vibW = S("path", { class: "w", d: `M410 470 V560 H700 V${CHIP.y + CHIP.h + 10}` });
    s.append(dyn.busW, dyn.intW, dyn.btnW, dyn.vibW);

    // ---- the tracker, opened up
    s.append(S("rect", { class: "strap", x: 250, y: 20, width: 140, height: 110, rx: 10 }));
    s.append(S("rect", { class: "case", x: 170, y: 120, width: 300, height: 410, rx: 40 }));
    dyn.scr = S("rect", { class: "scr", x: 210, y: 150, width: 220, height: 140, rx: 12 });
    dyn.clock = S("text", { class: "big", x: 320, y: 210 }); dyn.steps = S("text", { class: "mid2", x: 320, y: 248 });
    dyn.stepl = S("text", { class: "t s mid", x: 320, y: 268 }, "steps");
    s.append(dyn.scr, dyn.clock, dyn.steps, dyn.stepl, S("text", { class: "t s", x: 214, y: 304 }, "OLED"));
    s.append(S("rect", { class: "box", x: 210, y: 320, width: 80, height: 70, rx: 5 }), S("text", { class: "t b mid", x: 250, y: 344 }, "ACCEL"), S("text", { class: "t s mid", x: 250, y: 362 }, "FIFO"));
    s.append(S("rect", { class: "grid", x: 216, y: 370, width: 68, height: 10, fill: "none" }));
    dyn.fifo = S("rect", { class: "fifo", x: 216, y: 370, height: 10, width: 0 });
    s.append(dyn.fifo, S("line", { class: "grid", x1: 216 + 68 * 25 / 32, x2: 216 + 68 * 25 / 32, y1: 366, y2: 384 }));
    s.append(S("rect", { class: "cell", x: 210, y: 420, width: 140, height: 80, rx: 8 }), S("rect", { class: "cell", x: 350, y: 448, width: 8, height: 24, rx: 2 }));
    dyn.lvl = S("rect", { class: "lvl", x: 216, y: 426, height: 68, rx: 4, opacity: .5 });
    s.append(dyn.lvl, S("text", { class: "t b mid", x: 280, y: 464 }, "100 mAh"));
    dyn.vib = S("rect", { class: "vib", x: 370, y: 430, width: 80, height: 40, rx: 8 });
    dyn.vibw = S("circle", { class: "fifo", cx: 410, cy: 450, r: 5 });
    s.append(dyn.vib, dyn.vibw, S("text", { class: "t s mid", x: 410, y: 424 }, "vibration motor"));
    dyn.read1 = S("text", { class: "read", x: 170, y: 592, "xml:space": "preserve" });
    dyn.read2 = S("text", { class: "read", x: 170, y: 612, "xml:space": "preserve" });
    s.append(dyn.read1, dyn.read2);

    I.chip(s, { ...CHIP, sub: "asleep in WFI", labelAt: [720, 330], left: [[250, "BTN"], [300, "I2C"], [370, "INT1"]], bottom: [[700, "VIB"]] });

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 40, title: "MAIN LOOP", lessons: [75, 57] });
    const L = poll => ["int main(void) {", "  for (;;) {",
      poll ? "    __WFI();      // timer IRQ every 20 ms" : "    __WFI();      // sleep until an IRQ",
      poll ? "    read_xyz(&s); // one sample over I2C" : "    if (int1) read_fifo(buf, 25);",
      "    if (btn) display_on(5000);", "    steps += count_steps(buf);", "    if (display_is_on()) display_draw();", "  }", "}"];
    const codes = { poll: I.code(s, { x: SX, y: 64, w: 318, lh: 15, lines: L(true) }), fifo: I.code(s, { x: SX, y: 64, w: 318, lh: 15, lines: L(false) }) };
    I.section(s, { x: SX, x2: RX, y: 232, title: "RAM", lessons: [20], sep: true });
    const ram = I.ram(s, SX, 256);
    I.section(s, { x: SX, x2: RX, y: 420, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 442, n: 9, fmt: t => "[" + t.toFixed(2).padStart(7, " ") + "]", empty: "start walking…" });

    // ---- callouts
    const co = I.callouts(s, [
      ["disp", 8, 140, 152, "OLED display", ["Also on I2C. On for 5 s,", "then off: lit, it draws", "more than the CPU."], [60, 61], [210, 220]],
      ["accel", 8, 296, 152, "Accelerometer", ["50 samples a second into", "its own FIFO. At 25 it", "raises INT1."], [60, 57], [210, 350]],
      ["bat", 8, 420, 152, "Battery budget", ["I_avg = d·I_awake +", "(1 − d)·I_sleep: the time", "awake, d, decides."], [75], [210, 460]],
      ["btn", 490, 16, 140, "Button", ["A GPIO interrupt wakes", "the CPU at once."], [52, 57], [482, 172]],
      ["i2c", 490, 98, 140, "I2C bus", ["Sensor and display", "share two wires.", "Reads keep it awake."], [60], [560, 200]],
      ["sleep", 650, 40, 150, "WFI sleep", ["The core stops until an", "interrupt: 5 µA instead", "of 10 mA."], [75, 34], [720, CHIP.y]],
      ["int", 490, 398, 140, "INT1 wake-up", ["FIFO full enough: the", "sensor pulls INT1 and", "the CPU wakes."], [57], [600, 370]],
      ["vib", 490, 484, 140, "Vibration motor", ["A MOSFET switches it", "for 0.2 s at each goal."], [12, 14], [450, 450]]]);
    s.append(co.hot(I.hotspot({ x: 206, y: 146, width: 228, height: 148 }), "disp"), co.hot(I.hotspot({ x: 206, y: 316, width: 88, height: 78 }), "accel"),
             co.hot(I.hotspot({ x: 206, y: 416, width: 156, height: 88 }), "bat"), co.hot(I.hotspot({ x: 366, y: 426, width: 88, height: 48 }), "vib"),
             co.hot(I.hotspot({ x: CHIP.x, y: CHIP.y, width: CHIP.w, height: CHIP.h }), "sleep"), co.hot(I.hotspot({ x: 520, y: 190, width: 70, height: 160 }), "i2c"));
    dyn.side = S("rect", { class: "side", x: 470, y: 160, width: 12, height: 24, rx: 3, tabindex: 0, role: "button", "aria-label": "side button" });
    dyn.side.addEventListener("click", () => press());
    s.append(co.hot(dyn.side, "btn"));
    co.raise();

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 1, label: a => Math.round(a * 1000) + " ms", note: "the last second · current on a 0–20 mA scale", lanes: [
      { name: "CPU", kind: "awake", key: "cpu", cls: "pwm" }, { name: "I_DD", kind: "supply, 0–20 mA", key: "i", type: "ana", max: 20 },
      { name: "I2C", kind: "bus busy", key: "i2c" }, { name: "INT1", kind: "in · IRQ", key: "int1" }, { name: "DISPLAY", kind: "on", key: "disp", cls: "good" }] });
    const walkBtn = I.btn("Start walking", () => walk()), raiseBtn = I.btn("Raise wrist", () => raise()), pressBtn = I.btn("Press button", () => press());
    let speed = 1, labels = "auto";
    I.frame(box, { scene: s, analyzer: la, bar: [
      [walkBtn, raiseBtn, pressBtn],
      [I.cap("Read sensor"), I.seg([["poll", "Poll 20 ms"], ["fifo", "FIFO + INT1"]], "fifo", v => mode(v))],
      [I.cap("Speed"), I.seg([[0.1, "1/10×"], [1, "1×"], [10, "10×"]], 1, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });

    // ---------------------------------------------------------------- model
    const m = { t: 0, mode: "fifo", walking: false, raiseT: -9, btnT: -9, fifo: [], last: null, nextSample: 0, nextPoll: 0, nextDraw: 0,
                awakeUntil: 0, i2cUntil: 0, dispUntil: -1, vibUntil: -1, steps: 0, above: false, lastStep: -9, phase: 0,
                Iavg: 0.1, dAvg: 0.01, wakes: 0, wakeRate: 0, lit: [2], litT: 0, logged: 0 };
    const log = txt => uart.log(m.t, txt);
    function walk() { m.walking = !m.walking; log(m.walking ? "you start walking" : "you stop"); co.show("accel"); }
    function raise() { m.raiseT = m.t; co.show("accel"); }
    function press() { m.btnT = m.t; co.show("btn"); wake(P.btnAwake, false, [4]); display("button"); }
    function mode(v) { m.mode = v; m.fifo = []; log(v === "poll" ? "mode: timer wake every 20 ms" : "mode: FIFO, wake on INT1"); co.show(v === "poll" ? "sleep" : "int"); co.show("bat"); }
    function display(why) { if (m.t >= m.dispUntil) log(`display on (${why})`); m.dispUntil = m.t + P.dispOn; co.show("disp"); }
    function wake(dur, i2c, lit) { m.awakeUntil = Math.max(m.awakeUntil, m.t) + dur; if (i2c) m.i2cUntil = Math.max(m.i2cUntil, m.t) + dur * 0.85; m.wakes++; m.lit = lit; m.litT = m.t; }
    /* The sensor makes one sample every 20 ms: magnitude in g, and a tilt flag while the wrist turns. */
    function sensorSample() {
      if (m.walking) m.phase += 2 * Math.PI * 1.8 * P.rate;
      const a = 1 + (m.walking ? 0.4 * Math.sin(m.phase) : 0) + (Math.random() - 0.5) * 0.04;
      return { t: m.t, a, tilt: m.t - m.raiseT < 0.6 };
    }
    /* The firmware's step counter and gestures: run on every sample it gets. */
    function process(smp) {
      if (smp.a > 1.25 && !m.above && smp.t - m.lastStep > 0.3) {
        m.above = true; m.lastStep = smp.t; m.steps++;
        if (m.steps % 10 === 0) log(`steps = ${m.steps}`);
        if (m.steps % P.goal === 0) { m.vibUntil = m.t + 0.2; log(`goal: ${m.steps} steps, vibrate`); co.show("vib"); }
      }
      if (smp.a < 1.15) m.above = false;
      if (smp.tilt && m.t >= m.dispUntil) display(`wrist raised, seen ${Math.round((m.t - m.raiseT) * 1000)} ms later`);
    }
    function step(dt) {
      m.t += dt;
      if (m.t >= m.nextSample) {
        m.nextSample += P.rate;
        const smp = sensorSample();
        m.last = smp;
        if (m.mode === "fifo") { m.fifo.push(smp); if (m.fifo.length > 32) m.fifo.shift(); }
      }
      if (m.mode === "poll" && m.t >= m.nextPoll) {
        m.nextPoll += P.rate;
        wake(P.pollAwake, true, [3, 5]);
        if (m.last) process(m.last);
      }
      if (m.mode === "fifo" && m.fifo.length >= P.wm && m.t >= m.awakeUntil) {
        wake(P.fifoAwake, true, [3, 5]);
        m.fifo.forEach(process); m.fifo = [];
        co.show("int", 1500);
      }
      if (m.t < m.dispUntil && m.t >= m.nextDraw) { m.nextDraw = m.t + 0.1; wake(P.drawAwake, true, [6]); }
      const awake = m.t < m.awakeUntil;
      const I_ = (awake ? P.Iawake : P.Isleep) + (m.t < m.dispUntil ? P.Idisp : 0) + (m.t < m.vibUntil ? P.Ivib : 0);
      m.I = I_;
      const k = dt / 30;                                  // 30 s moving average
      m.Iavg += (I_ - m.Iavg) * k; m.dAvg += ((awake ? 1 : 0) - m.dAvg) * k;
    }
    let wakesPrev = 0, rateT = 0;
    function sample() {
      la.push(m.t, { cpu: m.t < m.awakeUntil ? 1 : 0, i: Math.min(20, m.I || 0), i2c: m.t < m.i2cUntil ? 1 : 0,
                     int1: m.mode === "fifo" && m.fifo.length >= P.wm ? 1 : 0, disp: m.t < m.dispUntil ? 1 : 0 });
      if (m.t - rateT >= 1) { m.wakeRate = (m.wakes - wakesPrev) / (m.t - rateT); wakesPrev = m.wakes; rateT = m.t; }
    }

    // ---------------------------------------------------------------- drawing
    function render(now) {
      const on = m.t < m.dispUntil, awake = m.t < m.awakeUntil;
      cls(dyn.scr, "scr" + (on ? " on" : ""));
      [dyn.clock, dyn.steps, dyn.stepl].forEach(e => { e.style.display = on ? "" : "none"; });
      const sec = 10 * 3600 + 42 * 60 + Math.floor(m.t);
      dyn.clock.textContent = `${Math.floor(sec / 3600) % 24}:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}`;
      dyn.steps.textContent = String(m.steps);
      dyn.fifo.setAttribute("width", 68 * Math.min(32, m.fifo.length) / 32);
      const life = P.cap / m.Iavg / 24;
      dyn.lvl.setAttribute("width", 128 * Math.max(0.05, Math.min(1, life / 90)));
      const buzz = m.t < m.vibUntil;
      cls(dyn.vib, "vib" + (buzz ? " on" : "")); dyn.vibw.setAttribute("cx", 410 + (buzz ? 6 * Math.sin(now / 15) : 0));
      cls(dyn.side, "side" + (m.t - m.btnT < 0.15 ? " on" : ""));
      cls(dyn.busW, "w bus" + (m.t < m.i2cUntil || m.t - m.litT < 0.08 ? " on" : ""));
      cls(dyn.intW, "w" + (m.mode === "fifo" && (m.fifo.length >= P.wm || m.t - m.litT < 0.08 && m.lit[0] === 3) ? " on" : ""));
      cls(dyn.btnW, "w" + (m.t - m.btnT < 0.15 ? " on" : ""));
      cls(dyn.vibW, "w" + (buzz ? " on" : ""));
      dyn.read1.innerHTML = `average current (30 s) <tspan class="v">${m.Iavg.toFixed(3)} mA</tspan>   awake <tspan class="v">${(m.dAvg * 100).toFixed(1)} %</tspan> of the time`;
      dyn.read2.innerHTML = `100 mAh lasts about <tspan class="v">${life >= 10 ? Math.round(life) : life.toFixed(1)} days</tspan> at this rate`;
      walkBtn.textContent = m.walking ? "Stop walking" : "Start walking";
      codes.poll.g.style.display = m.mode === "poll" ? "" : "none"; codes.fifo.g.style.display = m.mode === "fifo" ? "" : "none";
      codes[m.mode].set(m.t - m.litT < 0.06 || awake ? m.lit : [2]);
      co.update(now, labels);
      const k = I.k, v = I.v;
      ram.set([
        `${k("uint8_t  ")}fifo_level = ${v(m.mode === "fifo" ? m.fifo.length + " / 32" : "–")}`,
        `${k("uint32_t ")}steps      = ${v(m.steps)}`,
        `${k("uint16_t ")}wakes/s    = ${v(Math.round(m.wakeRate))}`,
        `${k("float    ")}awake      = ${v((m.dAvg * 100).toFixed(1) + " %")}`,
        `${k("float    ")}i_avg_mA   = ${v(m.Iavg.toFixed(3))}`,
        `${k("uint16_t ")}display_ms = ${v(on ? Math.round((m.dispUntil - m.t) * 1000) : 0)}`,
        `${k("bool     ")}cpu_awake  = ${v(awake ? 1 : 0)}`]);
      uart.render();
      la.draw(m.t);
    }
    I.loop({ tick: P.tick, speed: () => speed, every: 2, step, sample, render });
    box._demo = { m, walk, raise, press, mode, setSpeed: v => { speed = v; }, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("tracker", mount, CSS);
})();
