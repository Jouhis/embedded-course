/* Look inside a kettle (inside/kettle.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget kettle"></div>
 *
 * Temperature: a 10 kΩ NTC (B = 3950) between OUT and ground with a 10 kΩ resistor from 3.3 V to OUT, read by
 *   a 12-bit ADC, converted with the Beta equation (as in lessons 115 and 58). An open sensor reads 4095, a
 *   shorted one 0 (lesson 115).
 * Heater: a relay switched with slow PWM (time-proportional), period 2 s. Power is the duty cycle (lesson 116).
 * Firmware every 100 ms, a switch-based state machine: IDLE, HEATING (full power), HOLDING (PI keep-warm),
 *   FAULT. Boil detection: above 97 °C, less than 0.3 °C rise in 10 s. Faults: over 110 °C, ADC at 0..20 or
 *   4075..4095 (sensor short or open). Lifting the kettle off the base stops the heater.
 * Illustrative numbers: 2 kW heater, 1 kg of water, 400 J/K for the kettle itself, 4 W/K heat loss,
 *   a 4 s sensor lag, Kp = 0.15 /°C and Ki = 0.004 /(°C·s), the 2 s PWM period. Time is in seconds.
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .kettle .body{fill:var(--bg);stroke:var(--fg);stroke-width:1.8}
  .kettle .handle{fill:none;stroke:var(--fg);stroke-width:7;stroke-linecap:round;opacity:.75}
  .kettle .water{fill:var(--accent-soft)}
  .kettle .hotw{fill:var(--warn-soft)}
  .kettle .elem{fill:none;stroke:var(--muted);stroke-width:3;stroke-linejoin:round}
  .kettle .elem.on{stroke:var(--warn)}
  .kettle .elem.over{stroke:var(--bad)}
  .kettle .bub{fill:none;stroke:var(--accent);stroke-width:1.2}
  .kettle .steam{fill:none;stroke:var(--muted);stroke-width:2;stroke-linecap:round;opacity:.6}
  .kettle .base{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2}
  .kettle .ntc{fill:var(--bg);stroke:var(--fg);stroke-width:1.2}
  .kettle .ntc.open{stroke:var(--bad);stroke-dasharray:2 2}
  .kettle .sw{fill:var(--muted)} .kettle .sw.on{fill:var(--accent)}
  .kettle .btnc{fill:var(--bg);stroke:var(--muted);stroke-width:1.5;cursor:pointer}
  .kettle .btnc:hover{stroke:var(--accent)} .kettle .btnc.on{fill:var(--accent);stroke:var(--accent)}
  .kettle .rly{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2} .kettle .rly.on{stroke:var(--warn);fill:var(--warn-soft)}
  .kettle .disp{fill:var(--fg);font-family:var(--mono);font-size:12px;font-weight:700}
  .kettle .disp.bad{fill:var(--bad)}
  .kettle .gnd{stroke:var(--muted);stroke-width:1.4}`;

  const W = 1200, H = 640;
  const CHIP = { x: 640, y: 200, w: 160, h: 250 };
  const CARD = { x: 840, y: 16, w: 350, h: 608 };
  const SX = CARD.x + 22, SX2 = CARD.x + 208, SW = 120, RX = CARD.x + CARD.w - 20;
  const P = { tick: 0.1, heater: 2000, cWater: 4186, cKettle: 400, loss: 4, amb: 20, lag: 4, period: 2, kp: 0.15, ki: 0.004, cut: 110 };
  const R0 = 10000, B = 3950, T0 = 298.15;
  const adcOf = T => { const r = R0 * Math.exp(B * (1 / (T + 273.15) - 1 / T0)); return Math.round(4095 * r / (r + R0)); };
  const tempOf = code => { const r = R0 * code / (4095 - code); return 1 / (1 / T0 + Math.log(r / R0) / B) - 273.15; };
  const WY = { bot: 500, full: 262 };                 // water surface for 0 and 1 kg

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "An electric kettle wired to a microcontroller, and the firmware inside it" });
    const dyn = {};

    // ---- kettle (a group that lifts off the base)
    const k = S("g");
    k.append(S("path", { class: "handle", d: "M420 215 C455 215 455 395 420 395" }));
    k.append(S("path", { class: "body", d: "M206 240 L172 198 L180 192 L210 222 Z" }));
    k.append(S("rect", { class: "body", x: 200, y: 168, width: 220, height: 342, rx: 18 }));
    k.append(S("rect", { class: "body", x: 236, y: 156, width: 148, height: 12, rx: 4 }), S("rect", { class: "body", x: 296, y: 146, width: 28, height: 10, rx: 3 }));
    dyn.water = S("rect", { class: "water", x: 208, width: 204, rx: 6 });
    dyn.hotw = S("rect", { class: "hotw", x: 208, width: 204, rx: 6, opacity: 0 });
    dyn.elem = S("path", { class: "elem", d: "M228 492 l12 -10 12 10 12 -10 12 10 12 -10 12 10 12 -10 12 10 12 -10 12 10 12 -10 12 10 12 -10 12 10" });
    k.append(dyn.water, dyn.hotw, dyn.elem);
    dyn.bubs = [0, 1, 2, 3, 4, 5, 6].map(() => { const c = S("circle", { class: "bub", r: 3 }); k.append(c); return c; });
    dyn.steam = S("path", { class: "steam", d: "M176 186 c-8 -10 8 -16 0 -26 c-8 -10 8 -16 0 -26 M190 182 c-6 -8 6 -14 0 -22 c-6 -8 6 -14 0 -22" });
    k.append(dyn.steam);
    dyn.kettle = k; s.append(k);

    // ---- base: NTC with its divider, the on-base switch, the button and a display
    s.append(S("rect", { class: "base", x: 180, y: 516, width: 260, height: 46, rx: 8 }));
    dyn.disp = S("text", { class: "disp", x: 196, y: 548 });
    s.append(dyn.disp);
    // NTC: ground on its left, OUT down to the divider node
    s.append(S("path", { class: "gnd", d: "M292 522 H276 M276 516 V528 M272 518 V526 M268 520 V524" }));
    dyn.ntc = S("rect", { class: "ntc", x: 292, y: 517, width: 16, height: 10, rx: 2 });
    s.append(S("text", { class: "t s", x: 314, y: 528 }, "NTC"));
    s.append(S("path", { class: "w", d: "M240 598 l4 -4 8 8 8 -8 8 8 8 -8 8 8 4 -4 H300" }), S("text", { class: "t s end", x: 236, y: 602 }, "3.3 V"), S("text", { class: "t s", x: 258, y: 588 }, "10 kΩ"));
    dyn.adcW = S("path", { class: "w", d: `M300 527 V618 H615 V430 H${CHIP.x - 10}` });
    s.append(dyn.adcW);
    // button
    dyn.btnW = S("path", { class: "w", d: `M380 553 V604 H600 V380 H${CHIP.x - 10}` });
    s.append(dyn.btnW);
    // on-base switch
    dyn.swW = S("path", { class: "w", d: `M410 520 V590 H585 V330 H${CHIP.x - 10}` });
    dyn.sw = S("rect", { class: "sw", x: 404, y: 510, width: 12, height: 8, rx: 2 });
    s.append(dyn.swW, dyn.sw);
    // relay and heater power
    dyn.rly = S("rect", { class: "rly", x: 470, y: 84, width: 90, height: 34, rx: 5 });
    s.append(dyn.rly, S("text", { class: "t s mid", x: 515, y: 105 }, "relay"), S("text", { class: "t s mid", x: 515, y: 74 }, "mains"), S("path", { class: "w", d: "M515 78 V84" }));
    dyn.heatW = S("path", { class: "w", d: `M700 ${CHIP.y - 10} V101 H560` });
    dyn.pwrW = S("path", { class: "w bus", d: "M470 101 H462 V548 H440" });
    s.append(dyn.heatW, dyn.pwrW);
    I.chip(s, { ...CHIP, sub: "loop every 100 ms", labelAt: [735, 300],
      left: [[330, "ON_BASE"], [380, "BTN"], [430, "ADC0"]], top: [[700, "HEAT"]] });

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 46, title: "STATE MACHINE · switch (state)", lessons: [56] });
    const sm = I.stateMachine(s, {
      w: SW, stop: ["FAULT"],
      states: { IDLE: [SX, 74], HEATING: [SX2, 74], FAULT: [SX, 156], HOLDING: [SX2, 156] },
      paths: {
        "IDLE>HEATING": `M${SX + SW} 82 H${SX2 - 2}`, "HEATING>IDLE": `M${SX2} 94 H${SX + SW + 2}`,
        "HEATING>HOLDING": `M${SX2 + 60} 102 V154`, "HOLDING>HEATING": `M${SX2 + 96} 156 V104`,
        "HOLDING>IDLE": `M${SX2} 162 L${SX + 96} 104`, "FAULT>IDLE": `M${SX + 30} 156 V104` },
      labels: [["button", (SX + SW + SX2) / 2, 77, "mid"], ["boiled · stop", (SX + SW + SX2) / 2, 108, "mid"], ["at target", SX2 + 54, 134, "end"],
               ["100°", SX2 + 102, 134, ""], ["reset", SX + 36, 134, ""]] });
    s.append(S("text", { class: "t s", x: SX, y: 214 }, "a fault, or lifting the kettle, stops the heater"), S("text", { class: "t s", x: SX, y: 228 }, "from any state"));
    I.section(s, { x: SX, x2: RX, y: 272, title: "RAM", lessons: [20, 21], sep: true });
    const ram = I.ram(s, SX, 296);
    I.section(s, { x: SX, x2: RX, y: 456, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 478, n: 8, empty: "press the button to start", fmt: t => "[" + t.toFixed(1).padStart(6, " ") + "]" });

    // ---- callouts and hover areas
    const kTop = () => m.lifted ? -30 : 0;
    const co = I.callouts(s, [
      ["boil", 8, 96, 152, "Boil detection", ["Near 100 °C the reading", "stops rising: the water", "boils, so the heater stops."], [107, 56], () => [212, 268 + kTop()]],
      ["ntc", 8, 282, 152, "NTC thermistor", ["Its resistance falls as it", "warms. With the 10 kΩ", "resistor it is a divider."], [8, 115], [292, 522]],
      ["base", 8, 392, 152, "On-base switch", ["Kettle lifted: the switch", "opens and the heater", "stops at once."], [52, 56], [404, 514]],
      ["fault", 8, 490, 152, "Over-temperature", ["Over 110 °C, or a sensor", "reading 0 or 4095:", "heater off, state FAULT."], [84, 112], [300, 598]],
      ["heat", 474, 134, 106, "Heater", ["A relay turns the", "element on for", "duty × 2 s, each", "2 s: slow PWM."], [59, 14], [515, 118]],
      ["pid", 474, 236, 106, "PI control", ["Holding 70 or", "80 °C: power", "shrinks as the", "error shrinks."], [108], [CHIP.x, CHIP.y + 16]],
      ["adc", 474, 346, 106, "ADC", ["12 bits: 0 to", "4095. Hotter", "water, lower code."], [58], [615, 470]],
      ["btn", 474, 448, 106, "Button", ["GPIO input,", "pull-up, active", "low, debounced."], [52], [388, 545]]]);
    s.append(co.hot(I.hotspot({ x: 284, y: 512, width: 40, height: 20 }), "ntc"), co.hot(I.hotspot({ x: 398, y: 504, width: 26, height: 20 }), "base"),
             co.hot(I.hotspot({ x: 468, y: 80, width: 96, height: 42 }), "heat"), co.hot(I.hotspot({ x: CHIP.x, y: CHIP.y, width: CHIP.w, height: 80 }), "pid"),
             co.hot(I.hotspot({ x: 605, y: 420, width: 30, height: 30 }), "adc"), co.hot(I.hotspot({ x: 236, y: 584, width: 70, height: 22 }), "fault"));
    k.append(co.hot(I.hotspot({ x: 200, y: 168, width: 220, height: 320 }), "boil"));
    dyn.btn = S("circle", { class: "btnc", cx: 380, cy: 545, r: 8, tabindex: 0, role: "button", "aria-label": "kettle button" });
    dyn.btn.addEventListener("click", () => press());
    s.append(co.hot(dyn.btn, "btn"));
    co.raise();

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 120, label: a => a + " s", note: "120 s · the heater's 2 s PWM period shown as it is", lanes: [
      { name: "TEMP", kind: "ADC0 → °C, 0–110", key: "temp", type: "ana", max: 110 }, { name: "HEAT", kind: "PWM out, relay", key: "duty", type: "pwm", period: P.period, cls: "pwm" },
      { name: "BTN", kind: "in · active low", key: "btn" }, { name: "ON_BASE", kind: "in", key: "onBase" }, { name: "FAULT", kind: "state", key: "fault", cls: "bad" }] });
    const spBtns = [70, 80, 100].map(v => I.pill(v + "°", () => setpoint(v), "target " + v + " °C"));
    spBtns.forEach(b => { b.style.minWidth = "3rem"; });
    const startBtn = I.btn("Press button", () => press()), liftBtn = I.btn("Lift kettle", () => lift()),
          fillBtn = I.btn("Pour out", () => fill()), sensBtn = I.btn("Unplug sensor", () => unplug(), "stop"), resetBtn = I.btn("Reset", () => reset());
    let speed = 10, labels = "auto";
    I.frame(box, { scene: s, analyzer: la, bar: [
      [I.cap("Target"), ...spBtns],
      [startBtn, liftBtn, fillBtn, sensBtn, resetBtn],
      [I.cap("Speed"), I.seg([[1, "1×"], [10, "10×"], [30, "30×"]], 10, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });

    // ---------------------------------------------------------------- model
    const m = { t: 0, T: 18, Ts: 18, mass: 1, lifted: false, open: false, btnT: -9, state: "IDLE", lastEdge: null,
                sp: 100, duty: 0, integ: 0, adc: adcOf(18), temp: 18, hist: [], err: "", heat: 0 };
    const log = txt => uart.log(m.t, txt);
    function go(next, why) { if (m.state !== next) { log(`${m.state} → ${next}${why ? "  " + why : ""}`); m.lastEdge = m.state + ">" + next; m.state = next; } }
    function press() { m.btnT = m.t; co.show("btn", 2000); }
    function setpoint(v) { m.sp = v; log(`target = ${v} °C`); if (v < 100) co.show("pid"); }
    function lift() { m.lifted = !m.lifted; co.show("base"); }
    function fill() {
      if (m.mass > 0) { m.mass = 0; log("kettle emptied"); }
      else { m.T = (P.cKettle * m.T + P.cWater * 15) / (P.cKettle + P.cWater); m.mass = 1; log("filled with 1 L of cold water"); }
    }
    function unplug() { m.open = !m.open; co.show("ntc"); }
    function reset() {
      if (m.state !== "FAULT") return;
      const why = check();
      if (why) { log("reset refused: " + why); return; }
      m.err = ""; go("IDLE", "reset");
    }
    function check() {
      if (m.adc >= 4075) return "sensor open";
      if (m.adc <= 20) return "sensor short";
      if (m.temp > P.cut) return "over 110 °C";
      return "";
    }
    let btnPrev = 1, btnCnt = 0, btnState = 1;
    /* The firmware: one pass every 100 ms. */
    function firmware() {
      // inputs
      const pin = m.t - m.btnT < 0.3 ? 0 : 1;              // active low
      if (pin === btnPrev) btnCnt++; else btnCnt = 0;       // debounce: 2 equal reads in a row
      btnPrev = pin;
      let pressed = false;
      if (btnCnt >= 1 && pin !== btnState) { btnState = pin; pressed = pin === 0; }
      const onBase = !m.lifted;
      m.adc = m.open ? 4095 : Math.max(0, Math.min(4095, adcOf(m.Ts) + Math.round((Math.random() - 0.5) * 4)));
      m.temp = m.adc > 0 && m.adc < 4095 ? tempOf(m.adc) : m.adc ? -99 : 999;
      m.hist.push(m.temp); if (m.hist.length > 100) m.hist.shift();
      // safety first, in every state
      const why = check();
      if (why && m.state !== "FAULT") { m.err = why; m.duty = 0; go("FAULT", why); co.show("fault", 5000); return; }
      if (!onBase && m.state !== "IDLE" && m.state !== "FAULT") { m.duty = 0; go("IDLE", "lifted off the base"); co.show("base"); }
      switch (m.state) {
        case "IDLE":
          m.duty = 0; m.integ = 0;
          if (pressed) {
            if (!onBase) log("button: not on the base, ignored");
            else if (m.sp < 100 && m.temp >= m.sp - 3) go("HOLDING", `already near ${m.sp} °C`);
            else go("HEATING", `target ${m.sp} °C`);
          }
          break;
        case "HEATING":
          m.duty = 1; co.show("heat", 1200);
          if (pressed) { go("IDLE", "button: stop"); break; }
          if (m.sp < 100 && m.temp >= m.sp - 3) { go("HOLDING", `${m.temp.toFixed(1)} °C`); co.show("pid"); break; }
          if (m.sp === 100 && m.temp > 97 && m.hist.length === 100 && m.temp - m.hist[0] < 0.3) { go("IDLE", "boiled"); co.show("boil", 5000); }
          break;
        case "HOLDING": {
          if (pressed) { go("IDLE", "button: stop"); break; }
          if (m.sp === 100) { go("HEATING", "target 100 °C"); break; }
          const e = m.sp - m.temp;
          if (Math.abs(e) < 5) m.integ = Math.max(0, Math.min(0.5, m.integ + P.ki * e * P.tick));
          m.duty = Math.max(0, Math.min(1, P.kp * e + m.integ));
          break;
        }
        case "FAULT":
          m.duty = 0;
          if (pressed) log("button ignored: in FAULT");
          break;
      }
    }
    function physics(dt) {
      m.heat = !m.lifted && m.duty > 0 && (m.t % P.period) / P.period < m.duty ? 1 : 0;
      const C = P.cKettle + P.cWater * m.mass;
      m.T += (m.heat * P.heater - P.loss * (m.T - P.amb)) * dt / C;
      if (m.mass > 0 && m.T > 100) m.T = 100;               // boiling: the extra energy turns water to steam
      if (m.T > 300) m.T = 300;
      const plate = m.lifted ? 25 : m.T;
      m.Ts += (plate - m.Ts) * dt / (m.lifted ? 20 : P.lag);
    }
    function sample() { la.push(m.t, { temp: Math.max(0, Math.min(110, m.temp)), duty: m.lifted ? 0 : m.duty, btn: m.t - m.btnT < 0.3 ? 0 : 1, onBase: m.lifted ? 0 : 1, fault: m.state === "FAULT" ? 1 : 0 }); }

    // ---------------------------------------------------------------- drawing
    function render(now) {
      const lift = kTop();
      dyn.kettle.setAttribute("transform", `translate(0 ${lift})`);
      const top = WY.bot - (WY.bot - WY.full) * m.mass;
      [dyn.water, dyn.hotw].forEach(r => { r.setAttribute("y", top); r.setAttribute("height", Math.max(0, 504 - top)); });
      dyn.hotw.setAttribute("opacity", m.mass ? Math.max(0, Math.min(1, (m.T - 20) / 80)) : 0);
      const hot = m.mass > 0 && m.T > 85;
      dyn.bubs.forEach((b, i) => {
        if (!hot) { b.style.display = "none"; return; }
        const ph = ((now / 1000) * (0.6 + (m.T - 85) / 15) + i / 7) % 1;
        b.style.display = "";
        b.setAttribute("cx", 225 + ((i * 53) % 180) + 4 * Math.sin(now / 200 + i));
        b.setAttribute("cy", 480 - ph * (480 - top - 6));
      });
      dyn.steam.style.display = m.mass > 0 && m.T >= 99.5 ? "" : "none";
      cls(dyn.elem, "elem" + (m.T > P.cut ? " over" : m.heat ? " on" : ""));
      cls(dyn.ntc, "ntc" + (m.open ? " open" : ""));
      cls(dyn.sw, "sw" + (m.lifted ? "" : " on"));
      cls(dyn.swW, "w" + (m.lifted ? "" : " on"));
      cls(dyn.btnW, "w" + (m.t - m.btnT < 0.3 ? " on" : ""));
      cls(dyn.btn, "btnc" + (m.t - m.btnT < 0.3 ? " on" : ""));
      cls(dyn.adcW, "w on");
      cls(dyn.heatW, "w" + (m.heat ? " on" : "")); cls(dyn.pwrW, "w bus" + (m.heat ? " on" : "")); cls(dyn.rly, "rly" + (m.heat ? " on" : ""));
      dyn.disp.textContent = m.state === "FAULT" ? "Err" : m.temp.toFixed(0).padStart(3, " ") + " °C";
      cls(dyn.disp, "disp" + (m.state === "FAULT" ? " bad" : ""));
      spBtns.forEach((b, i) => b.classList.toggle("lit", [70, 80, 100][i] === m.sp));
      liftBtn.textContent = m.lifted ? "Put it back" : "Lift kettle";
      fillBtn.textContent = m.mass ? "Pour out" : "Fill up";
      sensBtn.textContent = m.open ? "Plug sensor in" : "Unplug sensor";
      resetBtn.disabled = m.state !== "FAULT";
      sm.set(m.state, m.lastEdge);
      co.update(now, labels);
      const kk = I.k, v = I.v, bad = m.state === "FAULT";
      ram.set([
        `${kk("uint16_t ")}adc_raw  = ${v(m.adc, bad && m.err.startsWith("sensor") ? "bad" : "v")}`,
        `${kk("int16_t  ")}temp_c10 = ${v(m.temp > 500 || m.temp < -50 ? "invalid" : Math.round(m.temp * 10))}  ${kk("(0.1 °C)")}`,
        `${kk("uint8_t  ")}target   = ${v(m.sp)}`,
        `${kk("float    ")}duty     = ${v(m.duty.toFixed(2))}  ${kk("integ")} ${v(m.integ.toFixed(2))}`,
        `${kk("bool     ")}on_base  = ${v(m.lifted ? 0 : 1)}  ${kk("heat")} ${v(m.heat)}`,
        `${kk("float    ")}rise_10s = ${v(m.hist.length ? (m.temp - m.hist[0]).toFixed(2) : "–")}`,
        `${kk("char*    ")}fault    = ${m.err ? v('"' + m.err + '"', "bad") : v("NULL")}`]);
      uart.render();
      la.draw(m.t);
    }
    I.loop({ tick: P.tick, speed: () => speed, every: 2, step(dt) { m.t += dt; firmware(); physics(dt); }, sample, render });
    box._demo = { m, press, setpoint, lift, fill, unplug, reset, setSpeed: v => { speed = v; }, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("kettle", mount, CSS);
})();
