/* Byte-level widgets. Load after course.js.
 *
 *   <div class="widget cobs"></div>     COBS framing (lesson 103), with an optional CRC-16/CCITT-FALSE
 *   <div class="widget glyph"></div>    a 5 by 7 font glyph and SSD1306 page addressing (lesson 61)
 *
 * COBS follows Cheshire and Baker: a code byte gives the distance to the next zero, counting itself;
 * 0xFF means 254 data bytes with no zero after them. 11 22 00 33 encodes to 03 11 22 02 33.
 * CRC-16/CCITT-FALSE: polynomial 0x1021, initial value 0xFFFF, not reflected, no final XOR, appended
 * high byte first, so the CRC over the body and its CRC is 0.
 * The glyph: one byte per column, bit 0 is the top row; L is {0x7F, 0x40, 0x40, 0x40, 0x40}. The page
 * commands are 0xB0 + page, 0x00 + low nibble of the column, 0x10 + high nibble (SSD1306 section 10.1).
 */
(function () {
  "use strict";
  const hx = (v, n) => (v >>> 0).toString(16).toUpperCase().padStart(n || 2, "0");
  const parseHex = t => { const parts = t.trim().split(/[\s,]+/).filter(Boolean); const out = []; for (const p of parts) { const v = parseInt(p.replace(/^0x/i, ""), 16); if (!Number.isFinite(v) || v < 0 || v > 255 || !/^(0x)?[0-9a-f]{1,2}$/i.test(p)) return null; out.push(v); } return out; };

  function cobsEncode(d) {
    const out = [0], trace = []; let ci = 0, code = 1;
    d.forEach((b, i) => {
      if (b === 0) { out[ci] = code; trace.push([i, b, `zero: write code ${hx(code)} at position ${ci}, start a new block at ${out.length}`, code]); ci = out.length; out.push(0); code = 1; }
      else {
        out.push(b); code++; trace.push([i, b, `copy to position ${out.length - 1}; code becomes ${code}`, code]);
        if (code === 0xFF) { out[ci] = 0xFF; trace.push([i, null, `254 data bytes: write code FF at position ${ci}, start a new block at ${out.length}`, 0xFF]); ci = out.length; out.push(0); code = 1; }
      }
    });
    out[ci] = code; trace.push([d.length, null, `end of data: write code ${hx(code)} at position ${ci}`, code]);
    return { out, trace };
  }
  function cobsDecode(e) {
    const out = []; let i = 0;
    while (i < e.length) {
      const code = e[i];
      if (code === 0) return { out, err: `position ${i}: a 00 where a code byte belongs. To the receiver that is the delimiter, so the frame ends early.` };
      i++;
      for (let j = 1; j < code; j++) {
        if (i >= e.length) return { out, err: `the code at position ${i - j} promises ${code - 1} data bytes, but the frame ends after ${j - 1}.` };
        if (e[i] === 0) return { out, err: `position ${i}: a 00 inside a block. The receiver ends the frame there.` };
        out.push(e[i++]);
      }
      if (code < 0xFF && i < e.length) out.push(0);
    }
    return { out, err: null };
  }
  function crcCcitt(d) { let c = 0xFFFF; d.forEach(b => { c ^= b << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }); return c; }

  const CSS = `
  .cobs .cb-row,.glyph .gl-row{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .cobs label,.glyph label{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;max-width:100%}
  .cobs input,.glyph input,.glyph select{font-family:var(--mono);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem;max-width:100%}
  .cobs input.hexs{width:22rem} .cobs .btn,.glyph .btn{font-size:.75rem;padding:.15rem .5rem}
  .cobs .cb-bytes{display:flex;flex-wrap:wrap;gap:.25rem;margin:.3rem 0 .6rem;font-family:var(--mono);font-size:.85rem}
  .cobs .cb-bytes span{border:1px solid var(--rule);border-radius:4px;padding:.15rem .3rem;background:var(--code-bg);position:relative}
  .cobs .cb-bytes span.z{border-color:var(--bad);color:var(--bad);font-weight:700}
  .cobs .cb-bytes span.code{border:2px solid var(--accent);font-weight:700;color:var(--accent)}
  .cobs .cb-bytes span.crc{border-color:#d9480f} .cobs .cb-bytes span.del{background:var(--fg);color:var(--bg)}
  .cobs .cb-bytes span.hl{box-shadow:0 0 0 3px var(--warn-soft);background:var(--warn-soft)}
  .cobs .cb-bytes span small{display:block;font-family:var(--sans);font-size:.62rem;color:var(--muted);font-weight:400;text-align:center}
  .cobs h4,.glyph h4{margin:.8rem 0 .2rem;font-size:.9rem}
  .cobs .cb-tbl{overflow-x:auto} .cobs table{border-collapse:collapse;font-size:.78rem} .cobs td,.cobs th{border:1px solid var(--rule);padding:.15rem .4rem;text-align:left} .cobs td.c{font-family:var(--mono)}
  .cobs .cb-res,.glyph .gl-res{font-family:var(--sans);font-size:.88rem;padding:.45rem .8rem;border-radius:4px;margin:.4rem 0;border-left:4px solid var(--rule);background:var(--code-bg)}
  .cobs .cb-res.ok{background:var(--good-soft);border-left-color:var(--good)} .cobs .cb-res.bad{background:var(--bad-soft);border-left-color:var(--bad)}
  .glyph .gl-main{display:flex;flex-wrap:wrap;gap:1.2rem;align-items:flex-start}
  .glyph .gl-grid{display:grid;grid-template-columns:auto repeat(5,1.9rem);gap:2px;font-family:var(--mono);font-size:.7rem;align-items:center}
  .glyph .gl-grid button{width:1.9rem;height:1.9rem;border:1px solid var(--rule);border-radius:3px;background:var(--bg);cursor:pointer;padding:0}
  .glyph .gl-grid button.on{background:var(--fg)}
  .glyph .gl-grid input{width:1.9rem;padding:.1rem 0;text-align:center;font-size:.7rem}
  .glyph .gl-grid .rl{color:var(--muted);padding-right:.3rem;text-align:right}
  .glyph .gl-bits{font-family:var(--mono);font-size:.78rem;line-height:1.5}
  .glyph svg{width:100%;max-width:560px;height:auto;display:block;font-family:var(--sans);font-size:9px;cursor:crosshair}
  .glyph svg .pg{fill:var(--code-bg);stroke:var(--rule);stroke-width:.4} .glyph svg .pg.sel{fill:var(--accent-soft)}
  .glyph svg .px{fill:var(--fg)} .glyph svg text{fill:var(--muted)}
  .glyph .gl-wire{font-family:var(--mono);font-size:.78rem;overflow-x:auto;white-space:pre;background:var(--code-bg);border-radius:4px;padding:.35rem .5rem}`;

  // ---------------- COBS ----------------
  const CB_PRE = [["Lesson 103: 11 22 00 33", "11 22 00 33", false], ["The sensor frame 00 21 CA 08, with its CRC", "00 21 CA 08", true], ["Two zeros: 11 00 00 22", "11 00 00 22", false], ["254 nonzero bytes", "*254", false]];
  function mountCobs(box) {
    const E = window.Course.el;
    const st = { text: "11 22 00 33", crc: false, rx: null, hl: -1 };
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "COBS: a frame with no zeros inside" }));
    const pre = E("div", { class: "cb-row" });
    CB_PRE.forEach(([l, t, c]) => pre.appendChild(E("button", { class: "btn secondary", type: "button", text: l, onclick: () => { st.text = t === "*254" ? Array.from({ length: 254 }, (_, i) => hx((i % 255) + 1)).join(" ") : t; st.crc = c; st.rx = null; sync(); render(); } })));
    const inp = E("input", { class: "hexs", "aria-label": "data bytes in hex" }), crcChk = E("input", { type: "checkbox" });
    inp.addEventListener("change", () => { st.text = inp.value; st.rx = null; render(); });
    crcChk.addEventListener("change", () => { st.crc = crcChk.checked; st.rx = null; render(); });
    box.append(pre, E("div", { class: "cb-row" }, [E("label", {}, ["data (hex)", inp]), E("label", {}, [crcChk, "append CRC-16/CCITT-FALSE, high byte first"])]));
    const body = E("div"), enc = E("div"), tr = E("div", { class: "cb-tbl" }), rxIn = E("input", { class: "hexs", "aria-label": "received bytes" }), dec = E("div"), err = E("div", { class: "cb-res bad" });
    rxIn.addEventListener("change", () => { st.rx = rxIn.value; render(); });
    box.append(err, E("h4", { text: "The body, before COBS" }), body, E("h4", { text: "After COBS, with the 00 delimiter" }), E("p", { class: "widget-hint", text: "Blue bytes are code bytes. Each arrow gives the position of the next code byte, where a zero used to be; hover to highlight it." }), enc,
      E("details", {}, [E("summary", { text: "The encoder, one byte at a time", style: "font-family:var(--sans);font-size:.85rem;cursor:pointer" }), tr]),
      E("h4", { text: "The receiver" }), E("p", { class: "widget-hint", text: "These are the bytes before the delimiter. Change one, for example a code byte, or make one of them 00, and see what the decoder makes of it." }),
      E("div", { class: "cb-row" }, [E("label", {}, ["received", rxIn]), E("button", { class: "btn secondary", type: "button", text: "As sent", onclick: () => { st.rx = null; render(); } })]), dec);
    function sync() { inp.value = st.text; crcChk.checked = st.crc; }
    const chip = (v, cls, small, i) => { const sp = E("span", { class: cls + (i >= 0 && i === st.hl ? " hl" : "") }, [hx(v)]); if (small) sp.appendChild(E("small", { text: small })); return sp; };
    function render() {
      const d = parseHex(st.text);
      if (!d || !d.length) { err.style.display = ""; err.textContent = "Type hex bytes separated by spaces, for example 11 22 00 33."; return; }
      err.style.display = "none";
      const full = d.slice(); let crc = null;
      if (st.crc) { crc = crcCcitt(d); full.push(crc >> 8, crc & 0xFF); }
      body.innerHTML = ""; const bw = E("div", { class: "cb-bytes" });
      full.forEach((b, i) => bw.appendChild(chip(b, b === 0 ? "z" : i >= d.length ? "crc" : "", b === 0 ? "zero" : i >= d.length ? (i === d.length ? "CRC hi" : "CRC lo") : "", -1)));
      body.appendChild(bw);
      if (st.crc) body.appendChild(E("p", { class: "cb-row", text: `CRC-16/CCITT-FALSE of the ${d.length} data bytes is 0x${hx(crc, 4)}. The CRC over all ${full.length} bytes is 0x${hx(crcCcitt(full), 4)}, which is how the receiver checks it.` }));
      const { out, trace } = cobsEncode(full);
      const codes = new Set(); for (let i = 0; i < out.length;) { codes.add(i); i += out[i] || 1; }
      enc.innerHTML = ""; const ew = E("div", { class: "cb-bytes" });
      out.forEach((b, i) => { const isC = codes.has(i), sp = chip(b, isC ? "code" : "", isC ? (b === 0xFF ? "254, no 0" : `→ ${i + b}`) : "", -1); if (isC) { sp.title = `code ${hx(b)}: the next zero was ${b} bytes on`; sp.addEventListener("mouseenter", () => { st.hl = i + b; mark(); }); sp.addEventListener("mouseleave", () => { st.hl = -1; mark(); }); } sp.dataset.i = i; ew.appendChild(sp); });
      const del = chip(0, "del", "delimiter", -1); del.dataset.i = out.length; ew.appendChild(del);
      enc.append(ew, E("p", { class: "cb-row", text: `${full.length} bytes became ${out.length}, plus the delimiter: ${out.length + 1} bytes on the wire. ${out.filter(b => b === 0).length ? "" : "There is no 00 before the delimiter."}` }));
      tr.innerHTML = `<table><tr><th>input</th><th>byte</th><th>what the encoder does</th></tr>` + trace.map(([i, b, t]) => `<tr><td>${b === null ? "" : i}</td><td class="c">${b === null ? "" : hx(b)}</td><td>${t}</td></tr>`).join("") + "</table>";
      if (st.rx === null) rxIn.value = out.map(b => hx(b)).join(" ");
      const rx = parseHex(rxIn.value) || [];
      const r = cobsDecode(rx), same = r.out.length === full.length && r.out.every((b, i) => b === full[i]);
      dec.innerHTML = "";
      const dw = E("div", { class: "cb-bytes" }); r.out.forEach((b, i) => dw.appendChild(chip(b, b === 0 ? "z" : b !== full[i] ? "hl" : "", "", -1))); dec.appendChild(dw);
      const res = E("div", { class: "cb-res " + (!r.err && same ? "ok" : "bad") });
      let t = r.err ? "The decoder stops: " + r.err : same ? "The decoder gives back the body exactly." : "The decoder ran without an error, but the body differs from what was sent.";
      if (st.crc && !r.err && !same) t += crcCcitt(r.out) === 0 ? " The CRC still checks: a corruption the CRC misses." : ` The CRC over it is 0x${hx(crcCcitt(r.out), 4)}, not 0, so the receiver drops the frame.`;
      else if (!st.crc && !r.err && !same) t += " Without a CRC, nothing tells the receiver. Tick the CRC box.";
      res.textContent = t; dec.appendChild(res);
    }
    function mark() { enc.querySelectorAll("span[data-i]").forEach(sp => sp.classList.toggle("hl", +sp.dataset.i === st.hl)); }
    sync(); render();
  }

  // ---------------- glyph and page addressing ----------------
  const GL_PRE = { L: [0x7F, 0x40, 0x40, 0x40, 0x40], P: [0x7F, 0x09, 0x09, 0x09, 0x06], "1": [0x00, 0x42, 0x7F, 0x40, 0x00], ">": [0x41, 0x22, 0x14, 0x08, 0x00], blank: [0, 0, 0, 0, 0] };
  function mountGlyph(box) {
    const E = window.Course.el;
    const st = { cols: GL_PRE.L.slice(), page: 2, col: 10, text: "PRESSES", khz: 400 };
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "A glyph, its column bytes, and where it lands on the panel" }));
    const pre = E("div", { class: "gl-row" }, ["load:"]);
    Object.keys(GL_PRE).forEach(k => pre.appendChild(E("button", { class: "btn secondary", type: "button", text: k, onclick: () => { st.cols = GL_PRE[k].slice(); render(); } })));
    box.appendChild(E("p", { class: "widget-hint", text: "Click pixels, or type a column byte. Each column is one byte, and bit 0 is the top row. The L of the lesson's font is 7F 40 40 40 40." }));
    box.appendChild(pre);
    const grid = E("div", { class: "gl-grid" }), bits = E("div", { class: "gl-bits" });
    box.appendChild(E("div", { class: "gl-main" }, [grid, bits]));
    box.appendChild(E("h4", { text: "Where it lands: 128 columns by 8 pages of 8 rows" }));
    box.appendChild(E("p", { class: "widget-hint", text: "Click the panel, or type a page and a column, to move the glyph. One data byte fills one column of one page, so the glyph never spans two pages here." }));
    const panel = E("div"), wire = E("div", { class: "gl-wire" }), res = E("div", { class: "gl-res" });
    const txt = E("input", { "aria-label": "menu text", value: st.text, style: "width:10rem" }), khz = E("select", { "aria-label": "bus speed" }, [E("option", { value: 100, text: "100 kbit/s" }), E("option", { value: 400, text: "400 kbit/s" })]);
    khz.value = "400";
    txt.addEventListener("input", () => { st.text = txt.value.slice(0, 40); render(); });
    khz.addEventListener("change", () => { st.khz = +khz.value; render(); });
    const pgIn = E("input", { type: "number", min: 0, max: 7, step: 1, "aria-label": "page", style: "width:3.5rem" }), colIn = E("input", { type: "number", min: 0, max: 123, step: 1, "aria-label": "column", style: "width:4.5rem" });
    pgIn.addEventListener("change", () => { st.page = Math.max(0, Math.min(7, Math.round(+pgIn.value) || 0)); render(); });
    colIn.addEventListener("change", () => { st.col = Math.max(0, Math.min(123, Math.round(+colIn.value) || 0)); render(); });
    box.append(E("div", { class: "gl-row" }, [E("label", {}, ["page", pgIn]), E("label", {}, ["column", colIn])]));
    box.append(panel, wire, E("p", { class: "widget-hint", text: "78 is the address 0x3C shifted left, with the write bit 0. The control byte 00 says a command follows, and 40 says data follows. After each data byte the column pointer moves on by one." }), E("h4", { text: "Text width and a full redraw" }), E("div", { class: "gl-row" }, [E("label", {}, ["text", txt]), E("label", {}, ["I²C", khz])]), res);
    function render() {
      grid.innerHTML = ""; grid.appendChild(E("span"));
      for (let c = 0; c < 5; c++) grid.appendChild(E("span", { class: "rl", style: "text-align:center;padding:0", text: "c" + c }));
      for (let r = 0; r < 7; r++) {
        grid.appendChild(E("span", { class: "rl", text: "bit " + r }));
        for (let c = 0; c < 5; c++) { const on = (st.cols[c] >> r) & 1; grid.appendChild(E("button", { type: "button", class: on ? "on" : "", "aria-label": `column ${c} bit ${r}`, "aria-pressed": String(!!on), onclick: () => { st.cols[c] ^= 1 << r; render(); } })); }
      }
      grid.appendChild(E("span", { class: "rl", text: "byte" }));
      for (let c = 0; c < 5; c++) { const i = E("input", { value: hx(st.cols[c]), "aria-label": `column ${c} byte` }); i.addEventListener("change", () => { const v = parseInt(i.value.replace(/^0x/i, ""), 16); if (Number.isFinite(v)) st.cols[c] = v & 0x7F; render(); }); grid.appendChild(i); }
      bits.innerHTML = "Column bytes, bit 7 to bit 0:<br>" + st.cols.map((b, c) => `c${c} = 0x${hx(b)} = ${b.toString(2).padStart(8, "0")}`).join("<br>") + `<br><br>{${st.cols.map(b => "0x" + hx(b)).join(", ")}}`;
      // panel
      const S = 4.2, W = 128 * S + 30, H = 64 * S + 14;
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="128 by 64 panel">`;
      for (let p = 0; p < 8; p++) { s += `<rect class="pg${p === st.page ? " sel" : ""}" x="26" y="${p * 8 * S}" width="${128 * S}" height="${8 * S}"/><text x="2" y="${p * 8 * S + 19}">page ${p}</text>`; }
      st.cols.forEach((b, c) => { for (let r = 0; r < 8; r++) if ((b >> r) & 1) s += `<rect class="px" x="${26 + (st.col + c) * S}" y="${(st.page * 8 + r) * S}" width="${S - 0.4}" height="${S - 0.4}"/>`; });
      s += `<text x="26" y="${H - 2}">column 0</text><text x="${W - 4}" y="${H - 2}" text-anchor="end">column 127</text></svg>`;
      panel.innerHTML = s;
      panel.querySelector("svg").addEventListener("click", ev => {
        const svg = ev.currentTarget, pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse());
        st.col = Math.max(0, Math.min(123, Math.floor((q.x - 26) / S))); st.page = Math.max(0, Math.min(7, Math.floor(q.y / (8 * S)))); render();
      });
      pgIn.value = st.page; colIn.value = st.col;
      const c1 = 0xB0 + st.page, c2 = st.col & 0x0F, c3 = 0x10 | (st.col >> 4);
      wire.textContent = `page ${st.page}, column ${st.col}:\n` +
        `78 00 ${hx(c1)}   page start = ${st.page}\n78 00 ${hx(c2)}   column, low nibble = ${st.col & 0xF}\n78 00 ${hx(c3)}   column, high nibble = ${st.col >> 4}: ${st.col >> 4} × 16 + ${st.col & 0xF} = ${st.col}\n` +
        `78 40 ${st.cols.map(b => hx(b)).join(" ")}\n         data, one byte per column`;
      const n = st.text.length, colsUsed = n * 6, frame = 8 * (9 + 130), t = frame * 9 / (st.khz * 1000);
      res.textContent = `"${st.text}" is ${n} character${n === 1 ? "" : "s"} × 6 columns = ${colsUsed} columns` + (colsUsed > 128 ? ", which is wider than the panel." : ` of 128.`) + ` A full redraw sends 8 pages × (9 command bytes + 130 data bytes) = ${frame.toLocaleString("en-US")} bytes, ${(frame * 9).toLocaleString("en-US")} clock pulses, about ${(t * 1000).toFixed(1)} ms at ${st.khz} kbit/s.`;
    }
    render();
  }
  window.Bytes = { cobsEncode, cobsDecode, crcCcitt };
  function init() {
    if (!document.getElementById("bytes-css")) { const s = document.createElement("style"); s.id = "bytes-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.cobs").forEach(mountCobs);
    document.querySelectorAll(".widget.glyph").forEach(mountGlyph);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
