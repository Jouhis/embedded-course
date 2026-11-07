/* C types, step by step. Load after course.js.
 *
 * 1. Integer promotion and conversion (lesson 45), for a 32-bit int as on the Cortex-M cores:
 *      <div class="widget cpromote"></div>
 *    Pick the operand types and values, the operator and the destination. The steps show the promotion
 *    to int, the usual arithmetic conversions, the result and the store, each with its bit pattern, and
 *    flag undefined behaviour (signed overflow, bad shifts, division by zero). C17 sections 6.3.1.1,
 *    6.3.1.3, 6.3.1.8, 6.5.5 and 6.5.7.
 * 2. Struct layout and byte order (lesson 48), with the AAPCS alignments (1, 2, 4, 8):
 *      <div class="widget structlayout"></div>
 *    Members, padding, total size, packed or not, and what each member reads from a wire buffer on a
 *    little-endian or a big-endian CPU.
 */
(function () {
  "use strict";
  const CSS = `
  .cpromote .cp-row,.structlayout .sl-row{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .cpromote select,.cpromote input,.structlayout select,.structlayout input{font-family:var(--mono);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem}
  .cpromote input{width:7rem} .structlayout input.nm{width:7rem} .structlayout input.n{width:3.2rem} .structlayout input.wire{width:16rem}
  .cpromote .cp-presets,.structlayout .sl-presets{display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0}
  .cpromote .cp-presets .btn,.structlayout .sl-presets .btn,.structlayout .sl-row .btn{font-size:.75rem;padding:.15rem .5rem}
  .cpromote .cp-code{font-family:var(--mono);font-size:.9rem;background:var(--code-bg);border-radius:4px;padding:.45rem .7rem;margin:.4rem 0;white-space:pre-wrap}
  .cpromote table,.structlayout table{border-collapse:collapse;font-size:.8rem;margin:.4rem 0;width:100%}
  .cpromote th,.cpromote td,.structlayout th,.structlayout td{padding:.25rem .4rem;border-bottom:1px solid var(--rule);text-align:left;vertical-align:top}
  .cpromote td.b{font-family:var(--mono);font-size:.74rem;white-space:nowrap} .cpromote td.b .hi{color:var(--muted)}
  .cpromote td.v{font-family:var(--mono);white-space:nowrap}
  .cpromote .cp-scroll,.structlayout .sl-scroll{overflow-x:auto}
  .cpromote tr.ub td{background:var(--bad-soft)} .cpromote tr.warn td{background:var(--warn-soft)}
  .cpromote .cp-guess{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.88rem}
  .cpromote .cp-fb{font-family:var(--sans);font-size:.9rem;font-weight:600} .cpromote .cp-fb.ok{color:var(--good)} .cpromote .cp-fb.no{color:var(--bad)}
  .structlayout .sl-grid{display:grid;grid-template-columns:3.2rem repeat(4,minmax(3.2rem,1fr));gap:2px;margin:.5rem 0;max-width:30rem}
  .structlayout .sl-grid .off{font-family:var(--mono);font-size:.72rem;color:var(--muted);align-self:center}
  .structlayout .sl-grid .c{font-family:var(--mono);font-size:.72rem;border-radius:3px;padding:.3rem .2rem;text-align:center;color:#fff;overflow:hidden;white-space:nowrap}
  .structlayout .sl-grid .c.pad{color:var(--muted);background:repeating-linear-gradient(45deg,var(--code-bg),var(--code-bg) 4px,var(--rule) 4px,var(--rule) 6px)}
  .structlayout .sl-grid .c.none{background:transparent}
  .structlayout .sl-sum{font-family:var(--sans);font-size:.9rem;margin:.3rem 0}
  .structlayout td.mono{font-family:var(--mono)} .structlayout td .bad{color:var(--bad);font-weight:600} .structlayout td .ok{color:var(--good);font-weight:600}
  .structlayout .chip{display:inline-block;width:.75rem;height:.75rem;border-radius:2px;margin-right:.3rem;vertical-align:-1px}`;

  // ---------------------------------------------------------------- promotion
  const TYPES = { uint8_t: [8, false], int8_t: [8, true], uint16_t: [16, false], int16_t: [16, true], uint32_t: [32, false], int32_t: [32, true], int: [32, true], "unsigned int": [32, false] };
  const OPS = ["+", "-", "*", "/", "%", "<<", ">>", "&", "|", "^", "<", ">", "==", "!=", "~a", "-a"];
  const P2 = n => 1n << BigInt(n);
  const range = ([bits, s]) => (s ? [-P2(bits - 1), P2(bits - 1) - 1n] : [0n, P2(bits) - 1n]);
  const wrap = (v, [bits, s]) => { let m = ((v % P2(bits)) + P2(bits)) % P2(bits); if (s && m >= P2(bits - 1)) m -= P2(bits); return m; };
  const bits32 = (v, shown) => { const u = Number(((v % P2(32)) + P2(32)) % P2(32)); const s = u.toString(2).padStart(32, "0").replace(/(.{4})/g, "$1 ").trim(); return shown === 32 ? s : `<span class="hi">${s.slice(0, s.length - (shown + shown / 4 - 1))}</span>${s.slice(-(shown + shown / 4 - 1))}`; };
  const hex32 = v => "0x" + (((v % P2(32)) + P2(32)) % P2(32)).toString(16).toUpperCase().padStart(8, "0");
  const intT = [32, true], uintT = [32, false];
  const tname = t => (t[1] ? (t[0] === 32 ? "int" : `int${t[0]}_t`) : t[0] === 32 ? "unsigned int" : `uint${t[0]}_t`);

  function evaluate(o) {
    const steps = []; let ub = null, impl = null;
    const A = TYPES[o.ta], B = TYPES[o.tb], D = o.td === "(int, the condition)" ? null : TYPES[o.td];
    const unary = o.op === "~a" || o.op === "-a";
    let a = BigInt(o.va), b = BigInt(o.vb);
    const fit = (v, t, n) => { const [lo, hi] = range(t); if (v < lo || v > hi) { const w = wrap(v, t); steps.push({ k: `${n} = ${v} does not fit ${o[n === "a" ? "ta" : "tb"]}`, v: w, w: t[0], t, note: `Stored as ${w}: the value modulo 2^${t[0]}.`, cls: "warn" }); return w; } return v; };
    a = fit(a, A, "a"); if (!unary) b = fit(b, B, "b");
    steps.push({ k: `a (${o.ta})`, v: a, w: A[0], t: A, note: "The stored value." });
    if (!unary) steps.push({ k: `b (${o.tb})`, v: b, w: B[0], t: B, note: "" });
    const promote = (v, t, n) => { if (t[0] < 32) { steps.push({ k: `${n} promoted to int`, v, w: 32, t: intT, note: `Narrower than int, so it becomes an int before any arithmetic. ${t[1] ? "Signed: sign-extended, the top bits copy bit " + (t[0] - 1) + "." : "Unsigned: zero-extended, the top bits are 0."} The value does not change.` }); return intT; } return t; };
    let pa = promote(a, A, "a"), pb = unary ? null : promote(b, B, "b");
    let rt;
    const shift = o.op === "<<" || o.op === ">>";
    if (unary) rt = pa;
    else if (shift) rt = pa;
    else if (!pa[1] || !pb[1]) {
      rt = uintT;
      if (pa[1] && a < 0n) { steps.push({ k: "a converted to unsigned int", v: wrap(a, uintT), w: 32, t: uintT, note: `One operand is unsigned int, so the other is converted to unsigned int too (the usual arithmetic conversions). ${a} becomes ${wrap(a, uintT)}: same bits, new meaning.`, cls: "warn" }); a = wrap(a, uintT); }
      else if (pb[1] && b < 0n) { steps.push({ k: "b converted to unsigned int", v: wrap(b, uintT), w: 32, t: uintT, note: `One operand is unsigned int, so the other is converted to unsigned int too. ${b} becomes ${wrap(b, uintT)}.`, cls: "warn" }); b = wrap(b, uintT); }
      else steps.push({ k: "usual arithmetic conversions", note: "One operand is unsigned int, so the operation is done in unsigned int. Both values are non-negative, so nothing changes yet." });
    } else rt = intT;
    let r, cmp = ["<", ">", "==", "!="].includes(o.op);
    switch (o.op) {
      case "+": r = a + b; break; case "-": r = a - b; break; case "*": r = a * b; break;
      case "/": case "%": if (b === 0n) { ub = "Division by zero is undefined behaviour."; r = 0n; } else { r = o.op === "/" ? a / b : a % b; } break;
      case "&": r = wrap(wrap(a, uintT) & wrap(b, uintT), rt); break; case "|": r = wrap(wrap(a, uintT) | wrap(b, uintT), rt); break; case "^": r = wrap(wrap(a, uintT) ^ wrap(b, uintT), rt); break;
      case "<": r = a < b ? 1n : 0n; break; case ">": r = a > b ? 1n : 0n; break; case "==": r = a === b ? 1n : 0n; break; case "!=": r = a !== b ? 1n : 0n; break;
      case "~a": r = wrap(~wrap(a, uintT), rt); break; case "-a": r = -a; break;
      case "<<": case ">>":
        if (b < 0n || b >= 32n) { ub = `Shifting a 32-bit ${tname(rt)} by ${b} is undefined behaviour: the count must be 0 to 31.`; r = 0n; break; }
        if (o.op === "<<") { r = a * P2(Number(b)); if (rt[1] && (a < 0n || r > range(intT)[1])) ub = a < 0n ? "Left-shifting a negative int is undefined behaviour." : `${a} << ${b} = ${r} does not fit in int: undefined behaviour. Write ${a}u << ${b} to shift an unsigned value.`; }
        else { r = a >= 0n ? a / P2(Number(b)) : -((-a - 1n) / P2(Number(b))) - 1n; if (a < 0n) impl = "Right-shifting a negative int is implementation-defined. GCC shifts arithmetically: the sign bit is copied in."; }
        break;
    }
    if (cmp) { steps.push({ k: `a ${o.op} b`, v: r, w: 32, t: intT, note: `The comparison is done on the converted values (${a} ${o.op} ${b}) and gives an int, 1 for true and 0 for false.` }); rt = intT; }
    else {
      const [lo, hi] = range(rt);
      if (!ub && (r < lo || r > hi)) {
        if (rt[1]) ub = `The exact result ${r} does not fit in int (${lo} to ${hi}): signed overflow is undefined behaviour. GCC usually wraps it to ${wrap(r, rt)}, but the optimiser may assume it never happens.`;
        else { steps.push({ k: `${unary ? o.op.replace("a", "") + "a" : "a " + o.op + " b"} = ${r} exactly`, note: `Too big for unsigned int: unsigned arithmetic wraps modulo 2^32, which C defines.`, cls: "warn" }); }
        r = wrap(r, rt);
      }
      steps.push({ k: `${unary ? o.op.replace("a", "") + "a" : "a " + o.op + " b"} in ${tname(rt)}`, v: r, w: 32, t: rt, note: ub ? ub : impl ? impl : "The arithmetic happens at 32 bits.", cls: ub ? "ub" : impl ? "warn" : "" });
    }
    let final = r;
    if (D) {
      const [lo, hi] = range(D);
      final = wrap(r, D);
      const changed = r < lo || r > hi;
      steps.push({ k: `stored in ${o.td} c`, v: final, w: D[0], t: D, cls: changed ? "warn" : "",
        note: !changed ? "It fits, so the value is unchanged." : D[1] ? `${r} does not fit: the conversion to a signed type is implementation-defined. GCC keeps the low ${D[0]} bits, giving ${final}.` : `Only the low ${D[0]} bits are kept: ${r} modulo 2^${D[0]} = ${final}. This is where the value is lost.` });
    }
    return { steps, final, ub };
  }

  const PROMO_PRESETS = [
    ["Lesson: 200 + 100 into uint8_t", { ta: "uint8_t", va: 200, op: "+", tb: "uint8_t", vb: 100, td: "uint8_t" }],
    ["-1 < 1u?", { ta: "int32_t", va: -1, op: "<", tb: "uint32_t", vb: 1, td: "(int, the condition)" }],
    ["-1 < (uint8_t)255?", { ta: "int8_t", va: -1, op: "<", tb: "uint8_t", vb: 255, td: "(int, the condition)" }],
    ["~x for x = 0xFF", { ta: "uint8_t", va: 255, op: "~a", tb: "int", vb: 0, td: "int" }],
    ["65535 * 65535 in uint16_t", { ta: "uint16_t", va: 65535, op: "*", tb: "uint16_t", vb: 65535, td: "uint32_t" }],
    ["0u - 1", { ta: "uint32_t", va: 0, op: "-", tb: "uint32_t", vb: 1, td: "uint32_t" }],
    ["1 << 31", { ta: "int", va: 1, op: "<<", tb: "int", vb: 31, td: "uint32_t" }],
    ["int16_t -300 into uint8_t", { ta: "int16_t", va: -300, op: "+", tb: "int", vb: 0, td: "uint8_t" }],
  ];

  function mountPromote(box) {
    const E = window.Course.el;
    const st = { ...PROMO_PRESETS[0][1] };
    box.appendChild(E("h3", { text: box.dataset.title || "What does C really compute?" }));
    const presets = E("div", { class: "cp-presets" });
    PROMO_PRESETS.forEach(([t, p]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { Object.assign(st, p); sync(); reveal = false; render(); } })));
    const tsel = (key, extra) => { const s = E("select", { "aria-label": key }, [...(extra || []), ...Object.keys(TYPES)].map(t => E("option", { value: t, text: t }))); s.addEventListener("change", () => { st[key] = s.value; reveal = false; render(); }); return s; };
    const vin = key => { const i = E("input", { type: "text", "aria-label": key, spellcheck: "false" }); i.addEventListener("change", () => { const t = i.value.trim(); const v = /^-?0x/i.test(t) ? (t.startsWith("-") ? -1 : 1) * parseInt(t.replace(/^-/, ""), 16) : parseInt(t, 10); if (Number.isFinite(v)) st[key] = v; reveal = false; render(); }); return i; };
    const ta = tsel("ta"), tb = tsel("tb"), td = tsel("td", ["(int, the condition)"]), va = vin("va"), vb = vin("vb");
    const op = E("select", { "aria-label": "operator" }, OPS.map(x => E("option", { value: x, text: x === "~a" ? "~a (unary)" : x === "-a" ? "-a (unary)" : x })));
    op.addEventListener("change", () => { st.op = op.value; reveal = false; render(); });
    const bPart = E("span", {}, [" b: ", tb, vb]);
    box.append(presets, E("div", { class: "cp-row" }, ["a: ", ta, va, " operator ", op, bPart]), E("div", { class: "cp-row" }, ["store the result in: ", td]));
    const code = E("div", { class: "cp-code" }), guessIn = E("input", { type: "text", spellcheck: "false", "aria-label": "Your prediction", style: "width:9rem" }), fb = E("span", { class: "cp-fb" });
    let reveal = false;
    const steps = E("div", { class: "cp-scroll" });
    box.append(code, E("div", { class: "cp-guess" }, ["Predict the result first: ", guessIn,
      E("button", { class: "btn", type: "button", text: "Check", onclick: () => { const g = guessIn.value.trim(); const v = /^-?0x/i.test(g) ? (g.startsWith("-") ? -1 : 1) * parseInt(g.replace(/^-/, ""), 16) : /^(true|false)$/i.test(g) ? (/true/i.test(g) ? 1 : 0) : parseInt(g, 10); const r = evaluate(st); fb.className = "cp-fb " + (BigInt(Number.isFinite(v) ? v : 0) === r.final && Number.isFinite(v) ? "ok" : "no"); fb.textContent = fb.className.includes("ok") ? (r.ub ? "That is what GCC usually gives, but see the red row: it is undefined behaviour." : "Correct.") : `Not quite: it is ${r.final}.`; reveal = true; render(); } }),
      E("button", { class: "btn secondary", type: "button", text: "Just show me", onclick: () => { reveal = true; render(); } }), fb]), steps);
    guessIn.addEventListener("keydown", e => { if (e.key === "Enter") e.target.nextSibling.click(); });
    function sync() { ta.value = st.ta; tb.value = st.tb; td.value = st.td; va.value = st.va; vb.value = st.vb; op.value = st.op; guessIn.value = ""; fb.textContent = ""; }
    function render() {
      const unary = st.op === "~a" || st.op === "-a";
      bPart.style.display = unary ? "none" : "";
      const expr = unary ? `${st.op.replace("a", "")}a` : `a ${st.op} b`;
      code.textContent = `${st.ta} a = ${st.va};\n` + (unary ? "" : `${st.tb} b = ${st.vb};\n`) + (st.td === "(int, the condition)" ? `if (${expr}) { … }      /* true or false? */` : `${st.td} c = ${expr};      /* c = ? */`);
      steps.innerHTML = "";
      if (!reveal) { steps.appendChild(E("p", { class: "widget-hint", text: "Type your answer (a number, or true/false for a condition), then check it. The steps appear after." })); return; }
      const r = evaluate(st);
      const t = E("table");
      t.appendChild(E("tr", {}, ["step", "type", "value", "bits", "why"].map(h => E("th", { text: h }))));
      r.steps.forEach(s => t.appendChild(E("tr", { class: s.cls || "" }, [E("td", { text: s.k }), E("td", { text: s.t ? tname(s.t) : "" }), E("td", { class: "v", text: s.v !== undefined ? `${s.v}  ${s.t && s.w === 32 ? hex32(s.v) : ""}` : "" }),
        E("td", { class: "b", html: s.v !== undefined ? bits32(s.t && !s.t[1] ? wrap(s.v, [32, false]) : s.v, s.w) : "" }), E("td", { text: s.note || "" })])));
      steps.appendChild(t);
    }
    sync(); render();
  }

  // ---------------------------------------------------------------- struct layout
  const MT = { uint8_t: [1, 1], int8_t: [1, 1], char: [1, 1], bool: [1, 1], uint16_t: [2, 2], int16_t: [2, 2], uint32_t: [4, 4], int32_t: [4, 4], float: [4, 4], "void *": [4, 4], uint64_t: [8, 8], double: [8, 8] };
  const MCOL = ["#1c7ed6", "#d9480f", "#7048e8", "#2f9e44", "#c2255c", "#0b7285", "#e67700", "#5c7cfa"];
  const SL_PRESETS = [
    ["WireFrame (the lesson)", [["uint8_t", "header", 1], ["uint16_t", "temp", 1], ["uint8_t", "status", 1]], "A5 12 34 05"],
    ["Bad order: 12 bytes", [["uint8_t", "flags", 1], ["uint32_t", "timestamp", 1], ["uint8_t", "id", 1], ["uint16_t", "value", 1]], "01 78 56 34 12 07 00 E8 03"],
    ["A log record with an array", [["uint32_t", "time_ms", 1], ["int16_t", "temp_centi", 1], ["char", "tag", 3]], "10 27 00 00 C4 09 4F 4B 21"],
    ["A double in the middle", [["uint8_t", "kind", 1], ["double", "value", 1], ["uint8_t", "crc", 1]], ""],
  ];

  function layout(members, packed) {
    let off = 0, maxA = 1; const out = [];
    members.forEach(([t, name, n]) => { const [sz, al] = MT[t]; const a = packed ? 1 : al; maxA = Math.max(maxA, a); const o = Math.ceil(off / a) * a; out.push({ t, name, n, sz, al, off: o, pad: o - off, bytes: sz * n }); off = o + sz * n; });
    const total = Math.ceil(off / maxA) * maxA;
    return { m: out, end: off, total, tail: total - off, align: maxA };
  }

  function mountStruct(box) {
    const E = window.Course.el;
    let members = SL_PRESETS[0][1].map(x => x.slice()), packed = false, wire = SL_PRESETS[0][2];
    box.appendChild(E("h3", { text: box.dataset.title || "Struct layout and byte order" }));
    const presets = E("div", { class: "sl-presets" });
    SL_PRESETS.forEach(([t, m, w]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { members = m.map(x => x.slice()); wire = w; packedBox.checked = packed = false; wireIn.value = wire; render(); } })));
    const list = E("div"), code = E("div", { class: "cp-code", style: "font-family:var(--mono);font-size:.85rem;background:var(--code-bg);border-radius:4px;padding:.45rem .7rem;white-space:pre;overflow-x:auto" });
    const packedBox = E("input", { type: "checkbox" }); packedBox.addEventListener("change", () => { packed = packedBox.checked; render(); });
    const grid = E("div", { class: "sl-grid" }), sum = E("div", { class: "sl-sum" }), wireIn = E("input", { class: "wire", type: "text", spellcheck: "false", value: wire, "aria-label": "Wire bytes" }), dec = E("div", { class: "sl-scroll" });
    wireIn.addEventListener("change", () => { wire = wireIn.value; render(); });
    box.append(presets, list, E("div", { class: "sl-row" }, [E("label", {}, [packedBox, " __attribute__((packed))"]),
      E("button", { class: "btn secondary", type: "button", text: "Sort members by alignment", onclick: () => { members.sort((a, b) => MT[b[0]][1] - MT[a[0]][1]); render(); } }),
      E("button", { class: "btn secondary", type: "button", text: "+ member", onclick: () => { if (members.length < 8) members.push(["uint8_t", "m" + members.length, 1]); render(); } })]),
      code, grid, sum, E("h4", { text: "Read a buffer from the wire through this struct" }), E("div", { class: "sl-row" }, ["bytes, as they arrive: ", wireIn]), dec);

    function render() {
      list.innerHTML = "";
      members.forEach((m, i) => {
        const t = E("select", { "aria-label": "type" }, Object.keys(MT).map(k => E("option", { value: k, text: k }))); t.value = m[0]; t.addEventListener("change", () => { m[0] = t.value; render(); });
        const nm = E("input", { class: "nm", type: "text", value: m[1], spellcheck: "false", "aria-label": "name" }); nm.addEventListener("change", () => { m[1] = nm.value.replace(/\W/g, "") || "m" + i; render(); });
        const n = E("input", { class: "n", type: "number", min: 1, max: 16, value: m[2], "aria-label": "array length" }); n.addEventListener("change", () => { m[2] = Math.max(1, Math.min(16, +n.value || 1)); render(); });
        list.appendChild(E("div", { class: "sl-row" }, [E("span", { class: "chip", style: `background:${MCOL[i]}` }), t, nm, "[", n, "]",
          E("button", { class: "btn secondary", type: "button", text: "↑", onclick: () => { if (i) { [members[i - 1], members[i]] = [members[i], members[i - 1]]; render(); } } }),
          E("button", { class: "btn secondary", type: "button", text: "✕", onclick: () => { if (members.length > 1) { members.splice(i, 1); render(); } } })]));
      });
      const L = layout(members, packed), sorted = layout(members.slice().sort((a, b) => MT[b[0]][1] - MT[a[0]][1]), false);
      code.textContent = `typedef struct${packed ? " __attribute__((packed))" : ""} {\n` + L.m.map(m => `    ${(m.t + " ").padEnd(10)}${m.name}${m.n > 1 ? `[${m.n}]` : ""};`.padEnd(30) + `/* offset ${m.off}, ${m.bytes} byte${m.bytes > 1 ? "s" : ""}${m.pad ? `, after ${m.pad} padding` : ""} */`).join("\n") + `\n} Record;                      /* sizeof = ${L.total} */`;
      grid.innerHTML = "";
      const owner = new Array(L.total).fill(-1);
      L.m.forEach((m, i) => { for (let k = 0; k < m.bytes; k++) owner[m.off + k] = i; });
      for (let r = 0; r < Math.ceil(L.total / 4); r++) {
        grid.appendChild(E("div", { class: "off", text: "+" + r * 4 }));
        for (let c = 0; c < 4; c++) {
          const k = r * 4 + c;
          if (k >= L.total) { grid.appendChild(E("div", { class: "c none" })); continue; }
          const i = owner[k];
          grid.appendChild(i < 0 ? E("div", { class: "c pad", text: "pad" }) : E("div", { class: "c", style: `background:${MCOL[i]}`, text: `${L.m[i].name}${L.m[i].bytes > 1 ? "[" + (k - L.m[i].off) + "]" : ""}`, title: `${L.m[i].t} ${L.m[i].name}, byte ${k - L.m[i].off}` }));
        }
      }
      const padTotal = L.total - L.m.reduce((s, m) => s + m.bytes, 0);
      sum.innerHTML = `sizeof = <b>${L.total}</b> bytes: ${L.total - padTotal} of data and <b>${padTotal}</b> of padding` + (L.tail ? ` (${L.tail} at the end, so that the next element of an array is aligned to ${L.align})` : "") + ". " +
        (packed ? "Packed: no padding, but the members can be unaligned. On the Cortex-M0+ an unaligned 16- or 32-bit access faults, so the compiler must read packed members byte by byte."
          : `Each member starts at a multiple of its alignment, and the struct is aligned to ${L.align}.` + (sorted.total < L.total ? ` Sorted by alignment it needs only ${sorted.total} bytes.` : ""));
      dec.innerHTML = "";
      const wb = wire.trim() ? wire.trim().split(/[\s,]+/).map(x => parseInt(x.replace(/^0x/i, ""), 16)).filter(Number.isFinite) : [];
      if (!wb.length) { dec.appendChild(E("p", { class: "widget-hint", text: "Type the bytes of a frame, in hex, to see what each member reads." })); return; }
      const t = E("table");
      t.appendChild(E("tr", {}, ["member", "bytes at its offset", "little-endian CPU (Cortex-M)", "big-endian CPU", "the shift form, big-endian on the wire"].map(h => E("th", { text: h }))));
      L.m.forEach((m, i) => {
        const bs = []; for (let k = 0; k < m.bytes; k++) bs.push(wb[m.off + k]);
        const missing = bs.some(v => v === undefined);
        const hx = v => v === undefined ? "??" : v.toString(16).toUpperCase().padStart(2, "0");
        const el = m.sz === 1 || m.n > 1 || m.t === "float" || m.t === "double" ? null : bs;
        const le = el && !missing ? "0x" + bs.slice().reverse().map(hx).join("") : "–", be = el && !missing ? "0x" + bs.map(hx).join("") : "–";
        const startW = L.m.reduce((s, x, j) => (j < i ? s + x.bytes : s), 0), wireBs = []; for (let k = 0; k < m.bytes; k++) wireBs.push(wb[startW + k]);
        const shift = el && wireBs.every(v => v !== undefined) ? "0x" + wireBs.map(hx).join("") : m.sz === 1 && m.n === 1 && wireBs[0] !== undefined ? "0x" + hx(wireBs[0]) : "–";
        const shifted = m.off !== startW;
        t.appendChild(E("tr", {}, [E("td", { html: `<span class="chip" style="background:${MCOL[i]}"></span>${m.name}` }), E("td", { class: "mono", html: bs.map(hx).join(" ") + (shifted ? ` <span class="bad">(offset ${m.off}, but it arrives at ${startW})</span>` : "") }),
          E("td", { class: "mono", html: m.sz === 1 && m.n === 1 ? "0x" + hx(bs[0]) : le }), E("td", { class: "mono", text: m.sz === 1 && m.n === 1 ? "0x" + hx(bs[0]) : be }), E("td", { class: "mono", text: shift })]));
      });
      dec.appendChild(t);
      dec.appendChild(E("p", { class: "widget-hint", text: (L.total !== L.end || L.m.some(m => m.pad) ? "With padding the struct does not match the wire: members past the first gap read the wrong bytes. " : "") +
        "memcpy into the struct reads each member in the CPU's byte order. A big-endian field on a little-endian Cortex-M comes out reversed; the shift form, (b[1] << 8) | b[2], gives the right value on any CPU." }));
    }
    render();
  }

  window.CTypes = { evaluate, layout };
  function init() {
    if (!document.getElementById("ctypes-css")) { const s = document.createElement("style"); s.id = "ctypes-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.cpromote").forEach(mountPromote);
    document.querySelectorAll(".widget.structlayout").forEach(mountStruct);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
