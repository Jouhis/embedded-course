/* Look inside a keyboard (inside/keyboard.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget keyboard"></div>
 *
 * A 4 by 4 key matrix on 8 pins. Rows ROW[3:0] hold output value 0 and are switched between output (driven
 * low) and input (Hi-Z); columns COL[3:0] are inputs with pull-ups. A timer interrupt runs every 0.25 ms and
 * handles one row per run: read the columns of the row driven since the last run (so the lines have settled),
 * debounce them, release the row, drive the next one. All four rows take 1 ms.
 * Without diodes, current also runs backwards through other closed keys and the floating rows, so three
 * corners of a rectangle make the fourth read as pressed (a ghost). A diode per key stops that.
 * Debounce: an integrator per key, DEBOUNCE_SCANS = 10 scans at 1 ms (as in lesson 52).
 * USB: the boot keyboard report of HID 1.11 Appendix B.1: modifiers, reserved, six usage IDs from the
 *   Keyboard/Keypad page (HID Usage Tables ch. 10: a = 0x04 ... z = 0x1D, 1 = 0x1E ... 4 = 0x21). More than six
 *   keys, or a combination the firmware cannot resolve (the ghost rectangle), reports ErrorRollOver (0x01)
 *   in all six fields (HID 1.11 Appendix C and F.3). The host polls the interrupt endpoint (lesson 102);
 *   8 ms is an example interval.
 * Illustrative numbers: the contact bounce (1 to 3 ms of chatter) and the 0.25 ms scan step.
 * Time is in milliseconds. Speeds: 1/1000×, 1/50× and real time.
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .keyboard:focus{outline:none} .keyboard:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
  .keyboard .key{fill:var(--code-bg);stroke:var(--rule);stroke-width:1.5;cursor:pointer;transition:fill .1s}
  .keyboard .key:hover{stroke:var(--accent)}
  .keyboard .key.held{fill:var(--accent-soft);stroke:var(--muted)}
  .keyboard .key.closed{stroke:var(--accent);stroke-width:2.5}
  .keyboard .key.down{fill:var(--accent);stroke:var(--accent)}
  .keyboard .key.ghost{stroke:var(--bad);stroke-width:2.5;stroke-dasharray:5 3;fill:var(--bad-soft)}
  .keyboard .kl{fill:var(--fg);font-family:var(--mono);font-size:14px;font-weight:700;text-anchor:middle;pointer-events:none}
  .keyboard .key.down + .kl{fill:var(--bg)}
  .keyboard .cnt{fill:var(--warn);pointer-events:none}
  .keyboard .dio{fill:var(--fg)}
  .keyboard .dioL{stroke:var(--fg);stroke-width:1.5}
  .keyboard .w.hiz{stroke-dasharray:3 4}
  .keyboard .w.scan{stroke:var(--accent);stroke-opacity:.45;stroke-width:1.8}
  .keyboard .scanhint{fill:var(--muted);font-family:var(--mono);font-size:10px;text-anchor:middle}
  .keyboard .host{fill:var(--bg);stroke:var(--muted);stroke-width:1.2}
  .keyboard .typed{fill:var(--fg);font-family:var(--mono);font-size:13px}
  .keyboard .caret{fill:var(--accent);animation:kb-blink 1s steps(1) infinite}
  @keyframes kb-blink{50%{opacity:0}}
  @media (prefers-reduced-motion:reduce){.keyboard .caret{animation:none}}`;

  const W = 1200, H = 640;
  const KEYS = [["1", "2", "3", "4"], ["Q", "W", "E", "R"], ["A", "S", "D", "F"], ["Z", "X", "C", "V"]];
  const usage = k => /[0-9]/.test(k) ? 0x1D + +k : 0x04 + k.charCodeAt(0) - 65;
  const keyOf = u => KEYS.flat().find(k => usage(k) === u);
  const CX = [230, 310, 390, 470], RY = [170, 250, 330, 410];
  const CHIP = { x: 640, y: 130, w: 160, h: 330 };
  const CARD = { x: 840, y: 12, w: 350, h: 616 };
  const SX = CARD.x + 20, RX = CARD.x + CARD.w - 18;
  const P = { tick: 0.05, N: 10, poll: 8 };       // ms; one ISR line per tick, 5 ticks per ISR run

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "A 4 by 4 key matrix wired to a microcontroller, the USB link to a host, and the scan firmware" });
    const dyn = { rows: [], cols: [], keys: [], cnt: [], dio: [] };

    // ---- pull-up rail and columns (nested so no column wire crosses another)
    s.append(S("text", { class: "t s end", x: 214, y: 88 }, "3.3 V"), S("path", { class: "w", d: `M${CX[0] - 10} 84 H${CX[3] + 10}` }));
    for (let c = 0; c < 4; c++) {
      const x = CX[c], yb = 520 - 14 * c, px = 760 - 30 * c;
      s.append(S("path", { class: "w", d: `M${x} 84 V88 l5 2.5 -10 5 10 5 -10 5 10 5 -5 2.5 V112` }));
      const wire = S("path", { class: "w", d: `M${x} 112 V${yb} H${px} V${CHIP.y + CHIP.h + 10}` });
      dyn.cols.push(wire); s.append(wire);
    }
    // ---- rows, straight into the chip
    for (let r = 0; r < 4; r++) {
      const wire = S("path", { class: "w hiz", d: `M190 ${RY[r]} H${CHIP.x - 10}` });
      dyn.rows.push(wire); s.append(wire);
    }
    // ---- host PC and USB
    s.append(S("rect", { class: "host", x: 560, y: 10, width: 240, height: 70, rx: 8 }), S("text", { class: "t h", x: 572, y: 28 }, "HOST PC"));
    dyn.typed = S("text", { class: "typed", x: 572, y: 58 }); dyn.caret = S("rect", { class: "caret", y: 46, width: 7, height: 15 });
    dyn.usb = S("path", { class: "w bus", d: `M720 ${CHIP.y - 10} V80` });
    s.append(dyn.typed, dyn.caret, dyn.usb, S("text", { class: "t s end", x: 712, y: 104 }, "USB, polled every 8 ms"));

    I.chip(s, { ...CHIP, sub: "scan ISR every 0.25 ms", labelAt: [720, 300],
      left: RY.map((y, r) => [y, "ROW" + r]), bottom: [0, 1, 2, 3].map(c => [760 - 30 * c, "COL" + c]), top: [[720, "USB"]] });
    dyn.hint = S("g"); dyn.hint.append(S("text", { class: "scanhint", x: 720, y: 348 }, "rows too fast to see:"), S("text", { class: "scanhint", x: 720, y: 362 }, "try 1/1000×")); s.append(dyn.hint);

    const co = I.callouts(s, [
      ["cols", 236, 6, 196, "Columns: inputs, pulled up", ["Each reads 1 until a closed key", "joins it to the driven row."], [16, 52], [310, 100]],
      ["rows", 8, 128, 160, "Rows: one driven low", ["The scan drives one row to 0", "at a time. The others are", "inputs (Hi-Z), so they float."], [51, 16], [190, RY[0]]],
      ["bounce", 8, 250, 160, "Bounce and debounce", ["A contact chatters for a few", "ms. A key counts only after", "10 scans in a row agree."], [52], () => keyPt(m.focus)],
      ["diodes", 8, 372, 160, "Diodes", ["One per key lets current go", "one way only. Without them", "a fourth key can appear."], [9], [CX[0] + 32, RY[2] - 7]],
      ["ghost", 8, 494, 160, "Ghost key", ["Q, W and A closed: current", "runs back through W and Q", "and pulls S's column low."], [9, 20], () => ghostPt()],
      ["usb", 445, 6, 106, "USB HID", ["8-byte report,", "sent when the", "host polls."], [102], [560, 45]],
      ["isr", 250, 548, 230, "Scan timer interrupt", ["Every 0.25 ms: read one row, debounce,", "move on. All four rows take 1 ms."], [57, 71], [CHIP.x, CHIP.y + CHIP.h - 20]]]);
    s.append(co.hot(I.hotspot({ x: 180, y: 80, width: 310, height: 34 }), "cols"),
             co.hot(I.hotspot({ x: 530, y: 150, width: 100, height: 270 }), "rows"),
             co.hot(I.hotspot({ x: 560, y: 10, width: 240, height: 70 }), "usb"),
             co.hot(I.hotspot({ x: CHIP.x, y: CHIP.y, width: CHIP.w, height: CHIP.h }), "isr"));

    // ---- keys: column → switch → (diode) → row
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = CX[c], y = RY[r];
      s.append(S("path", { class: "w", d: `M${x} ${y - 28} H${x + 10} M${x + 32} ${y - 10} V${y}` }));
      const d = S("g"); d.append(S("path", { class: "dio", d: `M${x + 27} ${y - 9} h10 l-5 6 z` }), S("line", { class: "dioL", x1: x + 26, x2: x + 38, y1: y - 3, y2: y - 3 }));
      dyn.dio.push(d); s.append(d);
      const g = S("g", { role: "button", "aria-label": "key " + KEYS[r][c] });
      const key = S("rect", { class: "key", x: x + 10, y: y - 46, width: 44, height: 36, rx: 6 });
      const bar = S("rect", { class: "cnt", x: x + 14, y: y - 16, height: 3, rx: 1.5, width: 0 });
      g.append(key, S("text", { class: "kl", x: x + 32, y: y - 23 }, KEYS[r][c]), bar);
      g.addEventListener("pointerdown", e => { e.preventDefault(); box.focus(); hold(r, c, !m.held[r][c]); });
      co.hot(g, "bounce");
      dyn.keys.push(key); dyn.cnt.push(bar); s.append(g);
    }

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 40, title: "SCAN ISR · every 0.25 ms", lessons: [57, 71] });
    const code = I.code(s, { x: SX, y: 66, w: 318, lines: [
      "void scan_isr(void) {",
      "  cols = ~(gpio_get_all() >> COL0) & 0xF;",
      "  debounce(row, cols);",
      "  gpio_set_dir(ROW_PIN[row], GPIO_IN);",
      "  row = (row + 1) & 3;",
      "  gpio_set_dir(ROW_PIN[row], GPIO_OUT);",
      "}"] });
    I.section(s, { x: SX, x2: RX, y: 210, title: "RAM", lessons: [20, 52], sep: true });
    const ram = I.ram(s, SX, 234, 19);
    I.section(s, { x: SX, x2: RX, y: 418, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 440, n: 10, lh: 17, empty: "type 1234 QWER ASDF ZXCV, or click a key", fmt: t => "[" + t.toFixed(2).padStart(8, " ") + " ms]" });
    co.raise();

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 40, label: a => a + " ms", note: "the last key you pressed · 40 ms", lanes: [
      { name: "ROW_DRIVE", kind: "out, its row low", key: "row" }, { name: "COL_LOW", kind: "in, its column", key: "col" },
      { name: "CONTACT", kind: "the switch itself", key: "raw", cls: "pwm" }, { name: "DEBOUNCED", kind: "firmware state", key: "down", cls: "good" },
      { name: "USB_IN", kind: "host poll", key: "poll" }] });
    let speed = 20, labels = "auto";
    I.frame(box, { scene: s, analyzer: la, bar: [
      [I.cap("Try"), I.btn("Q + W + A", () => preset(["Q", "W", "A"])), I.btn("7 keys", () => preset(["Q", "W", "E", "R", "A", "S", "D"])), I.btn("Release all", () => preset([]))],
      [I.cap("Diodes"), I.seg([[false, "Off"], [true, "On"]], false, v => setDiodes(v))],
      [I.cap("Speed"), I.seg([[1, "1/1000×"], [20, "1/50×"], [1000, "1× real"]], 20, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });
    box.tabIndex = 0;

    // ---------------------------------------------------------------- model
    const grid = () => KEYS.map(r => r.map(() => 0));
    const m = { t: 0, n: 0, line: 0, row: 0, driven: 0, held: grid(), bounce: grid(), cnt: grid(), down: grid(), raw: [0, 0, 0, 0],
                report: new Array(8).fill(0), sent: new Array(8).fill(0), diodes: false, focus: [1, 0], typed: "", lastPoll: -99 };
    const rnd = (() => { let x = 12345; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
    const log = txt => uart.log(m.t, txt);
    /* A key changes: its contact chatters for 1 to 3 ms before it settles. */
    function hold(r, c, on) {
      const to = on ? 1 : 0;
      if (m.held[r][c] === to) return;
      const from = contact(r, c), flips = [];
      let t = m.t + 0.05;
      const end = m.t + 1 + 2 * rnd();
      while (t < end) { flips.push(t); t += 0.08 + 0.4 * rnd(); }
      if ((flips.length % 2 === 1) !== (from !== to)) flips.push(t);
      m.held[r][c] = to; m.bounce[r][c] = flips.length ? { from, flips } : 0;
      m.focus = [r, c];
      co.show("bounce");
    }
    /* The contact now: the starting state, flipped once for each flip time that has passed. */
    function contact(r, c) {
      const b = m.bounce[r][c];
      if (!b) return m.held[r][c];
      let n = 0; for (const f of b.flips) if (f <= m.t) n++;
      if (n === b.flips.length) { m.bounce[r][c] = 0; return m.held[r][c]; }
      return n % 2 ? 1 - b.from : b.from;
    }
    /* Columns that read 0 while `row` is driven low. Without diodes closed keys conduct both ways and the
       other rows float, so every column joined to the row through closed keys is pulled low. */
    function lowCols(row) {
      if (row < 0) return [];
      if (m.diodes) return [0, 1, 2, 3].filter(c => contact(row, c));
      const rows = new Set([row]), cols = new Set();
      for (let grew = true; grew;) {
        grew = false;
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (contact(r, c)) {
          if (rows.has(r) && !cols.has(c)) { cols.add(c); grew = true; }
          if (cols.has(c) && !rows.has(r)) { rows.add(r); grew = true; }
        }
      }
      return [...cols];
    }
    function setDiodes(v) { m.diodes = v; log(v ? "diodes fitted: one per key" : "diodes removed"); if (v) co.show("diodes"); build(); }
    function debounce(row, cols) {
      let changed = false;
      for (let c = 0; c < 4; c++) {
        if (cols >> c & 1) { if (m.cnt[row][c] < P.N) m.cnt[row][c]++; } else if (m.cnt[row][c] > 0) m.cnt[row][c]--;
        if (!m.down[row][c] && m.cnt[row][c] === P.N) { m.down[row][c] = 1; changed = true; log(`key ${KEYS[row][c]} down${m.held[row][c] ? "" : ", but nobody pressed it: ghost"}`); }
        if (m.down[row][c] && m.cnt[row][c] === 0) { m.down[row][c] = 0; changed = true; log(`key ${KEYS[row][c]} up`); }
      }
      if (changed) build();
    }
    /* Two rows that share two or more down columns: the firmware cannot tell which key is real. */
    function rectangle() {
      const rowBits = m.down.map(r => r.reduce((a, b, c) => a | b << c, 0));
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) { const both = rowBits[a] & rowBits[b]; if (both & (both - 1)) return true; }
      return false;
    }
    function build() {
      const keys = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (m.down[r][c]) keys.push(usage(KEYS[r][c]));
      const rep = new Array(8).fill(0);
      let why = "";
      if (keys.length > 6) why = "more than 6 keys";
      else if (!m.diodes && rectangle()) why = "ghost rectangle";
      if (why) { for (let i = 2; i < 8; i++) rep[i] = 1; if (m.report[2] !== 1) log(`report: ErrorRollOver, ${why}`); co.show("ghost"); }
      else keys.forEach((u, i) => { rep[2 + i] = u; });
      m.report = rep;
    }
    const hex = a => a.map(b => b.toString(16).padStart(2, "0")).join(" ");
    /* One tick runs one line of the ISR; five ticks are one ISR run. */
    function step(dt) {
      m.t += dt; m.n++;
      const line = m.n % 5;
      if (line === 1) m.raw[m.row] = lowCols(m.driven).reduce((a, c) => a | 1 << c, 0);
      else if (line === 2) debounce(m.row, m.raw[m.row]);
      else if (line === 3) m.driven = -1;
      else if (line === 4) m.row = (m.row + 1) & 3;
      else m.driven = m.row;
      m.line = line === 0 ? 5 : line;
      // the host polls the interrupt endpoint
      if (Math.floor(m.t / P.poll) !== Math.floor((m.t - dt) / P.poll)) {
        m.lastPoll = m.t;
        if (m.report.join() !== m.sent.join()) {
          const before = m.sent;
          m.sent = m.report.slice();
          co.show("usb", 2000);
          if (m.sent[2] !== 1) {
            m.sent.slice(2).filter(u => u > 1 && !before.slice(2).includes(u)).forEach(u => { m.typed = (m.typed + keyOf(u).toLowerCase()).slice(-26); });
            log(`usb: report ${hex(m.sent.slice(2).filter(u => u)) || "empty"}`);
          } else log("usb: ErrorRollOver, host keeps old keys");
        }
      }
    }
    function sample() {
      const [r, c] = m.focus;
      la.push(m.t, { row: m.driven === r ? 1 : 0, col: m.driven >= 0 && lowCols(m.driven).includes(c) ? 1 : 0, raw: contact(r, c), down: m.down[r][c], poll: m.t - m.lastPoll < 0.4 ? 1 : 0 });
    }
    const ghosts = () => { const out = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (m.down[r][c] && !m.held[r][c]) out.push([r, c]); return out; };
    const keyPt = ([r, c]) => [CX[c] + 10, RY[r] - 28];
    const ghostPt = () => keyPt(ghosts()[0] || [2, 1]);
    function preset(keys) { KEYS.forEach((row, r) => row.forEach((k, c) => hold(r, c, keys.includes(k)))); }

    // ---------------------------------------------------------------- drawing
    function render(now) {
      /* A row is driven for 0.25 ms of sim time. Above 1/250× that is shorter than about 60 ms on screen,
         so a frame would catch a random row and the wires would flicker: draw the whole scan instead. */
      const fast = 250 / speed < 60;
      const lows = fast ? [0, 1, 2, 3].flatMap(r => lowCols(r)) : lowCols(m.driven);
      for (let r = 0; r < 4; r++) cls(dyn.rows[r], "w" + (fast ? " scan" : r === m.driven ? " on" : " hiz"));
      for (let c = 0; c < 4; c++) cls(dyn.cols[c], "w" + (lows.includes(c) ? " on" : ""));
      dyn.hint.style.display = fast ? "" : "none";
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const i = r * 4 + c;
        let k = "key";
        if (m.held[r][c]) k += " held";
        if (contact(r, c)) k += " closed";
        if (m.down[r][c]) k += m.held[r][c] ? " down" : " ghost";
        cls(dyn.keys[i], k);
        dyn.cnt[i].setAttribute("width", 36 * m.cnt[r][c] / P.N);
        dyn.dio[i].style.display = m.diodes ? "" : "none";
      }
      if (ghosts().length) co.show("ghost", 600);
      dyn.typed.textContent = m.typed;
      dyn.caret.setAttribute("x", 572 + m.typed.length * 7.8);
      cls(dyn.usb, "w bus" + (m.t - m.lastPoll < 0.6 ? " on" : ""));
      code.set(fast ? [1, 2, 3, 4, 5] : [m.line]);
      co.update(now, labels);
      const k = I.k, v = I.v, [fr, fc] = m.focus;
      ram.set([
        `${k("uint8_t ")}row       = ${v(m.row)}`,
        `${k("uint8_t ")}raw[4]    = ${m.raw.map(b => I.bits(b, 4).slice(2)).join(" ")}`,
        `${k("uint8_t ")}cnt[${KEYS[fr][fc]}]    = ${v(m.cnt[fr][fc] + " / " + P.N)}`,
        `${k("uint8_t ")}down[4]   = ${m.down.map(r => I.bits(r.reduce((a, b, c) => a | b << c, 0), 4).slice(2)).join(" ")}`,
        `${k("uint8_t ")}report[8] = ${m.report[2] === 1 ? v(hex(m.report), "bad") : v(hex(m.report))}`,
        `${k("                    md rs k1 k2 k3 k4 k5 k6")}`,
        `${k("uint8_t ")}sent[8]   = ${v(hex(m.sent))}`,
        `${k("char    ")}typed     = ${v('"' + m.typed.slice(-12) + '"')}`]);
      uart.render();
      la.draw(m.t);
    }

    // the physical keyboard holds a key for as long as it is down
    const MAP = {}; KEYS.forEach((row, r) => row.forEach((key, c) => { MAP[key.toLowerCase()] = [r, c]; }));
    box.addEventListener("keydown", e => { const p = MAP[e.key.toLowerCase()]; if (p && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); if (!e.repeat) hold(p[0], p[1], true); } });
    box.addEventListener("keyup", e => { const p = MAP[e.key.toLowerCase()]; if (p) hold(p[0], p[1], false); });

    I.loop({ tick: P.tick, speed: () => speed, every: 2, step, sample, render });
    box._demo = { m, hold, preset, setDiodes, setSpeed: v => { speed = v; }, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("keyboard", mount, CSS);
})();
