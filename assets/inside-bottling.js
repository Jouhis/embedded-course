/* Look inside a bottling line (inside/bottling.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget bottling"></div>
 *
 * A belt carries bottles past two light beams at one spot: the lower beam sees a bottle, the upper one sees
 * liquid. The lower beam's edge fires an interrupt; the ISR reads the upper beam and, for an underfilled
 * bottle, puts the position where it will reach the reject solenoid into a ring-buffer queue. The main loop
 * fires the solenoid when that position comes round. Position is either the belt encoder's count (right at
 * any belt speed) or a fixed time delay (right only at the speed it was set for).
 * Modbus RTU: a master polls the line every second with function 03 (read holding registers), registers 0
 * and 1 = good and rejected counts; frames carry CRC-16/MODBUS (polynomial 0xA001, init 0xFFFF, low byte
 * first), checked against lesson 101's example: 01 03 00 00 00 02 → C4 0B.
 * Illustrative numbers: 1 encoder count per mm, 240 mm from beams to solenoid, belt speeds, the 2.0 s delay
 * (240 mm at the normal 120 mm/s), the 60 ms solenoid pulse, bottle spacing and the share of underfilled ones.
 * Time is in seconds; 1 px = 1 mm.
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .bottling .belt{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.5}
  .bottling .tread{stroke:var(--muted);stroke-width:2;stroke-dasharray:4 10}
  .bottling .roll{fill:var(--bg);stroke:var(--fg);stroke-width:1.5}
  .bottling .glass{fill:var(--bg);stroke:var(--fg);stroke-width:1.4}
  .bottling .liq{fill:var(--accent);opacity:.45;stroke:none}
  .bottling .glass.wrong{stroke:var(--bad);stroke-width:2.5}
  .bottling .post{fill:var(--code-bg);stroke:var(--muted);stroke-width:1}
  .bottling .eye{fill:var(--bg);stroke:var(--muted);stroke-width:1.2}
  .bottling .eye.on{fill:var(--accent);stroke:var(--accent)}
  .bottling .sol{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.4}
  .bottling .sol.on{fill:var(--warn-soft);stroke:var(--warn)}
  .bottling .plunger{fill:var(--muted)}
  .bottling .bin{fill:none;stroke:var(--muted);stroke-width:1.5}
  .bottling .hmi{fill:var(--bg);stroke:var(--muted);stroke-width:1.2}
  .bottling .frame{font-family:var(--mono);font-size:10px;fill:var(--muted)}
  .bottling .frame.new{fill:var(--fg)}`;

  const W = 1200, H = 640;
  const BELT = { x0: 40, x1: 580, y: 360 }, EYE = 200, SOL = 425, DIST = 240, BW = 30, BH = 80;
  const CHIP = { x: 640, y: 220, w: 160, h: 250 };
  const CARD = { x: 840, y: 16, w: 350, h: 608 };
  const SX = CARD.x + 20, RX = CARD.x + CARD.w - 18;
  const P = { tick: 0.001, vmax: 200, lag: 0.4, pulse: 0.06, delay: 2.0, poll: 1.0 };

  function crc16(bytes) {
    let c = 0xFFFF;
    for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = c & 1 ? (c >> 1) ^ 0xA001 : c >> 1; }
    return c;
  }
  const withCrc = b => { const c = crc16(b); return [...b, c & 0xFF, c >> 8]; };
  const hex = a => a.map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "A bottling line with light beams, an encoder and a reject solenoid wired to a microcontroller, and the firmware inside it" });
    const dyn = {};

    // ---- wires under everything
    dyn.botW = S("path", { class: "w", d: `M${EYE} 400 V560 H600 V300 H${CHIP.x - 10}` });
    dyn.lvlW = S("path", { class: "w", d: `M${EYE + 4} 400 V575 H615 V340 H${CHIP.x - 10}` });
    dyn.encW = S("path", { class: "w", d: `M100 418 V600 H680 V${CHIP.y + CHIP.h + 10}` });
    dyn.motW = S("path", { class: "w", d: `M56 424 V620 H740 V${CHIP.y + CHIP.h + 10}` });
    dyn.solW = S("path", { class: "w", d: `M700 ${CHIP.y - 10} V170 H${SOL} V196` });
    dyn.busW = S("path", { class: "w bus", d: `M760 ${CHIP.y - 10} V120` });
    s.append(dyn.botW, dyn.lvlW, dyn.encW, dyn.motW, dyn.solW, dyn.busW);

    // ---- HMI / PLC (the Modbus master)
    s.append(S("rect", { class: "hmi", x: 470, y: 12, width: 330, height: 108, rx: 8 }), S("text", { class: "t h", x: 484, y: 30 }, "PLC · MODBUS MASTER"));
    dyn.count = S("text", { class: "t b", x: 484, y: 52 });
    dyn.frames = [0, 1].map(i => { const t = S("text", { class: "frame", x: 484, y: 76 + i * 18, "xml:space": "preserve" }); s.append(t); return t; });
    s.append(dyn.count, S("rect", { class: "box", x: 742, y: 140, width: 36, height: 18, rx: 3 }), S("text", { class: "t s mid", x: 760, y: 153 }, "485"));

    // ---- solenoid, reject bin
    dyn.sol = S("rect", { class: "sol", x: SOL - 15, y: 196, width: 30, height: 40, rx: 4 });
    dyn.plunger = S("rect", { class: "plunger", x: SOL - 4, y: 236, width: 8, height: 6 });
    s.append(dyn.plunger, dyn.sol, S("text", { class: "t s end", x: SOL - 20, y: 232 }, "solenoid"));
    s.append(S("path", { class: "bin", d: "M392 404 V470 H478 V404" }), S("text", { class: "t s mid", x: 435, y: 486 }, "REJECT"));
    dyn.binTxt = S("text", { class: "t s mid", x: 435, y: 500 });
    s.append(dyn.binTxt);

    // ---- sensor post behind the bottles
    s.append(S("rect", { class: "post", x: EYE - 4, y: 290, width: 12, height: 110 }));
    dyn.eyeL = S("rect", { class: "eye", x: EYE - 8, y: 301, width: 20, height: 10, rx: 3 });
    dyn.eyeB = S("rect", { class: "eye", x: EYE - 8, y: 340, width: 20, height: 10, rx: 3 });
    s.append(dyn.eyeL, dyn.eyeB);

    // ---- belt, motor, encoder
    s.append(S("rect", { class: "belt", x: BELT.x0, y: BELT.y, width: BELT.x1 - BELT.x0, height: 16, rx: 8 }));
    dyn.tread = S("line", { class: "tread", x1: BELT.x0 + 10, x2: BELT.x1 - 10, y1: BELT.y + 8, y2: BELT.y + 8 });
    s.append(dyn.tread, S("circle", { class: "roll", cx: 56, cy: 368, r: 6 }), S("circle", { class: "roll", cx: 564, cy: 368, r: 6 }));
    s.append(S("line", { class: "w", x1: 56, x2: 56, y1: 374, y2: 396 }), S("circle", { class: "box", cx: 56, cy: 410, r: 14 }), S("text", { class: "t b mid", x: 56, y: 414 }, "M"));
    s.append(S("line", { class: "w", x1: 70, x2: 92, y1: 410, y2: 410 }), S("rect", { class: "box", x: 92, y: 402, width: 16, height: 16, rx: 3 }), S("text", { class: "t s", x: 112, y: 414 }, "enc"));

    // ---- bottles live in their own layer above the post
    dyn.layer = S("g"); s.append(dyn.layer);

    I.chip(s, { ...CHIP, sub: "1 ms loop + edge IRQ", labelAt: [720, 350],
      left: [[300, "BOTTLE"], [340, "LEVEL"]], top: [[700, "SOL"], [760, "RS485"]], bottom: [[680, "ENC"], [740, "MOTOR"]] });

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 40, title: "FIRMWARE", lessons: [57, 70] });
    const L = mode => [
      "void beam_isr(void) {        // BOTTLE edge",
      "  if (gpio_get(LEVEL_PIN)) good++;",
      mode === "enc" ? "  else q_push(enc_count() + 240);" : "  else q_push(millis() + 2000);",
      "}",
      "void loop(void) {            // every 1 ms",
      mode === "enc" ? "  if (q_len && enc_count() >= q_peek()) {" : "  if (q_len && millis() >= q_peek()) {",
      "    q_pop(); solenoid_pulse(60); rejected++;",
      "  }",
      "  modbus_poll();",
      "}"];
    const codes = { enc: I.code(s, { x: SX, y: 64, w: 318, lh: 15, lines: L("enc") }), time: I.code(s, { x: SX, y: 64, w: 318, lh: 15, lines: L("time") }) };
    I.section(s, { x: SX, x2: RX, y: 232, title: "RAM", lessons: [20, 71], sep: true });
    const ram = I.ram(s, SX, 256);
    I.section(s, { x: SX, x2: RX, y: 420, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 442, n: 9, fmt: t => "[" + t.toFixed(2).padStart(6, " ") + "]", empty: "bottles on the way…" });

    // ---- callouts
    const co = I.callouts(s, [
      ["belt", 14, 30, 170, "Belt motor and encoder", ["PWM sets the motor's speed.", "The encoder's pulses, counted", "by a timer, say how far it went."], [59, 71], [96, 402]],
      ["eye", 14, 140, 170, "Two light beams", ["Lower: a bottle is here.", "Upper: liquid is at the", "right height, or not."], [52], [EYE - 8, 306]],
      ["isr", 200, 22, 180, "Edge interrupt", ["A bottle cuts the lower beam:", "the ISR reads the upper one", "and queues bad bottles."], [57], [EYE + 12, 345]],
      ["sol", 200, 122, 180, "Reject solenoid", ["A MOSFET drives the coil for", "60 ms; a flyback diode takes", "the spike at turn-off."], [12, 14], [SOL - 15, 216]],
      ["queue", 220, 410, 160, "Reject queue", ["Positions wait in a ring", "buffer until the encoder", "count reaches them."], [70, 20], [CHIP.x, 400]],
      ["time", 220, 500, 160, "Tracking by time", ["A fixed 2 s wait is right", "only at normal speed.", "Change it: wrong bottle."], [71, 55], [SOL, 300]],
      ["modbus", 490, 140, 140, "Modbus RTU", ["Each second the master", "reads 2 holding registers", "over RS-485. CRC at the end."], [101], [742, 149]]]);
    s.append(co.hot(I.hotspot({ x: 40, y: 380, width: 80, height: 50 }), "belt"), co.hot(I.hotspot({ x: EYE - 10, y: 290, width: 24, height: 110 }), "eye"),
             co.hot(I.hotspot({ x: SOL - 18, y: 192, width: 36, height: 48 }), "sol"), co.hot(I.hotspot({ x: 470, y: 12, width: 330, height: 150 }), "modbus"),
             co.hot(I.hotspot({ x: CHIP.x, y: CHIP.y, width: CHIP.w, height: CHIP.h }), "queue"));
    co.raise();

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 6, note: "6 s · MOTOR PWM drawn with a 0.2 s period", lanes: [
      { name: "BOTTLE", kind: "in · edge IRQ", key: "bot" }, { name: "LEVEL", kind: "in", key: "lvl" },
      { name: "SOL", kind: "out, 60 ms", key: "sol", cls: "bad" }, { name: "MOTOR", kind: "PWM out", key: "duty", type: "pwm", period: 0.2, cls: "pwm" },
      { name: "RS485", kind: "Modbus frames", key: "bus", cls: "good" }] });
    let speed = 1, labels = "auto";
    const beltSeg = I.seg([[0, "Stop"], [0.35, "Slow"], [0.6, "Normal"], [0.9, "Fast"]], 0.6, v => belt(v));
    I.frame(box, { scene: s, analyzer: la, bar: [
      [I.cap("Belt"), beltSeg],
      [I.btn("Next one underfilled", () => { m.forceBad = true; log("next bottle will be underfilled"); }), I.cap("Track by"),
       I.seg([["enc", "Encoder"], ["time", "Time"]], "enc", v => mode(v))],
      [I.cap("Speed"), I.seg([[0.5, "½×"], [1, "1×"], [2, "2×"]], 1, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });

    // ---------------------------------------------------------------- model
    const m = { t: 0, duty: 0.6, v: 0, pos: 0, bottles: [], id: 0, nextGap: 60, forceBad: false, mode: "enc", q: [], good: 0, rejected: 0,
                solT: -9, isrT: -9, fireT: -9, pollT: 0, busUntil: 0, pending: null, wrong: 0, missed: 0, prevBot: 0, req: [], rep: [] };
    const rnd = (() => { let x = 7; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
    const log = txt => uart.log(m.t, txt);
    const enc = () => Math.floor(m.pos);
    function belt(v) { m.duty = v; log(v ? `motor duty = ${Math.round(v * 100)} %` : "belt stopped"); co.show("belt"); if (m.mode === "time") co.show("time"); }
    function mode(v) { m.mode = v; m.q = []; log(v === "enc" ? "tracking by encoder count" : "tracking by time: 2000 ms"); co.show(v === "time" ? "time" : "queue"); }
    const at = x => m.bottles.find(b => b.st === "belt" && b.x - BW <= x && x <= b.x);
    /* Inputs as the pins see them. */
    const pinBot = () => at(EYE) ? 1 : 0;
    const pinLvl = () => { const b = at(EYE); return b && b.full ? 1 : 0; };
    /* The firmware: the beam ISR on a rising edge, the loop every 1 ms. */
    function beamIsr() {
      m.isrT = m.t;
      const b = at(EYE);
      if (pinLvl()) { m.good++; log(`irq: bottle ${b.id} level OK, good = ${m.good}`); return; }
      const key = m.mode === "enc" ? enc() + DIST : Math.round(m.t * 1000) + 2000;
      if (m.q.length < 8) m.q.push(key);
      log(`irq: bottle ${b.id} LOW, queue ${m.mode === "enc" ? "enc" : "ms"} ${key}`); co.show("isr"); co.show("queue");
    }
    function loop() {
      const now = m.mode === "enc" ? enc() : Math.round(m.t * 1000);
      if (m.q.length && now >= m.q[0]) {
        m.q.shift(); m.solT = m.t; m.fireT = m.t; m.rejected++;
        log(`solenoid fired at ${m.mode === "enc" ? "enc " + now : now + " ms"}`); co.show("sol");
      }
      if (m.t - m.pollT >= P.poll) {                       // the master's request arrives
        m.pollT = m.t;
        m.req = withCrc([0x01, 0x03, 0x00, 0x00, 0x00, 0x02]);
        m.rep = withCrc([0x01, 0x03, 0x04, m.good >> 8 & 0xFF, m.good & 0xFF, m.rejected >> 8 & 0xFF, m.rejected & 0xFF]);
        m.busUntil = m.t + 0.03;
      }
    }
    function physics(dt) {
      const vCmd = m.duty * P.vmax;
      m.v += (vCmd - m.v) * Math.min(1, dt / P.lag);
      const dx = m.v * dt;
      m.pos += dx;
      for (const b of m.bottles) {
        if (b.st === "belt") {
          b.x += dx;
          if (m.t - m.solT < P.pulse && b.x - BW <= SOL && SOL <= b.x) {
            b.st = "fall"; b.ft = 0;
            if (b.full) { m.wrong++; b.wrong = true; log(`a full bottle (${b.id}) was pushed!`); if (m.mode === "time") co.show("time", 5000); }
          }
          if (b.x - BW > BELT.x1 - 10) { b.st = "gone"; if (!b.full) { m.missed++; b.wrong = true; log(`underfilled bottle ${b.id} got through!`); if (m.mode === "time") co.show("time", 5000); } }
        } else if (b.st === "fall") { b.ft += dt; if (b.ft > 0.6) b.st = "bin"; }
      }
      m.bottles = m.bottles.filter(b => b.st === "belt" || b.st === "fall");
      // a new bottle at the start of the belt
      const last = m.bottles.filter(b => b.st === "belt").reduce((a, b) => Math.min(a, b.x), 1e9);
      if (last - BW - BELT.x0 > m.nextGap || last === 1e9) {
        const full = m.forceBad ? false : rnd() > 0.18;
        m.forceBad = false;
        m.bottles.push({ id: ++m.id, x: BELT.x0 + BW - 4, full, st: "belt" });
        m.nextGap = 40 + rnd() * 70;
      }
      const bot = pinBot();
      if (bot && !m.prevBot) beamIsr();
      m.prevBot = bot;
    }
    function sample() { la.push(m.t, { bot: pinBot(), lvl: pinLvl(), sol: m.t - m.solT < P.pulse ? 1 : 0, duty: m.duty, bus: m.t < m.busUntil ? 1 : 0 }); }

    // ---------------------------------------------------------------- drawing
    const pool = [];
    function bottleEl(i) {
      if (!pool[i]) {
        const g = S("g"), glass = S("rect", { class: "glass", width: BW, height: BH, rx: 5 }), liq = S("rect", { class: "liq", width: BW - 6 });
        const neck = S("rect", { class: "glass", width: 12, height: 14, rx: 2 });
        g.append(neck, glass, liq); dyn.layer.append(g); pool[i] = { g, glass, liq, neck };
      }
      return pool[i];
    }
    function render(now) {
      dyn.tread.setAttribute("stroke-dashoffset", (-m.pos % 14).toFixed(1));
      let i = 0;
      for (const b of m.bottles) {
        const e = bottleEl(i++);
        let x = b.x - BW, y = BELT.y - BH, op = 1;
        if (b.st === "fall") { const f = Math.min(1, b.ft / 0.5); x = SOL - BW / 2 + 0 * f; y += f * 64; op = 1 - 0.3 * f; }
        if (b.x - BW > BELT.x1 - 40) op = Math.max(0, 1 - (b.x - BW - (BELT.x1 - 40)) / 30);
        e.g.style.display = ""; e.g.setAttribute("opacity", op.toFixed(2));
        e.glass.setAttribute("x", x); e.glass.setAttribute("y", y);
        e.neck.setAttribute("x", x + 9); e.neck.setAttribute("y", y - 12);
        const top = b.full ? 16 : 44;
        e.liq.setAttribute("x", x + 3); e.liq.setAttribute("y", y + top); e.liq.setAttribute("height", BH - top - 3);
        cls(e.glass, "glass" + (b.wrong ? " wrong" : ""));
      }
      for (; i < pool.length; i++) pool[i].g.style.display = "none";
      const bot = pinBot(), lvl = pinLvl(), fire = m.t - m.solT < P.pulse || m.t - m.fireT < 0.15;
      const botH = I.steady(dyn.eyeB, bot), lvlH = I.steady(dyn.eyeL, lvl);   // fast belts: keep each cut visible
      cls(dyn.eyeB, "eye" + (botH ? " on" : "")); cls(dyn.eyeL, "eye" + (lvlH ? " on" : ""));
      cls(dyn.botW, "w" + (botH ? " on" : "")); cls(dyn.lvlW, "w" + (lvlH ? " on" : ""));
      cls(dyn.encW, "w" + (m.v > 2 ? " on" : "")); cls(dyn.motW, "w" + (m.duty > 0 ? " on" : ""));
      const fireH = I.hold(dyn.sol, fire, 150);
      cls(dyn.solW, "w" + (fireH ? " on" : "")); cls(dyn.sol, "sol" + (fireH ? " on" : ""));
      dyn.plunger.setAttribute("height", fire ? 46 : 6);
      const busOn = m.t < m.busUntil + 0.25;
      cls(dyn.busW, "w bus" + (busOn ? " on" : ""));
      dyn.count.textContent = `good ${m.good} · rejected ${m.rejected}`;
      if (m.req.length) {
        dyn.frames[0].textContent = "→ " + hex(m.req) + "   read 2 regs";
        dyn.frames[1].textContent = "← " + hex(m.rep);
        cls(dyn.frames[1], "frame" + (busOn ? " new" : ""));
      }
      dyn.binTxt.textContent = m.wrong || m.missed ? `wrong pushes ${m.wrong} · got through ${m.missed}` : "";
      cls(dyn.binTxt, "t s mid" + (m.wrong || m.missed ? " bad" : ""));
      codes.enc.g.style.display = m.mode === "enc" ? "" : "none"; codes.time.g.style.display = m.mode === "time" ? "" : "none";
      const want = m.t - m.isrT < 0.15 ? "0,1,2" : m.t - m.fireT < 0.15 ? "5,6" : busOn ? "8" : "4,5";
      const lit = I.steady(codes, want, 200).split(",").map(Number);   // each highlight stays at least 0.2 s
      codes[m.mode].set(lit);
      co.update(now, labels);
      const k = I.k, v = I.v;
      ram.set([
        `${k("uint32_t ")}enc_count = ${v(enc())}`,
        `${k("uint32_t ")}millis()  = ${v(Math.round(m.t * 1000))}`,
        `${k("uint32_t ")}queue[8]  = ${v(m.q.length ? m.q.join(" ") : "empty")}`,
        `${k("uint8_t  ")}q_len     = ${v(m.q.length)}`,
        `${k("uint16_t ")}good      = ${v(m.good)}  ${k("rejected")} ${v(m.rejected)}`,
        `${k("uint8_t  ")}duty      = ${v(Math.round(m.duty * 100) + " %")}`,
        `${k("float    ")}belt      = ${v(Math.round(m.v) + " mm/s")}`]);
      uart.render();
      la.draw(m.t);
    }
    I.loop({ tick: P.tick, speed: () => speed, every: 10, step(dt) { m.t += dt; physics(dt); loop(); }, sample, render });
    box._demo = { m, belt, mode, crc16, withCrc, bad: () => { m.forceBad = true; }, setSpeed: v => { speed = v; }, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("bottling", mount, CSS);
})();
