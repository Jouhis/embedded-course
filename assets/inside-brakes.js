/* Look inside a car's brakes (inside/brakes.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget brakes"></div>
 *
 * Seen from above. Four wheel-speed nodes, a brake-pedal node and a dashboard node share one CAN bus with
 * the brake controller (the MCU), which drives a valve block: per wheel, apply, hold or release pressure.
 * CAN facts from lesson 100: dominant 0 wins the wire, so in arbitration the lowest identifier wins and a
 * node drops out at the first bit where it sends recessive 1 but reads 0; 11-bit identifiers; the bus is
 * terminated at both ends with 120 Ω.
 * ABS: every 10 ms, slip = (reference − wheel) / reference, reference = the fastest wheel, but never falling
 *   faster than an accelerometer on the controller says the car slows, plus 1 m/s² (so four locked wheels
 *   cannot drag it down); release above
 * 20 % slip, apply below 8 %, hold between. A wheel node silent for more than 50 ms is a fault: ABS off,
 * plain braking, warning lamp (the fail-safe idea of lesson 112).
 * Illustrative: identifiers, the 10 ms frame period, 0.25 ms per frame, 1500 kg car, 100 km/h start, grip
 * 0.9 / 0.5 / 0.15, a tyre that grips best near 10 % slip and 25 % less when locked, brake and valve rates.
 * Time is in seconds.
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .brakes .body{fill:var(--bg);stroke:var(--fg);stroke-width:1.8}
  .brakes .glassw{fill:var(--code-bg);stroke:var(--rule);stroke-width:1}
  .brakes .tyre{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.5}
  .brakes .tyre.lock{stroke:var(--bad);stroke-width:2.5}
  .brakes .tread{stroke:var(--muted);stroke-width:14;stroke-dasharray:3 7}
  .brakes .node{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2}
  .brakes .node.tx{stroke:var(--accent);fill:var(--accent-soft)}
  .brakes .node.dead{stroke:var(--bad);stroke-dasharray:3 2}
  .brakes .node.lamp{fill:var(--bad-soft);stroke:var(--bad)}
  .brakes .term{fill:var(--bg);stroke:var(--muted);stroke-width:1}
  .brakes .hyd{fill:none;stroke:var(--muted);stroke-width:3;stroke-opacity:.5;stroke-linejoin:round}
  .brakes .hyd.on{stroke:var(--warn);stroke-opacity:1}
  .brakes .hyd.rel{stroke:var(--accent);stroke-opacity:1;stroke-dasharray:6 4}
  .brakes .blk{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.3}
  .brakes .rd{fill:var(--fg);font-family:var(--mono);font-size:12px} .brakes .rd .v{fill:var(--accent);font-weight:700} .brakes .rd .bad{fill:var(--bad);font-weight:700}
  .brakes .arb{font-family:var(--mono);font-size:11px;fill:var(--muted)}
  .brakes .arb .in{fill:var(--accent);font-weight:700} .brakes .arb .out{fill:var(--muted);opacity:.5} .brakes .arb .lost{fill:var(--bad);font-weight:700}
  .brakes .arb .won{fill:var(--good)} .brakes .arb .id{fill:var(--fg)}`;

  const W = 1200, H = 640;
  const CHIP = { x: 640, y: 200, w: 160, h: 260 };
  const CARD = { x: 840, y: 16, w: 350, h: 608 };
  const SX = CARD.x + 20, RX = CARD.x + CARD.w - 18;
  const WH = [{ n: "FL", x: 180, y: 140, id: 0x0A0, nx: 216, ny: 158 }, { n: "FR", x: 414, y: 140, id: 0x0A1, nx: 360, ny: 158 },
              { n: "RL", x: 180, y: 400, id: 0x0A2, nx: 216, ny: 418 }, { n: "RR", x: 414, y: 400, id: 0x0A3, nx: 360, ny: 418 }];
  const PEDAL = 0x050, DASH = 0x3E0;
  const P = { tick: 0.001, mass: 1500, wheelM: 20, Fb: 6000, period: 0.01, frame: 0.00025, timeout: 0.05, v0: 100 / 3.6,
              rel: 0.20, app: 0.08, pUp: 8, pDown: 15 };
  const MU = { dry: 0.9, wet: 0.5, ice: 0.15 };
  const bin11 = id => id.toString(2).padStart(11, "0");

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "A car seen from above with wheel-speed nodes on a CAN bus, the brake controller and its valve block, and the firmware inside it" });
    const dyn = { tyres: [], treads: [], nodes: [], hyd: [] };

    // ---- hydraulic lines (around the body) and the CAN bus
    const HY = ["M485 380 V170 H440", "M470 430 H440", "M500 440 V560 H165 V170 H180", "M530 440 V580 H150 V430 H180"];
    const order = [0, 1, 2, 3];   // FL, FR, RL, RR use the paths below
    const hydPath = { 0: HY[2], 1: HY[0], 2: HY[3], 3: HY[1] };
    order.forEach(i => { const p = S("path", { class: "hyd", d: hydPath[i] }); dyn.hyd[i] = p; s.append(p); });
    dyn.valveW = S("path", { class: "w bus", d: `M560 410 H${CHIP.x - 10}` });
    s.append(S("path", { class: "w", d: `M590 333 H${CHIP.x - 10}` }), S("rect", { class: "blk", x: 530, y: 320, width: 60, height: 26, rx: 4 }), S("text", { class: "t s mid", x: 560, y: 337 }, "accel"));
    dyn.bus = S("path", { class: "w bus", d: `M310 128 V462 M310 128 V60 H700 V${CHIP.y - 10}` });
    s.append(dyn.valveW);
    // ---- the car
    s.append(S("rect", { class: "body", x: 200, y: 110, width: 220, height: 370, rx: 36 }), S("rect", { class: "glassw", x: 220, y: 196, width: 180, height: 22, rx: 6 }));
    s.append(S("text", { class: "t s mid", x: 262, y: 104 }, "front"));
    WH.forEach((w, i) => {
      const t = S("rect", { class: "tyre", x: w.x, y: w.y, width: 26, height: 60, rx: 6 });
      const tr = S("line", { class: "tread", x1: w.x + 13, x2: w.x + 13, y1: w.y + 4, y2: w.y + 56 });
      dyn.tyres.push(t); dyn.treads.push(tr); s.append(t, tr);
    });
    s.append(dyn.bus);
    const stub = (x, y, w) => s.append(S("path", { class: "w", d: x < 310 ? `M${x + w} ${y} H310` : `M310 ${y} H${x}` }));
    WH.forEach(w => { stub(w.nx, w.ny + 11, 44); const r = S("rect", { class: "node", x: w.nx, y: w.ny, width: 44, height: 22, rx: 4 }); dyn.nodes.push(r); s.append(r, S("text", { class: "t s mid", x: w.nx + 22, y: w.ny + 15 }, w.n)); });
    stub(226, 241, 50); dyn.pedal = S("rect", { class: "node", x: 226, y: 230, width: 50, height: 22, rx: 4 }); s.append(dyn.pedal, S("text", { class: "t s mid", x: 251, y: 245 }, "pedal"));
    stub(330, 311, 56); dyn.dash = S("rect", { class: "node", x: 330, y: 300, width: 56, height: 22, rx: 4 }); s.append(dyn.dash, S("text", { class: "t s mid", x: 358, y: 315 }, "dash"));
    [[128, "120 Ω"], [462, "120 Ω"]].forEach(([y, l]) => s.append(S("rect", { class: "term", x: 304, y: y - 4, width: 12, height: 8, rx: 1 }), S("text", { class: "t s", x: 320, y: y + 4 }, l)));
    s.append(S("rect", { class: "blk", x: 470, y: 380, width: 90, height: 60, rx: 5 }), S("text", { class: "t s mid", x: 515, y: 406 }, "valve"), S("text", { class: "t s mid", x: 515, y: 420 }, "block"));
    dyn.read = S("text", { class: "rd", x: 20, y: 28, "xml:space": "preserve" }); dyn.read2 = S("text", { class: "rd", x: 20, y: 46, "xml:space": "preserve" });
    s.append(dyn.read, dyn.read2);
    I.chip(s, { ...CHIP, name: "MCU", sub: "brake controller", labelAt: [720, 330], left: [[333, "ACCEL"], [410, "VALVE[3:0]"]], top: [[700, "CAN"]] });

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 40, title: "CAN ARBITRATION · lowest ID wins", lessons: [100] });
    dyn.arb = S("g", { class: "arb" }); s.append(dyn.arb);
    I.section(s, { x: SX, x2: RX, y: 210, title: "RAM", lessons: [20, 56], sep: true });
    const ram = I.ram(s, SX, 234);
    I.section(s, { x: SX, x2: RX, y: 412, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 434, n: 10, fmt: t => "[" + t.toFixed(3).padStart(7, " ") + "]", empty: "press the brake" });

    // ---- callouts
    const co = I.callouts(s, [
      ["sensor", 8, 110, 136, "Wheel-speed node", ["Each wheel's node sends", "its speed in a CAN", "frame every 10 ms."], [100], [216, 169]],
      ["pedal", 8, 218, 136, "Pedal node", ["ID 0x050: the lowest,", "so it wins every", "arbitration."], [100], [226, 241]],
      ["lock", 8, 326, 136, "Locked wheel", ["Brake harder than the", "grip: the wheel stops", "turning and skids."], [108], [180, 170]],
      ["fault", 8, 450, 136, "Sensor timeout", ["No frame for 50 ms:", "ABS off, plain brakes,", "warning lamp on."], [112, 84], [216, 169]],
      ["can", 495, 76, 135, "CAN bus", ["Two wires, every node.", "Dominant 0 wins the", "wire, so IDs decide."], [100, 16], [600, 60]],
      ["abs", 495, 200, 135, "ABS in the MCU", ["Slip over 20 %: release", "that wheel. Under 8 %:", "apply again."], [56, 108], [CHIP.x, CHIP.y + 30]],
      ["valve", 190, 488, 250, "Valve block", ["Per wheel: apply, hold or release the", "brake pressure, 4 outputs."], [12, 14], [470, 420]]]);
    s.append(co.hot(I.hotspot({ x: 200, y: 150, width: 64, height: 40 }), "sensor"), co.hot(I.hotspot({ x: 222, y: 226, width: 58, height: 30 }), "pedal"),
             co.hot(I.hotspot({ x: 176, y: 136, width: 34, height: 68 }), "lock"), co.hot(I.hotspot({ x: 300, y: 56, width: 410, height: 10 }), "can"),
             co.hot(I.hotspot({ x: CHIP.x, y: CHIP.y, width: CHIP.w, height: CHIP.h }), "abs"), co.hot(I.hotspot({ x: 470, y: 380, width: 90, height: 60 }), "valve"));
    co.raise();

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 3, note: "3 s · front-left wheel", lanes: [
      { name: "PEDAL", kind: "CAN 0x050", key: "pedal" }, { name: "SPEED_FL", kind: "wheel, 0–30 m/s", key: "w", type: "ana", max: 30 },
      { name: "CAR", kind: "0–30 m/s", key: "v", type: "ana", max: 30, cls: "good" }, { name: "VALVE_FL", kind: "out, 1 = release", key: "rel", cls: "pwm" },
      { name: "CAN", kind: "bus busy", key: "bus" }, { name: "ABS_FAULT", kind: "flag", key: "fault", cls: "bad" }] });
    const brakeBtn = I.btn("Press brake", () => brake()), driveBtn = I.btn("Drive at 100 km/h", () => drive()),
          unplugBtn = I.btn("Unplug FL sensor", () => unplug(), "stop"), resetBtn = I.btn("Reset fault", () => resetFault());
    let speed = 1, labels = "auto";
    I.frame(box, { scene: s, analyzer: la, bar: [
      [brakeBtn, driveBtn],
      [I.cap("Road"), I.seg([["dry", "Dry"], ["wet", "Wet"], ["ice", "Ice"]], "dry", v => { m.road = v; log(`road: ${v}`); }),
       I.cap("ABS"), I.seg([[true, "On"], [false, "Off"]], true, v => { m.abs = v; log(v ? "ABS on" : "ABS off"); co.show("abs"); }), unplugBtn, resetBtn],
      [I.cap("Speed"), I.seg([[0.1, "1/10×"], [0.5, "½×"], [1, "1×"]], 1, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });

    // ---------------------------------------------------------------- model
    const m = { t: 0, v: P.v0, w: [P.v0, P.v0, P.v0, P.v0], p: [0, 0, 0, 0], valve: [0, 0, 0, 0], relT: [-9, -9, -9, -9], dist: 0, braking: false, pedal: 0, road: "dry", abs: true,
                rx: [P.v0, P.v0, P.v0, P.v0], rxT: [0, 0, 0, 0], rxPedal: 0, fault: false, unplugged: false, cyc: 0, busUntil: 0, arb: [], txT: {}, stopLogged: true, rot: [0, 0, 0, 0], ref: P.v0, dec: 0, accel: 0 };
    const log = txt => uart.log(m.t, txt);
    function brake() { m.braking = !m.braking; if (m.braking) { m.dist = 0; m.stopLogged = false; } log(m.braking ? "driver presses the brake" : "brake released"); co.show("pedal"); }
    function drive() { m.ref = P.v0; m.v = P.v0; m.w = [P.v0, P.v0, P.v0, P.v0]; m.p = [0, 0, 0, 0]; m.braking = false; m.dist = 0; m.stopLogged = true; log("driving at 100 km/h"); }
    function unplug() { m.unplugged = !m.unplugged; log(m.unplugged ? "FL sensor unplugged" : "FL sensor plugged in"); co.show("sensor"); }
    function resetFault() {
      if (!m.fault) return;
      if (m.t - m.rxT[0] > P.timeout) { log("reset refused: FL still silent"); return; }
      m.fault = false; log("fault cleared, ABS back on"); }
    /* One bus cycle: every node that has a frame starts at once; arbitration orders them, lowest ID first. */
    function canCycle() {
      m.cyc++;
      const nodes = [{ id: PEDAL, n: "pedal" }];
      WH.forEach((w, i) => { if (!(i === 0 && m.unplugged)) nodes.push({ id: w.id, n: w.n, i }); });
      if (m.cyc % 10 === 0) nodes.push({ id: DASH, n: "dash" });
      // bit-by-bit arbitration of the first round, for the panel
      const live = nodes.map(nd => ({ ...nd, out: -1 }));
      for (let b = 10; b >= 0; b--) {
        const inGame = live.filter(x => x.out < 0);
        const bus = inGame.some(x => !(x.id >> b & 1)) ? 0 : 1;
        inGame.forEach(x => { if ((x.id >> b & 1) && !bus) x.out = 10 - b; });
      }
      /* The panel shows the full contest, the one the dash joins every 100 ms: a panel that followed every
         10 ms cycle would jump between 5 and 6 rows. */
      if (m.cyc % 10 === 0 || !m.arb.length) m.arb = live.sort((a, b) => a.id - b.id);
      // frames go out in ID order; the controller receives them
      nodes.sort((a, b) => a.id - b.id).forEach((nd, k) => {
        m.txT[nd.n] = m.t + k * P.frame;
        if (nd.i !== undefined) { m.rx[nd.i] = m.w[nd.i]; m.rxT[nd.i] = m.t; }
        if (nd.id === PEDAL) m.rxPedal = m.braking ? 1 : 0;
      });
      m.busUntil = m.t + nodes.length * P.frame;
    }
    /* The brake controller: every 10 ms, after the frames. */
    function firmware() {
      if (!m.fault && m.t - m.rxT[0] > P.timeout) { m.fault = true; log("FL silent 50 ms: ABS off, lamp on"); co.show("fault", 6000); }
      // reference speed: the fastest wheel, but it may fall only as fast as the accelerometer says the car slows
      const top = Math.max(...m.rx);
      m.dec = m.accel;
      m.ref = Math.max(top, m.ref - (m.dec + 1) * P.period);
      const ref = m.ref;
      for (let i = 0; i < 4; i++) {
        let next = 0;                                          // 0 apply, 1 release, 2 hold
        if (m.abs && !m.fault && m.rxPedal && ref > 2) {
          const slip = (ref - m.rx[i]) / ref;
          next = slip > P.rel ? 1 : slip < P.app ? 0 : 2;
          if (next === 1 && m.valve[i] !== 1) co.show("abs", 1500);
        }
        m.valve[i] = next;
        if (next === 1) m.relT[i] = m.t;
      }
    }
    function physics(dt) {
      const N = P.mass * 9.81 / 4, mu = MU[m.road] * (1 + 0.04 * Math.sin(m.t * 3));
      let F = 0;
      for (let i = 0; i < 4; i++) {
        const target = m.rxPedal ? 1 : 0;
        if (m.valve[i] === 1) m.p[i] = Math.max(0, m.p[i] - P.pDown * dt);
        else if (m.valve[i] === 0) m.p[i] = target > m.p[i] ? Math.min(target, m.p[i] + P.pUp * dt) : Math.max(target, m.p[i] - 20 * dt);
        const slip = m.v > 0.3 ? (m.v - m.w[i]) / m.v : 0;
        const peak = mu * (i < 2 ? 1.02 : 0.98) * N;
        const Ft = Math.max(0, peak * (slip < 0.1 ? slip / 0.1 : 1 - 0.25 * Math.min(1, (slip - 0.1) / 0.9)));
        const Fb = m.p[i] * P.Fb;
        m.w[i] += (Ft - Fb) / P.wheelM * dt;
        if (m.w[i] < 0) m.w[i] = 0;
        if (m.w[i] > m.v) m.w[i] = m.v;
        F += Ft;
        m.rot[i] += m.w[i] * dt;
      }
      m.accel = F / P.mass + 0.1;
      m.v = Math.max(0, m.v - m.accel * dt);
      if (m.v < 0.05) { m.v = 0; m.w = [0, 0, 0, 0]; if (!m.stopLogged) { m.stopLogged = true; log(`stopped in ${m.dist.toFixed(1)} m`); } }
      m.dist += m.v * dt;
    }
    function step(dt) {
      m.t += dt;
      if (Math.floor(m.t / P.period) !== Math.floor((m.t - dt) / P.period)) { canCycle(); firmware(); }
      physics(dt);
    }
    function sample() { la.push(m.t, { pedal: m.rxPedal, w: m.w[0], v: m.v, rel: m.valve[0] === 1 ? 1 : 0, bus: m.t < m.busUntil ? 1 : 0, fault: m.fault ? 1 : 0 }); }

    // ---------------------------------------------------------------- drawing
    function render(now) {
      const locked = m.w.map(w => m.v > 1 && w < 0.5);
      WH.forEach((w, i) => {
        cls(dyn.tyres[i], "tyre" + (locked[i] ? " lock" : ""));
        dyn.treads[i].setAttribute("stroke-dashoffset", (m.rot[i] * 40 % 10).toFixed(1));
        /* Frames every 10 ms and ABS cycles of a few per second are too fast to draw one by one: a node that
           sends regularly stays lit, and a valve that released within 0.25 s shows as modulating. */
        cls(dyn.nodes[i], "node" + (i === 0 && m.unplugged ? " dead" : m.v > 0 || m.braking ? " tx" : ""));
        cls(dyn.hyd[i], "hyd" + (m.rxPedal && m.t - m.relT[i] < 0.25 ? " rel" : m.p[i] > 0.05 ? " on" : ""));
        if (locked[i]) co.show("lock", 800);
      });
      cls(dyn.pedal, "node" + (m.braking ? " tx" : ""));
      cls(dyn.dash, "node" + (m.fault ? " lamp" : ""));
      cls(dyn.bus, "w bus" + (m.v > 0 || m.braking ? " on" : ""));
      cls(dyn.valveW, "w bus" + (m.rxPedal && m.relT.some(t => m.t - t < 0.25) ? " on" : ""));
      const kmh = m.v * 3.6;
      dyn.read.innerHTML = `speed <tspan class="v">${kmh.toFixed(0)} km/h</tspan>   braking distance <tspan class="v">${m.dist.toFixed(1)} m</tspan>   road ${m.road}`;
      dyn.read2.innerHTML = locked[0] && locked[1] ? `<tspan class="bad">front wheels locked: the car cannot steer</tspan>` : m.fault ? `<tspan class="bad">ABS fault lamp on</tspan>` : "";
      brakeBtn.textContent = m.braking ? "Release brake" : "Press brake";
      unplugBtn.textContent = m.unplugged ? "Plug FL sensor in" : "Unplug FL sensor";
      resetBtn.disabled = !m.fault;
      // arbitration panel
      const arbHtml = m.arb.map((a, r) => {
        const bits = bin11(a.id).split("").map((c, b) => {
          const k = a.out < 0 || b < a.out ? "in" : b === a.out ? "lost" : "out";
          return `<tspan class="${k}">${c}</tspan>`;
        }).join("");
        const tail = a.out < 0 ? `<tspan class="won"> wins</tspan>` : `<tspan> out at bit ${a.out}</tspan>`;
        return `<text x="${SX}" y="${66 + r * 17}" xml:space="preserve"><tspan class="id">0x${a.id.toString(16).toUpperCase().padStart(3, "0")} ${a.n.padEnd(5)}</tspan> ${bits}${tail}</text>`;
      }).join("") + `<text x="${SX}" y="${66 + 6 * 17 + 4}" class="t s">losers retry at once · all sent within 1–2 ms</text>`;
      if (arbHtml !== dyn.arbHtml) { dyn.arb.innerHTML = arbHtml; dyn.arbHtml = arbHtml; }
      co.update(now, labels);
      const k = I.k, v = I.v, ref = m.ref;
      ram.set([
        `${k("uint16_t ")}rx_speed[4] = ${v(m.rx.map(x => Math.round(x * 3.6)).join(" "))} ${k("km/h")}`,
        `${k("uint16_t ")}ref         = ${v(Math.round(ref * 3.6))} ${k("km/h  accel")} ${v("-" + m.dec.toFixed(1))}`,
        `${k("int8_t   ")}slip_fl     = ${v(ref > 2 ? Math.round((ref - m.rx[0]) / ref * 100) + " %" : "–")}`,
        `${k("uint8_t  ")}release     = ${I.bits(m.valve.reduce((a, x, i) => a | (x === 1 ? 1 << i : 0), 0), 4)} ${k("RR RL FR FL")}`,
        `${k("uint16_t ")}fl_age_ms   = ${v(Math.round((m.t - m.rxT[0]) * 1000), m.t - m.rxT[0] > P.timeout ? "bad" : "v")}`,
        `${k("bool     ")}abs_on      = ${v(m.abs && !m.fault ? 1 : 0)}  ${k("fault")} ${v(m.fault ? 1 : 0, m.fault ? "bad" : "v")}`,
        `${k("bool     ")}pedal       = ${v(m.rxPedal)}`]);
      uart.render();
      la.draw(m.t);
    }
    I.loop({ tick: P.tick, speed: () => speed, every: 2, step, sample, render });
    box._demo = { m, brake, drive, unplug, resetFault, setAbs: v => { m.abs = v; }, setRoad: v => { m.road = v; }, setSpeed: v => { speed = v; }, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("brakes", mount, CSS);
})();
