/* Look inside a keyboard (inside/keyboard.html). Load after course.js.
 *
 *   <div class="widget kbswitch"></div>   one key on one pin: pull-up, bounce, integrator debounce
 *   <div class="widget kbmatrix"></div>   a 4 by 4 key matrix, scanned row by row, and the HID report it makes
 *   <div class="widget kblatency"></div>  from finger to host: bounce, debounce window, USB polling
 *
 * kbswitch: the pin has a pull-up to 3.3 V and the key shorts it to ground, so the pin is active low.
 *   Each press or release is recorded as 40 ms at 0.1 ms resolution and played back 60 times slower.
 *   The contact bounces for about 2 ms (6 ms for the worn switch). The debounce is lesson 52's
 *   integrator: one sample per millisecond, DEBOUNCE_SAMPLES in a row to change state (10 by default).
 *   Without debounce every falling edge seen by a fast loop (0.1 ms) types a character.
 * kbmatrix: rows GP0..GP3 have output value 0 and are switched between output (driven low) and input
 *   (Hi-Z); columns GP4..GP7 are inputs with pull-ups. A column reads 0 when a pressed key connects it to
 *   the driven row. Without diodes current can also run backwards through other pressed keys and the
 *   floating rows, so three corners of a rectangle make the fourth read as pressed (a ghost). With one
 *   diode per key (column to row) only the key on the driven row can pull a column low.
 *   The report is the boot keyboard report of HID 1.11 Appendix B.1: byte 0 modifiers (§8.3), byte 1
 *   reserved, bytes 2..7 up to six usage IDs from the Keyboard/Keypad page (HUT chapter 10): a = 0x04,
 *   z = 0x1D, 1 = 0x1E. More than six keys, or (with the ghost check) a combination the firmware cannot
 *   resolve, reports ErrorRollOver (0x01) in all six fields (HID 1.11 Appendix F.3, Appendix C).
 * kblatency: total = time until the debounced state changes + wait for the host's next poll of the
 *   interrupt endpoint (the interval comes from the endpoint descriptor, lesson 102).
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const CSS = `
  .kb svg{display:block;width:100%;height:auto;border:1px solid var(--rule);border-radius:6px;background:var(--bg);user-select:none;-webkit-user-select:none}
  .kb .row{display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;margin:.5rem 0}
  .kb .row .btn{font-size:.8rem;padding:.25rem .65rem}
  .kb label{font-family:var(--sans);font-size:.85rem;display:inline-flex;align-items:center;gap:.35rem}
  .kb select{font-family:var(--sans);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.15rem .3rem}
  .kb .say{font-family:var(--sans);font-size:.88rem;min-height:2.8em;margin:.4rem 0;padding:.45rem .7rem;border-left:3px solid var(--accent);background:var(--accent-soft);border-radius:0 4px 4px 0}
  .kb .mono{font-family:var(--mono);font-size:.82rem}
  .kb .typed{font-family:var(--mono);font-size:1rem;min-height:1.8rem;padding:.25rem .6rem;border:1px solid var(--rule);border-radius:4px;background:var(--code-bg);overflow-wrap:anywhere}
  .kb .typed:empty::before{content:"(nothing typed yet)";color:var(--muted);font-size:.8rem}
  .kb .bigkey{font-family:var(--mono);font-weight:700;font-size:1.1rem;width:4.2rem;height:3.6rem;border-radius:8px;border:1px solid var(--rule);border-bottom-width:5px;background:var(--code-bg);color:var(--fg);cursor:pointer;touch-action:none}
  .kb .bigkey.down{border-bottom-width:1px;transform:translateY(4px);background:var(--accent-soft);border-color:var(--accent)}
  .kb .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:.4rem;margin:.5rem 0}
  .kb .m{background:var(--code-bg);border-radius:4px;padding:.3rem .6rem;font-family:var(--sans);font-size:.78rem}
  .kb .m b{font-family:var(--mono);font-size:1rem;display:block}
  .kb .m.bad b{color:var(--bad)} .kb .m.good b{color:var(--good)}
  .kb .split{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:.8rem;margin-top:.6rem}
  @media (max-width:44rem){.kb .split{grid-template-columns:1fr}}
  .kb .code{font-family:var(--mono);font-size:.72rem;line-height:1.55;background:var(--code-bg);border-radius:6px;padding:.5rem .3rem;margin:0;overflow-x:auto;white-space:pre}
  .kb .code span{display:block;padding:0 .4rem;border-left:3px solid transparent}
  .kb .code span.on{background:var(--accent-soft);border-left-color:var(--accent)}
  .kb .mem{font-family:var(--mono);font-size:.78rem;border-collapse:collapse;width:100%}
  .kb .mem td{padding:.12rem .4rem;border-bottom:1px solid var(--rule)}
  .kb .mem tr.on td{background:var(--accent-soft)}
  .kb .mem .b1{color:var(--accent);font-weight:700}
  .kb .h4{font-family:var(--sans);font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:.6rem 0 .25rem}
  .kb .report{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:.2rem;margin:.2rem 0}
  .kb .report div{text-align:center;border:1px solid var(--rule);border-radius:4px;padding:.15rem 0;background:var(--bg)}
  .kb .report b{display:block;font-family:var(--mono);font-size:.9rem}
  .kb .report small{display:block;font-family:var(--sans);font-size:.62rem;color:var(--muted)}
  .kb .report div.set{border-color:var(--accent);background:var(--accent-soft)}
  .kb .report div.err{border-color:var(--bad);background:var(--bad-soft)}
  .kb .legend{font-family:var(--sans);font-size:.76rem;color:var(--muted);display:flex;flex-wrap:wrap;gap:.3rem 1rem;margin:.3rem 0}
  .kb .legend i{display:inline-block;width:1.4rem;height:0;border-top:3px solid;vertical-align:middle;margin-right:.3rem}
  /* SVG parts */
  .kb .w{fill:none;stroke:var(--muted);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .kb .w.hi{stroke:var(--warn);stroke-width:2.5}
  .kb .w.lo{stroke:var(--accent);stroke-width:3.5}
  .kb .w.hiz{stroke:var(--muted);stroke-dasharray:4 4;opacity:.7}
  .kb .w.thin{stroke-width:1.2}
  .kb .chip{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.5}
  .kb .t{fill:var(--fg);font-family:var(--mono);font-size:11px}
  .kb .t.s{font-size:9px;fill:var(--muted)}
  .kb .t.b{font-weight:700;font-size:13px}
  .kb .t.mid{text-anchor:middle} .kb .t.end{text-anchor:end}
  .kb .t.acc{fill:var(--accent)} .kb .t.bad{fill:var(--bad)} .kb .t.good{fill:var(--good)} .kb .t.warn{fill:var(--warn)}
  .kb .cap{fill:var(--code-bg);stroke:var(--rule);stroke-width:1.5;cursor:pointer}
  .kb .cap.held{fill:var(--accent-soft);stroke:var(--accent);stroke-width:2.5}
  .kb .cap.ghost{stroke:var(--bad);stroke-width:2.5;stroke-dasharray:5 3}
  .kb .cap.path{stroke:var(--accent);stroke-width:3.5}
  .kb .kl{fill:var(--fg);font-family:var(--mono);font-size:14px;font-weight:700;text-anchor:middle;pointer-events:none}
  .kb .dio{fill:var(--fg);stroke:none}
  .kb .dot{fill:var(--fg)}
  .kb .tr{fill:none;stroke:var(--accent);stroke-width:2}
  .kb .tr.b{stroke:var(--good)}
  .kb .tr.c{stroke:var(--warn)}
  .kb .grid{stroke:var(--rule);stroke-width:1}
  .kb .samp{fill:var(--warn)}
  .kb .poll{stroke:var(--muted);stroke-width:1.5}
  .kb .poll.take{stroke:var(--good);stroke-width:3}
  .kb .cursor{stroke:var(--fg);stroke-width:1;stroke-dasharray:3 3;opacity:.6}
  .kb .bar{fill:var(--accent-soft);stroke:var(--accent)}
  .kb .bar.wait{fill:var(--warn-soft);stroke:var(--warn)}`;

  // ---------------------------------------------------------------- helpers
  function E(tag, attrs, kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "text") el.textContent = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => el.append(c));
    return el;
  }
  function S(tag, attrs, text) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function svg(w, h, label) { return S("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label }); }
  function rng(seed) {
    let s = seed | 0;
    return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const hex2 = v => "0x" + v.toString(16).toUpperCase().padStart(2, "0");
  const G = "../reference/glossary.html#", L = "../lessons/";

  /* A contact that settles to `to` (1 = open, pin high; 0 = closed, pin low) after bouncing for about
     `bounceMs`, starting at t0. Returns the level at 0.1 ms steps over `ms` milliseconds. */
  function contact(from, to, t0, bounceMs, ms, r) {
    const n = Math.round(ms * 10), out = new Array(n).fill(to);
    let i = 0;
    for (; i < Math.round(t0 * 10) && i < n; i++) out[i] = from;
    let level = to, end = Math.round((t0 + bounceMs * (0.7 + 0.5 * r())) * 10);
    while (i < end && i < n) {
      const left = (end - i) / (bounceMs * 10);                 // bounces get shorter as the contact settles
      const len = Math.max(1, Math.round((2 + 6 * r() * left) * (level === to ? 1.4 : 0.7)));
      for (let k = 0; k < len && i < n; k++) out[i++] = level;
      level = level === to ? from : to;
    }
    return out;
  }

  // ================================================================ 1. one key on one pin
  function mountSwitch(box) {
    const W = 680, H = 250, X0 = 260, X1 = 666, MS = 40, SLOW = 60;
    const s = svg(W, H, "A key between a pulled-up GPIO pin and ground, with a scope view of the pin");
    // schematic
    const wires = {};
    s.append(S("text", { class: "t mid", x: 80, y: 18 }, "3.3 V"));
    s.append(S("path", { class: "w", d: "M60 24 H100" }));
    s.append(S("path", { class: "w", d: "M80 24 V40 l8 4 -16 8 16 8 -16 8 16 8 -16 8 8 4 V104" }));
    s.append(S("text", { class: "t s", x: 96, y: 66 }, "pull-up"));
    s.append(S("text", { class: "t s", x: 96, y: 77 }, "50 to 80 kΩ, on chip"));
    wires.node = S("path", { class: "w hi", d: "M80 104 V150 M80 112 H150" });
    s.append(wires.node, S("circle", { class: "dot", cx: 80, cy: 112, r: 3.5 }));
    s.append(S("rect", { class: "chip", x: 150, y: 80, width: 90, height: 64, rx: 6 }));
    s.append(S("text", { class: "t b mid", x: 195, y: 106 }, "MCU"));
    s.append(S("text", { class: "t s mid", x: 195, y: 122 }, "GP2 input"));
    const vlabel = S("text", { class: "t b warn", x: 30, y: 116 }, "3.3 V");
    s.append(vlabel);
    // the key: a switch drawn between the node and ground
    s.append(S("circle", { class: "dot", cx: 80, cy: 152, r: 3 }), S("circle", { class: "dot", cx: 80, cy: 190, r: 3 }));
    const lever = S("path", { class: "w", d: "M80 190 L104 158" });
    s.append(lever, S("path", { class: "w", d: "M80 190 V222 M64 222 H96 M70 228 H90 M76 234 H84" }));
    s.append(S("text", { class: "t s", x: 112, y: 176 }, "key"));
    s.append(S("text", { class: "t s", x: 100, y: 236 }, "ground (0 V)"));
    // scope lanes
    const lanes = [
      { y: 20, h: 50, name: "pin GP2 (raw)" },
      { y: 104, h: 60, name: "integrator" },
      { y: 196, h: 36, name: "debounced" }];
    lanes.forEach(l => {
      s.append(S("text", { class: "t s", x: X0, y: l.y - 6 }, l.name));
      s.append(S("line", { class: "grid", x1: X0, x2: X1, y1: l.y + l.h, y2: l.y + l.h }));
    });
    for (let ms = 0; ms <= MS; ms += 10) {
      const x = X0 + (X1 - X0) * ms / MS;
      s.append(S("line", { class: "grid", x1: x, x2: x, y1: 14, y2: 236, opacity: .5 }));
      s.append(S("text", { class: "t s mid", x, y: 247 }, ms + " ms"));
    }
    const rawP = S("polyline", { class: "tr" }), cntP = S("polyline", { class: "tr c" }), debP = S("polyline", { class: "tr b" });
    const samples = S("g"), cursor = S("line", { class: "cursor", y1: 14, y2: 236 });
    const topL = S("line", { class: "grid", x1: X0, x2: X1, stroke: "var(--warn)", "stroke-dasharray": "2 3" });
    const topT = S("text", { class: "t s end warn", x: X1 })
    s.append(topL, topT, rawP, samples, cntP, debP, cursor);
    rawP.setAttribute("points", `${X0},${lanes[0].y} ${X1},${lanes[0].y}`);   // key up, before the first press
    cursor.style.display = "none";

    const key = E("button", { class: "bigkey", type: "button", "aria-label": "Hold to press the key", text: "A" });
    const debounce = E("input", { type: "checkbox", checked: "" });
    const worn = E("input", { type: "checkbox" });
    const win = E("select", {}, [2, 5, 10, 20].map(n => E("option", { value: n, text: n + " samples (" + n + " ms)" })));
    win.value = "10";
    const typed = E("div", { class: "typed", "aria-live": "polite" });
    const say = E("p", { class: "say" });
    const mEdges = E("div", { class: "m" }), mPress = E("div", { class: "m" }), mCnt = E("div", { class: "m" });
    box.append(
      E("h3", { text: box.dataset.title || "One key on one pin" }),
      E("p", { class: "widget-hint", text: "Hold the key down, then let go. Each press is recorded and replayed 60 times slower, so you can watch the contact bounce." }),
      s,
      E("div", { class: "row" }, [key,
        E("div", {}, [
          E("label", {}, [debounce, "integrator debounce"]), E("br"),
          E("label", {}, [worn, "worn switch (longer bounce)"]), E("br"),
          E("label", {}, ["window ", win])]),
        E("button", { class: "btn secondary", type: "button", text: "Clear", onclick: () => { typed.textContent = ""; edges = 0; presses = 0; texts(); } })]),
      E("div", { class: "h4", text: "What the computer receives" }), typed,
      E("div", { class: "stats" }, [mEdges, mPress, mCnt]), say);

    let queue = [], cur = null, level = 1, edges = 0, presses = 0, seed = 1, lastCount = 0, stable = 1;
    const r = rng(7);
    function record(to) {
      const from = to ? 0 : 1;
      const raw = contact(from, to, 3, worn.checked ? 6 : 2, MS, rng(seed++ * 977 + (worn.checked ? 5 : 0)));
      // integrator, one sample per ms, starting from the stable state before the change
      const N = +win.value, cnt = [], deb = [];
      let c = from === 0 ? N : 0, st = from;
      const events = [];
      for (let ms = 0; ms < MS; ms++) {
        const pressed = raw[ms * 10] === 0;
        if (pressed) { if (c < N) c++; } else if (c > 0) c--;
        if (st === 1 && c === N) { st = 0; events.push({ i: ms * 10, kind: "press" }); }
        if (st === 0 && c === 0) { st = 1; events.push({ i: ms * 10, kind: "release" }); }
        cnt.push(c); deb.push(st);
      }
      const rawEdges = [];
      for (let i = 1; i < raw.length; i++) if (raw[i - 1] === 1 && raw[i] === 0) rawEdges.push(i);
      return { to, raw, cnt, deb, N, events, rawEdges, t0: null, done: false, useDeb: debounce.checked, nE: 0, nV: 0 };
    }
    let waiting = false;                          // a short pause between two recordings
    function enqueue(to) { queue.push(record(to)); if ((!cur || cur.done) && !waiting) next(); }
    function next() { cur = queue.shift() || null; if (cur) { cur.t0 = null; topL.setAttribute("y1", lanes[1].y); topL.setAttribute("y2", lanes[1].y); topT.setAttribute("y", lanes[1].y - 3); topT.textContent = "DEBOUNCE_SAMPLES = " + cur.N; } }
    const px = i => X0 + (X1 - X0) * i / (MS * 10);
    function draw(upTo) {
      const c = cur;
      if (!c) return;
      const lane0 = lanes[0], lane1 = lanes[1], lane2 = lanes[2];
      let pts = "";
      for (let i = 0; i <= upTo && i < c.raw.length; i++) {
        const y = lane0.y + (c.raw[i] ? 0 : lane0.h);
        if (i > 0 && c.raw[i] !== c.raw[i - 1]) pts += `${px(i).toFixed(1)},${(lane0.y + (c.raw[i - 1] ? 0 : lane0.h))} `;
        pts += `${px(i).toFixed(1)},${y} `;
      }
      rawP.setAttribute("points", pts);
      samples.replaceChildren();
      let cp = "", dp = "";
      for (let ms = 0; ms * 10 <= upTo && ms < MS; ms++) {
        samples.append(S("circle", { class: "samp", cx: px(ms * 10), cy: lane0.y + (c.raw[ms * 10] ? 0 : lane0.h), r: 2.2 }));
        const yc = lane1.y + lane1.h - lane1.h * c.cnt[ms] / c.N, yd = lane2.y + (c.deb[ms] ? 0 : lane2.h);
        cp += `${px(ms * 10)},${yc} ${px(ms * 10 + 10)},${yc} `;
        dp += `${px(ms * 10)},${yd} ${px(ms * 10 + 10)},${yd} `;
      }
      cntP.setAttribute("points", cp); debP.setAttribute("points", dp);
      cntP.style.display = debP.style.display = c.useDeb ? "" : "none";
      cursor.style.display = "";
      cursor.setAttribute("x1", px(upTo)); cursor.setAttribute("x2", px(upTo));
      level = c.raw[Math.min(upTo, c.raw.length - 1)];
      lastCount = c.cnt[Math.min(Math.floor(upTo / 10), MS - 1)];
      stable = c.deb[Math.min(Math.floor(upTo / 10), MS - 1)];
      // what the computer sees, as playback passes each event
      if (c.useDeb) {
        while (c.nV < c.events.length && c.events[c.nV].i <= upTo) {
          if (c.events[c.nV].kind === "press") { typed.textContent += "a"; presses++; }
          c.nV++;
        }
      } else {
        while (c.nE < c.rawEdges.length && c.rawEdges[c.nE] <= upTo) { typed.textContent += "a"; presses++; c.nE++; }
      }
      while (c.nE < c.rawEdges.length && c.rawEdges[c.nE] <= upTo) c.nE++;
    }
    function texts() {
      const v = level ? "3.3 V" : "0 V";
      vlabel.textContent = v; vlabel.setAttribute("class", "t b " + (level ? "warn" : "acc"));
      wires.node.setAttribute("class", "w " + (level ? "hi" : "lo"));
      lever.setAttribute("d", level ? "M80 190 L104 158" : "M80 190 L80 152");
      mEdges.innerHTML = `falling edges on the pin<b>${edges}</b>`;
      mPress.innerHTML = `key presses counted<b>${presses}</b>`;
      mCnt.innerHTML = `integrator count<b>${debounce.checked ? lastCount + " / " + win.value : "off"}</b>`;
      const c = cur;
      let msg;
      if (!c) msg = "Hold the key. The pin reads 1 (3.3 V) while the key is up, because the pull-up holds it high, and 0 while the key is down. The key is active low.";
      else if (!c.done) msg = c.to === 0
        ? "The contact closes, but its metal springs open and close again several times before they settle. Each dot is one read of the pin, once per millisecond."
        : "On release the contact chatters again, so the pin goes back to 3.3 V with a few short dips on the way.";
      else if (!c.useDeb) msg = `A loop that reacts to every falling edge saw ${c.rawEdges.length} edge${c.rawEdges.length === 1 ? "" : "s"} in this ${c.to === 0 ? "press" : "release"}, so it typed ${c.rawEdges.length} character${c.rawEdges.length === 1 ? "" : "s"} for one key stroke.`;
      else {
        const ev = c.events[0];
        msg = ev ? `The counter climbs while the pin reads pressed and falls while it reads released. It reached ${c.to === 0 ? c.N : 0} at ${ev.i / 10} ms, so the debounced state changed once, ${ev.i / 10 - 3} ms after the contact first moved.`
                 : `The counter has not reached the end of its range within 40 ms, so the key state has not changed yet.`;
        if (c.to === 0 && c.events.filter(e => e.kind === "press").length > 1) msg += " The window was shorter than the bounce, so the key was counted twice.";
        if (c.events.length > 1) msg = `The window of ${c.N} ms is shorter than this switch's bounce, so the counter hit both ends during the chatter and the key changed state ${c.events.length} times. Make the window longer than the longest bounce.`;
      }
      say.textContent = msg;
    }
    function tick(now) {
      if (cur) {
        if (cur.t0 === null) cur.t0 = now;
        const i = Math.min(MS * 10 - 1, Math.floor((now - cur.t0) / SLOW * 10));
        const before = cur.nE;
        draw(i);
        edges += cur.nE - before;
        if (i >= MS * 10 - 1 && !cur.done) {
          cur.done = true; texts();
          if (queue.length) { waiting = true; setTimeout(() => { waiting = false; next(); }, 350); }
        }
      }
      texts();
      requestAnimationFrame(tick);
    }
    let down = false;
    const press = e => { e.preventDefault(); if (down) return; down = true; key.classList.add("down"); enqueue(0); };
    const release = () => { if (!down) return; down = false; key.classList.remove("down"); enqueue(1); };
    key.addEventListener("pointerdown", e => { key.setPointerCapture(e.pointerId); press(e); });
    key.addEventListener("pointerup", release);
    key.addEventListener("pointercancel", release);
    key.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) press(e); });
    key.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") release(); });
    texts();
    requestAnimationFrame(tick);
  }

  // ================================================================ 2. the matrix and its report
  const KEYS = [["1", "2", "3", "4"], ["Q", "W", "E", "R"], ["A", "S", "D", "F"], ["Z", "X", "C", "V"]];
  const usage = k => /[0-9]/.test(k) ? (k === "0" ? 0x27 : 0x1D + +k) : 0x04 + k.charCodeAt(0) - 65;
  const CODE = [
    "for (int row = 0; row < 4; row++) {",
    "  gpio_set_dir(ROW_PIN[row], GPIO_OUT);",
    "  busy_wait_us(5);",
    "  uint32_t pins = gpio_get_all();",
    "  matrix[row] = ~(pins >> COL0) & 0xF;",
    "  gpio_set_dir(ROW_PIN[row], GPIO_IN);",
    "}",
    "build_report(matrix, report);"];

  function mountMatrix(box) {
    const W = 680, H = 345, RX = [], RY = [90, 145, 200, 255], CX = [235, 335, 435, 535];
    const s = svg(W, H, "A 4 by 4 key matrix: four row wires, four column wires and a key at each crossing");
    const held = KEYS.map(r => r.map(() => false));
    const st = { row: 0, phase: 0, matrix: [0, 0, 0, 0], diodes: false, ghostCheck: false, report: new Array(8).fill(0), lastRow: -1 };
    // chip
    s.append(S("rect", { class: "chip", x: 16, y: 50, width: 104, height: 285, rx: 6 }));
    s.append(S("text", { class: "t b mid", x: 68, y: 72 }, "MCU"));
    const rowW = [], colW = [], caps = [], dios = [], pinT = [], colT = [];
    s.append(S("text", { class: "t mid", x: 385, y: 16 }, "3.3 V"));
    s.append(S("path", { class: "w", d: `M${CX[0] - 20} 24 H${CX[3] + 20}` }));
    for (let c = 0; c < 4; c++) {
      const x = CX[c], yb = 284 + c * 13;
      s.append(S("path", { class: "w thin", d: `M${x} 24 V30 l5 2.5 -10 5 10 5 -10 5 10 5 -5 2.5 V58` }));
      colW[c] = S("path", { class: "w hi", d: `M${x} 58 V${yb} H120` });
      s.append(colW[c]);
      pinT[c] = S("text", { class: "t s", x: 124, y: yb - 2 }, `GP${4 + c}`);
      colT[c] = S("text", { class: "t s mid", x: x + 18, y: 52 }, "");
      s.append(pinT[c], colT[c]);
    }
    s.append(S("text", { class: "t s end", x: CX[0] - 12, y: 46 }, "pull-ups"));
    for (let r = 0; r < 4; r++) {
      rowW[r] = S("path", { class: "w hiz", d: `M120 ${RY[r]} H${CX[3] + 40}` });
      s.append(rowW[r], S("text", { class: "t s", x: 124, y: RY[r] - 4 }, `GP${r}`));
      RX[r] = S("text", { class: "t s end", x: 112, y: RY[r] + 4 }, "Hi-Z");
      s.append(RX[r]);
    }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const g = S("g", { tabindex: 0, role: "button", "aria-label": "key " + KEYS[r][c] });
      const x = CX[c], y = RY[r];
      // switch body sits between the column (left) and the row (below)
      g.append(S("path", { class: "w thin", d: `M${x} ${y - 30} h22 M${x + 22} ${y - 8} v8` }));
      const d = S("path", { class: "dio", d: `M${x + 17} ${y - 7} h10 l-5 6 z M${x + 16} ${y - 1} h12`, stroke: "var(--fg)", "stroke-width": 1.5 });
      dios.push(d); g.append(d);
      const cap = S("rect", { class: "cap", x: x + 6, y: y - 48, width: 34, height: 32, rx: 5 });
      caps.push(cap);
      g.append(cap, S("text", { class: "kl", x: x + 23, y: y - 27 }, KEYS[r][c]));
      const toggle = () => { held[r][c] = !held[r][c]; refresh(); };
      g.addEventListener("click", toggle);
      g.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
      s.append(g);
    }

    const code = E("pre", { class: "code", "aria-label": "The scan loop" }, CODE.map(l => E("span", { text: l })));
    const mem = E("table", { class: "mem" });
    const seen = E("div", { class: "mono" });
    const rep = E("div", { class: "report" });
    const say = E("p", { class: "say" });
    const speed = E("select", {}, [["0.7", "slow motion"], ["3", "faster"], ["40", "fast"], ["0", "paused"]].map(([v, t]) => E("option", { value: v, text: t })));
    const diode = E("input", { type: "checkbox" }), gcheck = E("input", { type: "checkbox" });
    diode.addEventListener("change", () => { st.diodes = diode.checked; refresh(); });
    gcheck.addEventListener("change", () => { st.ghostCheck = gcheck.checked; refresh(); });
    const preset = (keys) => { KEYS.forEach((row, r) => row.forEach((k, c) => { held[r][c] = keys.includes(k); })); refresh(); };
    box.append(
      E("h3", { text: box.dataset.title || "Sixteen keys on eight pins" }),
      E("p", { class: "widget-hint", text: "Click keys to hold them down (click again to let go). The firmware drives one row low at a time and reads the four columns." }),
      s,
      E("div", { class: "legend" }, [
        E("span", { html: '<i style="border-color:var(--warn)"></i>high, pulled up (reads 1)' }),
        E("span", { html: '<i style="border-color:var(--accent)"></i>low (reads 0)' }),
        E("span", { html: '<i style="border-color:var(--muted);border-top-style:dashed"></i>Hi-Z, floating' }),
        E("span", { html: '<i style="border-color:var(--bad);border-top-style:dashed"></i>ghost key' })]),
      E("div", { class: "row" }, [
        E("label", {}, ["scan ", speed]),
        E("button", { class: "btn secondary", type: "button", text: "Step", onclick: () => { speed.value = "0"; step(); } }),
        E("button", { class: "btn secondary", type: "button", text: "Try Q + W + A", onclick: () => preset(["Q", "W", "A"]) }),
        E("button", { class: "btn secondary", type: "button", text: "Press 7 keys", onclick: () => preset(["Q", "W", "E", "R", "A", "S", "D"]) }),
        E("button", { class: "btn secondary", type: "button", text: "Release all", onclick: () => preset([]) })]),
      E("div", { class: "row" }, [E("label", {}, [diode, "one diode per key"]), E("label", {}, [gcheck, "firmware ghost check"])]),
      say,
      E("div", { class: "split" }, [
        E("div", {}, [E("div", { class: "h4", text: "Firmware" }), code]),
        E("div", {}, [E("div", { class: "h4", text: "uint8_t matrix[4] in RAM" }), mem,
          E("div", { class: "h4", text: "Keys the firmware sees" }), seen])]),
      E("div", { class: "h4", text: "The 8-byte report sent over USB" }), rep);

    /* Which columns read 0 while `row` is driven low. Without diodes, pressed keys conduct both ways and
       the other rows float, so any column connected to the row through pressed keys is pulled low. */
    function lowCols(row) {
      if (st.diodes) return [0, 1, 2, 3].filter(c => held[row][c]);
      const rows = new Set([row]), cols = new Set();
      let grew = true;
      while (grew) {
        grew = false;
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (held[r][c]) {
          if (rows.has(r) && !cols.has(c)) { cols.add(c); grew = true; }
          if (cols.has(c) && !rows.has(r)) { rows.add(r); grew = true; }
        }
      }
      return [...cols].sort();
    }
    /* Pressed keys that carry current right now (for the highlight): all pressed keys on a low path. */
    function pathKeys(row) {
      if (st.diodes) return [0, 1, 2, 3].filter(c => held[row][c]).map(c => row * 4 + c);
      const cols = new Set(lowCols(row)), out = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (held[r][c] && cols.has(c)) out.push(r * 4 + c);
      return out;
    }
    function firmwareKeys() {
      const out = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (st.matrix[r] >> c & 1) out.push([r, c]);
      return out;
    }
    function hasRectangle() {
      const m = st.matrix;
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
        const both = m[a] & m[b];
        if (both & (both - 1)) return true;           // two rows share two or more columns
      }
      return false;
    }
    function build() {
      const keys = firmwareKeys(), r = new Array(8).fill(0);
      let err = keys.length > 6 ? "rollover" : null;
      if (!err && st.ghostCheck && hasRectangle()) err = "ghost";
      if (err) for (let i = 2; i < 8; i++) r[i] = 0x01;
      else keys.forEach(([y, x], i) => { r[2 + i] = usage(KEYS[y][x]); });
      st.report = r; st.err = err;
    }
    // phases: 0 drive, 1 settle, 2 read, 3 release; then the next row. After row 3 the report is built.
    function step() {
      st.phase++;
      if (st.phase === 2) { st.matrix[st.row] = lowCols(st.row).reduce((a, c) => a | 1 << c, 0); st.lastRow = st.row; }
      if (st.phase > 3) {
        st.phase = 0; st.row++;
        if (st.row > 3) { st.row = 0; build(); st.built = performance.now(); }
      }
      refresh();
    }
    function refresh() {
      const r = st.row, driven = st.phase <= 2, lows = driven ? lowCols(r) : [];
      const path = new Set(driven ? pathKeys(r) : []);
      // which floating rows are pulled low through pressed keys (only matters without diodes)
      const lowRows = new Set();
      if (driven && !st.diodes) for (let y = 0; y < 4; y++) for (let c of lows) if (held[y][c]) lowRows.add(y);
      for (let y = 0; y < 4; y++) {
        const cls = y === r && driven ? "lo" : lowRows.has(y) ? "lo" : "hiz";
        rowW[y].setAttribute("class", "w " + cls + (cls === "lo" && y !== r ? " thin" : ""));
        RX[y].textContent = y === r && driven ? "out 0" : "Hi-Z";
        RX[y].setAttribute("class", "t s end" + (y === r && driven ? " acc" : ""));
      }
      for (let c = 0; c < 4; c++) {
        const low = lows.includes(c);
        colW[c].setAttribute("class", "w " + (low ? "lo" : "hi"));
        colT[c].textContent = driven && st.phase === 2 ? (low ? "0" : "1") : "";
        colT[c].setAttribute("class", "t b mid " + (low ? "acc" : "warn"));
      }
      const seenSet = new Set(firmwareKeys().map(([y, x]) => y * 4 + x));
      caps.forEach((cap, i) => {
        const y = i >> 2, x = i & 3;
        let cls = "cap";
        if (held[y][x]) cls += " held";
        if (path.has(i)) cls += " path";
        if (!held[y][x] && seenSet.has(i)) cls += " ghost";
        cap.setAttribute("class", cls);
        dios[i].style.display = st.diodes ? "" : "none";
      });
      [...code.children].forEach((sp, i) => {
        const on = speed.value !== "40" && ((st.phase === 0 && i === 1) || (st.phase === 1 && i === 2) || (st.phase === 2 && (i === 3 || i === 4)) || (st.phase === 3 && i === 5));
        sp.classList.toggle("on", on);
      });
      mem.replaceChildren(...st.matrix.map((v, y) => E("tr", { class: y === st.lastRow && st.phase >= 2 && y === r ? "on" : "" }, [
        E("td", { text: `matrix[${y}]` }),
        E("td", { html: "0b" + [3, 2, 1, 0].map(b => (v >> b & 1) ? '<span class="b1">1</span>' : "0").join("") }),
        E("td", { text: "0x" + v.toString(16).toUpperCase() }),
        E("td", { text: KEYS[y].filter((k, c) => v >> c & 1).join(" ") || "·" })])));
      const fk = firmwareKeys();
      seen.innerHTML = fk.length ? fk.map(([y, x]) => held[y][x] ? KEYS[y][x] : `<span style="color:var(--bad)">${KEYS[y][x]} (ghost)</span>`).join(", ") : "none";
      const labels = ["modifiers", "reserved", "key 1", "key 2", "key 3", "key 4", "key 5", "key 6"];
      rep.replaceChildren(...st.report.map((v, i) => {
        let name = "";
        if (i >= 2 && v > 1) name = KEYS.flat().find(k => usage(k) === v) || "";
        if (v === 1) name = "ErrorRollOver";
        return E("div", { class: v === 1 ? "err" : v ? "set" : "" }, [E("b", { text: hex2(v) }), E("small", { text: name || labels[i] })]);
      }));
      // explanation
      const ghosts = fk.filter(([y, x]) => !held[y][x]).map(([y, x]) => KEYS[y][x]);
      let msg;
      if (st.err === "rollover") msg = "Seven keys are down, but the report has room for six. The firmware sends ErrorRollOver (0x01) in every key field, so the computer knows keys are down but not which ones, and keeps the keys it saw last.";
      else if (st.err === "ghost") msg = "The firmware found two rows sharing two columns, a rectangle it cannot resolve without diodes. It reports ErrorRollOver instead of guessing, which is what the HID specification asks a boot keyboard to do.";
      else if (ghosts.length) msg = `Ghost key: the firmware sees ${ghosts.join(", ")} although you are not pressing ${ghosts.length > 1 ? "them" : "it"}. When the ghost's row is driven low, current runs backwards through the other pressed keys and the floating row, and pulls the column low. Turn on the diodes, or the ghost check, and scan again.`;
      else if (driven) msg = `Row ${r} (GP${r}) is driven low and the other rows float. ` + (lows.length ? `Column${lows.length > 1 ? "s" : ""} ${lows.map(c => "GP" + (4 + c)).join(", ")} read${lows.length > 1 ? "" : "s"} 0, so a key on this row is down.` : "Every column still reads 1 through its pull-up, so no key on this row is down.");
      else msg = `Row ${r} goes back to Hi-Z before the next row is driven, so two rows never fight each other.`;
      say.textContent = msg;
    }
    let acc = 0, last = null;
    function tick(now) {
      const rate = +speed.value;
      if (last !== null && rate > 0) {
        acc += (now - last) / 1000 * rate * 4;          // four phases per row
        let n = 0;
        while (acc >= 1 && n++ < 64) { acc -= 1; step(); }
      }
      last = now;
      requestAnimationFrame(tick);
    }
    build(); refresh();
    requestAnimationFrame(tick);
  }

  // ================================================================ 3. latency from finger to host
  function mountLatency(box) {
    const W = 680, H = 230, X0 = 120, X1 = 666, MS = 30;
    const s = svg(W, H, "A timeline of one key press: contact bounce, scan samples, debounce and USB polls");
    const lanes = [["key contact", 22], ["scan samples", 70], ["debounced", 112], ["host polls", 160]];
    lanes.forEach(([n, y]) => s.append(S("text", { class: "t s", x: 8, y: y + 14 }, n)));
    for (let ms = 0; ms <= MS; ms += 5) {
      const x = X0 + (X1 - X0) * ms / MS;
      s.append(S("line", { class: "grid", x1: x, x2: x, y1: 14, y2: 196, opacity: .5 }), S("text", { class: "t s mid", x, y: 208 }, ms + " ms"));
    }
    const layer = S("g"), cursor = S("line", { class: "cursor", y1: 14, y2: 196 });
    s.append(layer, cursor);
    const poll = E("select", {}, [1, 8, 10].map(v => E("option", { value: v, text: v + " ms" }))); poll.value = "8";
    const win = E("select", {}, [5, 10].map(v => E("option", { value: v, text: v + " samples" }))); win.value = "10";
    const say = E("p", { class: "say" });
    const mLast = E("div", { class: "m" }), mMin = E("div", { class: "m" }), mAvg = E("div", { class: "m" }), mMax = E("div", { class: "m" });
    box.append(
      E("h3", { text: box.dataset.title || "From finger to computer" }),
      E("p", { class: "widget-hint", text: "Press the key at a random moment and follow it to the host. The scan runs every 1 ms; the host polls the keyboard's interrupt endpoint at the interval in its descriptor." }),
      s,
      E("div", { class: "row" }, [
        E("button", { class: "btn", type: "button", text: "Press a key", onclick: () => run(true) }),
        E("button", { class: "btn secondary", type: "button", text: "Press 1000 times", onclick: many }),
        E("label", {}, ["poll interval ", poll]), E("label", {}, ["debounce ", win])]),
      E("div", { class: "stats" }, [mLast, mMin, mAvg, mMax]), say);
    poll.addEventListener("change", () => { stats = []; run(true); });
    win.addEventListener("change", () => { stats = []; run(true); });

    let seed = 11, cur = null, stats = [];
    function simulate(r) {
      const P = +poll.value, N = +win.value;
      const tp = 2 + r() * 1, scanPhase = r(), pollPhase = r() * P;
      const raw = contact(1, 0, tp, 2, MS, r);
      let c = 0, tc = null;
      const samp = [];
      for (let t = scanPhase; t < MS; t += 1) {
        const v = raw[Math.min(raw.length - 1, Math.floor(t * 10))];
        if (v === 0) { if (c < N) c++; } else if (c > 0) c--;
        samp.push([t, v]);
        if (tc === null && c === N) tc = t;
      }
      let th = null;
      const polls = [];
      for (let t = pollPhase; t < MS + 40; t += P) { polls.push(t); if (th === null && tc !== null && t >= tc) th = t; }
      return { tp, raw, samp, tc, th, polls, P, N, total: th - tp, deb: tc - tp, wait: th - tc };
    }
    const px = t => X0 + (X1 - X0) * t / MS;
    function draw(c, upTo) {
      layer.replaceChildren();
      const yC = 22, hC = 26;
      let pts = "";
      for (let i = 0; i < c.raw.length && i / 10 <= upTo; i++) {
        if (i && c.raw[i] !== c.raw[i - 1]) pts += `${px(i / 10)},${yC + (c.raw[i - 1] ? 0 : hC)} `;
        pts += `${px(i / 10)},${yC + (c.raw[i] ? 0 : hC)} `;
      }
      layer.append(S("polyline", { class: "tr", points: pts }));
      c.samp.forEach(([t, v]) => { if (t <= upTo) layer.append(S("circle", { class: "samp", cx: px(t), cy: 84, r: v ? 2 : 3.5, opacity: v ? .45 : 1 })); });
      if (c.tc !== null) {
        const yD = 112, t = Math.min(upTo, MS);
        const p = c.tc <= t ? `${px(0)},${yD} ${px(c.tc)},${yD} ${px(c.tc)},${yD + 24} ${px(t)},${yD + 24}` : `${px(0)},${yD} ${px(t)},${yD}`;
        layer.append(S("polyline", { class: "tr b", points: p }));
      }
      c.polls.forEach(t => { if (t <= Math.min(upTo, MS)) layer.append(S("line", { class: "poll" + (t === c.th ? " take" : ""), x1: px(t), x2: px(t), y1: 158, y2: 184 })); });
      if (c.th !== null && upTo >= c.th && c.th <= MS) {
        layer.append(S("rect", { class: "bar", x: px(c.tp), y: 188, width: px(c.tc) - px(c.tp), height: 6 }));
        layer.append(S("rect", { class: "bar wait", x: px(c.tc), y: 188, width: Math.max(1, px(c.th) - px(c.tc)), height: 6 }));
        layer.append(S("text", { class: "t s good", x: px(c.th) + 4, y: 176 }, "report taken"));
      }
      cursor.setAttribute("x1", px(Math.min(upTo, MS))); cursor.setAttribute("x2", px(Math.min(upTo, MS)));
    }
    function showStats() {
      const f = v => v.toFixed(1) + " ms";
      mLast.innerHTML = `this press<b>${cur && cur.done ? f(cur.total) : "…"}</b>`;
      if (stats.length) {
        const mn = Math.min(...stats), mx = Math.max(...stats), av = stats.reduce((a, b) => a + b, 0) / stats.length;
        mMin.innerHTML = `fastest of ${stats.length}<b>${f(mn)}</b>`; mAvg.innerHTML = `average<b>${f(av)}</b>`; mMax.innerHTML = `slowest<b>${f(mx)}</b>`;
      } else { mMin.innerHTML = "fastest<b>–</b>"; mAvg.innerHTML = "average<b>–</b>"; mMax.innerHTML = "slowest<b>–</b>"; }
      if (cur && cur.done) say.innerHTML = `The contact first closed at ${cur.tp.toFixed(1)} ms. The integrator needed ${cur.N} pressed samples in a row, so the key state changed <b>${cur.deb.toFixed(1)} ms</b> later (blue bar). The new report then waited <b>${cur.wait.toFixed(1)} ms</b> in the endpoint buffer until the host's next poll (yellow bar), because a USB device cannot send until it is asked.`;
      else say.textContent = "Watching the press travel. The orange dots are the scan reading the key once per millisecond; the large dots read pressed.";
    }
    function run(animate) {
      cur = simulate(rng(seed++ * 7919));
      cur.start = null; cur.done = !animate;
      if (!animate) { draw(cur, MS); }
    }
    function many() {
      const r = rng(seed++ * 31);
      for (let i = 0; i < 1000; i++) { const c = simulate(r); stats.push(c.total); }
      stats = stats.slice(-5000);
      run(false); stats.push(cur.total); showStats();
    }
    function tick(now) {
      if (cur && !cur.done) {
        if (cur.start === null) cur.start = now;
        const t = (now - cur.start) / 120;           // 1 ms of simulated time every 120 ms
        draw(cur, t);
        if (t >= Math.min(MS, (cur.th || MS) + 2)) { cur.done = true; stats.push(cur.total); draw(cur, MS); }
        showStats();
      }
      requestAnimationFrame(tick);
    }
    run(true); showStats();
    requestAnimationFrame(tick);
  }

  function init() {
    if (!document.getElementById("kb-css")) { const st = document.createElement("style"); st.id = "kb-css"; st.textContent = CSS; document.head.appendChild(st); }
    document.querySelectorAll(".widget.kbswitch").forEach(b => { b.classList.add("kb"); mountSwitch(b); });
    document.querySelectorAll(".widget.kbmatrix").forEach(b => { b.classList.add("kb"); mountMatrix(b); });
    document.querySelectorAll(".widget.kblatency").forEach(b => { b.classList.add("kb"); mountLatency(b); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
