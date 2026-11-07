/* Bus waveforms: build a transfer and see what the wires carry. Load after course.js.
 *
 *   <div class="widget buswave" data-bus="i2c"></div>      data-bus: i2c | uart | spi (without data-bus, tabs let the learner switch)
 *
 * I2C (lesson 60): START, address + R/W, ACK, register, repeated START, data, NACK, STOP; who drives SDA
 *   in each bit; what changes when no device answers, or when a STOP replaces the repeated START.
 * UART (lesson 53): idle high, start bit, 8 data bits LSB first, optional parity, stop bits. A receiver
 *   at a different baud rate samples in the middle of its own bit times: the sample points and the
 *   byte it decodes are shown.
 * SPI (lesson 62): CS, SCK, MOSI for one byte, MSB first, in modes 0 to 3. A device that samples on the
 *   other edge reads what is on MOSI at its own edges, which is how a mode mismatch corrupts data.
 * Click a field in the drawing to see what it means.
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const CSS = `
  .buswave .bw-ctl{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;margin:.5rem 0;font-family:var(--sans);font-size:.85rem}
  .buswave .bw-ctl label{display:flex;gap:.3rem;align-items:center}
  .buswave input[type=text]{font-family:var(--mono);font-size:.85rem;width:6rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .35rem}
  .buswave select{font-family:var(--sans);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.15rem .3rem}
  .buswave label.rx{flex-wrap:wrap} .buswave label.rx input[type=range]{width:min(14rem,60vw)} .buswave .rxv{font-family:var(--mono);min-width:12rem}
  .buswave .bw-ctl .btn{font-size:.75rem;padding:.15rem .5rem}
  .buswave .bw-tabs{display:flex;gap:.3rem;margin:.3rem 0}
  .buswave .bw-scroll{overflow-x:auto;border:1px solid var(--rule);border-radius:6px;background:var(--code-bg);padding:.3rem 0}
  .buswave svg{display:block;height:auto;font-family:var(--mono);font-size:11px}
  .buswave svg .w{fill:none;stroke:var(--fg);stroke-width:2;stroke-linejoin:round}
  .buswave svg .lbl{fill:var(--muted);font-family:var(--sans);font-size:11px}
  .buswave svg .bit{fill:var(--fg);font-size:10px}
  .buswave svg .m{fill:var(--accent);opacity:.18} .buswave svg .d{fill:var(--good);opacity:.3} .buswave svg .x{fill:var(--bad);opacity:.25}
  .buswave svg .fld{cursor:pointer} .buswave svg .fld rect{fill:transparent;stroke:var(--rule)} .buswave svg .fld:hover rect,.buswave svg .fld.on rect{fill:var(--warn-soft);stroke:var(--warn)}
  .buswave svg .fld text{fill:var(--fg);font-size:10.5px;font-family:var(--sans)}
  .buswave svg .smp{fill:var(--accent)} .buswave svg .smp.bad{fill:var(--bad)}
  .buswave svg .edge{stroke:var(--accent);stroke-width:1.2} .buswave svg .edge.bad{stroke:var(--bad)}
  .buswave svg .ax{fill:var(--muted);font-size:10px;font-family:var(--sans)}
  .buswave .bw-tip{font-family:var(--sans);font-size:.9rem;background:var(--warn-soft);border-left:4px solid var(--warn);border-radius:4px;padding:.45rem .7rem;margin:.5rem 0}
  .buswave .bw-res{font-family:var(--sans);font-size:.9rem;margin:.4rem 0}
  .buswave .bw-res .ok{color:var(--good);font-weight:600} .buswave .bw-res .bad{color:var(--bad);font-weight:600}
  .buswave .bw-legend{font-family:var(--sans);font-size:.75rem;color:var(--muted);display:flex;flex-wrap:wrap;gap:.2rem 1rem;margin:.3rem 0}
  .buswave .bw-legend i{display:inline-block;width:1rem;height:.7rem;border-radius:2px;margin-right:.3rem;vertical-align:-1px}`;

  const hx = (v, w = 2) => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(w, "0");
  const bin = (v, n = 8) => (v >>> 0).toString(2).padStart(n, "0");
  const parseByte = t => { t = String(t).trim(); const v = /^0x/i.test(t) ? parseInt(t, 16) : /^[01]{8}$/.test(t) ? parseInt(t, 2) : parseInt(t, 10); return Number.isFinite(v) && v >= 0 && v <= 255 ? v : NaN; };

  function svgOf(w, h) { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", `0 0 ${w} ${h}`); s.setAttribute("width", w); return s; }
  function add(p, tag, a, txt) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt !== undefined) e.textContent = txt; p.appendChild(e); return e; }
  // transitions: [[x, level], ...] sorted; draws a digital line between x0 and x1
  function wave(svg, X, y, h, start, trans, x0, x1) {
    let lvl = start, d = `M${X(x0)},${lvl ? y : y + h}`;
    trans.forEach(([x, v]) => { if (v === lvl) return; d += `H${X(x)}V${v ? y : y + h}`; lvl = v; });
    d += `H${X(x1)}`;
    add(svg, "path", { d, class: "w" });
  }
  const levelAt = (start, trans, x) => { let l = start; for (const [tx, v] of trans) { if (tx <= x + 1e-9) l = v; else break; } return l; };

  // ------------------------------------------------------------------ I2C
  function i2cItems(o) {
    const items = [];
    const byte = (v, by, label, tip, ackBy, ack) => {
      for (let b = 7; b >= 0; b--) items.push({ k: "bit", v: (v >> b) & 1, by, g: label, tip });
      items.push({ k: "bit", v: ack ? 0 : 1, by: ack ? ackBy : "none", g: ack ? "ACK" : "NACK", ackOf: label,
        tip: ack ? `ACK: on the ninth clock the ${ackBy === "d" ? "device" : "master"} pulls SDA low to say it received the byte.` : ackBy === "m" ? "NACK from the master: SDA stays high on the ninth clock. It tells the device that this was the last byte it wants." : "NACK: nobody pulled SDA low on the ninth clock, so the pull-up keeps it high. No device has this address, or it is not powered." });
    };
    const A = o.addr, W = (A << 1) | 0, R = (A << 1) | 1;
    items.push({ k: "S", tip: "START: SDA falls while SCL is high. Only the master does this, and from now on the bus is busy." });
    byte(W, "m", `${hx(W)} = ${hx(A)} + W`, `Address byte: the 7-bit address ${hx(A)} shifted left by one, plus 0 for write: ${hx(A)} << 1 | 0 = ${hx(W)} = ${bin(W)}. The bits go out MSB first, and SDA only changes while SCL is low.`, "d", !o.absent);
    if (o.absent) { items.push({ k: "P", tip: "STOP: after the NACK the master gives up and releases the bus. i2c_write_blocking() returns PICO_ERROR_GENERIC." }); return items; }
    if (o.op === "write") {
      byte(o.reg, "m", `reg ${hx(o.reg)}`, `Register number ${hx(o.reg)}: the device stores it in its register pointer.`, "d", true);
      byte(o.data, "m", `value ${hx(o.data)}`, `The value ${hx(o.data)} goes into register ${hx(o.reg)}. For PWR_MGMT_1 (0x6B), 0x00 clears the SLEEP bit and wakes the MPU6050.`, "d", true);
      items.push({ k: "P", tip: "STOP: SDA rises while SCL is high. A write needs no repeated START because nothing comes back." });
      return items;
    }
    byte(o.reg, "m", `reg ${hx(o.reg)}`, `Register number ${hx(o.reg)}: it sets the device's register pointer. The master does not send a STOP after it (nostop = true).`, "d", true);
    if (o.stopBug) {
      items.push({ k: "P", tip: "STOP where a repeated START belongs: the transaction ends here and the bus is released. Another master could take the bus now, and some devices reset their register pointer. This is the bug the lesson's mistakes section describes." });
      items.push({ k: "S", tip: "A new START: this is a second, separate transaction." });
    } else items.push({ k: "Sr", tip: "Repeated START: SDA falls while SCL is high again, without a STOP before it. The master keeps the bus and changes direction to read." });
    byte(R, "m", `${hx(R)} = ${hx(A)} + R`, `Address byte for reading: ${hx(A)} << 1 | 1 = ${hx(R)}.`, "d", true);
    byte(o.data, "d", `data ${hx(o.data)}`, `The device drives SDA now: the byte ${hx(o.data)} = ${bin(o.data)}, MSB first. For WHO_AM_I (0x75) the MPU6050 answers 0x68. The master only drives SCL during these clocks.`, "m", false);
    items.push({ k: "P", tip: "STOP: SDA rises while SCL is high. The bus is free again." });
    return items;
  }
  function drawI2c(o, onTip) {
    const items = i2cItems(o), U = 24, L = 46, n = items.length + 2, W = L + n * U + 10, H = 150;
    const X = x => L + x * U, svg = svgOf(W, H);
    const scl = [], sda = [];
    let x = 1;
    const rows = { fld: 8, sda: 48, scl: 100 }, hh = 26;
    items.forEach(it => {
      if (it.k === "S") { sda.push([x + 0.5, 0]); scl.push([x + 1, 0]); }
      if (it.k === "Sr") { sda.push([x + 0.1, 1]); scl.push([x + 0.4, 1]); sda.push([x + 0.7, 0]); scl.push([x + 1, 0]); }
      if (it.k === "P") { sda.push([x + 0.1, 0]); scl.push([x + 0.4, 1]); sda.push([x + 0.7, 1]); }
      if (it.k === "bit") {
        if (it.by !== "none") add(svg, "rect", { class: it.by === "m" ? "m" : "d", x: X(x + 0.1), y: rows.sda - 3, width: U, height: hh + 6 });
        else add(svg, "rect", { class: "x", x: X(x + 0.1), y: rows.sda - 3, width: U, height: hh + 6 });
        sda.push([x + 0.1, it.v]); scl.push([x + 0.5, 1]); scl.push([x + 1, 0]);
        add(svg, "text", { class: "bit", x: X(x + 0.55), y: rows.sda + hh + 16, "text-anchor": "middle" }, String(it.v));
      }
      it.x = x; x += 1;
    });
    add(svg, "text", { class: "lbl", x: 4, y: rows.sda + 17 }, "SDA"); add(svg, "text", { class: "lbl", x: 4, y: rows.scl + 17 }, "SCL");
    wave(svg, X, rows.sda, hh, 1, sda, 0, n); wave(svg, X, rows.scl, hh, 1, scl, 0, n);
    // fields
    const groups = [];
    items.forEach(it => {
      const name = it.k === "bit" ? it.g : it.k;
      const last = groups[groups.length - 1];
      if (last && last.name === name && it.k === "bit" && !it.ackOf) last.x1 = it.x + 1;
      else groups.push({ name, x0: it.x, x1: it.x + 1, tip: it.tip });
    });
    groups.forEach(g => {
      const gEl = add(svg, "g", { class: "fld" });
      add(gEl, "rect", { x: X(g.x0) + 1, y: rows.fld, width: X(g.x1) - X(g.x0) - 2, height: 24, rx: 3 });
      add(gEl, "text", { x: (X(g.x0) + X(g.x1)) / 2, y: rows.fld + 16, "text-anchor": "middle" }, g.name.length * 6 > X(g.x1) - X(g.x0) ? g.name.split(" ")[0] : g.name);
      gEl.addEventListener("click", () => { svg.querySelectorAll(".fld").forEach(f => f.classList.remove("on")); gEl.classList.add("on"); onTip(`<b>${g.name}.</b> ${g.tip}`); });
    });
    const res = o.absent ? `<span class="bad">No ACK after the address.</span> The transfer stops after one byte, and the call returns an error.`
      : o.op === "write" ? `<span class="ok">Three bytes, each ACKed, then STOP.</span> Register ${hx(o.reg)} now holds ${hx(o.data)}.`
      : o.stopBug ? `<span class="bad">Two transactions, not one.</span> A STOP sits between the register byte and the read. The capture should show a repeated START there.`
      : `<span class="ok">One transaction:</span> START, ${hx(o.addr)}+W, ACK, ${hx(o.reg)}, ACK, repeated START, ${hx(o.addr)}+R, ACK, ${hx(o.data)}, NACK, STOP.`;
    return { svg, res, legend: '<span><i style="background:var(--accent);opacity:.35"></i>the master drives SDA</span><span><i style="background:var(--good);opacity:.5"></i>the device drives SDA</span><span><i style="background:var(--bad);opacity:.4"></i>nobody drives it: the pull-up holds it high</span>' };
  }

  // ------------------------------------------------------------------ UART
  function drawUart(o, onTip) {
    const bytes = o.bytes, per = 1 + 8 + (o.parity === "none" ? 0 : 1) + o.stop;
    const tx = [], fields = [];
    let x = 1;
    bytes.forEach((b, bi) => {
      tx.push([x, 0]); fields.push({ x0: x, x1: x + 1, name: "start", tip: "Start bit: the line goes low for one bit time. The falling edge is what the receiver synchronises on." });
      for (let i = 0; i < 8; i++) { const v = (b >> i) & 1; tx.push([x + 1 + i, v]); fields.push({ x0: x + 1 + i, x1: x + 2 + i, name: "D" + i, bit: v, tip: `Data bit ${i} = ${v}. UART sends the least significant bit first, so ${hx(b)} = ${bin(b)} goes out as ${bin(b).split("").reverse().join(" ")}.` }); }
      let p = x + 9;
      if (o.parity !== "none") {
        const ones = bin(b).split("").filter(c => c === "1").length, pv = o.parity === "even" ? ones & 1 : 1 - (ones & 1);
        tx.push([p, pv]); fields.push({ x0: p, x1: p + 1, name: "P", bit: pv, tip: `${o.parity} parity: ${ones} ones in the data, so the parity bit is ${pv} to make the total ${o.parity}.` }); p++;
      }
      tx.push([p, 1]); fields.push({ x0: p, x1: p + o.stop, name: o.stop === 2 ? "stop stop" : "stop", tip: `Stop bit${o.stop > 1 ? "s" : ""}: the line returns high for ${o.stop} bit time${o.stop > 1 ? "s" : ""}, so the next start bit has a falling edge to show.` });
      x += per; if (bi < bytes.length - 1 && o.gap) x += 1;
    });
    const end = x + 1;
    // receiver
    const Ttx = 1e6 / o.baud, Trx = 1e6 / o.rxbaud, ratio = Trx / Ttx;   // receiver bit time in transmitter bit units
    const rx = [], samples = [];
    let search = 0;
    for (let f = 0; f < bytes.length + 2; f++) {
      let fe = null, lvl = 1;
      for (let s = search; s < end; s += 0.05) { const l = levelAt(1, tx, s); if (lvl === 1 && l === 0) { fe = Math.round(s / 0.05) * 0.05; break; } lvl = l; }
      if (fe === null) break;
      let val = 0, ok = true; const pts = [];
      for (let k = 0; k < per; k++) {
        const t = fe + (k + 0.5) * ratio, l = levelAt(1, tx, t);
        pts.push([t, l]);
        if (k >= 1 && k <= 8) val |= l << (k - 1);
      }
      const stopOk = pts[per - 1][1] === 1;
      ok = stopOk && levelAt(1, tx, pts[0][0]) === 0;
      rx.push({ val, stopOk }); samples.push(...pts.map(p => [p[0], p[1], !ok]));
      search = fe + (per - o.stop + 0.5) * ratio;
    }
    const U = Math.max(16, Math.min(26, 760 / end)), L = 46, W = L + end * U + 10, H = 140, X = v => L + v * U, svg = svgOf(W, H);
    const y = 50, hh = 28;
    fields.forEach(f => {
      const g = add(svg, "g", { class: "fld" });
      add(g, "rect", { x: X(f.x0) + 1, y: 8, width: X(f.x1) - X(f.x0) - 2, height: 22, rx: 3 });
      add(g, "text", { x: (X(f.x0) + X(f.x1)) / 2, y: 23, "text-anchor": "middle" }, f.name === "stop stop" ? "stop" : f.name);
      if (f.bit !== undefined) add(svg, "text", { class: "bit", x: (X(f.x0) + X(f.x1)) / 2, y: y + hh + 16, "text-anchor": "middle" }, String(f.bit));
      g.addEventListener("click", () => { svg.querySelectorAll(".fld").forEach(e => e.classList.remove("on")); g.classList.add("on"); onTip(`<b>${f.name === "stop stop" ? "stop bits" : f.name}.</b> ${f.tip}`); });
    });
    add(svg, "text", { class: "lbl", x: 4, y: y + 18 }, "TX");
    wave(svg, X, y, hh, 1, tx, 0, end);
    samples.forEach(([t, l, bad]) => add(svg, "circle", { class: "smp" + (bad ? " bad" : ""), cx: X(t), cy: l ? y : y + hh, r: 3.2 }));
    for (let b = 0; b <= end; b += Math.max(1, Math.round(end / 12))) add(svg, "text", { class: "ax", x: X(b), y: H - 6, "text-anchor": "middle" }, (b * Ttx).toFixed(b * Ttx < 100 ? 1 : 0));
    add(svg, "text", { class: "ax", x: W - 10, y: H - 18, "text-anchor": "end" }, "µs");
    const sent = bytes.map(b => hx(b) + (b >= 32 && b < 127 ? ` '${String.fromCharCode(b)}'` : "")).join(", ");
    const got = rx.slice(0, bytes.length).map((r, i) => { const okb = r.val === bytes[i] && r.stopOk; return `<span class="${okb ? "ok" : "bad"}">${hx(r.val)}${r.val >= 32 && r.val < 127 ? ` '${String.fromCharCode(r.val)}'` : ""}${r.stopOk ? "" : " (framing error: the stop bit read 0)"}</span>`; }).join(", ");
    const err = o.err, drift = Math.abs((per - 0.5) * (ratio - 1)), limit = 50 / (per - 0.5);
    const res = `Bit time ${Ttx.toFixed(2)} µs; one frame is ${per} bits = ${(per * Ttx).toFixed(1)} µs. Sent ${sent}. ` +
      (err === 0 ? `The receiver samples in the middle of each bit (dots) and reads ${got}.` : `The receiver runs at ${Math.round(o.rxbaud)} baud (${err > 0 ? "+" : ""}${err.toFixed(2)} %), so its samples drift along the frame: by the stop bit they are ${drift.toFixed(2)} bit times off the middle. It reads ${got}${rx.length > bytes.length ? `, plus ${rx.length - bytes.length} byte${rx.length - bytes.length > 1 ? "s" : ""} of garbage` : ""}.`) +
      ` <br>The last sample stays inside its bit while the drift is under half a bit: for a ${per}-bit frame that is an error of about ±${limit.toFixed(1)} % between the two clocks, and less in practice, because the receiver finds the start edge only to within 1/16 of a bit. The RP2040 divisor of lesson 53 is off by 0.006 %.`;
    return { svg, res, legend: '<span><i style="background:var(--accent);border-radius:50%"></i>where the receiver samples the line</span><span><i style="background:var(--bad);border-radius:50%"></i>samples of a byte it reads wrong</span>' };
  }

  // ------------------------------------------------------------------ SPI
  const MODES = [[0, 0], [0, 1], [1, 0], [1, 1]];
  function drawSpi(o, onTip) {
    const [cpol, cpha] = MODES[o.mode], b = o.byte;
    const bits = []; for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    const sck = [], mosi = [], edges = [];
    for (let i = 0; i < 8; i++) {
      const lead = cpha ? i + 1 : i + 1.5, trail = cpha ? i + 1.5 : i + 2;
      edges.push({ x: lead, rise: cpol === 0, lead: true, i }); edges.push({ x: trail, rise: cpol === 1, lead: false, i });
    }
    edges.forEach(e => sck.push([e.x, e.rise ? 1 : 0]));
    const changes = [];
    if (!cpha) { mosi.push([0.5, bits[0]]); changes.push(0.5); for (let i = 1; i < 8; i++) { mosi.push([i + 1, bits[i]]); changes.push(i + 1); } }
    else for (let i = 0; i < 8; i++) { mosi.push([i + 1, bits[i]]); changes.push(i + 1); }
    const devRise = o.dev === 0 || o.dev === 3;
    const samples = edges.filter(e => e.rise === devRise).map(e => {
      const race = changes.some(c => Math.abs(c - e.x) < 1e-9);
      return { x: e.x, v: levelAt(bits[0], mosi, e.x + 1e-6), race };
    });
    const got = samples.reduce((a, s) => (a << 1) | s.v, 0) & 0xFF;
    const U = 70, L = 50, end = 10, W = L + end * U + 10, H = 210, X = v => L + v * U, svg = svgOf(W, H);
    const rows = { fld: 6, cs: 38, sck: 88, mosi: 140 }, hh = 26;
    for (let i = 0; i < 8; i++) {
      const g = add(svg, "g", { class: "fld" }), x0 = cpha ? i + 1 : i + (i === 0 ? 0.5 : 1), x1 = cpha ? i + 2 : i + 2;
      add(g, "rect", { x: X(i + 1) + 2, y: rows.fld, width: U - 4, height: 22, rx: 3 });
      add(g, "text", { x: X(i + 1.5), y: rows.fld + 15, "text-anchor": "middle" }, `bit ${7 - i} = ${bits[i]}`);
      g.addEventListener("click", () => { svg.querySelectorAll(".fld").forEach(e => e.classList.remove("on")); g.classList.add("on");
        onTip(`<b>Bit ${7 - i}</b> of ${hx(b)} (MSB first). In mode ${o.mode} the master puts it on MOSI ${cpha ? "at the leading clock edge" : i === 0 ? "when CS falls" : "at the trailing edge of the previous bit"}, and it should be read at the ${cpha ? "trailing" : "leading"} edge, which is ${(cpha ? !(cpol === 0) : cpol === 0) ? "rising" : "falling"}.`); });
      add(svg, "text", { class: "bit", x: X(i + 1.5), y: rows.mosi + hh + 15, "text-anchor": "middle" }, String(bits[i]));
      void x0; void x1;
    }
    add(svg, "text", { class: "lbl", x: 4, y: rows.cs + 17 }, "CS"); add(svg, "text", { class: "lbl", x: 4, y: rows.sck + 17 }, "SCK"); add(svg, "text", { class: "lbl", x: 4, y: rows.mosi + 17 }, "MOSI");
    wave(svg, X, rows.cs, hh, 1, [[0.5, 0], [9.5, 1]], 0, end);
    wave(svg, X, rows.sck, hh, cpol, sck, 0, end);
    wave(svg, X, rows.mosi, hh, bits[0], mosi, 0.5, 9.5);
    samples.forEach(s => {
      add(svg, "line", { class: "edge" + (s.race ? " bad" : ""), x1: X(s.x), x2: X(s.x), y1: rows.sck - 4, y2: rows.mosi + hh + 2 });
      add(svg, "circle", { class: "smp" + (s.race ? " bad" : ""), cx: X(s.x), cy: s.v ? rows.mosi : rows.mosi + hh, r: 3.5 });
    });
    const okb = got === b && !samples.some(s => s.race);
    const res = `The master sends ${hx(b)} in mode ${o.mode} (CPOL ${cpol}, CPHA ${cpha}): the clock idles ${cpol ? "high" : "low"}, and data is meant to be read on the ${(cpha ? cpol === 1 : cpol === 0) ? "rising" : "falling"} edge. The device samples on every ${devRise ? "rising" : "falling"} edge (lines). ` +
      (okb ? `<span class="ok">It reads ${hx(got)}: correct.</span>` + (o.dev !== o.mode ? ` Mode ${o.dev} and mode ${o.mode} sample on the same edge, so this pair happens to work.` : "")
        : `<span class="bad">It reads ${hx(got)} = ${bin(got)}, not ${hx(b)}.</span> Its edges ${samples.some(s => s.race) ? "fall exactly where the master changes MOSI (red), so it catches the next bit, one place early" : "do not match the master's"}. SPI has no handshake, so nothing reports the error: only the data is wrong.`);
    return { svg, res, legend: '<span><i style="background:var(--accent)"></i>edge where the device samples MOSI</span><span><i style="background:var(--bad)"></i>it samples while MOSI is changing</span>' };
  }

  function mount(box) {
    const E = window.Course.el;
    let bus = ["i2c", "uart", "spi"].includes(box.dataset.bus) ? box.dataset.bus : "i2c";
    const st = { i2c: { addr: 0x68, reg: 0x75, data: 0x68, op: "read", absent: false, stopBug: false },
      uart: { text: "Hi", baud: 115200, err: 0, parity: "none", stop: 1, gap: false },
      spi: { byte: 0x01, mode: 0, dev: 0 } };
    box.appendChild(E("h3", { text: box.dataset.title || "What the wires carry" }));
    const tabs = E("div", { class: "bw-tabs" }), ctl = E("div", { class: "bw-ctl" }), scroll = E("div", { class: "bw-scroll" }), legend = E("div", { class: "bw-legend" });
    const res = E("div", { class: "bw-res" }), tip = E("div", { class: "bw-tip", text: "Click a field above the wires to see what it is." });
    box.append(tabs, ctl, scroll, legend, res, tip);
    if (box.dataset.bus) tabs.style.display = "none";   // a lesson about one bus shows only that bus
    const tabBtns = [["i2c", "I²C"], ["uart", "UART"], ["spi", "SPI"]].map(([k, t]) => { const b = E("button", { type: "button", class: "btn", text: t, onclick: () => { bus = k; tip.textContent = "Click a field above the wires to see what it is."; build(); } }); tabs.appendChild(b); return [k, b]; });
    const sel = (opts, v, on, label) => { const s = E("select", { "aria-label": label }, opts.map(([a, b]) => E("option", { value: a, text: b }))); s.value = String(v); s.addEventListener("change", () => { on(s.value); draw(); }); return s; };
    const txt = (v, on, label) => { const i = E("input", { type: "text", value: v, spellcheck: "false", "aria-label": label }); i.addEventListener("change", () => { on(i.value); draw(); }); return i; };
    const chk = (v, on, label) => { const c = E("input", { type: "checkbox" }); c.checked = v; c.addEventListener("change", () => { on(c.checked); draw(); }); return E("label", {}, [c, label]); };
    const lab = (t, c) => E("label", {}, [t, c]);
    function build() {
      tabBtns.forEach(([k, b]) => { b.className = "btn" + (k === bus ? "" : " secondary"); });
      ctl.innerHTML = "";
      if (bus === "i2c") {
        const s = st.i2c;
        ctl.append(lab("transfer", sel([["read", "read one register"], ["write", "write one register"]], s.op, v => { s.op = v; if (v === "write" && s.reg === 0x75) { s.reg = 0x6B; s.data = 0x00; } if (v === "read" && s.reg === 0x6B) { s.reg = 0x75; s.data = 0x68; } build(); }, "Transfer")),
          lab("address", txt(hx(s.addr), v => { const n = parseByte(v); if (n < 128) s.addr = n; }, "Address")), lab("register", txt(hx(s.reg), v => { const n = parseByte(v); if (!isNaN(n)) s.reg = n; }, "Register")),
          lab(s.op === "read" ? "the device answers" : "value", txt(hx(s.data), v => { const n = parseByte(v); if (!isNaN(n)) s.data = n; }, "Data")),
          chk(s.absent, v => { s.absent = v; }, " no device at this address"));
        if (s.op === "read") ctl.append(chk(s.stopBug, v => { s.stopBug = v; }, " STOP instead of a repeated START (the bug)"));
      } else if (bus === "uart") {
        const s = st.uart, bauds = [9600, 19200, 38400, 57600, 115200].map(v => [v, String(v)]);
        const rxv = E("span", { class: "rxv" });
        const rxs = E("input", { type: "range", min: -12, max: 12, step: 0.25, value: s.err, "aria-label": "Receiver clock error" });
        const showRx = () => { rxv.textContent = `${s.err > 0 ? "+" : ""}${s.err.toFixed(2)} % = ${Math.round(s.baud * (1 + s.err / 100))} baud`; };
        rxs.addEventListener("input", () => { s.err = +rxs.value; showRx(); draw(); });
        showRx();
        ctl.append(lab("bytes", txt(s.text, v => { s.text = v; }, "Bytes")), lab("transmitter baud", sel(bauds, s.baud, v => { s.baud = +v; showRx(); }, "Baud")),
          E("label", { class: "rx" }, ["receiver clock error ", rxs, rxv]),
          E("button", { class: "btn secondary", type: "button", text: "Same clock", onclick: () => { s.err = 0; rxs.value = 0; showRx(); draw(); } }),
          lab("parity", sel([["none", "none"], ["even", "even"], ["odd", "odd"]], s.parity, v => { s.parity = v; }, "Parity")), lab("stop bits", sel([[1, "1"], [2, "2"]], s.stop, v => { s.stop = +v; }, "Stop bits")));
        ctl.appendChild(E("span", { class: "widget-hint", text: "Bytes: text such as Hi, or hex such as 0x55 0xA5." }));
      } else {
        const s = st.spi;
        ctl.append(lab("byte", txt(hx(s.byte), v => { const n = parseByte(v); if (!isNaN(n)) s.byte = n; }, "Byte")),
          lab("master mode", sel(MODES.map((m, i) => [i, `mode ${i} (CPOL ${m[0]}, CPHA ${m[1]})`]), s.mode, v => { s.mode = +v; }, "Master mode")),
          lab("the device expects", sel(MODES.map((m, i) => [i, `mode ${i}`]), s.dev, v => { s.dev = +v; }, "Device mode")));
        ctl.appendChild(E("span", { class: "widget-hint", text: "The 74HC595 samples on the rising edge: mode 0." }));
      }
      draw();
    }
    function uartBytes(t) {
      t = t.trim();
      if (/^(0x[0-9a-f]{1,2}[\s,]*)+$/i.test(t)) return t.split(/[\s,]+/).filter(Boolean).map(v => parseInt(v, 16)).slice(0, 4);
      return [...t].slice(0, 4).map(c => c.charCodeAt(0) & 0xFF);
    }
    function draw() {
      const onTip = h => { tip.innerHTML = h; };
      let r;
      if (bus === "i2c") r = drawI2c(st.i2c, onTip);
      else if (bus === "uart") { const by = uartBytes(st.uart.text); r = drawUart({ ...st.uart, rxbaud: st.uart.baud * (1 + st.uart.err / 100), bytes: by.length ? by : [0x48] }, onTip); }
      else r = drawSpi(st.spi, onTip);
      scroll.innerHTML = ""; scroll.appendChild(r.svg); res.innerHTML = r.res; legend.innerHTML = r.legend;
    }
    build();
  }
  window.BusWave = { i2cItems };
  function init() {
    if (!document.getElementById("buswave-css")) { const s = document.createElement("style"); s.id = "buswave-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.buswave").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
