/* Look inside an electric toothbrush (inside/toothbrush.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget toothbrush"></div>
 *
 * One button, one motor, one LED and a battery. Asleep, the chip is in Stop mode with the CPU clock off; the
 * button's falling edge on an EXTI line wakes it (lesson 75). The firmware then debounces: the pin must read
 * low on 3 passes in a row (10 ms apart), or the wake came from a bump and the chip goes back to sleep.
 * The motor sits on an N-channel MOSFET low-side switch driven with PWM, a flyback diode across the motor
 * (lessons 12, 14, 59). A short press steps CLEAN → SOFT → off. A 2-minute timer pauses the motor briefly
 * every 30 s and switches off at the end. The battery is read through a 1:2 divider on the ADC; below a
 * threshold the brush refuses to start and blinks the LED.
 * Illustrative: every current (motor 150 mA at full duty, awake 8 mA, Stop 20 µA), the battery voltages
 * (4.2 V full, 3.3 V empty, 3.5 V cutoff), the duty cycles, the 0.3 s pause, the ADC reference of 3.3 V.
 * Time is in seconds.
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .toothbrush .body{fill:var(--bg);stroke:var(--fg);stroke-width:1.8}
  .toothbrush .bristle{stroke:var(--muted);stroke-width:3;stroke-linecap:round}
  .toothbrush .head{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.6}
  .toothbrush .knob{fill:var(--bg);stroke:var(--fg);stroke-width:1.6;cursor:pointer} .toothbrush .knob:hover{stroke:var(--accent)} .toothbrush .knob.down{fill:var(--accent);stroke:var(--accent)}
  .toothbrush .lamp{fill:var(--bg);stroke:var(--muted);stroke-width:1.2} .toothbrush .lamp.on{fill:var(--good);stroke:var(--good)} .toothbrush .lamp.low{fill:var(--bad);stroke:var(--bad)}
  .toothbrush .quad{fill:var(--bg);stroke:var(--muted);stroke-width:1} .toothbrush .quad.done{fill:var(--accent);stroke:var(--accent)}
  .toothbrush .part{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2} .toothbrush .part.on{fill:var(--warn-soft);stroke:var(--warn)}
  .toothbrush .cell{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.4} .toothbrush .lvl{fill:var(--good)} .toothbrush .lvl.low{fill:var(--bad)}
  .toothbrush .rotor{fill:none;stroke:var(--warn);stroke-width:2}
  .toothbrush .gnd{stroke:var(--muted);stroke-width:1.4}
  .toothbrush .tri{fill:var(--muted)}`;

  const W = 1200, H = 600;
  const CHIP = { x: 640, y: 110, w: 160, h: 320 };
  const CARD = { x: 840, y: 16, w: 350, h: 568 };
  const SX = CARD.x + 22, SX2 = CARD.x + 208, SW = 120, RX = CARD.x + CARD.w - 20;
  const P = { tick: 0.002, fw: 0.01, need: 3, press: 0.15, bump: 0.006, total: 120, quad: 30, pause: 0.3,
              iMotor: 0.15, iRun: 0.008, iStop: 0.00002, vFull: 4.2, vEmpty: 3.3, vLow: 3.5, sag: 0.08, vref: 3.3 };
  const MODES = [["CLEAN", 0.8], ["SOFT", 0.5]];

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "An electric toothbrush: button, motor driver and battery wired to a microcontroller, and the firmware inside it" });
    const dyn = {};

    // ---- wires (drawn first)
    dyn.rail = S("path", { class: "w", d: "M245 120 V70 H560 V86" });
    s.append(dyn.rail, S("line", { class: "w", x1: 400, x2: 400, y1: 70, y2: 102 }), S("line", { class: "w", x1: 470, x2: 470, y1: 70, y2: 100 }));
    s.append(S("path", { class: "w", d: "M400 154 V180 H470 V154" }), S("line", { class: "w", x1: 400, x2: 400, y1: 180, y2: 200 }));
    s.append(S("path", { class: "w", d: "M245 200 V290 H400 V250" }), S("line", { class: "gnd", x1: 300, x2: 340, y1: 296, y2: 296 }), S("line", { class: "gnd", x1: 310, x2: 330, y1: 302, y2: 302 }));
    s.append(S("line", { class: "w", x1: 560, x2: 560, y1: 126, y2: 146 }), S("line", { class: "w", x1: 560, x2: 560, y1: 186, y2: 196 }),
             S("line", { class: "gnd", x1: 548, x2: 572, y1: 196, y2: 196 }), S("line", { class: "gnd", x1: 554, x2: 566, y1: 202, y2: 202 }));
    dyn.adcW = S("path", { class: "w", d: `M560 136 H${CHIP.x - 10}` });
    dyn.gateW = S("path", { class: "w", d: `M430 225 H${CHIP.x - 10}` });
    dyn.btnW = S("path", { class: "w", d: `M130 330 H${CHIP.x - 10}` });
    dyn.ledW = S("path", { class: "w", d: `M${CHIP.x - 10} 390 H124` });
    s.append(dyn.adcW, dyn.gateW, dyn.btnW, dyn.ledW);

    // ---- the brush
    s.append(S("rect", { class: "body", x: 70, y: 150, width: 80, height: 400, rx: 34 }));
    dyn.head = S("g");
    dyn.head.append(S("rect", { class: "body", x: 96, y: 40, width: 28, height: 120, rx: 10 }), S("rect", { class: "head", x: 88, y: 30, width: 44, height: 56, rx: 16 }));
    for (let i = 0; i < 5; i++) dyn.head.append(S("line", { class: "bristle", x1: 132, x2: 148, y1: 40 + i * 9, y2: 40 + i * 9 }));
    s.append(dyn.head);
    dyn.quads = [0, 1, 2, 3].map(i => { const r = S("rect", { class: "quad", x: 84 + i * 14, y: 270, width: 10, height: 10, rx: 2 }); s.append(r); return r; });
    s.append(S("text", { class: "t s mid", x: 110, y: 296 }, "30 s steps"));
    dyn.knob = S("circle", { class: "knob", cx: 110, cy: 330, r: 18, tabindex: 0, role: "button", "aria-label": "button" });
    dyn.lamp = S("circle", { class: "lamp", cx: 110, cy: 390, r: 7 });
    s.append(dyn.lamp);
    s.append(S("rect", { class: "part", x: 86, y: 430, width: 48, height: 96, rx: 6 }), S("text", { class: "t s mid", x: 110, y: 540 }, "inside"));
    s.append(S("text", { class: "t s mid", x: 110, y: 470 }, "charge"), S("text", { class: "t s mid", x: 110, y: 484 }, "coil"));

    // ---- the circuit
    s.append(S("text", { class: "t s", x: 254, y: 64 }, "VBAT"));
    s.append(S("rect", { class: "cell", x: 220, y: 120, width: 50, height: 80, rx: 5 }));
    dyn.lvl = S("rect", { class: "lvl", x: 226, width: 38, rx: 3 }); s.append(dyn.lvl);
    s.append(S("text", { class: "t s end", x: 214, y: 140 }, "battery"));
    dyn.vTxt = S("text", { class: "t s end", x: 214, y: 156 }); dyn.iTxt = S("text", { class: "t s end", x: 214, y: 172 }); s.append(dyn.vTxt, dyn.iTxt);
    dyn.motor = S("circle", { class: "part", cx: 400, cy: 128, r: 26 });
    dyn.rotor = S("path", { class: "rotor" });
    s.append(dyn.motor, dyn.rotor, S("text", { class: "t mid", x: 400, y: 132 }, "M"), S("text", { class: "t s end", x: 366, y: 132 }, "motor"));
    s.append(S("rect", { class: "part", x: 458, y: 100, width: 24, height: 54, rx: 3 }), S("path", { class: "tri", d: "M462 136 H478 L470 122 Z" }), S("line", { class: "gnd", x1: 461, x2: 479, y1: 121, y2: 121 }));
    s.append(S("text", { class: "t s", x: 488, y: 116 }, "flyback"), S("text", { class: "t s", x: 488, y: 130 }, "diode"));
    dyn.fet = S("rect", { class: "part", x: 370, y: 200, width: 60, height: 50, rx: 4 });
    s.append(dyn.fet, S("text", { class: "t s mid", x: 400, y: 222 }, "N-MOS"), S("text", { class: "t s mid", x: 400, y: 236 }, "low side"));
    s.append(S("rect", { class: "part", x: 552, y: 86, width: 16, height: 40, rx: 2 }), S("rect", { class: "part", x: 552, y: 146, width: 16, height: 40, rx: 2 }),
             S("text", { class: "t s end", x: 546, y: 110 }, "R"), S("text", { class: "t s end", x: 546, y: 170 }, "R"));

    I.chip(s, { ...CHIP, sub: "", labelAt: [720, 270], left: [[136, "VBAT_ADC"], [225, "PWM"], [330, "BTN"], [390, "LED"]] });
    dyn.modeTxt = S("text", { class: "t s mid", x: 720, y: 290 }); dyn.curTxt = S("text", { class: "t s mid", x: 720, y: 306 }); s.append(dyn.modeTxt, dyn.curTxt);

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 40, title: "STATE MACHINE", lessons: [56, 75] });
    const sm = I.stateMachine(s, {
      w: SW, stop: ["LOW_BAT"],
      states: { SLEEP: [SX, 64], WAKE: [SX2, 64], LOW_BAT: [SX, 150], RUN: [SX2, 150] },
      paths: { "SLEEP>WAKE": `M${SX + SW} 74 H${SX2 - 2}`, "WAKE>SLEEP": `M${SX2} 84 H${SX + SW + 2}`, "WAKE>RUN": `M${SX2 + 60} 92 V148`,
               "WAKE>LOW_BAT": `M${SX2 + 10} 92 L${SX + SW - 10} 148`, "RUN>SLEEP": `M${SX2 + SW} 160 H${SX2 + SW + 10} V58 H${SX + 40} V62`, "LOW_BAT>SLEEP": `M${SX + 30} 148 V94` },
      labels: [["EXTI edge", (SX + SW + SX2) / 2, 69, "mid"], ["bounce", (SX + SW + SX2) / 2, 99, "mid"], ["3 lows", SX2 + 66, 124, ""],
               ["low", SX + SW + 6, 136, ""], ["off · 2 min", SX2 - 20, 54, "mid"], ["2 s", SX + 36, 124, ""]] });
    s.append(S("text", { class: "t s", x: SX, y: 204 }, "SLEEP = Stop mode, CPU clock off"));
    I.section(s, { x: SX, x2: RX, y: 230, title: "RAM", lessons: [20, 58], sep: true });
    const ram = I.ram(s, SX, 254);
    I.section(s, { x: SX, x2: RX, y: 412, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 434, n: 8, fmt: t => "[" + t.toFixed(2).padStart(7, " ") + "]", empty: "press the button" });

    // ---- callouts
    const co = I.callouts(s, [
      ["btn", 170, 490, 160, "Button on EXTI", ["Active low, pull-up. Its edge", "wakes the chip; 3 low reads", "10 ms apart count as a press."], [52, 70, 75], [128, 330]],
      ["fet", 338, 400, 150, "MOSFET switch", ["The pin drives the gate;", "the MOSFET carries the", "motor current. PWM duty", "sets the speed."], [12, 59], [400, 250]],
      ["diode", 492, 400, 144, "Flyback diode", ["Gives the coil's current", "a path when the MOSFET", "opens: no spike."], [14], [470, 154]],
      ["adc", 430, 2, 180, "Battery on the ADC", ["Two equal resistors halve", "VBAT into the ADC range.", "Below 3.5 V: no start."], [58, 8], [568, 136]],
      ["sleep", 652, 450, 148, "Stop mode", ["Asleep the chip draws", "µA, awake mA, the", "motor far more."], [75], [720, 430]],
      ["timer", 170, 400, 160, "Two-minute timer", ["Every 30 s a short pause", "in the motor; then off."], [71], [140, 275]]]);
    s.append(co.hot(I.hotspot({ x: 370, y: 200, width: 60, height: 50 }), "fet"), co.hot(I.hotspot({ x: 455, y: 96, width: 30, height: 62 }), "diode"),
             co.hot(I.hotspot({ x: 548, y: 82, width: 24, height: 108 }), "adc"), co.hot(I.hotspot({ x: CHIP.x, y: 260, width: CHIP.w, height: 60 }), "sleep"),
             co.hot(I.hotspot({ x: 80, y: 262, width: 60, height: 40 }), "timer"));
    s.append(dyn.knob);                                     // clickable, after the hotspots
    co.hot(dyn.knob, "btn");
    co.raise();
    dyn.knob.addEventListener("pointerdown", e => { e.preventDefault(); press(); });

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 4, note: "4 s · PWM drawn slowed", lanes: [
      { name: "BTN", kind: "in · active low", key: "btn" }, { name: "AWAKE", kind: "CPU clock on", key: "awake", cls: "good" },
      { name: "PWM", kind: "gate, duty = speed", key: "pwm", type: "pwm", period: 0.1, cls: "pwm" },
      { name: "IDD", kind: "0–200 mA", key: "idd", type: "ana", max: 0.2 }, { name: "VBAT", kind: "3.0–4.3 V", key: "vb", type: "ana", max: 1.3, cls: "good" }] });
    const btnPill = I.pill("●", () => press(), "press the button");
    const bumpBtn = I.btn("Bump it", () => bump()), drainBtn = I.btn("Drain the battery", () => { m.soc = 0.18; log("battery nearly empty"); co.show("adc"); }), chargeBtn = I.btn("Put on charger", () => { m.soc = 1; log("charged"); });
    let speed = 1, labels = "auto";
    I.frame(box, { scene: s, analyzer: la, bar: [
      [I.cap("Button"), btnPill],
      [bumpBtn, drainBtn, chargeBtn],
      [I.cap("Speed"), I.seg([[0.1, "1/10×"], [1, "1×"], [10, "10×"]], 1, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });

    // ---------------------------------------------------------------- model
    const m = { t: 0, state: "SLEEP", lastEdge: null, btnUntil: -1, pin: 1, prevPin: 1, awake: false, lows: 0, highSeen: false, mode: 0, run: 0, duty: 0,
                soc: 0.9, fwT: 0, lowT: 0, adc: 0, idd: P.iStop, wakes: 0, pressT: -9 };
    const log = txt => uart.log(m.t, txt);
    function go(next, why) { if (m.state !== next) { log(`${m.state} → ${next}${why ? "  " + why : ""}`); m.lastEdge = m.state + ">" + next; m.state = next; } }
    function press() { m.btnUntil = m.t + P.press; m.pressT = m.t; co.show("btn"); }
    function bump() { m.btnUntil = m.t + P.bump; log("a bump shakes the button contact"); co.show("btn"); }
    const vbat = () => P.vEmpty + (P.vFull - P.vEmpty) * m.soc - P.sag * m.duty;
    function sleep(why) { m.duty = 0; m.awake = false; go("SLEEP", why); }
    /* The firmware: one pass every 10 ms while awake. */
    function firmware() {
      const pin = m.pin;
      m.adc = Math.round(Math.min(4095, vbat() / 2 / P.vref * 4095));
      const v = m.adc / 4095 * P.vref * 2;
      switch (m.state) {
        case "WAKE":
          if (pin === 0) { if (++m.lows >= P.need) {
            if (v < P.vLow) { m.lowT = m.t; go("LOW_BAT", `VBAT ${v.toFixed(2)} V`); co.show("adc", 4000); }
            else { m.mode = 0; m.run = 0; m.highSeen = false; go("RUN", MODES[0][0]); co.show("fet"); }
          } } else sleep("bounce, back to Stop");
          break;
        case "RUN":
          if (pin === 1) m.highSeen = true;
          else if (m.highSeen) {                           // a new press while running (edge after release)
            m.highSeen = false;
            if (m.mode + 1 < MODES.length) { m.mode++; log(`mode ${MODES[m.mode][0]}, duty ${MODES[m.mode][1] * 100} %`); }
            else { sleep("switched off"); break; }
          }
          m.run += P.fw;
          if (m.run >= P.total) { sleep("2 minutes done"); co.show("timer"); break; }
          if (v < P.vEmpty + 0.05) { sleep("battery empty"); break; }
          { const q = m.run % P.quad; if (m.run > 1 && q < P.pause && q + P.fw >= P.pause) { log(`${Math.round(m.run / P.quad) * 30} s: next quarter`); co.show("timer"); }
            m.duty = m.run > 1 && q < P.pause ? 0 : MODES[m.mode][1]; }
          break;
        case "LOW_BAT":
          m.duty = 0;
          if (m.t - m.lowT > 2) sleep("blinked low battery");
          break;
      }
    }
    function step(dt) {
      m.t += dt;
      m.prevPin = m.pin; m.pin = m.t < m.btnUntil ? 0 : 1;
      if (!m.awake && m.prevPin === 1 && m.pin === 0) {     // EXTI falling edge wakes the chip from Stop
        m.awake = true; m.wakes++; m.lows = 0; m.fwT = m.t; go("WAKE", "EXTI on BTN"); co.show("sleep");
      }
      if (m.awake && m.t >= m.fwT) { m.fwT += P.fw; firmware(); }
      m.idd = m.awake ? P.iRun + P.iMotor * m.duty : P.iStop;
      m.soc = Math.max(0, m.soc - m.idd * dt / (0.6 * 3600));   // illustrative 600 mAh
    }
    const ledOn = () => m.state === "RUN" ? 1 : m.state === "LOW_BAT" ? (m.t % 0.4 < 0.2 ? 1 : 0) : 0;
    function sample() { la.push(m.t, { btn: m.pin, awake: m.awake ? 1 : 0, pwm: m.duty, idd: m.idd, vb: vbat() - 3.0 }); }

    // ---------------------------------------------------------------- drawing
    function render(now) {
      const on = m.duty > 0;
      dyn.head.setAttribute("transform", on ? `translate(${(Math.sin(m.t * 260) * 2.5 * m.duty).toFixed(2)} 0)` : "");
      const a = m.t * 40 * m.duty;
      dyn.rotor.setAttribute("d", on ? `M${400 + 18 * Math.cos(a)} ${128 + 18 * Math.sin(a)} A18 18 0 0 1 ${400 + 18 * Math.cos(a + 2)} ${128 + 18 * Math.sin(a + 2)}` : "");
      cls(dyn.motor, "part" + (on ? " on" : "")); cls(dyn.fet, "part" + (on ? " on" : ""));
      cls(dyn.gateW, "w" + (on ? " on" : "")); cls(dyn.rail, "w" + (on ? " on" : ""));
      cls(dyn.btnW, "w" + (m.pin === 0 ? " on" : "")); cls(dyn.knob, "knob" + (m.pin === 0 ? " down" : ""));
      cls(dyn.adcW, "w" + (m.awake ? " on" : ""));
      const led = ledOn();
      cls(dyn.lamp, "lamp" + (led ? (m.state === "LOW_BAT" ? " low" : " on") : "")); cls(dyn.ledW, "w" + (led ? " on" : ""));
      cls(btnPill, "fb" + (m.pin === 0 ? " lit" : ""));
      const done = m.state === "RUN" ? Math.floor(m.run / P.quad) : 0;
      dyn.quads.forEach((q, i) => cls(q, "quad" + (i < done ? " done" : "")));
      const vb = vbat(), h = 68 * m.soc;
      dyn.lvl.setAttribute("y", 196 - h); dyn.lvl.setAttribute("height", h); cls(dyn.lvl, "lvl" + (vb < P.vLow ? " low" : ""));
      dyn.vTxt.textContent = vb.toFixed(2) + " V";
      dyn.iTxt.textContent = m.idd < 0.001 ? Math.round(m.idd * 1e6) + " µA" : Math.round(m.idd * 1000) + " mA";
      dyn.modeTxt.textContent = m.awake ? (m.state === "RUN" ? `${MODES[m.mode][0]} · duty ${Math.round(m.duty * 100)} %` : m.state) : "Stop mode";
      dyn.curTxt.textContent = m.awake ? "CPU running" : "CPU clock off";
      sm.set(m.state, m.lastEdge);
      co.update(now, labels);
      const k = I.k, v = I.v;
      ram.set([
        `${k("uint8_t  ")}mode       = ${v(m.state === "RUN" ? MODES[m.mode][0] : "–")}`,
        `${k("uint8_t  ")}duty_pct   = ${v(Math.round(m.duty * 100))}`,
        `${k("uint8_t  ")}btn_lows   = ${v(m.state === "WAKE" ? m.lows : m.awake ? P.need : 0)}`,
        `${k("uint32_t ")}run_ms     = ${v(Math.round(m.run * 1000))}`,
        `${k("uint16_t ")}adc_raw    = ${v(m.adc)}  ${k("→")} ${v((m.adc / 4095 * P.vref * 2).toFixed(2) + " V", m.adc / 4095 * P.vref * 2 < P.vLow ? "bad" : "v")}`,
        `${k("uint16_t ")}wakeups    = ${v(m.wakes)}`]);
      uart.render();
      la.draw(m.t);
    }
    I.loop({ tick: P.tick, speed: () => speed, every: 5, step, sample, render });
    box._demo = { m, press, bump, drain: () => { m.soc = 0.18; }, charge: () => { m.soc = 1; }, setSpeed: v => { speed = v; }, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("toothbrush", mount, CSS);
})();
