/* Look inside an elevator (inside/elevator.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget elevator"></div>
 *
 * Inputs: hall call buttons (GPIO, interrupt), one floor sensor per floor (active low: a magnet on the car
 *   pulls the output low), the travelling cable (car buttons, door-closed switch, light curtain, door motor),
 *   an emergency stop (interrupt), and a motor encoder counted by a timer.
 * Outputs: motor PWM to a motor driver, brake release (a MOSFET drives the coil; no power = brake on).
 * Firmware: a switch-based state machine run every 10 ms: IDLE, MOVING, DOOR_OPENING, DOOR_OPEN,
 *   DOOR_CLOSING, E_STOP. Calls are one bit per floor. The car keeps its direction while calls remain ahead
 *   and stops on the way only when there is room to stop. It may move only while the door switch reads closed.
 * Motion (illustrative numbers): top speed 0.5 floors/s, acceleration 0.5 floors/s², speed profile
 *   v = min(vmax, sqrt(2 a d)) with a crawl speed for levelling. Doors take 1.2 s and stay open 2 s.
 * The analyzer draws the PWM with a 0.2 s period so the duty cycle is visible; a real drive runs at kHz.
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .elevator .slab{stroke:var(--muted);stroke-width:3;stroke-linecap:round}
  .elevator .car{fill:var(--bg);stroke:var(--fg);stroke-width:1.8}
  .elevator .inner{fill:var(--accent-soft)}
  .elevator .door{fill:var(--code-bg);stroke:var(--muted);stroke-width:1}
  .elevator .rope{stroke:var(--muted);stroke-width:1.2}
  .elevator .hb{fill:var(--bg);stroke:var(--muted);stroke-width:1.5;cursor:pointer;transition:all .15s}
  .elevator .hb:hover{stroke:var(--accent)}
  .elevator .hb.lit{fill:var(--accent);stroke:var(--accent)}
  .elevator .sens{fill:var(--bg);stroke:var(--muted);stroke-width:1}
  .elevator .sens.on{fill:var(--accent);stroke:var(--accent)}
  .elevator .mag{fill:var(--warn)}
  .elevator .beam{stroke:var(--bad);stroke-width:1.4;stroke-dasharray:3 3}
  .elevator .beam.cut{stroke-width:3;stroke-dasharray:none}
  .elevator .estop{fill:var(--bad);stroke:none;cursor:pointer}
  .elevator .estop.hit{fill:var(--bad-soft);stroke:var(--bad);stroke-width:2.5}
  .elevator .brk{fill:var(--bad-soft);stroke:var(--bad);stroke-width:1.2}
  .elevator .brk.off{fill:var(--good-soft);stroke:var(--good)}
  .elevator .person{fill:none;stroke:var(--warn);stroke-width:2.4;stroke-linecap:round}`;

  const W = 1200, H = 640, FLOORS = 4;
  const fy = f => 540 - 120 * f;                  // floor level (car bottom), f may be fractional
  const CAR = { x: 240, w: 100, h: 90 };
  const CHIP = { x: 640, y: 200, w: 160, h: 240 };
  const CARD = { x: 840, y: 16, w: 350, h: 608 };
  const P = { vmax: 0.5, acc: 0.5, crawl: 0.05, lag: 0.15, door: 1 / 1.2, hold: 2000, brakeMs: 300, tick: 0.01 };
  const SX = CARD.x + 22, SX2 = CARD.x + 208, SW = 120, RX = CARD.x + CARD.w - 20;

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "An elevator shaft wired to a microcontroller, and the firmware inside it" });
    const dyn = {};

    // ---- shaft and floors
    s.append(S("rect", { class: "wall", x: 230, y: 90, width: 120, height: 500 }));
    for (let f = 0; f < FLOORS; f++) {
      const y = fy(f);
      s.append(S("line", { class: "slab", x1: 170, x2: 230, y1: y, y2: y }), S("line", { class: "slab", x1: 350, x2: 440, y1: y, y2: y }));
      s.append(S("text", { class: "t big end", x: 440, y: y - 8 }, String(f)));
    }
    dyn.sensW = S("path", { class: "w bus", d: `M200 ${fy(3) - 14} V604 H600 V330 H${CHIP.x - 10}` });
    s.append(dyn.sensW);
    dyn.sens = [];
    for (let f = 0; f < FLOORS; f++) {
      const y = fy(f) - 14;
      s.append(S("path", { class: "w", d: `M224 ${y} H200` }));
      const r = S("rect", { class: "sens", x: 224, y: y - 6, width: 8, height: 12, rx: 2 });
      dyn.sens.push(r); s.append(r);
    }
    dyn.callW = S("path", { class: "w bus", d: `M470 ${fy(0) - 50} V230 H${CHIP.x - 10}` });
    s.append(dyn.callW);
    dyn.hb = [];
    for (let f = 0; f < FLOORS; f++) {
      const y = fy(f) - 50;
      s.append(S("rect", { class: "box", x: 382, y: y - 15, width: 22, height: 30, rx: 4 }), S("path", { class: "w", d: `M404 ${y} H470` }));
      const c = S("circle", { class: "hb", cx: 393, cy: y, r: 6.5, tabindex: 0, role: "button", "aria-label": "call button, floor " + f });
      c.addEventListener("click", () => call(f, "hall"));
      c.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); call(f, "hall"); } });
      dyn.hb.push(c); s.append(c);
    }
    // machine room
    s.append(S("line", { class: "slab", x1: 230, x2: 350, y1: 90, y2: 90 }));
    dyn.brk = S("rect", { class: "brk", x: 245, y: 45, width: 20, height: 20, rx: 3 });
    s.append(dyn.brk, S("line", { class: "rope", x1: 265, x2: 272, y1: 55, y2: 55 }));
    s.append(S("circle", { class: "box", cx: 290, cy: 55, r: 18 }), S("text", { class: "t b mid", x: 290, y: 59 }, "M"));
    s.append(S("text", { class: "t s mid", x: 255, y: 82 }, "brake"), S("text", { class: "t s", x: 296, y: 33 }, "enc"));
    s.append(S("rect", { class: "box", x: 420, y: 96, width: 92, height: 28, rx: 5 }), S("text", { class: "t s mid", x: 466, y: 114 }, "motor driver"));
    dyn.drvW = S("path", { class: "w", d: "M420 110 H330 V55 H308" });
    dyn.pwmW = S("path", { class: "w", d: `M680 ${CHIP.y - 10} V110 H512` });
    dyn.encW = S("path", { class: "w", d: `M720 ${CHIP.y - 10} V24 H290 V37` });
    dyn.brkW = S("path", { class: "w", d: `M760 ${CHIP.y - 10} V10 H255 V45` });
    dyn.rope = S("line", { class: "rope", x1: 290, x2: 290, y1: 73 });
    dyn.cable = S("path", { class: "w bus" });
    s.append(dyn.drvW, dyn.pwmW, dyn.encW, dyn.brkW, dyn.rope, dyn.cable);
    // the car
    const car = S("g");
    car.append(S("rect", { class: "car", x: CAR.x, y: 0, width: CAR.w, height: CAR.h, rx: 3 }));
    car.append(S("rect", { class: "inner", x: CAR.x + 7, y: 8, width: CAR.w - 14, height: CAR.h - 10 }));
    dyn.person = S("path", { class: "person", d: "M290 26 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M290 31 V58 M290 38 L279 49 M290 38 L301 49 M290 58 L281 78 M290 58 L299 78" });
    dyn.dl = S("rect", { class: "door", x: CAR.x + 7, y: 8, height: CAR.h - 10 });
    dyn.dr = S("rect", { class: "door", y: 8, height: CAR.h - 10 });
    dyn.beam = S("line", { class: "beam", x1: CAR.x + 4, x2: CAR.x + CAR.w - 4, y1: CAR.h - 18, y2: CAR.h - 18 });
    car.append(dyn.person, dyn.dl, dyn.dr, dyn.beam, S("rect", { class: "mag", x: CAR.x - 6, y: CAR.h - 20, width: 6, height: 12, rx: 1 }));
    dyn.car = car; s.append(car);
    // emergency stop and the chip
    s.append(S("path", { class: "w", d: `M720 ${CHIP.y + CHIP.h + 10} V488` }));
    dyn.estop = S("circle", { class: "estop", cx: 720, cy: 500, r: 13, tabindex: 0, role: "button", "aria-label": "emergency stop" });
    dyn.estop.addEventListener("click", () => estop());
    s.append(S("rect", { class: "box", x: 708, y: 512, width: 24, height: 9, rx: 2 }), S("text", { class: "t s mid", x: 720, y: 536 }, "E-stop"));
    I.chip(s, { ...CHIP, sub: "loop every 10 ms", labelAt: [735, 300],
      left: [[230, "CALL[3:0]"], [330, "FLOOR[3:0]"], [380, "CAR I/O"]], top: [[680, "PWM"], [720, "ENC"], [760, "BRK"]], bottom: [[720, "ESTOP"]] });

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 46, title: "STATE MACHINE · switch (state)", lessons: [56] });
    const sm = I.stateMachine(s, {
      w: SW, stop: ["E_STOP"],
      states: { IDLE: [SX, 74], MOVING: [SX2, 74], DOOR_CLOSING: [SX, 140], DOOR_OPENING: [SX2, 140], E_STOP: [SX, 206], DOOR_OPEN: [SX2, 206] },
      paths: {
        "IDLE>MOVING": `M${SX + SW} 88 H${SX2 - 2}`, "DOOR_CLOSING>DOOR_OPENING": `M${SX + SW} 154 H${SX2 - 2}`,
        "MOVING>DOOR_OPENING": `M${SX2 + 90} 102 V138`, "DOOR_OPENING>DOOR_OPEN": `M${SX2 + 90} 168 V204`,
        "DOOR_OPEN>DOOR_CLOSING": `M${SX2} 220 L${SX + 100} 170`, "DOOR_CLOSING>IDLE": `M${SX + 24} 140 V104`,
        "IDLE>DOOR_OPENING": `M${SX + 100} 102 L${SX2 + 24} 138` },
      labels: [["call", (SX + SW + SX2) / 2, 83, "mid"], ["beam cut", (SX + SW + SX2) / 2, 149, "mid"], ["arrived", SX2 + 84, 124, "end"],
               ["opened", SX2 + 84, 190, "end"], ["closed", SX + 30, 124, ""], ["2 s", SX + 160, 205, ""]] });
    s.append(S("text", { class: "t s", x: SX, y: 254 }, "the E-stop interrupt forces E_STOP from any state"));
    I.section(s, { x: SX, x2: RX, y: 296, title: "RAM", lessons: [20], sep: true });
    const ram = I.ram(s, SX, 320);
    I.section(s, { x: SX, x2: RX, y: 486, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 508, empty: "waiting for a call…" });

    // ---- callouts and hover areas
    const co = I.callouts(s, [
      ["call", 482, 246, 150, "Call buttons", ["GPIO inputs. A press fires", "an interrupt that sets", "one bit in calls."], [52, 57], [470, 290]],
      ["pwm", 482, 132, 150, "Motor PWM", ["Duty cycle ramps up and", "down for a smooth ride."], [59, 12], [560, 110]],
      ["brake", 330, 30, 146, "Brake", ["A MOSFET powers the coil.", "No power = brake on."], [12, 14], [330, 10]],
      ["enc", 482, 30, 150, "Encoder", ["A timer counts its pulses:", "position between floors."], [71], [560, 24]],
      ["estop", 520, 556, 150, "Emergency stop", ["Highest-priority interrupt:", "PWM off, brake on, at once."], [57, 72], [707, 500]],
      ["floor", 8, 282, 155, "Floor sensors", ["Active-low GPIO inputs.", "The car's magnet pulls", "one to 0 at its floor."], [16, 52], [200, 330]],
      ["door", 8, 398, 155, "Door switch", ["The motor may run only", "while it reads closed.", "Real lifts also wire this", "in hardware."], [112, 84], () => [CAR.x, carTop() + 40]],
      ["beam", 8, 530, 155, "Light curtain", ["Beam cut while closing:", "the doors open again."], [112], () => [CAR.x + 6, carTop() + CAR.h - 18]]]);
    s.append(
      co.hot(I.hotspot({ x: 378, y: 140, width: 100, height: 380 }), "call"),
      co.hot(I.hotspot({ x: 192, y: 160, width: 44, height: 450 }), "floor"),
      co.hot(I.hotspot({ x: 418, y: 92, width: 270, height: 36 }), "pwm"),
      co.hot(I.hotspot({ x: 240, y: 38, width: 30, height: 34 }), "brake"),
      co.hot(I.hotspot({ x: 272, y: 30, width: 40, height: 44 }), "enc"),
      co.hot(dyn.estop, "estop"));
    dyn.hb.forEach(c => s.append(c));                  // call buttons above their hover area
    car.append(co.hot(I.hotspot({ x: CAR.x, y: 0, width: CAR.w, height: CAR.h }), "door"));
    co.raise();

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 8, note: "PWM drawn with a 0.2 s period so the duty cycle is visible", lanes: [
      { name: "FLOOR", kind: "in · active low", key: "floorPin" }, { name: "DOOR_CLOSED", kind: "in", key: "doorClosed" },
      { name: "BEAM_CUT", kind: "in", key: "beam" }, { name: "MOTOR_PWM", kind: "PWM out", key: "pwm", type: "pwm", period: 0.2, cls: "pwm" },
      { name: "BRAKE_RELEASE", kind: "out", key: "brakeOut" }, { name: "ESTOP", kind: "in · IRQ", key: "estopIn", cls: "bad" }] });
    const carBtns = [0, 1, 2, 3].map(f => I.pill(String(f), () => call(f, "car"), "car button " + f));
    const walkBtn = I.btn("Step into the doorway", walk), resetBtn = I.btn("Reset", reset);
    let speed = 1, labels = "auto";
    I.frame(box, { scene: s, analyzer: la, bar: [
      [I.cap("Car"), ...carBtns],
      [walkBtn, I.btn("Emergency stop", estop, "stop"), resetBtn],
      [I.cap("Speed"), I.seg([[0.4, "½×"], [1, "1×"], [2.5, "2.5×"]], 1, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });

    // ---------------------------------------------------------------- model
    const m = { p: 0, v: 0, door: 0, state: "IDLE", calls: 0, dir: 1, target: 0, duty: 0, brakeOut: 0, doorMotor: 0,
                hold: 0, moveMs: 0, person: 0, estopIn: 0, lastEdge: null, t: 0, prevFloor: null };
    const carTop = () => fy(m.p) - CAR.h;
    const atFloor = f => Math.abs(m.p - f) < 0.03;
    const floorPins = () => [0, 1, 2, 3].map(f => atFloor(f) ? 0 : 1);
    const doorClosed = () => m.door < 0.005;
    const beam = () => m.person > 0 && m.door > 0.05;
    const log = txt => uart.log(m.t, txt);
    function go(next, why) { if (m.state !== next) { log(`${m.state} → ${next}${why ? "  " + why : ""}`); m.lastEdge = m.state + ">" + next; m.state = next; } }
    function call(f, where = "car") {
      if (m.state === "E_STOP") { log("call ignored: E-stop active, press Reset"); return; }
      if (!(m.calls >> f & 1)) log(`irq: ${where} button ${f}, calls |= 1 << ${f}`);
      m.calls |= 1 << f; co.show("call");
    }
    function walk() {
      if (m.door < 0.05) { log("doors closed: nobody can step in"); return; }
      m.person = 2500; co.show("beam");
    }
    function estop() {
      if (m.state === "E_STOP") return;
      m.estopIn = 1; m.duty = 0; m.brakeOut = 0; m.doorMotor = 0;
      log("irq: ESTOP, pwm = 0, brake on");
      go("E_STOP"); co.show("estop"); co.show("brake");
    }
    function reset() {
      if (m.state !== "E_STOP") return;
      m.estopIn = 0;
      const near = Math.round(m.p);
      if (!atFloor(near)) { m.calls |= 1 << near; m.dir = near > m.p ? 1 : -1; log(`reset: between floors, level at ${near}`); }
      go("IDLE");
    }
    function nextTarget() {
      const above = [0, 1, 2, 3].filter(f => (m.calls >> f & 1) && f > m.p + 0.01);
      const below = [0, 1, 2, 3].filter(f => (m.calls >> f & 1) && f < m.p - 0.01).reverse();
      if (m.dir > 0) { if (above.length) return [above[0], 1]; if (below.length) return [below[0], -1]; }
      else { if (below.length) return [below[0], -1]; if (above.length) return [above[0], 1]; }
      return [Math.round(m.p), m.dir];
    }
    /* The firmware: one pass every 10 ms. */
    function firmware() {
      const here = Math.round(m.p), level = atFloor(here);
      switch (m.state) {
        case "IDLE":
          m.duty = 0; m.brakeOut = 0; m.doorMotor = 0;
          if (level && (m.calls >> here & 1)) { m.calls &= ~(1 << here); go("DOOR_OPENING", `call ${here}, already here`); break; }
          if (m.calls) {
            if (!doorClosed()) { co.show("door"); break; }
            [m.target, m.dir] = nextTarget(); m.moveMs = 0;
            go("MOVING", `target ${m.target}`); co.show("door"); co.show("brake");
          }
          break;
        case "MOVING": {
          const [t] = nextTarget();
          const stopDist = m.v * m.v / (2 * P.acc);
          if (t !== m.target && Math.sign(t - m.p) === m.dir && Math.abs(t - m.p) > stopDist + 0.02 && Math.abs(t - m.p) < Math.abs(m.target - m.p)) { m.target = t; log(`stop on the way at ${t}`); }
          m.moveMs += 10; m.brakeOut = 1;
          if (m.moveMs < P.brakeMs) { m.duty = 0; break; }               // wait for the brake to lift
          const d = (m.target - m.p) * m.dir;
          if (d <= 0.004 && atFloor(m.target)) {
            m.duty = 0; m.brakeOut = 0; m.p = m.target; m.v = 0;
            m.calls &= ~(1 << m.target);
            go("DOOR_OPENING", `floor ${m.target} sensor = 0`); co.show("floor"); co.show("brake");
            break;
          }
          const want = Math.max(P.crawl, Math.min(P.vmax, Math.sqrt(2 * P.acc * Math.max(0, d))));
          const prev = m.duty;
          m.duty = Math.min(want / P.vmax, prev + P.acc * P.tick / P.vmax);   // ramp no faster than acc
          if (Math.abs(m.duty - prev) > 0.004) co.show("pwm", 1500);
          break;
        }
        case "DOOR_OPENING":
          m.doorMotor = 1;
          if (m.door >= 1) { m.doorMotor = 0; m.hold = P.hold; go("DOOR_OPEN", "hold 2 s"); }
          break;
        case "DOOR_OPEN":
          m.doorMotor = 0;
          if (m.calls >> here & 1) { m.calls &= ~(1 << here); m.hold = P.hold; }
          if (beam()) m.hold = P.hold;
          m.hold -= 10;
          if (m.hold <= 0) go("DOOR_CLOSING");
          break;
        case "DOOR_CLOSING":
          m.doorMotor = -1;
          if (beam()) { go("DOOR_OPENING", "beam cut"); co.show("beam"); break; }
          if (doorClosed()) { m.doorMotor = 0; m.door = 0; go("IDLE", "door switch closed"); co.show("door"); }
          break;
        case "E_STOP":
          m.duty = 0; m.brakeOut = 0; m.doorMotor = 0;
          break;
      }
    }
    function physics(dt) {
      const vCmd = m.brakeOut ? m.dir * m.duty * P.vmax : 0;
      if (m.brakeOut) m.v += (vCmd - m.v) * Math.min(1, dt / P.lag);
      else { const dv = 3 * dt; m.v = Math.abs(m.v) <= dv ? 0 : m.v - Math.sign(m.v) * dv; }
      m.p = Math.max(0, Math.min(FLOORS - 1, m.p + m.v * dt));
      m.door = Math.max(0, Math.min(1, m.door + m.doorMotor * P.door * dt));
      if (m.person > 0) m.person -= dt * 1000;
    }
    function sample() {
      const sig = { floorPin: floorPins().every(v => v) ? 1 : 0, doorClosed: doorClosed() ? 1 : 0, beam: beam() ? 1 : 0, pwm: m.duty, brakeOut: m.brakeOut, estopIn: m.estopIn };
      if (m.prevFloor !== null && sig.floorPin !== m.prevFloor) co.show("floor", 2500);
      if (Math.abs(m.v) > 0.01) co.show("enc", 600);
      m.prevFloor = sig.floorPin;
      la.push(m.t, sig);
    }
    function render(now) {
      const cb = fy(m.p), ct = cb - CAR.h;
      dyn.car.setAttribute("transform", `translate(0 ${ct})`);
      dyn.rope.setAttribute("y2", ct);
      dyn.cable.setAttribute("d", `M330 ${cb} C330 ${cb + 30} 365 ${(cb + 590) / 2} 365 570 V590 H570 V380 H${CHIP.x - 10}`);
      const half = (CAR.w - 14) / 2, open = m.door * (half - 3);
      dyn.dl.setAttribute("width", half - open); dyn.dr.setAttribute("x", CAR.x + 7 + half + open); dyn.dr.setAttribute("width", half - open);
      dyn.person.style.display = m.person > 0 && m.door > 0.05 ? "" : "none";
      cls(dyn.beam, "beam" + (beam() ? " cut" : ""));
      dyn.beam.style.display = m.door > 0.02 ? "" : "none";
      const pins = floorPins();
      dyn.sens.forEach((r, f) => cls(r, "sens" + (pins[f] ? "" : " on")));
      cls(dyn.sensW, "w bus" + (pins.every(v => v) ? "" : " on"));
      dyn.hb.forEach((c, f) => cls(c, "hb" + (m.calls >> f & 1 ? " lit" : "")));
      carBtns.forEach((b, f) => b.classList.toggle("lit", !!(m.calls >> f & 1)));
      cls(dyn.callW, "w bus" + (m.calls ? " on" : ""));
      const run = m.duty > 0;
      cls(dyn.pwmW, "w" + (run ? " on" : "")); cls(dyn.drvW, "w" + (run ? " on" : ""));
      cls(dyn.encW, "w" + (Math.abs(m.v) > 0.01 ? " on" : ""));
      cls(dyn.brkW, "w" + (m.brakeOut ? " on" : ""));
      cls(dyn.brk, "brk" + (m.brakeOut ? " off" : ""));
      cls(dyn.cable, "w bus" + (m.doorMotor || beam() ? " on" : ""));
      cls(dyn.estop, "estop" + (m.estopIn ? " hit" : ""));
      sm.set(m.state, m.lastEdge);
      walkBtn.disabled = m.door < 0.05; resetBtn.disabled = m.state !== "E_STOP";
      co.update(now, labels);
      const k = I.k, v = I.v;
      ram.set([
        `${k("uint8_t ")}calls       = ${I.bits(m.calls, 4)}`,
        `${k("float   ")}floor       = ${v(m.p.toFixed(2))}`,
        `${k("int     ")}target      = ${v(m.state === "MOVING" ? m.target : "–")}  ${k("dir")} ${v(m.dir > 0 ? "UP" : "DOWN")}`,
        `${k("int32_t ")}enc         = ${v(Math.round(m.p * 2048))}`,
        `${k("uint8_t ")}duty        = ${v(Math.round(m.duty * 100) + " %")}`,
        `${k("uint8_t ")}floor_pins  = ${I.bits(pins.reduce((a, b, i) => a | b << i, 0), 4, 0)}`,
        `${k("bool    ")}door_closed = ${v(doorClosed() ? 1 : 0)}  ${k("beam")} ${v(beam() ? 1 : 0)}`]);
      uart.render();
      la.draw(m.t);
    }
    I.loop({ tick: P.tick, speed: () => speed, every: 2, step(dt) { m.t += dt; firmware(); physics(dt); }, sample, render });
    box._demo = { m, call, walk, estop, reset, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("elevator", mount, CSS);
})();
