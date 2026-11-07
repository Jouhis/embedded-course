/* CAN arbitration and bit stuffing (lesson 100). Load after course.js.
 *
 *   <div class="widget canbus"></div>
 *
 * Arbitration: up to four nodes start a standard frame in the same bit time. The bus is the wired AND of
 * the bits sent (0 is dominant). A node that sends 1 and reads 0 stops. The lesson's example is
 * 0x0F0, 0x120 and 0x1A0: B and C drop out at identifier bit 8, and A wins.
 * Stuffing: after five identical bits on the wire (stuff bits included) the transmitter inserts one of the
 * opposite level. 0 0 0 0 0 1 1 1 1 1 0 becomes 0 0 0 0 0 1 1 1 1 1 0 1 0 (13 bits), stuff bits at 6 and 11.
 * A receiver that sees six identical bits reports a stuff error.
 */
(function () {
  "use strict";
  const CSS = `
  .canbus .cn-row{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .canbus label{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;max-width:100%}
  .canbus input{font-family:var(--mono);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem;max-width:100%}
  .canbus input.id{width:4.2rem} .canbus input.bits{width:20rem}
  .canbus .btn{font-size:.75rem;padding:.15rem .5rem}
  .canbus h4{margin:.9rem 0 .3rem;font-size:.92rem}
  .canbus .cn-tbl{overflow-x:auto;margin:.4rem 0}
  .canbus table{border-collapse:collapse;font-family:var(--mono);font-size:.78rem}
  .canbus td,.canbus th{border:1px solid var(--rule);padding:.15rem .3rem;text-align:center;min-width:1.25rem}
  .canbus th{font-family:var(--sans);font-weight:600;font-size:.7rem}
  .canbus td.nm{text-align:left;font-family:var(--sans);white-space:nowrap}
  .canbus td.out{color:var(--muted);background:var(--code-bg)} .canbus td.lost{background:var(--bad-soft);color:var(--bad);font-weight:700}
  .canbus td.bus{font-weight:700} .canbus td.d{background:var(--accent-soft)} .canbus td.now{outline:2px solid var(--warn);outline-offset:-2px}
  .canbus td.win{background:var(--good-soft);font-weight:700}
  .canbus .wire{display:flex;flex-wrap:wrap;gap:2px;margin:.3rem 0 .5rem}
  .canbus .wire button{font-family:var(--mono);font-size:.8rem;width:1.6rem;padding:.2rem 0;border:1px solid var(--rule);border-radius:3px;background:var(--bg);color:var(--fg);cursor:pointer;position:relative}
  .canbus .wire button.st{border:2px solid #d9480f;color:#d9480f;font-weight:700}
  .canbus .wire button.fl{background:var(--bad);color:#fff;border-color:var(--bad)}
  .canbus .wire button.er{box-shadow:0 0 0 3px var(--bad-soft)}
  .canbus .cn-res{font-family:var(--sans);font-size:.88rem;padding:.45rem .8rem;border-radius:4px;margin:.4rem 0;border-left:4px solid var(--rule);background:var(--code-bg)}
  .canbus .cn-res.ok{background:var(--good-soft);border-left-color:var(--good)} .canbus .cn-res.bad{background:var(--bad-soft);border-left-color:var(--bad)}`;

  function stuff(bits) {
    const out = [], isStuff = []; let run = 0, last = -1;
    bits.forEach(b => {
      out.push(b); isStuff.push(false);
      run = b === last ? run + 1 : 1; last = b;
      if (run === 5) { const s = 1 - b; out.push(s); isStuff.push(true); last = s; run = 1; }
    });
    return { out, isStuff };
  }
  function destuff(wire) {
    const out = []; let run = 0, last = -1;
    for (let i = 0; i < wire.length; i++) {
      const b = wire[i];
      run = b === last ? run + 1 : 1; last = b;
      if (run === 6) return { out, err: i };
      out.push(b);
      if (run === 5 && i + 1 < wire.length) { i++; const sb = wire[i]; if (sb === b) return { out, err: i }; last = sb; run = 1; }
    }
    return { out, err: null };
  }

  function mount(box) {
    const E = window.Course.el;
    const st = { ids: ["0F0", "120", "1A0", ""], step: 11, bits: "00000111110", flips: new Set() };
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "CAN: arbitration and bit stuffing" }));

    box.appendChild(E("h4", { text: "1. Who wins arbitration?" }));
    box.appendChild(E("p", { class: "widget-hint", text: "Each node sends its 11-bit identifier, most significant bit first, and reads the bus. 0 is dominant: the bus is 0 if any node sends 0. Step one bit at a time." }));
    const idRow = E("div", { class: "cn-row" });
    const tbl = E("div", { class: "cn-tbl" }), res = E("div", { class: "cn-res" });
    st.ids.forEach((v, i) => { const inp = E("input", { class: "id", value: v, "aria-label": `node ${"ABCD"[i]} identifier`, placeholder: "none" }); inp.addEventListener("change", () => { st.ids[i] = inp.value.trim().replace(/^0x/i, ""); st.step = 0; render(); }); idRow.appendChild(E("label", {}, [`node ${"ABCD"[i]} 0x`, inp])); });
    const pre = (t, ids) => E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { st.ids = ids.concat(["", "", "", ""]).slice(0, 4); idRow.querySelectorAll("input").forEach((x, i) => { x.value = st.ids[i]; }); st.step = 0; render(); } });
    box.append(idRow, E("div", { class: "cn-row" }, [
      E("button", { class: "btn", type: "button", text: "Next bit", onclick: () => { st.step = Math.min(11, st.step + 1); render(); } }),
      E("button", { class: "btn secondary", type: "button", text: "All bits", onclick: () => { st.step = 11; render(); } }),
      E("button", { class: "btn secondary", type: "button", text: "Start again", onclick: () => { st.step = 0; render(); } }),
      pre("Lesson: 0F0, 120, 1A0", ["0F0", "120", "1A0"]), pre("3FE against 3FF", ["3FE", "3FF"]), pre("Same identifier twice", ["123", "123"])]), tbl, res);

    box.appendChild(E("h4", { text: "2. Bit stuffing" }));
    box.appendChild(E("p", { class: "widget-hint", text: "Type bits, or click a bit on the wire to flip it, as noise would. Orange bits are stuff bits. The receiver removes them, and six identical bits in a row is a stuff error." }));
    const bitsIn = E("input", { class: "bits", value: st.bits, "aria-label": "data bits" });
    bitsIn.addEventListener("input", () => { st.bits = bitsIn.value.replace(/[^01]/g, "").slice(0, 40); st.flips.clear(); render(); });
    const sPre = (t, b) => E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { st.bits = b; bitsIn.value = b; st.flips.clear(); render(); } });
    const wireBox = E("div"), res2 = E("div", { class: "cn-res" });
    box.append(E("div", { class: "cn-row" }, [E("label", {}, ["bits", bitsIn]), sPre("Lesson: 00000111110", "00000111110"), sPre("Ten zeros", "0000000000"), sPre("Alternating", "0101010101")]), wireBox, res2);

    function parseIds() { return st.ids.map((v, i) => ({ n: "ABCD"[i], v: /^[0-9a-f]{1,3}$/i.test(v) ? parseInt(v, 16) : null })).filter(x => x.v !== null && x.v <= 0x7FF); }
    function render() {
      const nodes = parseIds();
      if (nodes.length < 2) { tbl.innerHTML = ""; res.className = "cn-res bad"; res.textContent = "Give at least two nodes an identifier from 000 to 7FF."; }
      else {
        const alive = nodes.map(() => true), lostAt = nodes.map(() => -1), bus = [];
        for (let k = 10; k >= 0; k--) {
          const idx = 10 - k; if (idx >= st.step) break;
          const sent = nodes.map((n, i) => (alive[i] ? (n.v >> k) & 1 : null));
          const b = sent.some(x => x === 0) ? 0 : 1; bus.push(b);
          sent.forEach((x, i) => { if (x === 1 && b === 0) { alive[i] = false; lostAt[i] = k; } });
        }
        let h = "<table><tr><th>bit</th>" + Array.from({ length: 11 }, (_, i) => `<th>${10 - i}</th>`).join("") + "<th>status</th></tr>";
        nodes.forEach((n, i) => {
          h += `<tr><td class="nm">${n.n} = 0x${n.v.toString(16).toUpperCase().padStart(3, "0")}</td>`;
          for (let j = 0; j < 11; j++) {
            const k = 10 - j, bit = (n.v >> k) & 1;
            if (j >= st.step) { h += `<td style="color:var(--muted)">${bit}</td>`; continue; }
            const cls = lostAt[i] === k ? "lost" : lostAt[i] > k ? "out" : (bit === 0 ? "d" : "") + (j === st.step - 1 ? " now" : "");
            h += `<td class="${cls}">${lostAt[i] > k && lostAt[i] !== -1 ? "" : bit}</td>`;
          }
          h += `<td class="nm">${lostAt[i] >= 0 ? `stopped at bit ${lostAt[i]}` : st.step >= 11 ? (alive.filter(Boolean).length === 1 ? "wins" : "still sending") : "sending"}</td></tr>`;
        });
        h += `<tr><td class="nm"><b>bus</b></td>` + Array.from({ length: 11 }, (_, j) => j < bus.length ? `<td class="bus${bus[j] === 0 ? " d" : ""}">${bus[j]}</td>` : "<td></td>").join("") + `<td class="nm">${bus.length ? "0 dominant, 1 recessive" : ""}</td></tr></table>`;
        tbl.innerHTML = h;
        const left = nodes.filter((_, i) => alive[i]);
        if (st.step < 11) { res.className = "cn-res"; res.textContent = st.step === 0 ? "Press Next bit. Before each step, say which nodes will still be sending." : `${left.map(n => n.n).join(", ")} still sending after ${st.step} bit${st.step === 1 ? "" : "s"}.`; }
        else if (left.length === 1) { const w = left[0]; res.className = "cn-res ok"; res.textContent = `${w.n} (0x${w.v.toString(16).toUpperCase().padStart(3, "0")}) wins: the lowest identifier. Its frame was never disturbed, so arbitration cost no time. The losers retry when the bus is free.`; }
        else { res.className = "cn-res bad"; res.textContent = `${left.map(n => n.n).join(" and ")} sent the same identifier, so arbitration cannot separate them. They collide later in the frame and raise a bit error. Every identifier on a bus must belong to one sender only.`; }
      }
      // stuffing
      const bits = st.bits.split("").map(Number);
      wireBox.innerHTML = "";
      if (!bits.length) { res2.className = "cn-res bad"; res2.textContent = "Type some 0s and 1s."; return; }
      const { out, isStuff } = stuff(bits), wire = out.map((b, i) => (st.flips.has(i) ? 1 - b : b));
      const d = destuff(wire), w = E("div", { class: "wire" });
      wire.forEach((b, i) => { const bt = E("button", { type: "button", class: (isStuff[i] ? "st" : "") + (st.flips.has(i) ? " fl" : "") + (d.err === i ? " er" : ""), text: String(b), title: `wire bit ${i + 1}${isStuff[i] ? ", a stuff bit" : ""}`, onclick: () => { st.flips.has(i) ? st.flips.delete(i) : st.flips.add(i); render(); } }); w.appendChild(bt); });
      wireBox.appendChild(E("div", { class: "cn-row", text: `on the wire, ${wire.length} bits for ${bits.length} data bits` + (isStuff.some(Boolean) ? `; stuff bits at ${isStuff.map((s, i) => (s ? i + 1 : 0)).filter(Boolean).join(" and ")}` : "; no stuff bits needed") + ":" }));
      wireBox.appendChild(w);
      const same = d.err === null && d.out.length === bits.length && d.out.every((b, i) => b === bits[i]);
      if (d.err !== null) { res2.className = "cn-res ok"; res2.textContent = `The receiver sees six identical bits ending at wire bit ${d.err + 1}: a stuff error. Every node sends an error frame, and the sender retries. The flipped bit was caught.`; }
      else if (!same) { res2.className = "cn-res bad"; res2.textContent = `The receiver removed the stuff bits and got ${d.out.join("")}, not ${bits.join("")}. Stuffing did not catch this flip; the 15-bit CRC is the check that does.`; }
      else { res2.className = "cn-res ok"; res2.textContent = `The receiver drops the bit after each run of five and gets back ${d.out.join("")}. Click a bit to flip it.`; }
    }
    render();
  }
  window.CanBus = { stuff, destuff };
  function init() {
    if (!document.getElementById("canbus-css")) { const s = document.createElement("style"); s.id = "canbus-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.canbus").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
