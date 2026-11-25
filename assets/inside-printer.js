/* Look inside a 3D printer (inside/printer.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget printer"></div>
 *
 * One axis (X). A host computer plans the moves and sends them over USB; the MCU keeps up to 8 in a ring-buffer
 * queue and turns each into STEP pulses from a timer interrupt, with DIR for the direction. The stepper is
 * driven open loop: the firmware counts the steps it sent, nothing measures where the head is. With an
 * acceleration ramp the step interval shrinks gradually; without it, a fast move starts at full speed and the
 * motor loses some steps, so later layers shift. Homing drives towards the endstop (a switch to ground with a
 * pull-up, active low) and sets the count to 0 where it closes.
 * Illustrative numbers: 80 steps/mm, 3000 mm/s² acceleration, a motor that follows a sudden start only up to
 * 80 mm/s and otherwise loses 15 to 35 mm, feed rates, 0.5 mm layers drawn 5 px high, the 50 ms the host takes
 * per move. Time is in seconds, X in mm (1 mm = 1 px).
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .printer .rail{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.2}
  .printer .beltl{stroke:var(--muted);stroke-width:1.5}
  .printer .car{fill:var(--bg);stroke:var(--fg);stroke-width:1.5}
  .printer .hend{fill:var(--warn-soft);stroke:var(--warn);stroke-width:1.2}
  .printer .bed{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.2}
  .printer .lay{fill:var(--accent);opacity:.55}
  .printer .lay.now{opacity:.95}
  .printer .endsw{fill:var(--bg);stroke:var(--muted);stroke-width:1.2} .printer .endsw.on{fill:var(--accent);stroke:var(--accent)}
  .printer .host{fill:var(--bg);stroke:var(--muted);stroke-width:1.2}
  .printer .qcell{fill:var(--code-bg);stroke:var(--rule);stroke-width:1} .printer .qcell.on{fill:var(--accent-soft);stroke:var(--accent)}
  .printer .rd{fill:var(--fg);font-family:var(--mono);font-size:11px} .printer .rd .v{fill:var(--accent);font-weight:700} .printer .rd .bad{fill:var(--bad);font-weight:700}`;

  const W = 1200, H = 640, X0 = 80, NOZ = 236, LH = 5, LAYERS = 20;
  const CHIP = { x: 640, y: 200, w: 160, h: 250 };
  const CARD = { x: 840, y: 16, w: 350, h: 608 };
  const SX = CARD.x + 20, RX = CARD.x + CARD.w - 18;
  const P = { tick: 0.001, spm: 80, acc: 3000, pullIn: 80, home: 25, travel: 200, qmax: 8, hostDt: 0.05 };

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "One axis of a 3D printer wired to a microcontroller, and the firmware inside it" });
    const dyn = {};

    // ---- wires
    dyn.usbW = S("path", { class: "w bus", d: `M520 50 H720 V${CHIP.y - 10}` });
    dyn.stepW = S("path", { class: "w", d: `M600 250 H${CHIP.x - 10}` });
    dyn.dirW = S("path", { class: "w", d: `M600 280 H${CHIP.x - 10}` });
    dyn.coilW = S("path", { class: "w bus", d: "M570 236 V110 H28 V136" });
    dyn.endW = S("path", { class: "w", d: `M55 170 V400 H${CHIP.x - 10}` });
    s.append(dyn.usbW, dyn.stepW, dyn.dirW, dyn.coilW, dyn.endW);

    // ---- host with its outgoing moves
    s.append(S("rect", { class: "host", x: 40, y: 14, width: 480, height: 76, rx: 8 }), S("text", { class: "t h", x: 54, y: 32 }, "HOST COMPUTER · PLANS THE MOVES"));
    dyn.hostTxt = S("text", { class: "t", x: 54, y: 54, "xml:space": "preserve" });
    dyn.hostTxt2 = S("text", { class: "t s", x: 54, y: 74 });
    s.append(dyn.hostTxt, dyn.hostTxt2);
    // ---- driver, motor, rail, endstop
    s.append(S("rect", { class: "box", x: 540, y: 236, width: 60, height: 58, rx: 5 }), S("text", { class: "t s mid", x: 570, y: 262 }, "stepper"), S("text", { class: "t s mid", x: 570, y: 276 }, "driver"));
    s.append(S("circle", { class: "box", cx: 28, cy: 150, r: 14 }), S("text", { class: "t b mid", x: 28, y: 154 }, "M"));
    s.append(S("rect", { class: "rail", x: 42, y: 146, width: 468, height: 8, rx: 3 }), S("line", { class: "beltl", x1: 28, x2: 505, y1: 140, y2: 140 }), S("circle", { class: "box", cx: 505, cy: 150, r: 6 }));
    dyn.end = S("rect", { class: "endsw", x: 50, y: 156, width: 10, height: 14, rx: 2 });
    s.append(dyn.end);
    dyn.read = S("text", { class: "rd", x: 110, y: 130, "xml:space": "preserve" });
    s.append(dyn.read);
    // ---- bed and the printed part
    dyn.bed = S("rect", { class: "bed", x: 70, width: 440, height: 12, rx: 3 });
    dyn.layers = []; for (let i = 0; i < LAYERS; i++) { const r = S("rect", { class: "lay", height: LH - 0.6 }); dyn.layers.push(r); s.append(r); }
    s.append(dyn.bed);
    // ---- carriage (moves)
    dyn.car = S("g");
    dyn.car.append(S("rect", { class: "car", x: X0 - 20, y: 134, width: 40, height: 26, rx: 4 }), S("rect", { class: "hend", x: X0 - 8, y: 160, width: 16, height: 66, rx: 3 }),
                   S("path", { class: "car", d: `M${X0 - 6} 226 L${X0 + 6} 226 L${X0} ${NOZ} Z` }));
    s.append(dyn.car);

    I.chip(s, { ...CHIP, sub: "step timer IRQ", labelAt: [720, 330], left: [[250, "STEP"], [280, "DIR"], [400, "ENDSTOP"]], top: [[720, "USB"]] });

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 40, title: "FIRMWARE", lessons: [71, 57] });
    const code = I.code(s, { x: SX, y: 64, w: 318, lh: 15, lines: [
      "void step_isr(void) {          // timer IRQ",
      "  gpio_put(STEP_PIN, 1);",
      "  pos += dir;              // counted, not measured",
      "  gpio_put(STEP_PIN, 0);",
      "  timer_set(next_interval(&mv));   // the ramp",
      "}",
      "void loop(void) {",
      "  if (!mv.active && q_len) mv = q_pop();",
      "  if (homing && !gpio_get(ENDSTOP)) pos = 0;",
      "}"] });
    I.section(s, { x: SX, x2: RX, y: 232, title: "RAM", lessons: [20, 70], sep: true });
    const ram = I.ram(s, SX, 256);
    dyn.q = []; for (let i = 0; i < 8; i++) { const r = S("rect", { class: "qcell", x: SX + 92 + i * 26, y: 384, width: 22, height: 14, rx: 2 }); dyn.q.push(r); s.append(r); }
    s.append(S("text", { class: "var", x: SX, y: 395 }, ""), S("text", { class: "t s", x: SX, y: 395 }, "queue[8]"));
    I.section(s, { x: SX, x2: RX, y: 428, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 450, n: 9, fmt: t => "[" + t.toFixed(2).padStart(6, " ") + "]", empty: "home X, then start the print" });

    // ---- callouts
    const headPt = () => [X0 + m.real, 200];
    const co = I.callouts(s, [
      ["host", 70, 372, 215, "Host computer", ["Slices the model and plans the", "moves, then sends them ahead", "over USB."], [102, 77], [300, 90]],
      ["queue", 300, 372, 215, "Move queue", ["Up to 8 moves wait in a ring", "buffer, so the host may be a", "little late. Empty: the head stops."], [70], [CHIP.x, 340]],
      ["step", 70, 452, 215, "Step pulses", ["A timer interrupt makes one STEP", "pulse per 1/80 mm. DIR picks", "the direction."], [71, 57], [620, 250]],
      ["ramp", 300, 452, 215, "Acceleration ramp", ["The time between steps shrinks", "gradually. Start at full speed", "and the motor loses steps."], [71, 14], headPt],
      ["end", 70, 532, 215, "Endstop", ["A switch at X = 0, active low.", "Homing drives until it closes,", "then sets pos = 0."], [52, 16], [55, 170]],
      ["drv", 300, 532, 215, "Stepper driver", ["Turns STEP and DIR into coil", "currents. Nothing checks that", "the motor really moved."], [14], [570, 294]]]);
    s.append(co.hot(I.hotspot({ x: 40, y: 14, width: 480, height: 76 }), "host"), co.hot(I.hotspot({ x: CHIP.x, y: CHIP.y + 100, width: CHIP.w, height: 150 }), "queue"),
             co.hot(I.hotspot({ x: 600, y: 240, width: 40, height: 50 }), "step"), co.hot(I.hotspot({ x: 44, y: 154, width: 22, height: 22 }), "end"),
             co.hot(I.hotspot({ x: 540, y: 236, width: 60, height: 58 }), "drv"));
    dyn.car.append(co.hot(I.hotspot({ x: X0 - 20, y: 134, width: 40, height: 102 }), "ramp"));
    co.raise();

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 4, note: "4 s · STEP drawn as its rate, 80 pulses per mm", lanes: [
      { name: "STEP rate", kind: "out, 0–250 mm/s", key: "v", type: "ana", max: 250 }, { name: "DIR", kind: "out, 1 = +X", key: "dir" },
      { name: "ENDSTOP", kind: "in · active low", key: "end", cls: "good" }, { name: "QUEUE", kind: "moves, 0–8", key: "q", type: "ana", max: 8 },
      { name: "USB", kind: "host sends", key: "usb" }] });
    const homeBtn = I.btn("Home X", () => home()), printBtn = I.btn("Start print", () => print()), pauseBtn = I.btn("Pause host", () => pauseHost()), clearBtn = I.btn("Clear bed", () => clear());
    let speed = 1, labels = "auto";
    I.frame(box, { scene: s, analyzer: la, bar: [
      [homeBtn, printBtn, pauseBtn, clearBtn],
      [I.cap("Feed"), I.seg([[60, "60"], [150, "150"], [250, "250 mm/s"]], 150, v => { m.feed = v; log(`feed = ${v} mm/s`); }),
       I.cap("Ramp"), I.seg([[true, "On"], [false, "Off"]], true, v => { m.ramp = v; log(v ? "acceleration ramp on" : "ramp off: full speed at once"); co.show("ramp"); })],
      [I.cap("Speed"), I.seg([[0.25, "¼×"], [1, "1×"], [4, "4×"]], 1, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });

    // ---------------------------------------------------------------- model
    const m = { t: 0, pos: 137, real: 137, homed: false, homing: false, printing: false, paused: false, feed: 150, ramp: true,
                q: [], mv: null, plan: [], layer: 0, segs: [], hostT: 0, usbT: -9, lost: 0, dirOut: 1, v: 0, nextIdx: 0 };
    const rnd = (() => { let x = 99; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
    const log = txt => uart.log(m.t, txt);
    const endPin = () => m.real <= 0.3 ? 0 : 1;
    function home() {
      if (m.printing) { log("busy printing: stop first"); return; }
      m.homing = true; m.mv = null; m.q = [];
      log("homing: towards the endstop at 25 mm/s"); co.show("end");
    }
    function print() {
      if (m.printing) { m.printing = false; m.plan = []; m.q = []; m.mv = null; m.v = 0; log("print stopped"); return; }
      if (m.homing) { log("still homing: wait for the endstop"); return; }
      if (!m.homed) { log("not homed: press Home X first"); co.show("end"); return; }
      if (m.layer >= LAYERS) { log("bed full: clear it first"); return; }
      m.printing = true; m.nextIdx = 0; log("host: print started"); co.show("host");
    }
    function pauseHost() { m.paused = !m.paused; log(m.paused ? "host busy: no moves sent" : "host sending again"); co.show("queue"); }
    function clear() { if (m.printing) { log("busy printing: stop first"); return; } m.segs = []; m.layer = 0; log("bed cleared"); }
    /* The host's plan: travel to 40, then one printed pass per layer, alternating direction. */
    function nextMove() {
      if (m.nextIdx === 0) { m.nextIdx++; return { to: 40, f: P.travel, print: false, layer: -1 }; }
      const L = m.nextIdx - 1;
      if (L >= LAYERS) return null;
      m.nextIdx++;
      return { to: L % 2 ? 40 : 360, f: m.feed, print: true, layer: L };
    }
    function host() {
      if (!m.printing || m.paused || m.t - m.hostT < P.hostDt || m.q.length >= P.qmax) return;
      const mv = nextMove();
      if (!mv) return;
      m.hostT = m.t; m.usbT = m.t; m.q.push(mv);
    }
    /* The firmware: the loop takes a move when idle; the step ISR (modelled per tick) advances pos. */
    function firmware(dt) {
      if (m.homing) {
        m.dirOut = 0; m.v = P.home;
        if (!endPin()) { m.homing = false; m.homed = true; m.v = 0; const was = m.pos; m.pos = 0; log(`endstop closed: pos = 0 (was ${was.toFixed(1)})`); co.show("end"); return; }
        m.pos -= P.home * dt; m.real = Math.max(0, m.real - P.home * dt); return;
      }
      if (!m.mv && m.q.length) {
        m.mv = m.q.shift(); m.mv.from = m.pos; m.mv.dir = Math.sign(m.mv.to - m.pos) || 1;
        m.dirOut = m.mv.dir > 0 ? 1 : 0;
        m.v = m.ramp ? 0 : m.mv.f;
        if (!m.ramp && m.mv.f > P.pullIn) { m.lost = 15 + 20 * rnd(); co.show("ramp", 4000); }
        if (m.mv.print) m.layer = m.mv.layer;
      }
      if (!m.mv) { m.v = 0; if (m.printing && !m.q.length) { if (m.nextIdx > LAYERS) { m.printing = false; log("print finished"); } else if (m.paused) co.show("queue", 600); } return; }
      const mv = m.mv, left = (mv.to - m.pos) * mv.dir;
      if (m.ramp) m.v = Math.min(mv.f, m.v + P.acc * dt, Math.sqrt(2 * P.acc * Math.max(0, left)) + 1);
      const d = Math.min(left, m.v * dt);
      m.pos += mv.dir * d;
      // the motor: follows the steps, except the ones it loses
      let dr = d;
      if (m.lost > 0) { const take = Math.min(dr, m.lost); m.lost -= take; dr -= take; }
      m.real = Math.max(0, Math.min(420, m.real + mv.dir * dr));
      if (mv.print && mv.layer < LAYERS) {
        const sg = m.segs[mv.layer] || (m.segs[mv.layer] = [m.real, m.real]);
        sg[0] = Math.min(sg[0], m.real); sg[1] = Math.max(sg[1], m.real);
      }
      if (left - d <= 1e-6) {
        if (Math.abs(m.real - m.pos) > 1 && mv.print) log(`layer ${mv.layer + 1} done · pos ${m.pos.toFixed(0)}, head at ${m.real.toFixed(0)}`);
        else if (mv.print && (mv.layer + 1) % 5 === 0) log(`layer ${mv.layer + 1} done`);
        m.mv = null; m.lost = 0; if (mv.print) m.layer = mv.layer + 1;
      }
    }
    function sample() { la.push(m.t, { v: m.mv || m.homing ? m.v : 0, dir: m.dirOut, end: endPin(), q: m.q.length, usb: m.t - m.usbT < 0.012 ? 1 : 0 }); }

    // ---------------------------------------------------------------- drawing
    function render(now) {
      const bedTop = NOZ + LH * (Math.min(m.layer, LAYERS - 1) + 1) + 0.5;
      dyn.bed.setAttribute("y", bedTop);
      dyn.layers.forEach((r, L) => {
        const sg = m.segs[L];
        if (!sg) { r.style.display = "none"; return; }
        r.style.display = "";
        r.setAttribute("x", X0 + sg[0]); r.setAttribute("width", Math.max(1, sg[1] - sg[0]));
        r.setAttribute("y", bedTop - LH * (L + 1));
        cls(r, "lay" + (m.mv && m.mv.layer === L ? " now" : ""));
      });
      dyn.car.setAttribute("transform", `translate(${m.real} 0)`);
      const moving = !!(m.mv || m.homing) && m.v > 0;
      cls(dyn.stepW, "w" + (moving ? " on" : "")); cls(dyn.coilW, "w bus" + (moving ? " on" : ""));
      cls(dyn.dirW, "w" + (m.dirOut ? " on" : ""));
      cls(dyn.endW, "w" + (endPin() ? "" : " on")); cls(dyn.end, "endsw" + (endPin() ? "" : " on"));
      cls(dyn.usbW, "w bus" + (I.hold(dyn.usbW, m.t - m.usbT < 0.1) ? " on" : ""));
      dyn.q.forEach((r, i) => cls(r, "qcell" + (i < m.q.length ? " on" : "")));
      const off = Math.abs(m.real - m.pos) > 1;
      dyn.read.innerHTML = `firmware: X <tspan class="v">${m.pos.toFixed(1)}</tspan> mm   head really at: X <tspan class="${off ? "bad" : "v"}">${m.real.toFixed(1)}</tspan> mm`;
      dyn.hostTxt.textContent = m.printing ? (m.paused ? "paused: busy with something else" : `layer ${Math.min(m.layer + 1, LAYERS)} of ${LAYERS} · feed ${m.feed} mm/s`) : "idle";
      dyn.hostTxt2.textContent = m.printing ? `sent ${Math.max(0, m.nextIdx - 1)} moves, ${m.q.length} waiting in the MCU` : "";
      printBtn.textContent = m.printing ? "Stop print" : "Start print";
      pauseBtn.textContent = m.paused ? "Resume host" : "Pause host";
      code.set(m.homing ? [8] : moving ? [0, 1, 2, 3, 4] : [6, 7]);
      co.update(now, labels);
      const k = I.k, v = I.v;
      ram.set([
        `${k("enum    ")}state   = ${v(m.homing ? "HOMING" : m.mv ? "MOVING" : m.printing ? "WAITING" : "IDLE")}`,
        `${k("int32_t ")}pos     = ${v(Math.round(m.pos * P.spm))}  ${k("steps =")} ${v(m.pos.toFixed(1) + " mm")}`,
        `${k("int8_t  ")}dir     = ${v(m.dirOut ? "+1" : "-1")}`,
        `${k("float   ")}rate    = ${v(Math.round((moving ? m.v : 0) * P.spm) + " steps/s")}`,
        `${k("bool    ")}homed   = ${v(m.homed ? 1 : 0)}  ${k("ramp")} ${v(m.ramp ? 1 : 0)}`,
        `${k("uint8_t ")}q_len   = ${v(m.q.length)}`]);
      uart.render();
      la.draw(m.t);
    }
    I.loop({ tick: P.tick, speed: () => speed, every: 5, step(dt) { m.t += dt; host(); firmware(dt); }, sample, render });
    box._demo = { m, home, print, pauseHost, clear, setRamp: v => { m.ramp = v; }, setFeed: v => { m.feed = v; }, setSpeed: v => { speed = v; }, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("printer", mount, CSS);
})();
