/* Look inside a firmware update (inside/update.html). Load after manifest.js, course.js and inside.js.
 *
 *   <div class="widget update"></div>
 *
 * A device runs from one flash slot while a new image arrives over UART into the other. Each 4 KB sector is
 * erased (it then reads 0xFF) and programmed page by page (256-byte chunks). The image's header carries a
 * magic value and the CRC-32 of the image; the receiver recomputes it. Only a good image is marked pending,
 * in a metadata record kept twice with a sequence number and its own check, so a record cut off by a power
 * loss fails and the other copy is used (lessons 104, 105). The bootloader runs a pending image as a trial
 * with a counter; the image confirms itself after its self-test, or the watchdog resets it and the counter
 * runs out, and the bootloader rolls back to the old slot (lesson 104).
 * The CRC-32 (reflected polynomial 0xEDB88320) is computed for real over a made-up 48 KB image.
 * Illustrative: slot sizes, 50 ms per sector erase, 22 ms per chunk, the 2 s self-test, 2 trials, boot time.
 * Time is in seconds.
 */
(function () {
  "use strict";
  const I = window.Inside, S = I.S, cls = I.cls;
  const CSS = `
  .update .tool{fill:var(--bg);stroke:var(--muted);stroke-width:1.2}
  .update .cell{fill:var(--code-bg);stroke:var(--rule);stroke-width:1}
  .update .cell.ff{fill:var(--bg);stroke:var(--muted);stroke-dasharray:3 2}
  .update .cell.img{fill:var(--accent-soft);stroke:var(--accent)}
  .update .cell.old{fill:var(--code-bg);stroke:var(--muted)}
  .update .cell.bad{fill:var(--bad-soft);stroke:var(--bad)}
  .update .cell.boot{fill:var(--good-soft);stroke:var(--good)}
  .update .fill{fill:var(--warn)}
  .update .run{fill:none;stroke:var(--good);stroke-width:2.5}
  .update .fbox{fill:none;stroke:var(--rule);stroke-width:1.2;stroke-dasharray:5 4}
  .update .led{fill:var(--bg);stroke:var(--muted);stroke-width:1.2} .update .led.on{fill:var(--good);stroke:var(--good)}
  .update .psu{fill:var(--code-bg);stroke:var(--muted);stroke-width:1.2} .update .psu.off{stroke:var(--bad);fill:var(--bad-soft)}
  .update .bar{fill:var(--accent)}`;

  const W = 1200, H = 640, NS = 12, CW = 34, MX = 150;
  const CHIP = { x: 640, y: 200, w: 160, h: 250 };
  const CARD = { x: 840, y: 16, w: 350, h: 608 };
  const SX = CARD.x + 22, SX2 = CARD.x + 208, SW = 120, RX = CARD.x + CARD.w - 20;
  const P = { tick: 0.002, erase: 0.05, chunk: 0.022, pages: 16, verify: 0.15, meta: 0.2, boot: 0.4, selftest: 2, crash: 1, trials: 2 };
  const ROWS = { boot: 316, A: 356, B: 396, meta: 436 };

  // ---- CRC-32 over a made-up image
  const TABLE = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function image(ver) { const b = new Uint8Array(48 * 1024); let x = ver.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0; for (let i = 0; i < b.length; i++) { x = (x * 1103515245 + 12345) >>> 0; b[i] = x >>> 24; } return b; }
  const hex8 = v => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(8, "0");

  function mount(box) {
    const s = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "A device's flash memory during a firmware update, and the bootloader's state machine" });
    const dyn = { cells: { A: [], B: [] }, fills: { A: [], B: [] }, meta: [] };

    // ---- wires
    dyn.uartW = S("path", { class: "w", d: `M170 110 V240 H${CHIP.x - 10}` });
    dyn.vddW = S("path", { class: "w", d: `M590 155 H690 V${CHIP.y - 10}` });
    dyn.ledW = S("path", { class: "w", d: `M760 ${CHIP.y - 10} V136` });
    s.append(dyn.uartW, dyn.vddW, dyn.ledW);
    // ---- update tool, supply, LED
    s.append(S("rect", { class: "tool", x: 40, y: 20, width: 260, height: 90, rx: 8 }), S("text", { class: "t h", x: 54, y: 40 }, "UPDATE TOOL · LAPTOP"));
    dyn.toolTxt = S("text", { class: "t", x: 54, y: 62 }); dyn.toolTxt2 = S("text", { class: "t s", x: 54, y: 80 });
    s.append(dyn.toolTxt, dyn.toolTxt2, S("rect", { class: "fbox", x: 54, y: 90, width: 230, height: 8 }));
    dyn.bar = S("rect", { class: "bar", x: 54, y: 90, height: 8, width: 0 }); s.append(dyn.bar);
    dyn.psu = S("rect", { class: "psu", x: 470, y: 130, width: 120, height: 50, rx: 6 }); s.append(dyn.psu, S("text", { class: "t s mid", x: 530, y: 152 }, "power supply"));
    dyn.psuTxt = S("text", { class: "t s mid", x: 530, y: 168 }); s.append(dyn.psuTxt);
    dyn.led = S("circle", { class: "led", cx: 760, cy: 126, r: 9 }); s.append(dyn.led, S("text", { class: "t s", x: 774, y: 130 }, "status LED"));
    // ---- flash map (inside the MCU)
    s.append(S("rect", { class: "fbox", x: 40, y: 280, width: 586, height: 196, rx: 8 }), S("text", { class: "t h", x: 54, y: 298 }, "FLASH INSIDE THE MCU · 4 KB SECTORS"));
    s.append(S("line", { class: "zoom", x1: 626, y1: 280, x2: CHIP.x, y2: 400 }), S("line", { class: "zoom", x1: 626, y1: 476, x2: CHIP.x, y2: 440 }));
    s.append(S("text", { class: "t s", x: 54, y: ROWS.boot + 18 }, "BOOTLOADER"));
    for (let i = 0; i < 3; i++) s.append(S("rect", { class: "cell boot", x: MX + i * (CW + 2), y: ROWS.boot, width: CW, height: 28, rx: 3 }));
    ["A", "B"].forEach(sl => {
      dyn["lab" + sl] = S("text", { class: "t s", x: 54, y: ROWS[sl] + 18 }); s.append(dyn["lab" + sl]);
      for (let i = 0; i < NS; i++) {
        const x = MX + i * (CW + 2), r = S("rect", { class: "cell", x, y: ROWS[sl], width: CW, height: 28, rx: 3 });
        const f = S("rect", { class: "fill", x, y: ROWS[sl] + 24, height: 4, width: 0 });
        dyn.cells[sl].push(r); dyn.fills[sl].push(f); s.append(r, f);
      }
      s.append(S("text", { class: "t s mid", x: MX + CW / 2, y: ROWS[sl] + 18 }, "hdr"));
      dyn["run" + sl] = S("rect", { class: "run", x: MX - 4, y: ROWS[sl] - 4, width: NS * (CW + 2) + 6, height: 36, rx: 5 }); s.append(dyn["run" + sl]);
    });
    s.append(S("text", { class: "t s", x: 54, y: ROWS.meta + 18 }, "METADATA ×2"));
    for (let i = 0; i < 2; i++) { const r = S("rect", { class: "cell", x: MX + i * 220, y: ROWS.meta, width: 214, height: 28, rx: 3 }); const tx = S("text", { class: "t s", x: MX + i * 220 + 8, y: ROWS.meta + 18 }); dyn.meta.push([r, tx]); s.append(r, tx); }

    I.chip(s, { ...CHIP, sub: "", labelAt: [720, 300], left: [[240, "UART_RX"]], top: [[690, "VDD"], [760, "LED"]] });
    dyn.chipTxt = S("text", { class: "t s mid", x: 720, y: 318 }); s.append(dyn.chipTxt);

    // ---- firmware card
    I.card(s, { ...CARD, from: CHIP });
    I.section(s, { x: SX, x2: RX, y: 40, title: "BOOT AND UPDATE STATES", lessons: [104, 56] });
    const MID = (SX + SX2) / 2;
    const sm = I.stateMachine(s, {
      w: SW, stop: [],
      states: { BOOT: [SX, 64], RUN: [SX2, 64], VERIFY: [SX, 136], DOWNLOAD: [SX2, 136], TRIAL: [MID, 196] },
      paths: { "BOOT>RUN": `M${SX + SW} 74 H${SX2 - 2}`, "RUN>DOWNLOAD": `M${SX2 + 60} 92 V134`, "DOWNLOAD>VERIFY": `M${SX2} 150 H${SX + SW + 2}`,
               "VERIFY>BOOT": `M${SX + 30} 136 V94`, "VERIFY>RUN": `M${SX + SW - 6} 136 L${SX2 + 6} 94`,
               "BOOT>TRIAL": `M${SX} 84 H${SX - 10} V210 H${MID - 2}`, "TRIAL>BOOT": `M${MID} 216 H${SX - 16} V78 H${SX - 2}`,
               "TRIAL>RUN": `M${MID + SW} 210 H${SX2 + SW + 10} V78 H${SX2 + SW + 2}` },
      labels: [["image ok", (SX + SW + SX2) / 2, 69, "mid"], ["update", SX2 + 66, 116, ""], ["last chunk", (SX + SW + SX2) / 2, 166, "mid"],
               ["CRC ok", SX + 36, 116, ""], ["bad", SX + SW + 4, 128, ""], ["confirmed", SX2 + SW + 8, 194, "end"], ["no confirm", SX - 6, 236, ""]] });
    I.section(s, { x: SX, x2: RX, y: 262, title: "RAM", lessons: [20, 103], sep: true });
    const ram = I.ram(s, SX, 286);
    I.section(s, { x: SX, x2: RX, y: 444, title: "UART LOG", lessons: [53], sep: true });
    const uart = I.uart(s, { x: SX, y: 466, n: 9, fmt: t => "[" + t.toFixed(2).padStart(6, " ") + "]" });

    // ---- callouts
    const co = I.callouts(s, [
      ["uart", 188, 150, 150, "Image over UART", ["256-byte chunks, written", "into the other slot while", "the app keeps running."], [53, 103], [300, 240]],
      ["power", 340, 16, 140, "Pull the power", ["Allowed at any moment:", "the running slot is not", "touched until the end."], [104, 105], [470, 155]],
      ["led", 490, 16, 140, "Status LED", ["Slow blink: running.", "Fast: bootloader.", "Double: trial image."], [51], [751, 126]],
      ["slots", 240, 500, 190, "Two slots", ["The bootloader never erases", "the image it runs from. The", "new one goes in the other."], [104, 68], [MX + 5 * (CW + 2) + CW / 2, ROWS.B + 28]],
      ["crc", 40, 500, 190, "Magic and CRC-32", ["Erased flash reads 0xFF. The", "header's magic and the image", "CRC prove the copy is whole."], [104, 103], [MX + CW / 2, ROWS.B + 28]],
      ["meta", 440, 500, 186, "Metadata, twice", ["Two copies, each with a", "sequence number and a check:", "a torn write loses to the other."], [105], [MX + 330, ROWS.meta + 28]]]);
    s.append(co.hot(I.hotspot({ x: 40, y: 20, width: 260, height: 90 }), "uart"), co.hot(I.hotspot({ x: 470, y: 130, width: 120, height: 50 }), "power"),
             co.hot(I.hotspot({ x: 745, y: 110, width: 30, height: 30 }), "led"), co.hot(I.hotspot({ x: 46, y: ROWS.A - 4, width: 560, height: 76 }), "slots"),
             co.hot(I.hotspot({ x: 46, y: ROWS.meta - 4, width: 560, height: 36 }), "meta"));
    co.raise();

    // ---- analyzer and toolbar
    const la = I.analyzer({ secs: 10, note: "10 s", lanes: [
      { name: "VDD", kind: "power", key: "vdd", cls: "good" }, { name: "UART_RX", kind: "chunks arriving", key: "rx" },
      { name: "ERASE", kind: "flash busy", key: "er", cls: "pwm" }, { name: "PROGRAM", kind: "flash busy", key: "pg", cls: "pwm" },
      { name: "LED", kind: "out", key: "led" }] });
    const sendBtn = I.btn("Send update", () => send(false)), badBtn = I.btn("Send a broken build", () => send(true)),
          corruptBtn = I.btn("Flip a bit on the wire", () => { m.corruptNext = !m.corruptNext; log(m.corruptNext ? "the next transfer will have one bad byte" : "transfers clean again"); }),
          pwrBtn = I.btn("Pull the power", () => power(), "stop");
    let speed = 1, labels = "auto";
    I.frame(box, { scene: s, analyzer: la, bar: [
      [sendBtn, badBtn, corruptBtn, pwrBtn],
      [I.cap("Speed"), I.seg([[0.5, "½×"], [1, "1×"], [4, "4×"]], 1, v => { speed = v; }),
       I.cap("Labels"), I.seg([["auto", "Auto"], ["all", "All"], ["off", "Off"]], "auto", v => { labels = v; })]] });

    // ---------------------------------------------------------------- model
    const slotOf = (ver, bad) => ({ ver, bad, ok: true, cells: new Array(NS).fill("img"), fill: new Array(NS).fill(0) });
    const m = { t: 0, on: true, state: "BOOT", lastEdge: null, phT: 0, run: null, slots: { A: slotOf("1.2", false), B: { ...slotOf("1.1", false), cells: new Array(NS).fill("old") } },
                meta: [{ seq: 7, active: "A", pending: null, trials: 0, ok: true }, { seq: 6, active: "A", pending: null, trials: 0, ok: true }],
                dl: null, metaW: null, corruptNext: false, nextVer: 3, crcCalc: null, crcHdr: null, rxT: -9, erT: -9, pgT: -9, resets: 0 };
    m.slots.B.cells = new Array(NS).fill("old");
    const log = txt => uart.log(m.t, txt);
    const other = sl => sl === "A" ? "B" : "A";
    function go(next, why) { if (m.state !== next) { log(`${m.state} → ${next}${why ? "  " + why : ""}`); m.lastEdge = m.state + ">" + next; m.state = next; m.phT = 0; } }
    const metaNow = () => m.meta.filter(c => c.ok).sort((a, b) => b.seq - a.seq)[0];
    function writeMeta(fields) {                          // overwrite the older copy with seq + 1
      const cur = metaNow(), idx = m.meta.indexOf(m.meta.filter(c => c !== cur)[0] || m.meta[1]);
      m.metaW = { idx, rec: { ...cur, ...fields, seq: cur.seq + 1, ok: true }, until: m.t + P.meta };
      m.meta[idx] = { ...m.meta[idx], ok: false, writing: true };
    }
    function send(bad) {
      if (!m.on) { log("no power"); return; }
      if (m.state !== "RUN") { log(`busy (${m.state}): try again in RUN`); return; }
      const ver = "1." + m.nextVer++;
      const target = other(m.run);
      m.dl = { ver, bad, corrupt: m.corruptNext, target, sector: 0, page: -1, tNext: m.t };
      m.corruptNext = false;
      const sl = m.slots[target]; sl.ver = null; sl.ok = false; sl.bad = bad;
      go("DOWNLOAD", `v${ver} into slot ${target}`); co.show("uart"); co.show("slots");
    }
    function power() {
      if (m.on) {
        m.on = false; log("power lost");
        if (m.metaW) { m.meta[m.metaW.idx] = { ...m.meta[m.metaW.idx], ok: false, writing: false, torn: true }; m.metaW = null; co.show("meta", 5000); }
        if (m.dl) { m.dl = null; co.show("slots", 5000); }
        m.state = "OFF"; m.run = null;
      } else { m.on = true; m.lastEdge = null; m.state = "BOOT"; m.phT = 0; log("power on: bootloader starts"); }
      co.show("power");
    }
    /* The bootloader's decision, run once per boot. */
    function bootDecide() {
      const md = metaNow();
      let slot = md.active, trial = false;
      if (md.pending) {
        if (md.trials > 0) { slot = md.pending; trial = true; writeMeta({ trials: md.trials - 1 }); log(`trial of slot ${slot}, ${md.trials - 1} left after this`); }
        else { log(`slot ${md.pending} never confirmed: roll back to ${md.active}`); writeMeta({ pending: null, trials: 0 }); }
      }
      if (!m.slots[slot].ok) { log(`slot ${slot} fails magic/CRC: use ${other(slot)}`); slot = other(slot); trial = false; }
      m.run = slot;
      return trial;
    }
    function step(dt) {
      m.t += dt;
      if (!m.on) return;
      m.phT += dt;
      if (m.metaW && m.t >= m.metaW.until) { m.meta[m.metaW.idx] = m.metaW.rec; m.metaW = null; }
      switch (m.state) {
        case "BOOT":
          if (m.phT >= P.boot && !m.metaW) { const trial = bootDecide(); if (trial) go("TRIAL", `running v${m.slots[m.run].ver}`); else go("RUN", `slot ${m.run}, v${m.slots[m.run].ver}`); }
          break;
        case "DOWNLOAD": {
          const d = m.dl, sl = m.slots[d.target];
          if (m.t < d.tNext) break;
          if (d.page < 0) { sl.cells[d.sector] = "ff"; sl.fill[d.sector] = 0; m.erT = m.t; d.page = 0; d.tNext = m.t + P.erase; break; }
          m.rxT = m.t; m.pgT = m.t; d.page++; sl.fill[d.sector] = d.page / P.pages; d.tNext = m.t + P.chunk;
          if (d.page >= P.pages) { sl.cells[d.sector] = "img"; d.sector++; d.page = -1; }
          if (d.sector >= NS) go("VERIFY", "all 48 KB written");
          break;
        }
        case "VERIFY":
          if (m.phT >= P.verify) {
            const d = m.dl, sl = m.slots[d.target], img = image(d.ver);
            m.crcHdr = crc32(img);
            if (d.corrupt) img[1234] ^= 0x10;
            m.crcCalc = crc32(img);
            if (m.crcCalc !== m.crcHdr) {
              sl.cells = sl.cells.map(() => "bad"); sl.ok = false; m.dl = null;
              log(`CRC ${hex8(m.crcCalc)} ≠ header ${hex8(m.crcHdr)}`); go("RUN", "image rejected"); co.show("crc", 5000);
            } else {
              sl.ver = d.ver; sl.ok = true; m.dl = null;
              log(`CRC ${hex8(m.crcCalc)} matches`); writeMeta({ pending: d.target, trials: P.trials }); co.show("crc"); co.show("meta");
              go("BOOT", "pending set, reboot");
            }
          }
          break;
        case "TRIAL": {
          const sl = m.slots[m.run];
          if (sl.bad && m.phT >= P.crash) { m.resets++; log(`v${sl.ver} crashed: watchdog reset`); go("BOOT"); break; }
          if (!sl.bad && m.phT >= P.selftest && !m.metaW) { writeMeta({ active: m.run, pending: null, trials: 0 }); log(`self-test passed: slot ${m.run} confirmed`); go("RUN", "confirmed"); }
          break;
        }
        case "RUN": break;
      }
    }
    function ledOn() {
      if (!m.on) return 0;
      const t = m.t;
      if (m.state === "BOOT") return t % 0.25 < 0.125 ? 1 : 0;
      if (m.state === "TRIAL") { const p = t % 1.2; return p < 0.15 || (p > 0.3 && p < 0.45) ? 1 : 0; }
      return t % 1 < 0.5 ? 1 : 0;
    }
    function sample() { la.push(m.t, { vdd: m.on ? 1 : 0, rx: m.t - m.rxT < 0.015 ? 1 : 0, er: m.t - m.erT < P.erase ? 1 : 0, pg: m.t - m.pgT < 0.008 ? 1 : 0, led: ledOn() }); }

    // ---------------------------------------------------------------- drawing
    function render(now) {
      ["A", "B"].forEach(sl => {
        const S_ = m.slots[sl];
        S_.cells.forEach((c, i) => { cls(dyn.cells[sl][i], "cell " + c); dyn.fills[sl][i].setAttribute("width", m.dl && m.dl.target === sl && m.dl.sector === i && c === "ff" ? CW * S_.fill[i] : 0); });
        dyn["lab" + sl].textContent = `SLOT ${sl}  ${S_.ver ? "v" + S_.ver : S_.cells[0] === "old" ? "old" : "–"}`;
        dyn["run" + sl].style.display = m.run === sl && m.on ? "" : "none";
      });
      m.meta.forEach((c, i) => {
        const [r, tx] = dyn.meta[i];
        cls(r, "cell " + (c.writing ? "ff" : c.ok ? "img" : "bad"));
        tx.textContent = c.writing ? "writing…" : c.ok ? `seq ${c.seq}  active ${c.active}  pending ${c.pending ? c.pending + " ×" + c.trials : "–"}` : `seq ? · check fails`;
      });
      cls(dyn.led, "led" + (ledOn() ? " on" : ""));
      cls(dyn.psu, "psu" + (m.on ? "" : " off")); dyn.psuTxt.textContent = m.on ? "on" : "unplugged";
      cls(dyn.vddW, "w" + (m.on ? " on" : "")); cls(dyn.ledW, "w" + (ledOn() ? " on" : ""));
      cls(dyn.uartW, "w" + (I.hold(dyn.uartW, m.t - m.rxT < 0.05, 250) ? " on" : ""));
      const d = m.dl;
      const done = d ? (d.sector * P.pages + Math.max(0, d.page)) / (NS * P.pages) : 0;
      dyn.bar.setAttribute("width", 230 * done);
      dyn.toolTxt.textContent = d ? `sending v${d.ver}${d.bad ? " (broken build)" : ""}` : m.on ? `device runs v${m.run ? m.slots[m.run].ver : "–"}` : "device is off";
      dyn.toolTxt2.textContent = d ? `${Math.round(done * 48)} of 48 KB · slot ${d.target}` : m.corruptNext ? "next transfer: one bad byte" : "";
      dyn.chipTxt.textContent = !m.on ? "no power" : m.state === "BOOT" ? "bootloader" : `app from slot ${m.run}`;
      sendBtn.disabled = badBtn.disabled = !m.on || m.state !== "RUN";
      pwrBtn.textContent = m.on ? "Pull the power" : "Plug it in";
      corruptBtn.textContent = m.corruptNext ? "Wire clean again" : "Flip a bit on the wire";
      sm.set(m.state, m.lastEdge);
      co.update(now, labels);
      const k = I.k, v = I.v, md = metaNow();
      ram.set([
        `${k("char    ")}running    = ${v(m.on && m.run ? "slot " + m.run + " v" + m.slots[m.run].ver : "–")}`,
        `${k("char    ")}active     = ${v(md.active)}  ${k("pending")} ${v(md.pending || "–")}  ${k("trials")} ${v(md.trials)}`,
        `${k("uint32_t ")}meta_seq   = ${v(md.seq)}`,
        `${k("uint32_t ")}received   = ${v(d ? Math.round(done * 48) + " KB" : "–")}`,
        `${k("uint32_t ")}crc_hdr    = ${v(m.crcHdr === null ? "–" : hex8(m.crcHdr))}`,
        `${k("uint32_t ")}crc_calc   = ${v(m.crcCalc === null ? "–" : hex8(m.crcCalc), m.crcCalc !== null && m.crcCalc !== m.crcHdr ? "bad" : "v")}`,
        `${k("uint8_t  ")}wdt_resets = ${v(m.resets)}`]);
      uart.render();
      la.draw(m.t);
    }
    I.loop({ tick: P.tick, speed: () => speed, every: 5, step, sample, render });
    box._demo = { m, send, power, corrupt: () => { m.corruptNext = true; }, crc32, setSpeed: v => { speed = v; }, setLabels: v => { labels = v; } };   // for tests
  }

  I.register("update", mount, CSS);
})();
