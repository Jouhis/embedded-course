/* Wraparound of a free-running counter (lessons 55 and 73). Load after course.js.
 *
 *   <div class="widget wraptime" data-unit="ms" data-preset="systick"></div>    presets: systick (lesson 73), blink (55), small
 *
 * A timeout starts at a counter value close to the wrap. The timeline shows, for each moment of real
 * elapsed time, what three checks answer: the comparison with a computed deadline, the unsigned
 * elapsed-time check of lesson 73, and the signed distance of lesson 55. Green agrees with the truth,
 * red does not. The counter width can be 8, 16 or 32 bits, so the wrap is easy to see on small numbers.
 * Lesson 73's numbers: start 0xFFFFFF00, timeout 2000 ms; at 2000 ms, now = 1744 and now - start = 2000.
 */
(function () {
  "use strict";
  const PRE = {
    systick: { label: "Lesson 73: start 0xFFFFFF00, 2000 ms", bits: 32, start: 0xFFFFFF00, timeout: 2000, cur: 2000 },
    blink: { label: "Lesson 55: the deadline is 0xFFFFFFF0", bits: 32, start: 0xFFFFFFE0, timeout: 16, cur: 40 },
    small: { label: "An 8-bit counter: start 250, timeout 10", bits: 8, start: 250, timeout: 10, cur: 12 }
  };
  const CSS = `
  .wraptime .wt-row{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .wraptime label{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;max-width:100%}
  .wraptime input,.wraptime select{font-family:var(--mono);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem;max-width:100%}
  .wraptime input.n{width:7.5rem} .wraptime input[type=range]{width:min(26rem,80vw)}
  .wraptime .btn{font-size:.75rem;padding:.15rem .5rem}
  .wraptime svg{width:100%;height:auto;display:block;font-family:var(--sans);font-size:11px}
  .wraptime svg text{fill:var(--fg)} .wraptime svg .mut{fill:var(--muted)}
  .wraptime .t{fill:var(--good);opacity:.75} .wraptime .f{fill:var(--rule);opacity:.5} .wraptime .x{fill:var(--bad);opacity:.85}
  .wraptime .wl{stroke:var(--warn);stroke-width:1.5;stroke-dasharray:4 3} .wraptime .cur{stroke:var(--fg);stroke-width:2}
  .wraptime .wt-tbl{overflow-x:auto} .wraptime table{border-collapse:collapse;font-size:.8rem;margin:.4rem 0}
  .wraptime td,.wraptime th{border:1px solid var(--rule);padding:.2rem .45rem;text-align:left;white-space:nowrap} .wraptime td.c{font-family:var(--mono)}
  .wraptime td.ok{background:var(--good-soft)} .wraptime td.bad{background:var(--bad-soft);font-weight:700}
  .wraptime .wt-res{font-family:var(--sans);font-size:.88rem;padding:.45rem .8rem;border-radius:4px;margin:.4rem 0;border-left:4px solid var(--rule);background:var(--code-bg)}`;

  function mount(box) {
    const E = window.Course.el, unit = box.dataset.unit || "ms";
    const st = Object.assign({ full: false }, PRE[box.dataset.preset] || PRE.systick);
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "When does the timeout expire?" }));
    box.appendChild(E("p", { class: "widget-hint", text: `The counter counts ${unit} and wraps to 0 after its largest value. Drag the cursor through the wrap and read what each check answers. Green agrees with the truth, red does not.` }));
    const presets = E("div", { class: "wt-row" });
    Object.entries(PRE).forEach(([k, p]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: p.label, onclick: () => { Object.assign(st, p); sync(); render(); } })));
    const bitsSel = E("select", { "aria-label": "counter width" }, [8, 16, 32].map(b => E("option", { value: b, text: `uint${b}_t` })));
    const startIn = E("input", { class: "n", "aria-label": "start value" }), toIn = E("input", { class: "n", type: "number", min: 1, step: 1, "aria-label": "timeout" });
    const fullChk = E("input", { type: "checkbox" });
    bitsSel.addEventListener("change", () => { st.bits = +bitsSel.value; const M = 2 ** st.bits; st.start = M - Math.min(M / 4, st.bits === 32 ? 256 : 6); st.timeout = Math.min(st.timeout, M / 2 - 1); st.cur = Math.min(st.cur, span()); sync(); render(); });
    startIn.addEventListener("change", () => { const v = parseInt(startIn.value.trim(), startIn.value.trim().toLowerCase().startsWith("0x") ? 16 : 10); if (Number.isFinite(v)) st.start = ((v % 2 ** st.bits) + 2 ** st.bits) % 2 ** st.bits; sync(); render(); });
    toIn.addEventListener("change", () => { const v = Math.round(+toIn.value); if (v >= 1) st.timeout = Math.min(v, 2 ** st.bits * 2); sync(); render(); });
    fullChk.addEventListener("change", () => { st.full = fullChk.checked; st.cur = Math.min(st.cur, span()); sync(); render(); });
    const cur = E("input", { type: "range", min: 0, step: 1, "aria-label": "elapsed time" }), curOut = E("b");
    cur.addEventListener("input", () => { st.cur = +cur.value; render(); });
    box.append(presets, E("div", { class: "wt-row" }, [E("label", {}, ["counter", bitsSel]), E("label", {}, ["start = now at the start", startIn]), E("label", {}, [`timeout (${unit})`, toIn]), E("label", {}, [fullChk, "show a whole counter cycle"])]),
      E("div", { class: "wt-row" }, [E("label", {}, ["elapsed time", cur, curOut])]));
    const svgBox = E("div"), tbl = E("div", { class: "wt-tbl" }), res = E("div", { class: "wt-res" });
    box.append(svgBox, tbl, res);

    const M = () => 2 ** st.bits, H = () => 2 ** (st.bits - 1);
    const span = () => (st.full ? Math.round(M() * 1.15) + st.timeout : Math.max(3 * st.timeout, st.timeout + 40));
    const hex = v => "0x" + v.toString(16).toUpperCase().padStart(st.bits / 4, "0");
    function sync() {
      bitsSel.value = st.bits; startIn.value = hex(st.start); toIn.value = st.timeout; fullChk.checked = st.full;
      cur.max = span(); cur.value = st.cur;
    }
    function checks(t) {
      const m = M(), now = (st.start + t) % m, dl = (st.start + st.timeout) % m;
      const el = ((now - st.start) % m + m) % m, sd = ((now - dl) % m + m) % m, sdi = sd >= H() ? sd - m : sd;
      return { now, dl, el, sd, sdi, truth: t >= st.timeout, naive: now >= dl, sub: el >= st.timeout, sig: sdi >= 0 };
    }
    const ROWS = [["truth", "the truth: elapsed ≥ timeout"], ["naive", "now >= start + timeout"], ["sub", "(uint)(now − start) >= timeout"], ["sig", "(int)(now − deadline) >= 0"]];
    function render() {
      const S = span(), W = 680, L = 210, R = 10, top = 22, rh = 26, X = t => L + (t / S) * (W - L - R), Hh = top + ROWS.length * rh + 26;
      curOut.textContent = `${st.cur.toLocaleString("en-US")} ${unit}`;
      const N = 700; let s = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="timeline of the checks">`;
      ROWS.forEach(([k, lab], ri) => {
        const y = top + ri * rh;
        s += `<text x="4" y="${y + 15}" style="font-family:var(--mono);font-size:10.5px">${lab}</text>`;
        let a = 0, prev = null;
        const flush = (b, c) => { if (c === null) return; const cls = !c.v ? (c.bad ? "x" : "f") : c.bad ? "x" : "t"; s += `<rect class="${cls}" x="${X(a)}" y="${y + 3}" width="${Math.max(0.6, X(b) - X(a))}" height="${rh - 8}"/>`; };
        for (let i = 0; i <= N; i++) {
          const t = Math.round(i / N * S), c = checks(t), v = c[k], cell = { v, bad: k !== "truth" && v !== c.truth };
          if (!prev || prev.v !== cell.v || prev.bad !== cell.bad) { if (prev) flush(t, prev); a = t; prev = cell; }
        }
        flush(S, prev);
      });
      // the wrap points: real elapsed times where the counter goes back to 0
      for (let k = 1, w = M() - st.start; w <= S && k < 50; k++, w += M()) s += `<line class="wl" x1="${X(w)}" x2="${X(w)}" y1="${top - 6}" y2="${top + ROWS.length * rh}"/><text class="mut" x="${X(w) + 3}" y="${top - 8}">wraps to 0</text>`;
      s += `<line class="hl" x1="${X(st.timeout)}" x2="${X(st.timeout)}" y1="${top}" y2="${top + ROWS.length * rh}" style="stroke:var(--muted);stroke-dasharray:2 3"/>`;
      s += `<line class="cur" x1="${X(st.cur)}" x2="${X(st.cur)}" y1="${top - 4}" y2="${top + ROWS.length * rh + 4}"/>`;
      s += `<text class="mut" x="${L}" y="${Hh - 4}">0</text><text class="mut" x="${X(st.timeout)}" y="${Hh - 4}" text-anchor="middle">timeout</text><text class="mut" x="${W - R}" y="${Hh - 4}" text-anchor="end">${S.toLocaleString("en-US")} ${unit} elapsed</text></svg>`;
      svgBox.innerHTML = s;
      const c = checks(st.cur), b = st.bits, T = `uint${b}_t`, Ti = `int${b}_t`;
      const cell = (v) => `<td class="${v === c.truth ? "ok" : "bad"}">${v ? "due" : "not yet"}</td>`;
      tbl.innerHTML = `<table><tr><th>at ${st.cur.toLocaleString("en-US")} ${unit}</th><th>value</th><th>answer</th></tr>
        <tr><td>now</td><td class="c">${hex(c.now)}</td><td>${c.truth ? "due" : "not yet"} (the truth)</td></tr>
        <tr><td>now >= start + timeout</td><td class="c">${hex(c.now)} >= ${hex(c.dl)}</td>${cell(c.naive)}</tr>
        <tr><td>(${T})(now − start) >= timeout</td><td class="c">${hex(c.el)} = ${c.el.toLocaleString("en-US")} >= ${st.timeout}</td>${cell(c.sub)}</tr>
        <tr><td>(${Ti})(now − deadline) >= 0</td><td class="c">${hex(c.sd)} reads as ${c.sdi.toLocaleString("en-US")}</td>${cell(c.sig)}</tr></table>`;
      const dlWraps = st.start + st.timeout >= M();
      const cycle = b === 32 ? (unit === "ms" ? " (about 49.7 days)" : " (about 71.6 minutes)") : "";
      res.textContent = (dlWraps ? `The deadline start + timeout passes the wrap, so it is stored as ${hex((st.start + st.timeout) % M())}, a small number. Before the counter wraps, now is larger than that, so the comparison says due at once.`
        : st.start + S >= M() ? `The deadline ${hex(st.start + st.timeout)} is just below the wrap. Once the counter wraps, now is a small number again, so now >= deadline says not yet, and keeps saying it until the counter has come all the way round${cycle}.`
        : "Nothing passes the wrap here, so all three checks agree. Load a preset, or move the start closer to the wrap.")
        + ` The subtraction checks have limits too. The signed distance is right while now is less than ${H().toLocaleString("en-US")} ${unit} from the deadline${b === 32 ? (unit === "ms" ? " (about 24.9 days)" : " (about 35.8 minutes)") : ""}, and the unsigned elapsed time is right until a whole counter cycle has passed. Tick "show a whole counter cycle" to see where each one fails.`;
    }
    sync(); render();
  }
  function init() {
    if (!document.getElementById("wraptime-css")) { const s = document.createElement("style"); s.id = "wraptime-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.wraptime").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
