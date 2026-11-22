/* Look inside an elevator (inside/elevator.html). Load after course.js.
 *
 *   <div class="widget elevator"></div>
 *
 * A toolbar, one scene and a logic analyzer. The scene has the shaft and its parts, the MCU with its pins,
 * and a card that opens up the firmware: the state machine, the variables in RAM and a UART log.
 * Callout cards with a leader line explain a part. "Auto" shows a callout when its signal changes or when
 * the pointer is over the part; "All" shows every callout; "Off" hides them.
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
  const NS = "http://www.w3.org/2000/svg";
  const CSS = `
  .ev{padding:0;overflow:hidden}
  .ev svg{display:block;width:100%;height:auto;user-select:none;-webkit-user-select:none}
  .ev .bar{display:flex;flex-wrap:wrap;gap:.6rem 1.2rem;align-items:center;justify-content:space-between;padding:.65rem .9rem;border-bottom:1px solid var(--rule);background:var(--code-bg)}
  .ev .grp{display:inline-flex;gap:.4rem;align-items:center;font-family:var(--sans);font-size:.78rem;color:var(--muted)}
  .ev .cap{font-family:var(--mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 .15rem 0 .3rem}
  .ev .fb{font-family:var(--mono);font-weight:700;font-size:.85rem;width:2.1rem;height:2.1rem;border-radius:50%;border:1px solid var(--rule);background:var(--bg);color:var(--fg);cursor:pointer;transition:all .15s}
  .ev .fb:hover{border-color:var(--accent)}
  .ev .fb.lit{border-color:var(--accent);background:var(--accent);color:var(--bg);box-shadow:0 0 0 3px var(--accent-soft)}
  .ev .act{font-family:var(--sans);font-size:.8rem;font-weight:600;padding:.4rem .75rem;border-radius:6px;border:1px solid var(--rule);background:var(--bg);color:var(--fg);cursor:pointer}
  .ev .act:hover{border-color:var(--accent);color:var(--accent)}
  .ev .act.stop{border-color:var(--bad);color:var(--bad)}
  .ev .act.stop:hover{background:var(--bad);color:var(--bg)}
  .ev .act:disabled{opacity:.4;cursor:default;border-color:var(--rule);color:var(--muted);background:var(--bg)}
  .ev .seg{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden;background:var(--bg)}
  .ev .seg button{font-family:var(--mono);font-size:.72rem;padding:.3rem .55rem;border:0;border-right:1px solid var(--rule);background:none;color:var(--muted);cursor:pointer}
  .ev .seg button:last-child{border-right:0}
  .ev .seg button.on{background:var(--accent-soft);color:var(--accent);font-weight:700}
  .ev .pane{padding:.4rem .6rem}
  .ev .la-head{display:flex;flex-wrap:wrap;gap:.2rem 1rem;justify-content:space-between;align-items:baseline;padding:.55rem .9rem 0;border-top:1px solid var(--rule);font-family:var(--mono);font-size:.7rem;color:var(--muted)}
  .ev .la-head span:first-child{text-transform:uppercase;letter-spacing:.05em}
  .ev .t{fill:var(--fg);font-family:var(--mono);font-size:11px}
  .ev .t.s{font-size:9.5px;fill:var(--muted)}
  .ev .t.b{font-weight:700;font-size:12px}
  .ev .t.h{font-size:10px;fill:var(--muted);letter-spacing:.06em}
  .ev .t.big{font-weight:700;font-size:18px;fill:var(--muted)}
  .ev .t.mid{text-anchor:middle} .ev .t.end{text-anchor:end}
  .ev .w{fill:none;stroke:var(--muted);stroke-opacity:.55;stroke-width:1.4;stroke-linejoin:round;transition:stroke .2s}
  .ev .w.bus{stroke-width:2.6}
  .ev .w.on{stroke:var(--accent);stroke-opacity:1;stroke-width:2.2;stroke-dasharray:7 5;animation:ev-flow .7s linear infinite}
  .ev .w.bus.on{stroke-width:3.2}
  @keyframes ev-flow{to{stroke-dashoffset:-12}}
  @media (prefers-reduced-motion:reduce){.ev .w.on{animation:none;stroke-dasharray:none}}
  .ev .wall{fill:none;stroke:var(--rule);stroke-width:2}
  .ev .slab{stroke:var(--muted);stroke-width:3;stroke-linecap:round}
  .ev .box{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2}
  .ev .chip{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.5}
  .ev .pin{stroke:var(--fg);stroke-width:2}
  .ev .car{fill:var(--bg);stroke:var(--fg);stroke-width:1.8}
  .ev .inner{fill:var(--accent-soft)}
  .ev .door{fill:var(--code-bg);stroke:var(--muted);stroke-width:1}
  .ev .rope{stroke:var(--muted);stroke-width:1.2}
  .ev .hb{fill:var(--bg);stroke:var(--muted);stroke-width:1.5;cursor:pointer;transition:all .15s}
  .ev .hb:hover{stroke:var(--accent)}
  .ev .hb.lit{fill:var(--accent);stroke:var(--accent)}
  .ev .sens{fill:var(--bg);stroke:var(--muted);stroke-width:1}
  .ev .sens.on{fill:var(--accent);stroke:var(--accent)}
  .ev .mag{fill:var(--warn)}
  .ev .beam{stroke:var(--bad);stroke-width:1.4;stroke-dasharray:3 3}
  .ev .beam.cut{stroke-width:3;stroke-dasharray:none}
  .ev .estop{fill:var(--bad);stroke:none;cursor:pointer}
  .ev .estop.hit{fill:var(--bad-soft);stroke:var(--bad);stroke-width:2.5}
  .ev .brk{fill:var(--bad-soft);stroke:var(--bad);stroke-width:1.2}
  .ev .brk.off{fill:var(--good-soft);stroke:var(--good)}
  .ev .person{fill:none;stroke:var(--warn);stroke-width:2.4;stroke-linecap:round}
  .ev .hot{fill:transparent;cursor:help}
  .ev .co{opacity:0;transition:opacity .25s;pointer-events:none}
  .ev .co.show{opacity:1;pointer-events:auto}
  .ev .co rect{fill:var(--bg);stroke:var(--accent);stroke-width:1.2}
  .ev .co .lead{stroke:var(--accent);stroke-width:1;fill:none}
  .ev .co .ld{fill:var(--accent)}
  .ev .co .ct{fill:var(--fg);font-family:var(--sans);font-size:10.5px}
  .ev .co .ch{fill:var(--accent);font-family:var(--mono);font-size:10.5px;font-weight:700}
  .ev .co .cl{fill:var(--muted);font-family:var(--sans);font-size:9.5px}
  .ev .card{fill:var(--bg);stroke:var(--rule);stroke-width:1.2}
  .ev .sep{stroke:var(--rule);stroke-width:1}
  .ev .zoom{stroke:var(--muted);stroke-width:1;stroke-dasharray:3 4;opacity:.5}
  .ev .st rect{fill:var(--code-bg);stroke:var(--rule);stroke-width:1.2;transition:all .2s}
  .ev .st text{fill:var(--muted);font-family:var(--mono);font-size:10px;font-weight:700;text-anchor:middle}
  .ev .st.on rect{fill:var(--accent-soft);stroke:var(--accent);stroke-width:2}
  .ev .st.on text{fill:var(--accent)}
  .ev .st.stop.on rect{fill:var(--bad-soft);stroke:var(--bad)} .ev .st.stop.on text{fill:var(--bad)}
  .ev .arr{fill:none;stroke:var(--muted);stroke-opacity:.6;stroke-width:1.1}
  .ev .arr.on{stroke:var(--accent);stroke-opacity:1;stroke-width:2}
  .ev .var{font-family:var(--mono);font-size:11px;fill:var(--fg)}
  .ev .var .k{fill:var(--muted)} .ev .var .v{fill:var(--accent);font-weight:700}
  .ev .var .b1{fill:var(--accent);font-weight:700} .ev .var .b0{fill:var(--muted)}
  .ev .log{font-family:var(--mono);font-size:10px;fill:var(--muted)}
  .ev .log .new{fill:var(--fg)}
  .ev .lan{stroke:var(--accent);stroke-width:1.5;fill:var(--accent-soft)}
  .ev .lan.pwm{stroke:var(--warn);fill:var(--warn-soft)} .ev .lan.bad{stroke:var(--bad);fill:var(--bad-soft)}
  .ev .grid{stroke:var(--rule);stroke-width:1}
  .ev a tspan{fill:var(--accent);text-decoration:underline}`;

  function S(tag, attrs, text) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function E(tag, attrs, kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "text") el.textContent = attrs[k];
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => el.append(c));
    return el;
  }
  const L = "../lessons/";
  const LESSON = { 12: "0012-mosfets.html", 14: "0014-inductors-motors-and-relays.html", 16: "0016-logic-levels-pull-ups-open.html",
    20: "0020-bitwise-operations-and-masks.html", 52: "0052-gpio-input-and-debouncing.html", 53: "0053-uart-logging.html",
    56: "0056-state-machines.html", 57: "0057-interrupts-in-practice.html", 59: "0059-pwm.html", 71: "0071-timers.html",
    72: "0072-the-nvic.html", 84: "0084-robustness.html", 112: "0112-functional-safety.html" };
  function lessons(parent, x, y, nums, cls, anchor) {
    const t = S("text", { class: cls, x, y, "text-anchor": anchor || "start" });
    t.append(document.createTextNode(nums.length > 1 ? "lessons " : "lesson "));
    nums.forEach((n, i) => {
      const a = S("a", { href: L + LESSON[n] });
      a.append(S("tspan", {}, String(n)));
      t.append(a);
      if (i < nums.length - 1) t.append(document.createTextNode(" · "));
    });
    parent.append(t);
  }

  // ---------------------------------------------------------------- geometry
  const W = 1200, H = 640, FLOORS = 4;
  const fy = f => 540 - 120 * f;                  // floor level (car bottom), f may be fractional
  const CAR = { x: 240, w: 100, h: 90 };
  const CHIP = { x: 640, y: 200, w: 160, h: 240 };
  const CARD = { x: 840, y: 16, w: 350, h: 608 };
  const P = { vmax: 0.5, acc: 0.5, crawl: 0.05, lag: 0.15, door: 1 / 1.2, hold: 2000, brakeMs: 300, tick: 10 };
  const SX = CARD.x + 22, SX2 = CARD.x + 208, SW = 120;
  const STATES = { IDLE: [SX, 74], MOVING: [SX2, 74], DOOR_CLOSING: [SX, 140], DOOR_OPENING: [SX2, 140], E_STOP: [SX, 206], DOOR_OPEN: [SX2, 206] };

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "An elevator shaft wired to a microcontroller, and the firmware inside it" });
    const dyn = {}, hot = [];
    const hotspot = (id, attrs) => { const r = S("rect", Object.assign({ class: "hot" }, attrs)); hot.push([r, id]); return r; };

    // ---- shaft and floors
    s.append(S("rect", { class: "wall", x: 230, y: 90, width: 120, height: 500 }));
    for (let f = 0; f < FLOORS; f++) {
      const y = fy(f);
      s.append(S("line", { class: "slab", x1: 170, x2: 230, y1: y, y2: y }), S("line", { class: "slab", x1: 350, x2: 440, y1: y, y2: y }));
      s.append(S("text", { class: "t big end", x: 440, y: y - 8 }, String(f)));
    }
    // floor sensors (left wall) → bus → under the building → chip
    dyn.sensW = S("path", { class: "w bus", d: `M200 ${fy(3) - 14} V604 H600 V330 H${CHIP.x - 10}` });
    s.append(dyn.sensW);
    dyn.sens = [];
    for (let f = 0; f < FLOORS; f++) {
      const y = fy(f) - 14;
      s.append(S("path", { class: "w", d: `M224 ${y} H200` }));
      const r = S("rect", { class: "sens", x: 224, y: y - 6, width: 8, height: 12, rx: 2 });
      dyn.sens.push(r); s.append(r);
    }
    // hall call buttons (landings) → bus → chip
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
    // machine room: brake, motor with encoder, driver
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
    s.append(dyn.drvW, dyn.pwmW, dyn.encW, dyn.brkW);
    dyn.rope = S("line", { class: "rope", x1: 290, x2: 290, y1: 73 });
    dyn.cable = S("path", { class: "w bus" });
    s.append(dyn.rope, dyn.cable);
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
    // emergency stop under the chip
    s.append(S("path", { class: "w", d: `M720 ${CHIP.y + CHIP.h + 10} V488` }));
    dyn.estop = S("circle", { class: "estop", cx: 720, cy: 500, r: 13, tabindex: 0, role: "button", "aria-label": "emergency stop" });
    dyn.estop.addEventListener("click", () => estop());
    s.append(S("rect", { class: "box", x: 708, y: 512, width: 24, height: 9, rx: 2 }), dyn.estop, S("text", { class: "t s mid", x: 720, y: 536 }, "E-stop"));
    // the chip and its pins
    s.append(S("rect", { class: "chip", x: CHIP.x, y: CHIP.y, width: CHIP.w, height: CHIP.h, rx: 8 }));
    [[230, "CALL[3:0]"], [330, "FLOOR[3:0]"], [380, "CAR I/O"]].forEach(([y, n]) =>
      s.append(S("line", { class: "pin", x1: CHIP.x - 10, x2: CHIP.x, y1: y, y2: y }), S("text", { class: "t s", x: CHIP.x + 8, y: y + 3 }, n)));
    [[680, "PWM"], [720, "ENC"], [760, "BRK"]].forEach(([x, n]) =>
      s.append(S("line", { class: "pin", x1: x, x2: x, y1: CHIP.y - 10, y2: CHIP.y }), S("text", { class: "t s mid", x, y: CHIP.y + 16 }, n)));
    s.append(S("line", { class: "pin", x1: 720, x2: 720, y1: CHIP.y + CHIP.h, y2: CHIP.y + CHIP.h + 10 }), S("text", { class: "t s mid", x: 720, y: CHIP.y + CHIP.h - 8 }, "ESTOP"));
    s.append(S("text", { class: "t b mid", x: 735, y: 300 }, "MCU"), S("text", { class: "t s mid", x: 735, y: 316 }, "loop every 10 ms"));

    // ---- firmware card (a zoom into the chip)
    s.append(S("line", { class: "zoom", x1: CHIP.x + CHIP.w, y1: CHIP.y, x2: CARD.x, y2: CARD.y + 30 }), S("line", { class: "zoom", x1: CHIP.x + CHIP.w, y1: CHIP.y + CHIP.h, x2: CARD.x, y2: CARD.y + CARD.h - 30 }));
    s.append(S("rect", { class: "card", x: CARD.x, y: CARD.y, width: CARD.w, height: CARD.h, rx: 10 }));
    s.append(S("text", { class: "t h", x: SX, y: 46 }, "STATE MACHINE · switch (state)"));
    lessons(s, CARD.x + CARD.w - 20, 46, [56], "t s", "end");
    const defs = S("defs"), mk = S("marker", { id: "ev-arr", viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 5, markerHeight: 5, orient: "auto" });
    mk.append(S("path", { d: "M0 0 L8 4 L0 8 z", fill: "var(--muted)" })); defs.append(mk); s.append(defs);
    const PATHS = {
      "IDLE>MOVING": `M${SX + SW} 88 H${SX2 - 2}`,
      "DOOR_CLOSING>DOOR_OPENING": `M${SX + SW} 154 H${SX2 - 2}`,
      "MOVING>DOOR_OPENING": `M${SX2 + 90} 102 V138`,
      "DOOR_OPENING>DOOR_OPEN": `M${SX2 + 90} 168 V204`,
      "DOOR_OPEN>DOOR_CLOSING": `M${SX2} 220 L${SX + 100} 170`,
      "DOOR_CLOSING>IDLE": `M${SX + 24} 140 V104`,
      "IDLE>DOOR_OPENING": `M${SX + 100} 102 L${SX2 + 24} 138` };
    dyn.arrows = {};
    for (const k in PATHS) { const p = S("path", { class: "arr", d: PATHS[k], "marker-end": "url(#ev-arr)" }); dyn.arrows[k] = p; s.append(p); }
    [["call", (SX + SW + SX2) / 2, 83, "mid"], ["beam cut", (SX + SW + SX2) / 2, 149, "mid"], ["arrived", SX2 + 84, 124, "end"],
     ["opened", SX2 + 84, 190, "end"], ["closed", SX + 30, 124, ""], ["2 s", SX + 160, 205, ""]]
      .forEach(([t, x, y, a]) => s.append(S("text", { class: "t s" + (a ? " " + a : ""), x, y }, t)));
    dyn.st = {};
    for (const n in STATES) {
      const [x, y] = STATES[n];
      const g = S("g", { class: "st" + (n === "E_STOP" ? " stop" : "") });
      g.append(S("rect", { x, y, width: SW, height: 28, rx: 6 }), S("text", { x: x + SW / 2, y: y + 18 }, n));
      dyn.st[n] = g; s.append(g);
    }
    s.append(S("text", { class: "t s", x: SX, y: 254 }, "the E-stop interrupt forces E_STOP from any state"));
    s.append(S("line", { class: "sep", x1: CARD.x + 14, x2: CARD.x + CARD.w - 14, y1: 272, y2: 272 }));
    s.append(S("text", { class: "t h", x: SX, y: 296 }, "RAM"));
    lessons(s, CARD.x + CARD.w - 20, 296, [20], "t s", "end");
    dyn.vars = S("g", { class: "var" }); s.append(dyn.vars);
    s.append(S("line", { class: "sep", x1: CARD.x + 14, x2: CARD.x + CARD.w - 14, y1: 462, y2: 462 }));
    s.append(S("text", { class: "t h", x: SX, y: 486 }, "UART LOG"));
    lessons(s, CARD.x + CARD.w - 20, 486, [53], "t s", "end");
    dyn.log = S("g", { class: "log" }); s.append(dyn.log);

    // ---- hover areas
    s.append(
      hotspot("call", { x: 378, y: 140, width: 100, height: 380 }),
      hotspot("floor", { x: 192, y: 160, width: 44, height: 450 }),
      hotspot("pwm", { x: 418, y: 92, width: 270, height: 36 }),
      hotspot("brake", { x: 240, y: 38, width: 30, height: 34 }),
      hotspot("enc", { x: 272, y: 30, width: 40, height: 44 }),
      hotspot("estop", { x: 700, y: 482, width: 40, height: 46 }));
    car.append(hotspot("door", { x: CAR.x, y: 0, width: CAR.w, height: CAR.h }));
    hot.forEach(([el, id]) => {
      el.addEventListener("pointerenter", () => hover(id, true));
      el.addEventListener("pointerleave", () => hover(id, false));
    });
    dyn.estop.parentNode.append(dyn.estop);        // keep the button clickable above its hover area

    // ---- callouts: [id, box x, y, w, title, lines, lessons, target]
    const CO = [
      ["call", 482, 246, 150, "Call buttons", ["GPIO inputs. A press fires", "an interrupt that sets", "one bit in calls."], [52, 57], [470, 290]],
      ["pwm", 482, 132, 150, "Motor PWM", ["Duty cycle ramps up and", "down for a smooth ride."], [59, 12], [560, 110]],
      ["brake", 330, 30, 146, "Brake", ["A MOSFET powers the coil.", "No power = brake on."], [12, 14], [330, 10]],
      ["enc", 482, 30, 150, "Encoder", ["A timer counts its pulses:", "position between floors."], [71], [560, 24]],
      ["estop", 520, 556, 150, "Emergency stop", ["Highest-priority interrupt:", "PWM off, brake on, at once."], [57, 72], [707, 500]],
      ["floor", 8, 282, 155, "Floor sensors", ["Active-low GPIO inputs.", "The car's magnet pulls", "one to 0 at its floor."], [16, 52], [200, 330]],
      ["door", 8, 398, 155, "Door switch", ["The motor may run only", "while it reads closed.", "Real lifts also wire this", "in hardware."], [112, 84], () => [CAR.x, carTop() + 40]],
      ["beam", 8, 530, 155, "Light curtain", ["Beam cut while closing:", "the doors open again."], [112], () => [CAR.x + 6, carTop() + CAR.h - 18]]];
    const co = {};
    CO.forEach(([id, x, y, w, title, lines, les, target]) => {
      const g = S("g", { class: "co" }), h = 34 + lines.length * 13;
      const lead = S("line", { class: "lead" }), dot = S("circle", { class: "ld", r: 3 });
      g.append(lead, dot, S("rect", { x, y, width: w, height: h, rx: 6 }), S("text", { class: "ch", x: x + 8, y: y + 15 }, title));
      lines.forEach((l, i) => g.append(S("text", { class: "ct", x: x + 8, y: y + 29 + i * 13 }, l)));
      lessons(g, x + 8, y + h - 8, les, "cl", "start");
      s.append(g);
      co[id] = { g, lead, dot, box: [x, y, w, h], target, until: 0, hover: false };
    });
    function placeLead(c) {
      const [tx, ty] = typeof c.target === "function" ? c.target() : c.target;
      const [x, y, w, h] = c.box;
      const cx = Math.max(x, Math.min(x + w, tx)), cy = Math.max(y, Math.min(y + h, ty));
      c.lead.setAttribute("x1", cx); c.lead.setAttribute("y1", cy); c.lead.setAttribute("x2", tx); c.lead.setAttribute("y2", ty);
      c.dot.setAttribute("cx", tx); c.dot.setAttribute("cy", ty);
    }

    // ---- logic analyzer
    const LA = { x0: 150, x1: 1188, secs: 8, lh: 28, lanes: [
      ["FLOOR", "in · active low", "floorPin", ""], ["DOOR_CLOSED", "in", "doorClosed", ""], ["BEAM_CUT", "in", "beam", ""],
      ["MOTOR_PWM", "PWM out", "pwm", " pwm"], ["BRAKE_RELEASE", "out", "brakeOut", ""], ["ESTOP", "in · IRQ", "estopIn", " bad"]] };
    const la = S("svg", { viewBox: `0 0 ${W} ${LA.lanes.length * LA.lh + 26}`, role: "img", "aria-label": "Logic analyzer: six signals over the last 8 seconds" });
    for (let k = 0; k <= LA.secs; k++) {
      const x = LA.x0 + (LA.x1 - LA.x0) * k / LA.secs;
      la.append(S("line", { class: "grid", x1: x, x2: x, y1: 6, y2: LA.lanes.length * LA.lh + 6, opacity: .45 }));
      la.append(S("text", { class: "t s " + (k === 0 ? "" : k === LA.secs ? "end" : "mid"), x, y: LA.lanes.length * LA.lh + 20 }, k === LA.secs ? "now" : `−${LA.secs - k} s`));
    }
    const laP = LA.lanes.map(([n, kind, , c], i) => {
      const y = 6 + i * LA.lh;
      la.append(S("text", { class: "t", x: 14, y: y + 14 }, n), S("text", { class: "t s", x: 14, y: y + 24 }, kind));
      const p = S("path", { class: "lan" + c }); la.append(p); return p;
    });

    // ---- toolbar
    const carBtns = [0, 1, 2, 3].map(f => E("button", { class: "fb", type: "button", text: String(f), "aria-label": "car button " + f, onclick: () => call(f, "car") }));
    const walkBtn = E("button", { class: "act", type: "button", text: "Step into the doorway", onclick: walk });
    const stopBtn = E("button", { class: "act stop", type: "button", text: "Emergency stop", onclick: estop });
    const resetBtn = E("button", { class: "act", type: "button", text: "Reset", onclick: reset });
    function seg(opts, init, on) {
      const el = E("div", { class: "seg", role: "group" });
      opts.forEach(([v, t]) => {
        const b = E("button", { type: "button", text: t, "aria-pressed": String(v === init), onclick: () => {
          [...el.children].forEach(c => { c.classList.toggle("on", c === b); c.setAttribute("aria-pressed", String(c === b)); }); on(v); } });
        if (v === init) b.classList.add("on");
        el.append(b);
      });
      return el;
    }
    let speed = 1, labels = "auto";
    box.append(
      E("div", { class: "bar" }, [
        E("div", { class: "grp" }, [E("span", { class: "cap", text: "Car" }), ...carBtns]),
        E("div", { class: "grp" }, [walkBtn, stopBtn, resetBtn]),
        E("div", { class: "grp" }, [E("span", { class: "cap", text: "Speed" }), seg([[0.4, "½×"], [1, "1×"], [2.5, "2.5×"]], 1, v => { speed = v; }),
          E("span", { class: "cap", text: "Labels" }), seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })])]),
      E("div", { class: "pane" }, [s]),
      E("div", { class: "la-head" }, [E("span", { text: "Logic analyzer" }), E("span", { text: "PWM drawn with a 0.2 s period so the duty cycle is visible" })]),
      E("div", { class: "pane" }, [la]));

    // ---------------------------------------------------------------- model
    const m = { p: 0, v: 0, door: 0, state: "IDLE", calls: 0, dir: 1, target: 0, duty: 0, brakeOut: 0, doorMotor: 0,
                hold: 0, moveMs: 0, person: 0, estopIn: 0, lastEdge: null, t: 0, hist: [], log: [] };
    const carTop = () => fy(m.p) - CAR.h;
    const atFloor = f => Math.abs(m.p - f) < 0.03;
    const floorPins = () => [0, 1, 2, 3].map(f => atFloor(f) ? 0 : 1);
    const doorClosed = () => m.door < 0.005;
    const beam = () => m.person > 0 && m.door > 0.05;
    function log(text) { m.log.push([m.t, text]); if (m.log.length > 6) m.log.shift(); }
    function go(next, why) { if (m.state !== next) { log(`${m.state} → ${next}${why ? "  " + why : ""}`); m.lastEdge = m.state + ">" + next; m.state = next; } }
    function show(id, ms) { const c = co[id]; if (c) c.until = Math.max(c.until, performance.now() + (ms || 3500)); }
    function hover(id, on) { const c = co[id]; if (c) c.hover = on; }
    function call(f, where) {
      if (m.state === "E_STOP") { log("call ignored: E-stop active, press Reset"); return; }
      if (!(m.calls >> f & 1)) log(`irq: ${where} button ${f}, calls |= 1 << ${f}`);
      m.calls |= 1 << f; show("call");
    }
    function walk() {
      if (m.door < 0.05) { log("doors closed: nobody can step in"); return; }
      m.person = 2500; show("beam");
    }
    function estop() {
      if (m.state === "E_STOP") return;
      m.estopIn = 1; m.duty = 0; m.brakeOut = 0; m.doorMotor = 0;
      log("irq: ESTOP, pwm = 0, brake on");
      go("E_STOP"); show("estop"); show("brake");
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
            if (!doorClosed()) { show("door"); break; }
            [m.target, m.dir] = nextTarget(); m.moveMs = 0;
            go("MOVING", `target ${m.target}`); show("door"); show("brake");
          }
          break;
        case "MOVING": {
          const [t] = nextTarget();
          const stopDist = m.v * m.v / (2 * P.acc);
          if (t !== m.target && Math.sign(t - m.p) === m.dir && Math.abs(t - m.p) > stopDist + 0.02 && Math.abs(t - m.p) < Math.abs(m.target - m.p)) { m.target = t; log(`stop on the way at ${t}`); }
          m.moveMs += P.tick; m.brakeOut = 1;
          if (m.moveMs < P.brakeMs) { m.duty = 0; break; }               // wait for the brake to lift
          const d = (m.target - m.p) * m.dir;
          if (d <= 0.004 && atFloor(m.target)) {
            m.duty = 0; m.brakeOut = 0; m.p = m.target; m.v = 0;
            m.calls &= ~(1 << m.target);
            go("DOOR_OPENING", `floor ${m.target} sensor = 0`); show("floor"); show("brake");
            break;
          }
          const want = Math.max(P.crawl, Math.min(P.vmax, Math.sqrt(2 * P.acc * Math.max(0, d))));
          const prev = m.duty;
          m.duty = Math.min(want / P.vmax, prev + P.acc * P.tick / 1000 / P.vmax);   // ramp no faster than acc
          if (Math.abs(m.duty - prev) > 0.004) show("pwm", 1500);
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
          m.hold -= P.tick;
          if (m.hold <= 0) go("DOOR_CLOSING");
          break;
        case "DOOR_CLOSING":
          m.doorMotor = -1;
          if (beam()) { go("DOOR_OPENING", "beam cut"); show("beam"); break; }
          if (doorClosed()) { m.doorMotor = 0; m.door = 0; go("IDLE", "door switch closed"); show("door"); }
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
    let prevFloor = null;
    function sample() {
      const sig = { floorPin: floorPins().every(v => v) ? 1 : 0, doorClosed: doorClosed() ? 1 : 0, beam: beam() ? 1 : 0, pwm: m.duty, brakeOut: m.brakeOut, estopIn: m.estopIn };
      if (prevFloor !== null && sig.floorPin !== prevFloor) show("floor", 2500);
      if (Math.abs(m.v) > 0.01) show("enc", 600);
      prevFloor = sig.floorPin;
      m.hist.push([m.t, sig]);
      while (m.hist.length && m.hist[0][0] < m.t - LA.secs - 0.5) m.hist.shift();
    }

    // ---------------------------------------------------------------- drawing
    const cls = (el, c) => { if (el.getAttribute("class") !== c) el.setAttribute("class", c); };
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
      for (const n in dyn.st) cls(dyn.st[n], "st" + (n === "E_STOP" ? " stop" : "") + (m.state === n ? " on" : ""));
      for (const k in dyn.arrows) cls(dyn.arrows[k], "arr" + (k === m.lastEdge ? " on" : ""));
      walkBtn.disabled = m.door < 0.05; resetBtn.disabled = m.state !== "E_STOP";
      for (const id in co) {
        const c = co[id], on = labels === "all" || (labels === "auto" && (c.hover || now < c.until));
        c.g.classList.toggle("show", on);
        if (on) placeLead(c);
      }
      // RAM
      const v = x => `<tspan class="v">${x}</tspan>`, k = x => `<tspan class="k">${x}</tspan>`;
      const bits = [3, 2, 1, 0].map(b => `<tspan class="b${m.calls >> b & 1}">${m.calls >> b & 1}</tspan>`).join("");
      const fp = floorPins().slice().reverse().map(b => `<tspan class="b${1 - b}">${b}</tspan>`).join("");
      const lines = [
        `${k("uint8_t ")}calls       = 0b${bits}`,
        `${k("float   ")}floor       = ${v(m.p.toFixed(2))}`,
        `${k("int     ")}target      = ${v(m.state === "MOVING" ? m.target : "–")}  ${k("dir")} ${v(m.dir > 0 ? "UP" : "DOWN")}`,
        `${k("int32_t ")}enc         = ${v(Math.round(m.p * 2048))}`,
        `${k("uint8_t ")}duty        = ${v(Math.round(m.duty * 100) + " %")}`,
        `${k("uint8_t ")}floor_pins  = 0b${fp}`,
        `${k("bool    ")}door_closed = ${v(doorClosed() ? 1 : 0)}  ${k("beam")} ${v(beam() ? 1 : 0)}`];
      dyn.vars.innerHTML = lines.map((l, i) => `<text x="${SX}" y="${320 + i * 19}" xml:space="preserve">${l}</text>`).join("");
      dyn.log.innerHTML = m.log.map(([t, txt], i) => `<text x="${SX}" y="${508 + i * 17}" class="${i === m.log.length - 1 ? "new" : ""}" xml:space="preserve">[${t.toFixed(2).padStart(7, " ")}] ${txt.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`).join("")
        || `<text x="${SX}" y="508">waiting for a call…</text>`;
      // analyzer: each lane is a filled area, high above the baseline
      const X = t => LA.x1 - (m.t - t) / LA.secs * (LA.x1 - LA.x0);
      const vis = m.hist.filter(([t]) => t >= m.t - LA.secs);
      LA.lanes.forEach(([, , key], i) => {
        const y0 = 6 + i * LA.lh, hi = y0 + 4, lo = y0 + 22;
        if (!vis.length) { laP[i].setAttribute("d", ""); return; }
        let d = `M${X(vis[0][0]).toFixed(1)} ${lo}`, prev = lo;
        for (const [t, sig] of vis) {
          const lvl = key === "pwm" ? (sig.pwm > 0 && (t % 0.2) / 0.2 < sig.pwm ? hi : lo) : (sig[key] ? hi : lo);
          const x = X(t).toFixed(1);
          if (lvl !== prev) d += ` L${x} ${prev} L${x} ${lvl}`;
          prev = lvl;
        }
        d += ` L${X(m.t).toFixed(1)} ${prev} L${X(m.t).toFixed(1)} ${lo} Z`;
        laP[i].setAttribute("d", d);
      });
    }
    let last = null, acc = 0;
    function tick(now) {
      if (last !== null) {
        acc += Math.min(0.1, (now - last) / 1000) * speed;
        while (acc >= P.tick / 1000) {
          acc -= P.tick / 1000; m.t += P.tick / 1000;
          firmware(); physics(P.tick / 1000);
          if (Math.round(m.t * 1000) % 20 === 0) sample();
        }
      }
      render(now);
      last = now;
      requestAnimationFrame(tick);
    }
    render(0);
    requestAnimationFrame(tick);
    box._elevator = { m, call, walk, estop, reset, setLabels: v => { labels = v; } };   // for tests
  }

  function init() {
    if (!document.getElementById("ev-css")) { const st = document.createElement("style"); st.id = "ev-css"; st.textContent = CSS; document.head.appendChild(st); }
    document.querySelectorAll(".widget.elevator").forEach(b => { b.classList.add("ev"); mount(b); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
