/* Modbus RTU frame builder and CRC checker (lesson 101). Load after course.js.
 *
 *   <div class="widget crcframe"></div>
 *
 * Builds a request or a reply, appends CRC-16/MODBUS (reflected polynomial 0xA001, initial 0xFFFF, no final
 * XOR; low byte first), and traces the CRC of any byte one shift at a time, as in the lesson's table.
 * Click bits in the frame to corrupt it on the wire: the receiver runs the CRC over the whole frame,
 * CRC bytes included, and accepts it only if the result is 0.
 * Known values from the lesson: 01 03 00 00 00 02 → CRC 0x0BC4, sent C4 0B; 01 03 04 12 34 AB CD → 0x2000.
 */
(function () {
  "use strict";
  const CSS = `
  .crcframe .cf-row{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .crcframe label{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;max-width:100%}
  .crcframe select{max-width:100%} .crcframe input.hexs{max-width:100%}
  .crcframe input,.crcframe select{font-family:var(--mono);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem}
  .crcframe input{width:5.5rem} .crcframe input.hexs{width:16rem}
  .crcframe .btn{font-size:.75rem;padding:.15rem .5rem}
  .crcframe .cf-frame{display:flex;flex-wrap:wrap;gap:.35rem;margin:.6rem 0}
  .crcframe .cf-byte{border:2px solid var(--f);border-radius:6px;padding:.25rem .35rem;background:var(--code-bg);cursor:pointer;min-width:5.6rem}
  .crcframe .cf-byte.sel{box-shadow:0 0 0 3px var(--warn-soft)}
  .crcframe .cf-byte .h{font-family:var(--mono);font-weight:700;font-size:1rem;text-align:center}
  .crcframe .cf-byte .h.bad{color:var(--bad)}
  .crcframe .cf-byte .n{font-family:var(--sans);font-size:.68rem;color:var(--muted);text-align:center}
  .crcframe .cf-bits{display:flex;gap:1px;justify-content:center;margin-top:.15rem}
  .crcframe .cf-bits button{width:.75rem;height:1.05rem;padding:0;font-family:var(--mono);font-size:.6rem;border:1px solid var(--rule);border-radius:2px;background:var(--bg);color:var(--fg);cursor:pointer}
  .crcframe .cf-bits button.flip{background:var(--bad);color:#fff;border-color:var(--bad)}
  .crcframe .fA{--f:#1c7ed6} .crcframe .fF{--f:#7048e8} .crcframe .fD{--f:#2f9e44} .crcframe .fC{--f:#d9480f}
  .crcframe .cf-res{font-family:var(--sans);font-size:.9rem;padding:.5rem .8rem;border-radius:4px;margin:.4rem 0}
  .crcframe .cf-res.ok{background:var(--good-soft);border-left:4px solid var(--good)} .crcframe .cf-res.bad{background:var(--bad-soft);border-left:4px solid var(--bad)}
  .crcframe table{font-size:.8rem;border-collapse:collapse;margin:.4rem 0}
  .crcframe td,.crcframe th{padding:.18rem .5rem;border-bottom:1px solid var(--rule);font-family:var(--mono);text-align:left}
  .crcframe th{font-family:var(--sans)} .crcframe td.x{color:var(--accent);font-weight:700}
  .crcframe .cf-scroll{overflow-x:auto} .crcframe .cf-note{font-family:var(--sans);font-size:.86rem;color:var(--muted)}`;

  function crc16(bytes) {
    let c = 0xFFFF;
    for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xA001 : c >>> 1; }
    return c;
  }
  function traceByte(start, b) {
    const rows = [["Start", "-", start]];
    let c = start ^ b; rows.push([`XOR ${hx(b)} into the low byte`, "-", c]);
    for (let i = 1; i <= 8; i++) { const out = c & 1; c = out ? (c >>> 1) ^ 0xA001 : c >>> 1; rows.push([`Shift ${i}`, String(out), c, out]); }
    return rows;
  }
  const hx = (v, w = 2) => (v >>> 0).toString(16).toUpperCase().padStart(w, "0");

  function mount(box) {
    const E = window.Course.el;
    const st = { kind: "read", slave: 1, start: 0, count: 2, reg: 1, value: 0x0064, regs: "1234 ABCD", custom: "01 03 00 00 00 02", baud: 115200 };
    let flips = new Set(), sel = 0;
    box.appendChild(E("h3", { text: box.dataset.title || "Build a Modbus RTU frame" }));
    const ctl = E("div", { class: "cf-row" }), ctl2 = E("div", { class: "cf-row" }), frame = E("div", { class: "cf-frame" }), res = E("div", { class: "cf-res" }), timing = E("p", { class: "cf-note" }), trace = E("div", { class: "cf-scroll" });
    box.append(ctl, ctl2, E("p", { class: "widget-hint", text: "Click a byte to trace its CRC step, or click its bits to flip them on the wire." }), frame, res, timing, E("h4", { text: "The CRC, one shift at a time" }), trace);
    const num = (key, label, hex) => { const i = E("input", { type: "text", spellcheck: "false", value: hex ? "0x" + hx(st[key], 4) : String(st[key]), "aria-label": label }); i.addEventListener("change", () => { const v = /^0x/i.test(i.value) ? parseInt(i.value, 16) : parseInt(i.value, 10); if (Number.isFinite(v)) st[key] = v & 0xFFFF; flips.clear(); render(); }); return E("label", {}, [label, i]); };
    function build() {
      ctl.innerHTML = ""; ctl2.innerHTML = "";
      const k = E("select", { "aria-label": "Frame" }, [["read", "request: 03 read holding registers"], ["write", "request: 06 write one register"], ["reply", "reply to 03"], ["custom", "any bytes (hex)"]].map(([v, t]) => E("option", { value: v, text: t })));
      k.value = st.kind; k.addEventListener("change", () => { st.kind = k.value; flips.clear(); sel = 0; build(); });
      const baud = E("select", { "aria-label": "Baud" }, [9600, 19200, 115200].map(v => E("option", { value: v, text: v + " baud" }))); baud.value = st.baud; baud.addEventListener("change", () => { st.baud = +baud.value; render(); });
      ctl.append(k, baud, E("button", { class: "btn secondary", type: "button", text: "Clear the flipped bits", onclick: () => { flips.clear(); render(); } }));
      if (st.kind !== "custom") ctl2.append(num("slave", "slave address"));
      if (st.kind === "read") ctl2.append(num("start", "first register", true), num("count", "how many"));
      if (st.kind === "write") ctl2.append(num("reg", "register", true), num("value", "value", true));
      if (st.kind === "reply") { const i = E("input", { class: "hexs", type: "text", value: st.regs, spellcheck: "false", "aria-label": "Register values" }); i.addEventListener("change", () => { st.regs = i.value; flips.clear(); render(); }); ctl2.append(E("label", {}, ["register values (hex, 16-bit)", i])); }
      if (st.kind === "custom") { const i = E("input", { class: "hexs", type: "text", value: st.custom, spellcheck: "false", "aria-label": "Bytes" }); i.addEventListener("change", () => { st.custom = i.value; flips.clear(); render(); }); ctl2.append(E("label", {}, ["bytes before the CRC", i])); }
      render();
    }
    function body() {
      const s = st.slave & 0xFF, hi = v => (v >> 8) & 0xFF, lo = v => v & 0xFF;
      if (st.kind === "read") return [[s, "A", "slave address"], [3, "F", "function 03"], [hi(st.start), "D", "first register, high"], [lo(st.start), "D", "first register, low"], [hi(st.count), "D", "count, high"], [lo(st.count), "D", "count, low"]];
      if (st.kind === "write") return [[s, "A", "slave address"], [6, "F", "function 06"], [hi(st.reg), "D", "register, high"], [lo(st.reg), "D", "register, low"], [hi(st.value), "D", "value, high"], [lo(st.value), "D", "value, low"]];
      if (st.kind === "reply") {
        const regs = st.regs.trim().split(/[\s,]+/).filter(Boolean).map(v => parseInt(v.replace(/^0x/i, ""), 16) & 0xFFFF).filter(Number.isFinite).slice(0, 8);
        const out = [[s, "A", "slave address"], [3, "F", "function 03"], [regs.length * 2, "D", "byte count"]];
        regs.forEach((r, i) => out.push([hi(r), "D", `register ${i}, high`], [lo(r), "D", `register ${i}, low`]));
        return out;
      }
      return st.custom.trim().split(/[\s,]+/).filter(Boolean).map(v => parseInt(v.replace(/^0x/i, ""), 16) & 0xFF).filter(Number.isFinite).slice(0, 16).map((b, i) => [b, i === 0 ? "A" : i === 1 ? "F" : "D", i === 0 ? "address" : i === 1 ? "function" : "data"]);
    }
    function render() {
      const b = body(), c = crc16(b.map(x => x[0]));
      const sent = [...b, [c & 0xFF, "C", "CRC low (sent first)"], [c >> 8, "C", "CRC high"]];
      const rx = sent.map((x, i) => { let v = x[0]; for (let k = 0; k < 8; k++) if (flips.has(i * 8 + k)) v ^= 1 << k; return v; });
      if (sel >= sent.length) sel = 0;
      frame.innerHTML = "";
      sent.forEach((x, i) => {
        const bits = E("div", { class: "cf-bits" });
        for (let k = 7; k >= 0; k--) { const id = i * 8 + k; bits.appendChild(E("button", { type: "button", class: flips.has(id) ? "flip" : "", text: String((rx[i] >> k) & 1), title: `bit ${k}: click to flip it on the wire`,
          onclick: ev => { ev.stopPropagation(); flips.has(id) ? flips.delete(id) : flips.add(id); render(); } })); }
        const el = E("div", { class: `cf-byte f${x[1]}` + (i === sel ? " sel" : ""), onclick: () => { sel = i; render(); } }, [E("div", { class: "h" + (rx[i] !== x[0] ? " bad" : ""), text: hx(rx[i]) }), E("div", { class: "n", text: x[2] }), bits]);
        frame.appendChild(el);
      });
      const check = crc16(rx), nflip = flips.size;
      res.className = "cf-res " + (check === 0 ? (nflip ? "bad" : "ok") : "bad");
      res.innerHTML = `CRC of the ${b.length} bytes = <b>0x${hx(c, 4)}</b>, sent low byte first as <b>${hx(c & 0xFF)} ${hx(c >> 8)}</b>. ` +
        `The receiver computes the CRC over all ${sent.length} bytes, CRC included: <b>0x${hx(check, 4)}</b>. ` +
        (check === 0 ? (nflip ? `<b>Accepted, though ${nflip} bits were flipped.</b> The changes cancelled out in the CRC; that is rare, but the CRC does not catch every pattern.` : "<b>0 means the frame is intact, so it is accepted.</b>")
          : `<b>Not 0, so the frame is dropped silently</b>: ${nflip} bit${nflip > 1 ? "s" : ""} flipped on the wire. Modbus sends no reply to a bad frame, and the master times out and retries.`);
      const charUs = 10 / st.baud * 1e6, gap = 3.5 * charUs;
      timing.textContent = `At ${st.baud} baud, 8N1, one character is 10 bits = ${charUs.toFixed(1)} µs, so this ${sent.length}-byte frame takes ${(sent.length * charUs / 1000).toFixed(3)} ms. The frame ends after 3.5 characters of silence: ${gap >= 1000 ? (gap / 1000).toFixed(3) + " ms" : gap.toFixed(0) + " µs"}` + (st.baud > 19200 ? "; above 19200 baud the serial-line specification fixes it at 1.750 ms instead." : ".");
      const before = crc16(sent.slice(0, sel).map(x => x[0]));
      trace.innerHTML = "";
      const t = document.createElement("table");
      t.innerHTML = `<tr><th>byte ${sel} = ${hx(sent[sel][0])} (${sent[sel][2]})</th><th>bit shifted out</th><th>crc after the step</th><th></th></tr>` +
        traceByte(before, sent[sel][0]).map(([k, out, v, x]) => `<tr><td>${k}</td><td>${out}</td><td class="${x ? "x" : ""}">${hx(v, 4)}</td><td style="font-family:var(--sans)">${x ? "1 fell off: XOR with A001" : out === "0" ? "0 fell off: just shift" : ""}</td></tr>`).join("");
      trace.appendChild(t);
      trace.appendChild(E("p", { class: "cf-note", text: sel === 0 ? "The first byte starts from 0xFFFF. Click another byte: its trace starts from the CRC of all the bytes before it." : `It starts from 0x${hx(before, 4)}, the CRC of bytes 0 to ${sel - 1}.` }));
    }
    build();
  }
  window.CrcFrame = { crc16 };
  function init() {
    if (!document.getElementById("crcframe-css")) { const s = document.createElement("style"); s.id = "crcframe-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.crcframe").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
