/* Bit widgets for number systems and bitwise lessons (load after course.js).
 *
 * 1. Interactive register: click bits to toggle; shows binary, hex, unsigned and signed decimal.
 *      <div class="widget bitreg" data-width="8" data-value="0x2C" data-title="An 8-bit register"
 *           data-fields="7-4:HIGH,3-0:LOW"></div>
 *    data-width: 8, 16 or 32. data-fields (optional): named bit ranges drawn under the bits.
 *
 * 2. Drill: endless generated exercises with instant feedback and a streak counter.
 *      <div class="widget bitdrill" data-kinds="set,clear,toggle,test,field,mask,hex2bin,bin2hex,twos" data-width="8"></div>
 *    Kinds:
 *      hex2bin / bin2hex  convert between bases
 *      twos               signed value of an 8-bit pattern (two's complement)
 *      set / clear / toggle  the result of reg |= (1u << n), reg &= ~(1u << n), reg ^= (1u << n)
 *      test               is bit n set? (answer 1 or 0)
 *      mask               the hex mask for bits a..b
 *      field              extract (reg >> lo) & mask
 *    Answers are typed in hex (0x..), binary (0b..) or decimal; all are accepted.
 */
(function () {
  "use strict";

  const CSS = `
  .bitreg .bits{display:flex;flex-wrap:wrap;gap:2px;margin:.5rem 0}
  .bitreg .bit{display:flex;flex-direction:column;align-items:center;min-width:1.7rem}
  .bitreg .bit button{font-family:var(--mono);font-size:1rem;width:1.7rem;height:2rem;border:1px solid var(--rule);border-radius:3px;background:var(--bg);color:var(--fg);cursor:pointer}
  .bitreg .bit button.one{background:var(--accent);color:var(--bg);border-color:var(--accent)}
  .bitreg .bit small{font-family:var(--mono);font-size:.65rem;color:var(--muted)}
  .bitreg .bit.nib{margin-left:.5rem}
  .bitreg .vals{font-family:var(--mono);font-size:.9rem;display:grid;grid-template-columns:auto 1fr;gap:.1rem 1rem}
  .bitreg .fields{display:flex;gap:2px;font-size:.7rem;font-family:var(--sans);color:var(--muted)}
  .bitreg .fields span{border-top:2px solid var(--accent);text-align:center}
  .bitdrill .task{font-family:var(--mono);font-size:1rem;margin:.5rem 0}
  .bitdrill .streak{font-family:var(--sans);color:var(--muted);font-size:.85rem}`;

  function injectCss() {
    if (document.getElementById("bits-css")) return;
    const s = document.createElement("style");
    s.id = "bits-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  const mask32 = w => (w >= 32 ? 0xFFFFFFFF : ((1 << w) >>> 0) - 1);
  const toHex = (v, w) => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(Math.ceil(w / 4), "0");
  const toBin = (v, w) => (v >>> 0).toString(2).padStart(w, "0").replace(/(?=(\d{4})+$)/g, " ").trim();
  const signed = (v, w) => (v & (1 << (w - 1)) ? (v >>> 0) - 2 ** w : v >>> 0);

  function parseAnswer(s) {
    const t = String(s).trim().replace(/[\s_]/g, "");
    if (/^-?0x[0-9a-f]+$/i.test(t)) return parseInt(t, 16);
    if (/^-?0b[01]+$/i.test(t)) return (t.startsWith("-") ? -1 : 1) * parseInt(t.replace(/^-?0b/i, ""), 2);
    if (/^[01]{5,}$/.test(t)) return parseInt(t, 2);      // long 0/1 strings: treat as binary
    if (/^-?\d+$/.test(t)) return parseInt(t, 10);
    return NaN;
  }

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "text") n.textContent = v; else if (k === "class") n.className = v; else n.setAttribute(k, v); });
    (kids || []).forEach(k => n.append(k));
    return n;
  }

  // ------------------------------------------------------------ interactive register

  function mountReg(box) {
    const w = parseInt(box.dataset.width || "8", 10);
    let v = (parseAnswer(box.dataset.value || "0") >>> 0) & mask32(w);
    box.appendChild(el("h3", { text: box.dataset.title || `${w}-bit register` }));
    const bits = el("div", { class: "bits" });
    const vals = el("div", { class: "vals" });
    box.append(bits);
    if (box.dataset.fields) {
      const f = el("div", { class: "fields" });
      // One span per field, sized by bit count (bits are ~1.7rem + 2px each)
      box.dataset.fields.split(",").forEach(spec => {
        const [range, name] = spec.split(":");
        const [hi, lo] = range.split("-").map(Number);
        const n = (hi - (isNaN(lo) ? hi : lo)) + 1;
        f.appendChild(el("span", { text: name, style: `width:calc(${n} * 1.7rem + ${n - 1} * 2px)` }));
      });
      box.append(f);
    }
    box.append(vals);
    function render() {
      bits.innerHTML = "";
      for (let b = w - 1; b >= 0; b--) {
        const one = (v >>> b) & 1;
        const btn = el("button", { type: "button", class: one ? "one" : "", text: String(one), title: `bit ${b} (value ${2 ** b})` });
        btn.addEventListener("click", () => { v = (v ^ (1 << b)) >>> 0; render(); });
        const cell = el("div", { class: "bit" + (b % 4 === 3 && b !== w - 1 ? " nib" : "") }, [btn, el("small", { text: String(b) })]);
        bits.appendChild(cell);
      }
      vals.innerHTML = "";
      [["Binary", "0b" + toBin(v, w)], ["Hex", toHex(v, w)], ["Unsigned", String(v >>> 0)], ["Signed (two's complement)", String(signed(v, w))]]
        .forEach(([k, val]) => { vals.append(el("span", { text: k })); vals.append(el("code", { text: val })); });
    }
    render();
  }

  // ------------------------------------------------------------ drill

  const rnd = n => Math.floor(Math.random() * n);

  function makeTask(kind, w) {
    const reg = rnd(2 ** Math.min(w, 16)) >>> 0;
    const n = rnd(w);
    const H = x => toHex(x, w);
    switch (kind) {
      case "hex2bin": return { q: `Write ${H(reg)} in binary.`, a: reg, show: "0b" + toBin(reg, w) };
      case "bin2hex": return { q: `Write 0b${toBin(reg, w)} in hex.`, a: reg, show: H(reg) };
      case "twos": { const r8 = reg & 0xFF; return { q: `The 8-bit pattern 0b${toBin(r8, 8)} as a signed (two's complement) number in decimal?`, a: signed(r8, 8), show: String(signed(r8, 8)), signedAnswer: true }; }
      case "set": return { q: `reg = ${H(reg)};  reg |= (1u << ${n});  // reg = ?`, a: (reg | (1 << n)) >>> 0, show: H((reg | (1 << n)) >>> 0) };
      case "clear": return { q: `reg = ${H(reg)};  reg &= ~(1u << ${n});  // reg = ?`, a: (reg & ~(1 << n)) >>> 0 & mask32(w), show: H((reg & ~(1 << n)) >>> 0 & mask32(w)) };
      case "toggle": return { q: `reg = ${H(reg)};  reg ^= (1u << ${n});  // reg = ?`, a: (reg ^ (1 << n)) >>> 0, show: H((reg ^ (1 << n)) >>> 0) };
      case "test": return { q: `reg = ${H(reg)};  (reg >> ${n}) & 1u  // = ? (0 or 1)`, a: (reg >>> n) & 1, show: String((reg >>> n) & 1) };
      case "mask": {
        const lo = rnd(w - 1), hi = lo + 1 + rnd(Math.min(4, w - lo - 1));
        const m = ((mask32(hi - lo + 1)) << lo) >>> 0;
        return { q: `Mask with bits ${hi}…${lo} set (all others 0), in hex?`, a: m, show: H(m) };
      }
      case "field": {
        const lo = rnd(w - 3), len = 2 + rnd(3), hi = Math.min(w - 1, lo + len - 1);
        const val = (reg >>> lo) & mask32(hi - lo + 1);
        return { q: `reg = ${H(reg)}. Extract the field in bits ${hi}…${lo}: (reg >> ${lo}) & ${toHex(mask32(hi - lo + 1), 1)}  // = ?`, a: val, show: `${toHex(val, 1)} (= ${val})` };
      }
      default: return { q: "Unknown drill kind " + kind, a: 0, show: "0" };
    }
  }

  function mountDrill(box) {
    const w = parseInt(box.dataset.width || "8", 10);
    const kinds = (box.dataset.kinds || "set,clear,toggle,test").split(",").map(s => s.trim());
    box.appendChild(el("h3", { text: box.dataset.title || "Bit drill" }));
    const task = el("div", { class: "task" });
    const input = el("input", { type: "text", autocomplete: "off", spellcheck: "false", placeholder: "0x.., 0b.. or decimal" });
    const check = el("button", { class: "btn", type: "button", text: "Check" });
    const next = el("button", { class: "btn secondary", type: "button", text: "Skip" });
    const fb = el("div", { class: "q-feedback" });
    const streakEl = el("div", { class: "streak" });
    box.append(task, el("div", { class: "q-input-row" }, [input, check, next]), fb, streakEl);
    let cur, streak = 0, best = 0, answered = false, count = 0;
    function newTask() {
      cur = makeTask(kinds[rnd(kinds.length)], w);
      task.textContent = cur.q;
      input.value = ""; fb.className = "q-feedback"; answered = false; next.textContent = "Skip";
      if (count++ > 0) input.focus({ preventScroll: true });  // don't steal focus on page load
    }
    function evaluate() {
      if (answered) { newTask(); return; }
      const v = parseAnswer(input.value);
      if (isNaN(v)) return;
      const ok = cur.signedAnswer ? v === cur.a : (v >>> 0) === (cur.a >>> 0);
      streak = ok ? streak + 1 : 0; best = Math.max(best, streak);
      fb.className = "q-feedback show " + (ok ? "good" : "bad");
      fb.textContent = ok ? `Correct: ${cur.show}` : `Not quite. Answer: ${cur.show}`;
      streakEl.textContent = `Streak: ${streak} · best: ${best}. Press Enter for the next one.`;
      answered = true; next.textContent = "Next";
    }
    check.addEventListener("click", evaluate);
    input.addEventListener("keydown", e => { if (e.key === "Enter") evaluate(); });
    next.addEventListener("click", newTask);
    newTask();
  }

  window.Bits = { makeTask, parseAnswer, toHex, toBin, signed };

  function init() {
    injectCss();
    document.querySelectorAll(".bitreg").forEach(mountReg);
    document.querySelectorAll(".bitdrill").forEach(mountDrill);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
