/* Look inside a microwave oven (inside/microwave.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget microwave"></div>
 *
 * A keypad and a door switch in; relays out for the magnetron, the turntable motor and the lamp, plus a buzzer.
 * The firmware is a switch-based state machine run every 10 ms: IDLE, COOKING, PAUSED, DONE. Half power is
 * slow PWM of the magnetron relay: on 2 s of every 4 s. The magnetron's supply also runs through a second door
 * switch in hardware, so an open door stops it whatever the firmware does (the idea of lesson 112).
 * Watchdog (lesson 84): every pass of the loop kicks it; if the kicks stop for 100 ms it resets the chip, and
 * after a reset every output starts off. "Freeze" simulates a bug that hangs the loop with the outputs as they
 * were. Illustrative: the 100 ms timeout, the 0.3 s boot, the 4 s PWM period, the heating rate of the food.
 * Time is in seconds.
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .microwave .oven{fill:var(--bg);stroke:var(--fg);stroke-width:1.8}
  .microwave .cav{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2;transition:fill .2s}
  .microwave .cav.lamp{fill:var(--accent-soft)} .microwave .cav.cook{fill:var(--warn-soft)}
  .microwave .door{fill:var(--bg);fill-opacity:.25;stroke:var(--fg);stroke-width:1.6;cursor:pointer}
  .microwave .slab{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.4;cursor:pointer}
  .microwave .plate{fill:none;stroke:var(--muted);stroke-width:2}
  .microwave .food{fill:var(--good-soft);stroke:var(--good);stroke-width:1.4}
  .microwave .food.warm{fill:var(--warn-soft);stroke:var(--warn)} .microwave .food.burnt{fill:var(--bad-soft);stroke:var(--bad);stroke-width:2.4}
  .microwave .hotf{fill:var(--bad)}
  .microwave .smoke{fill:none;stroke:var(--muted);stroke-width:2;stroke-linecap:round;opacity:.7}
  .microwave .disp{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2}
  .microwave .seg7{fill:var(--accent);font-family:var(--mono);font-size:24px;font-weight:700;text-anchor:middle}
  .microwave .seg7.bad{fill:var(--bad)}
  .microwave .key{fill:var(--bg);stroke:var(--muted);stroke-width:1.2;cursor:pointer} .microwave .key:hover{stroke:var(--accent)} .microwave .key.on{fill:var(--accent);stroke:var(--accent)}
  .microwave .kt{fill:var(--fg);font-family:var(--sans);font-size:11px;font-weight:600;text-anchor:middle;pointer-events:none}
  .microwave .part{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2} .microwave .part.on{fill:var(--accent-soft);stroke:var(--accent)} .microwave .part.mag{fill:var(--warn-soft);stroke:var(--warn)}
  .microwave .dsw{stroke:var(--fg);stroke-width:2;stroke-linecap:round}
  .microwave .wdtb{fill:var(--good)} .microwave .wdtb.late{fill:var(--bad)}
  .microwave .wdtf{fill:none;stroke:var(--muted);stroke-width:1}`;

  const W = 1200, H = 640;
  const CHIP = { x: 640, y: 200, w: 160, h: 250 };
  const CARD = { x: 840, y: 16, w: 350, h: 608 };
  const SX = CARD.x + 22, SX2 = CARD.x + 208, SW = 120, RX = CARD.x + CARD.w - 20;
  const P = { tick: 0.01, wdt: 0.1, boot: 0.3, period: 4, heat: 1.2 };
  const PARTS = [["MAG", "magnetron", 60, 780, 605], ["TURN", "turntable", 170, 740, 590], ["LAMP", "lamp", 280, 700, 575], ["BUZZ", "buzzer", 390, 660, 560]];

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "A microwave oven wired to a microcontroller with a watchdog, and the firmware inside it" });
    const dyn = { parts: [], pw: [] };

    // ---- wires
    dyn.doorW = S("path", { class: "w", d: `M366 106 V70 H620 V250 H${CHIP.x - 10}` });
    dyn.keyW = S("path", { class: "w bus", d: `M540 330 H${CHIP.x - 10}` });
    s.append(dyn.doorW, dyn.keyW);
    PARTS.forEach(([pin, , x, px, hy]) => { const w = S("path", { class: "w", d: `M${x + 45} 530 V${hy} H${px} V${CHIP.y + CHIP.h + 10}` }); dyn.pw.push(w); s.append(w); });

    // ---- oven
    s.append(S("rect", { class: "oven", x: 30, y: 90, width: 530, height: 360, rx: 12 }));
    dyn.cav = S("rect", { class: "cav", x: 50, y: 110, width: 320, height: 320, rx: 6 });
    s.append(dyn.cav);
    dyn.plate = S("ellipse", { class: "plate", cx: 210, cy: 404, rx: 110, ry: 16 });
    dyn.food = S("rect", { class: "food", y: 352, width: 64, height: 44, rx: 10 });
    dyn.smoke = S("path", { class: "smoke" });
    s.append(dyn.plate, dyn.food, dyn.smoke);
    s.append(S("rect", { class: "part", x: 356, y: 104, width: 20, height: 10, rx: 2 }), S("text", { class: "t s end", x: 352, y: 102 }, "door switch"));
    // keypad
    s.append(S("rect", { class: "disp", x: 410, y: 116, width: 130, height: 50, rx: 6 }));
    dyn.seg = S("text", { class: "seg7", x: 475, y: 150 }); s.append(dyn.seg);
    dyn.keys = {};
    [["plus", "+30 s", 410, 186], ["power", "Power", 480, 186], ["start", "Start", 410, 236], ["stop", "Stop", 480, 236]].forEach(([k, l, x, y]) => {
      const r = S("rect", { class: "key", x, y, width: 60, height: 36, rx: 6, tabindex: 0, role: "button", "aria-label": l });
      r.addEventListener("click", () => key(k));
      dyn.keys[k] = r; s.append(r, S("text", { class: "kt", x: x + 30, y: y + 22 }, l));
    });
    dyn.pwr = S("text", { class: "t s mid", x: 475, y: 296 }); s.append(dyn.pwr);
    dyn.foodT = S("text", { class: "t s mid", x: 475, y: 320 }); s.append(dyn.foodT);
    // parts under the oven; the magnetron's supply goes through a second door switch
    PARTS.forEach(([pin, name, x], i) => {
      const r = S("rect", { class: "part", x, y: 470, width: 90, height: 60, rx: 6 });
      dyn.parts.push(r); s.append(r, S("text", { class: "t s mid", x: x + 45, y: 496 }, name), S("text", { class: "t s mid", x: x + 45, y: 512 }, i === 0 ? "+ relay" : "relay"));
    });
    s.append(S("line", { class: "w", x1: 105, x2: 105, y1: 450, y2: 456 }), S("line", { class: "w", x1: 105, x2: 105, y1: 464, y2: 470 }));
    dyn.dsw = S("line", { class: "dsw", x1: 105, y1: 464 });
    s.append(dyn.dsw, S("text", { class: "t s", x: 112, y: 464 }, "door switch 2"));
    // door (drawn last so it covers the cavity)
    dyn.door = S("g");
    dyn.doorClosed = S("rect", { class: "door", x: 46, y: 106, width: 328, height: 328, rx: 8 });
    dyn.doorOpen = S("path", { class: "slab", d: "M46 106 L8 130 L8 410 L46 434 Z" });
    dyn.doorClosed.addEventListener("click", () => door()); dyn.doorOpen.addEventListener("click", () => door());
    s.append(dyn.doorClosed, dyn.doorOpen);

    I.chip(s, { ...CHIP, sub: "loop every 10 ms", labelAt: [720, 300], left: [[250, "DOOR"], [330, "KEYS"]], bottom: PARTS.map(p => [p[3], p[0]]) });
    s.append(S("text", { class: "t s", x: 660, y: 384 }, "WATCHDOG"), S("rect", { class: "wdtf", x: 660, y: 390, width: 120, height: 10, rx: 2 }));
    dyn.wdtb = S("rect", { class: "wdtb", x: 660, y: 390, height: 10, rx: 2 }); s.append(dyn.wdtb);
    dyn.wdtTxt = S("text", { class: "t s", x: 660, y: 416 }); s.append(dyn.wdtTxt);

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 46, title: "STATE MACHINE · switch (state)", lessons: [56] });
    const sm = I.stateMachine(s, {
      w: SW, states: { IDLE: [SX, 74], COOKING: [SX2, 74], DONE: [SX, 156], PAUSED: [SX2, 156] },
      paths: { "IDLE>COOKING": `M${SX + SW} 82 H${SX2 - 2}`, "COOKING>DONE": `M${SX2} 98 L${SX + SW - 10} 154`, "COOKING>PAUSED": `M${SX2 + 40} 102 V154`,
               "PAUSED>COOKING": `M${SX2 + 80} 156 V104`, "DONE>IDLE": `M${SX + 30} 156 V104`, "PAUSED>IDLE": `M${SX2} 172 H${SX + SW + 40} L${SX + 100} 104` },
      labels: [["start", (SX + SW + SX2) / 2, 77, "mid"], ["time 0", SX + SW + 4, 118, ""], ["door · stop", SX2 + 34, 134, "end"], ["start", SX2 + 86, 134, ""],
               ["5 s", SX + 36, 134, ""], ["stop", SX + SW + 44, 186, ""]] });
    s.append(S("text", { class: "t s", x: SX, y: 214 }, "every pass ends with wdt_kick()"));
    I.section(s, { x: SX, x2: RX, y: 252, title: "RAM", lessons: [20], sep: true });
    const ram = I.ram(s, SX, 276);
    I.section(s, { x: SX, x2: RX, y: 434, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 456, n: 9, fmt: t => "[" + t.toFixed(2).padStart(7, " ") + "]", empty: "press +30 s, then Start" });

    // ---- callouts
    const co = I.callouts(s, [
      ["door", 60, 124, 150, "Door switch", ["A GPIO input. Opened while", "cooking: PAUSED and every", "output off."], [52, 56], [366, 112]],
      ["lock", 215, 124, 150, "Hardware interlock", ["A second switch sits in the", "magnetron's supply: an open", "door stops it, bug or not."], [112], [105, 460]],
      ["mag", 60, 224, 150, "Magnetron relay", ["Half power is slow PWM:", "on 2 s of every 4 s. The", "relay cannot switch faster."], [59, 14], [105, 470]],
      ["out", 215, 224, 150, "Other outputs", ["Turntable and lamp relays,", "and a buzzer driven with", "PWM for the beep."], [51, 59], [325, 470]],
      ["keys", 386, 8, 170, "Keypad", ["Four keys, scanned and", "debounced in the loop."], [52], [470, 116]],
      ["wdt", 630, 8, 170, "Watchdog", ["Kicked every 10 ms. No kick", "for 100 ms: chip reset."], [84], [660, 395]]]);
    s.append(co.hot(I.hotspot({ x: 350, y: 98, width: 30, height: 20 }), "door"), co.hot(I.hotspot({ x: 90, y: 448, width: 90, height: 22 }), "lock"),
             co.hot(I.hotspot({ x: CHIP.x, y: 370, width: CHIP.w, height: 60 }), "wdt"), co.hot(I.hotspot({ x: 400, y: 108, width: 150, height: 60 }), "keys"));
    PARTS.forEach(([, , x], i) => s.append(co.hot(I.hotspot({ x, y: 470, width: 90, height: 60 }), i === 0 ? "mag" : "out")));
    co.raise();

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 20, note: "20 s · the magnetron relay as it switches", lanes: [
      { name: "DOOR", kind: "in, 1 = open", key: "door" }, { name: "MAG", kind: "relay, after switch 2", key: "mag", cls: "pwm" },
      { name: "TURN", kind: "relay", key: "turn" }, { name: "WDT", kind: "counter, 0–100 ms", key: "wdt", type: "ana", max: P.wdt, cls: "bad" },
      { name: "BUZZ", kind: "PWM out", key: "buzz", cls: "good" }] });
    const doorBtn = I.btn("Open door", () => door()), freezeBtn = I.btn("Freeze firmware", () => freeze(), "stop"), powerBtn = I.btn("Power cycle", () => powerCycle());
    let speed = 1, labels = "auto";
    I.frame(box, { scene: s, analyzer: la, bar: [
      [I.cap("Keys"), I.pill("+30", () => key("plus"), "+30 s"), I.pill("Pwr", () => key("power"), "power level"), I.pill("▶", () => key("start"), "start"), I.pill("■", () => key("stop"), "stop")],
      [doorBtn, freezeBtn, powerBtn, I.cap("Watchdog"), I.seg([[true, "On"], [false, "Off"]], true, v => { m.wdtOn = v; log(v ? "watchdog enabled" : "watchdog disabled"); co.show("wdt"); })],
      [I.cap("Speed"), I.seg([[1, "1×"], [5, "5×"], [20, "20×"]], 1, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });

    // ---------------------------------------------------------------- model
    const m = { t: 0, doorOpen: false, state: "IDLE", lastEdge: null, left: 0, power: 1, hung: false, wdtOn: true, wdt: 0, bootUntil: -1,
                out: { MAG: 0, TURN: 0, LAMP: 0, BUZZ: 0 }, keys: [], keyT: {}, T: 5, angle: 0, doneT: 0, resets: 0 };
    const log = txt => uart.log(m.t, txt);
    function go(next, why) { if (m.state !== next) { log(`${m.state} → ${next}${why ? "  " + why : ""}`); m.lastEdge = m.state + ">" + next; m.state = next; } }
    function key(k) { m.keys.push(k); m.keyT[k] = m.t; co.show("keys", 1500); }
    function door() { m.doorOpen = !m.doorOpen; co.show("door"); if (m.out.MAG) co.show("lock"); if (!m.doorOpen && m.T > 60) { /* food stays */ } }
    function freeze() { if (m.hung) return; m.hung = true; log("bug: loop stuck, outputs frozen"); co.show("wdt"); }
    function boot(why) { m.out = { MAG: 0, TURN: 0, LAMP: 0, BUZZ: 0 }; m.hung = false; m.state = "IDLE"; m.lastEdge = null; m.left = 0; m.keys = []; m.wdt = 0; m.bootUntil = m.t + P.boot; m.resets++; log(`reset (${why}): outputs off`); }
    function powerCycle() { boot("power on"); }
    /* The firmware: one pass every 10 ms, unless it is stuck or still booting. */
    function firmware() {
      if (m.hung) return;
      if (m.t < m.bootUntil) { m.wdt = 0; return; }            // the boot code kicks too
      const doorOpen = m.doorOpen;
      while (m.keys.length) {
        const k = m.keys.shift();
        if (k === "plus") { m.left += 30; if (m.state === "DONE") go("IDLE"); }
        else if (k === "power") { m.power = m.power === 1 ? 0.5 : 1; log(`power = ${m.power * 100} %`); co.show("mag"); }
        else if (k === "start") {
          if (doorOpen) { log("start ignored: the door is open"); co.show("door"); }
          else if (m.state === "IDLE" || m.state === "PAUSED" || m.state === "DONE") { if (!m.left) m.left = 30; go("COOKING", `${Math.ceil(m.left)} s at ${m.power * 100} %`); }
        } else if (k === "stop") {
          if (m.state === "COOKING") go("PAUSED", "stop key");
          else { if (m.state !== "IDLE") go("IDLE", "cleared"); m.left = 0; }
        }
      }
      const o = { MAG: 0, TURN: 0, LAMP: doorOpen ? 1 : 0, BUZZ: 0 };
      switch (m.state) {
        case "IDLE": break;
        case "COOKING":
          if (doorOpen) { go("PAUSED", "door opened"); co.show("door"); break; }
          m.left -= P.tick;
          o.MAG = (m.t % P.period) / P.period < m.power ? 1 : 0; o.TURN = 1; o.LAMP = 1;
          if (m.left <= 0) { m.left = 0; m.doneT = m.t; go("DONE", "time is up"); }
          break;
        case "PAUSED": break;
        case "DONE":
          o.BUZZ = m.t - m.doneT < 1.5 && (m.t - m.doneT) % 0.5 < 0.3 ? 1 : 0;
          if (doorOpen || m.t - m.doneT > 5) go("IDLE");
          break;
      }
      m.out = o;
      m.wdt = 0;                                                // wdt_kick()
    }
    function physics(dt) {
      if (m.wdtOn) { m.wdt += dt; if (m.wdt > P.wdt + 1e-9) { boot("watchdog"); co.show("wdt", 5000); } }
      const magOn = m.out.MAG && !m.doorOpen;                    // switch 2 in hardware
      m.T += (magOn ? P.heat : 0) * dt - (m.T - 20) * 0.002 * dt;
      m.T = Math.min(m.T, 250);
      if (m.out.TURN) m.angle += dt * 2 * Math.PI / 10;
    }
    function sample() { la.push(m.t, { door: m.doorOpen ? 1 : 0, mag: m.out.MAG && !m.doorOpen ? 1 : 0, turn: m.out.TURN, wdt: Math.min(P.wdt, m.wdtOn ? m.wdt : 0), buzz: m.out.BUZZ }); }

    // ---------------------------------------------------------------- drawing
    function render(now) {
      const magOn = m.out.MAG && !m.doorOpen;
      cls(dyn.cav, "cav" + (magOn ? " cook" : m.out.LAMP ? " lamp" : ""));
      dyn.doorClosed.style.display = m.doorOpen ? "none" : ""; dyn.doorOpen.style.display = m.doorOpen ? "" : "none";
      dyn.food.setAttribute("x", 178 + 52 * Math.sin(m.angle));
      cls(dyn.food, "food" + (m.T > 130 ? " burnt" : m.T > 50 ? " warm" : ""));
      const fx = 210 + 52 * Math.sin(m.angle);
      dyn.smoke.setAttribute("d", m.T > 130 ? `M${fx - 10} 346 c-8 -12 8 -18 0 -30 c-8 -12 8 -18 0 -30 M${fx + 12} 344 c-6 -10 6 -16 0 -26` : "");
      dyn.dsw.setAttribute("x2", m.doorOpen ? 115 : 105); dyn.dsw.setAttribute("y2", m.doorOpen ? 452 : 456);
      const booting = m.t < m.bootUntil;
      dyn.seg.textContent = booting ? "- - - -" : m.state === "DONE" ? "End" : `${Math.floor(Math.ceil(m.left) / 60)}:${String(Math.ceil(m.left) % 60).padStart(2, "0")}`;
      cls(dyn.seg, "seg7" + (m.hung ? " bad" : ""));
      dyn.pwr.textContent = `power ${m.power * 100} %`;
      for (const k in dyn.keys) cls(dyn.keys[k], "key" + (m.t - (m.keyT[k] ?? -9) < 0.15 ? " on" : ""));
      PARTS.forEach(([pin], i) => {
        const on = pin === "MAG" ? magOn : m.out[pin];
        cls(dyn.parts[i], "part" + (on ? (pin === "MAG" ? " mag" : " on") : ""));
        cls(dyn.pw[i], "w" + (m.out[pin] ? " on" : ""));
      });
      cls(dyn.doorW, "w" + (m.doorOpen ? " on" : ""));
      cls(dyn.keyW, "w bus" + (Object.values(m.keyT).some(t => m.t - t < 0.15) ? " on" : ""));
      const frac = m.wdtOn ? Math.min(1, m.wdt / P.wdt) : 0;
      dyn.wdtb.setAttribute("width", Math.max(1, 120 * frac)); cls(dyn.wdtb, "wdtb" + (frac > 0.5 ? " late" : ""));
      dyn.wdtTxt.textContent = !m.wdtOn ? "disabled" : m.hung ? `no kick for ${Math.round(m.wdt * 1000)} ms` : booting ? "booting" : "kicked every 10 ms";
      doorBtn.textContent = m.doorOpen ? "Close door" : "Open door";
      freezeBtn.disabled = m.hung;
      sm.set(m.state, m.lastEdge);
      co.update(now, labels);
      const k = I.k, v = I.v;
      ram.set([
        `${k("uint16_t ")}seconds_left = ${v(Math.ceil(m.left))}`,
        `${k("uint8_t  ")}power_pct    = ${v(m.power * 100)}`,
        `${k("uint8_t  ")}outputs      = ${I.bits((m.out.MAG) | (m.out.TURN << 1) | (m.out.LAMP << 2) | (m.out.BUZZ << 3), 4)} ${k("BUZ LMP TRN MAG")}`,
        `${k("bool     ")}door_open    = ${v(m.doorOpen ? 1 : 0)}`,
        `${k("uint16_t ")}wdt_ms       = ${v(m.wdtOn ? Math.round(Math.min(m.wdt, P.wdt) * 1000) : "off", m.hung ? "bad" : "v")}`,
        `${k("uint8_t  ")}resets       = ${v(m.resets)}`
      ]);
      dyn.foodT.textContent = `food ${Math.round(m.T)} °C`; cls(dyn.foodT, "t s mid" + (m.T > 130 ? " hotf" : ""));
      uart.render();
      la.draw(m.t);
    }
    I.loop({ tick: P.tick, speed: () => speed, every: 2, step(dt) { m.t += dt; firmware(); physics(dt); }, sample, render });
    box._demo = { m, key, door, freeze, powerCycle, setWdt: v => { m.wdtOn = v; }, setSpeed: v => { speed = v; }, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("microwave", mount, CSS);
})();
