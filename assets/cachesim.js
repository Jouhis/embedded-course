/* Cache simulator for the memory hierarchy lesson (36). Load after course.js.
 *
 *   <div class="widget cachesim" data-title="A tiny XIP cache" data-sets="4" data-ways="2" data-line="16"
 *        data-hit="1" data-miss="20"></div>
 *
 * A set-associative cache with LRU replacement. The learner picks an access pattern and steps through it;
 * each address is split into tag, index and offset, the set it maps to lights up, and the access is drawn
 * as a hit (green) or a miss (red, with the line it evicted). The ways menu switches between direct-mapped,
 * 2-way and 4-way so the same pattern can be compared. data-hit and data-miss are the cycle costs used for
 * the average (the lesson's illustration numbers, not datasheet values).
 */
(function () {
  "use strict";

  const CSS = `
  .cachesim .cc-controls{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.5rem 0}
  .cachesim select{font:inherit;font-size:.85rem;padding:.2rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px}
  .cachesim .cc-desc{font-family:var(--sans);font-size:.85rem;color:var(--muted);margin:.25rem 0 .5rem}
  .cachesim .cc-addr{font-family:var(--mono);font-size:.95rem;margin:.5rem 0;display:flex;flex-wrap:wrap;gap:.3rem;align-items:baseline}
  .cachesim .cc-addr .f{padding:.15rem .4rem;border-radius:3px}
  .cachesim .cc-addr .tag{background:var(--warn-soft);color:var(--warn)}
  .cachesim .cc-addr .idx{background:var(--accent-soft);color:var(--accent);font-weight:700}
  .cachesim .cc-addr .off{background:var(--code-bg);color:var(--muted)}
  .cachesim .cc-addr small{display:block;font-family:var(--sans);font-size:.65rem;text-align:center}
  .cachesim table.cc{font-family:var(--mono);font-size:.8rem;border-collapse:separate;border-spacing:3px;margin:.5rem 0}
  .cachesim table.cc th{font-family:var(--sans);font-size:.72rem;color:var(--muted);font-weight:600;padding:0 .4rem}
  .cachesim table.cc td{border:1px solid var(--rule);border-radius:4px;padding:.3rem .5rem;min-width:7.5rem;background:var(--bg);transition:background .2s}
  .cachesim table.cc td.empty{color:var(--muted)}
  .cachesim table.cc tr.cur th{color:var(--accent)}
  .cachesim table.cc tr.cur td{border-color:var(--accent)}
  .cachesim table.cc td.hit{background:var(--good-soft);border-color:var(--good);border-width:2px}
  .cachesim table.cc td.miss{background:var(--bad-soft);border-color:var(--bad);border-width:2px}
  .cachesim table.cc td small{display:block;color:var(--muted);font-size:.68rem}
  .cachesim .cc-stats{display:flex;flex-wrap:wrap;gap:.5rem 1.2rem;font-family:var(--sans);font-size:.85rem;margin:.5rem 0}
  .cachesim .cc-stats b{font-family:var(--mono)}
  .cachesim .cc-bar{height:.6rem;border-radius:3px;background:var(--bad-soft);overflow:hidden;margin:.2rem 0 .6rem;max-width:30rem}
  .cachesim .cc-bar span{display:block;height:100%;background:var(--good);transition:width .2s}
  .cachesim .cc-seq{display:flex;flex-wrap:wrap;gap:2px;margin:.4rem 0}
  .cachesim .cc-seq span{font-family:var(--mono);font-size:.62rem;padding:.05rem .2rem;border-radius:2px;background:var(--code-bg);color:var(--muted)}
  .cachesim .cc-seq span.h{background:var(--good-soft);color:var(--good)}
  .cachesim .cc-seq span.m{background:var(--bad-soft);color:var(--bad)}
  .cachesim .cc-seq span.now{outline:2px solid var(--accent)}
  .cachesim .cc-msg{font-family:var(--sans);font-size:.85rem;background:var(--accent-soft);padding:.5rem .75rem;border-radius:4px;min-height:2.4rem}`;

  const BASE = 0x10000000;   // RP2040 XIP flash
  const hex = (x, w = 8) => "0x" + (x >>> 0).toString(16).toUpperCase().padStart(w, "0");
  const bin = (x, n) => (x >>> 0).toString(2).padStart(n, "0");

  function patterns(sets, line) {
    const way = sets * line;   // bytes that map onto every set once: addresses this far apart collide
    const rep = (n, f) => { const out = []; for (let i = 0; i < n; i++) out.push(...f(i)); return out; };
    return [
      { name: "Loop over a 64-byte table, 3 times", desc: "A small loop reads the same 16 words again and again. Only the first pass misses: temporal locality.",
        seq: rep(3, () => rep(16, i => [BASE + 0x100 + 4 * i])) },
      { name: "Read a 256-byte buffer once", desc: `Each miss brings in a whole ${line}-byte line, so the next ${line / 4 - 1} words hit: spatial locality.`,
        seq: rep(64, i => [BASE + 0x200 + 4 * i]) },
      { name: "Two tables that collide", desc: `Table B starts exactly ${way} bytes after table A, so A[i] and B[i] map to the same set. Compare direct-mapped with 2-way.`,
        seq: rep(2, () => rep(8, i => [BASE + 4 * i, BASE + way + 4 * i])) },
      { name: "Three tables that collide", desc: "Three addresses share each set. Two ways are not enough: LRU throws out the line that is needed next. Try 4-way.",
        seq: rep(2, () => rep(8, i => [BASE + 4 * i, BASE + way + 4 * i, BASE + 2 * way + 4 * i])) },
    ];
  }

  function injectCss() {
    if (document.getElementById("cachesim-css")) return;
    const s = document.createElement("style");
    s.id = "cachesim-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function mount(box) {
    const E = window.Course.el;
    const sets = +(box.dataset.sets || 4), line = +(box.dataset.line || 16);
    const hitCost = +(box.dataset.hit || 1), missCost = +(box.dataset.miss || 20);
    const offBits = Math.log2(line), idxBits = Math.log2(sets);
    const pats = patterns(sets, line);
    let ways = +(box.dataset.ways || 2), pat = 0, pos, cache, results, last, timer = null;

    box.appendChild(E("h3", { text: box.dataset.title || "Cache simulator" }));
    const patSel = E("select", { "aria-label": "Access pattern" }, pats.map((p, i) => E("option", { value: i, text: p.name })));
    const waySel = E("select", { "aria-label": "Ways" }, [[1, "direct-mapped (1 way)"], [2, "2-way"], [4, "4-way"]]
      .map(([n, t]) => { const o = E("option", { value: n, text: t }); if (n === ways) o.selected = true; return o; }));
    const btn = (t, f, c) => E("button", { class: "btn" + (c ? " " + c : ""), type: "button", text: t, onclick: f });
    const runBtn = btn("Run", () => { if (timer) stop(); else { runBtn.textContent = "Pause"; timer = setInterval(() => { if (!step()) stop(); }, 220); } });
    box.appendChild(E("div", { class: "cc-controls" }, [patSel, waySel, btn("Step", () => step()), runBtn, btn("Reset", reset, "secondary")]));
    const desc = E("p", { class: "cc-desc" });
    const seqEl = E("div", { class: "cc-seq" });
    const addrEl = E("div", { class: "cc-addr" });
    const table = E("table", { class: "cc" });
    const msg = E("div", { class: "cc-msg" });
    const stats = E("div", { class: "cc-stats" });
    const bar = E("div", { class: "cc-bar" }, [E("span")]);
    box.append(desc, seqEl, addrEl, table, msg, stats, bar);
    patSel.addEventListener("change", () => { pat = +patSel.value; reset(); });
    waySel.addEventListener("change", () => { ways = +waySel.value; reset(); });

    function stop() { if (timer) { clearInterval(timer); timer = null; } runBtn.textContent = "Run"; }
    function reset() {
      stop();
      pos = 0; last = null; results = [];
      cache = [...Array(sets)].map(() => [...Array(ways)].map(() => ({ valid: false, tag: 0, used: 0 })));
      msg.textContent = `${sets} sets × ${ways} way${ways > 1 ? "s" : ""} × ${line}-byte lines = ${sets * ways * line} bytes of cache. Press Step.`;
      render();
    }
    function step() {
      const seq = pats[pat].seq;
      if (pos >= seq.length) { msg.textContent = "Pattern finished. Change the ways or the pattern and compare the hit rate."; return false; }
      const a = seq[pos];
      const idx = (a >>> offBits) & (sets - 1), tag = a >>> (offBits + idxBits);
      const set = cache[idx];
      let w = set.findIndex(l => l.valid && l.tag === tag);
      const hit = w >= 0;
      let evicted = null;
      if (!hit) {
        w = set.findIndex(l => !l.valid);
        if (w < 0) { w = set.reduce((best, l, i) => (l.used < set[best].used ? i : best), 0); evicted = set[w].tag; }
        set[w].valid = true; set[w].tag = tag;
      }
      set[w].used = pos + 1;
      results.push(hit);
      last = { a, idx, tag, w, hit, evicted };
      const lineAddr = t => hex(((t << idxBits) | idx) << offBits);
      msg.textContent = hit
        ? `${hex(a)} → set ${idx}, tag ${hex(tag, 1)}: HIT in way ${w}. One cycle.`
        : `${hex(a)} → set ${idx}, tag ${hex(tag, 1)}: MISS. The line ${lineAddr(tag)} is fetched from flash into way ${w}` +
          (evicted !== null ? `, evicting the line ${lineAddr(evicted)} (least recently used).` : " (the way was empty).");
      pos++;
      render();
      return true;
    }

    function render() {
      const seq = pats[pat].seq;
      desc.textContent = pats[pat].desc;
      seqEl.innerHTML = "";
      seq.forEach((a, i) => seqEl.appendChild(E("span", {
        class: (i < results.length ? (results[i] ? "h" : "m") : "") + (i === pos - 1 ? " now" : ""),
        text: (a & 0xFFF).toString(16).toUpperCase().padStart(3, "0"), title: hex(a) })));

      addrEl.innerHTML = "";
      if (last) {
        const lo = last.a & ((1 << (offBits + idxBits)) - 1);
        addrEl.append(E("span", { text: hex(last.a) + " =" }),
          E("span", { class: "f tag" }, [`tag ${hex(last.tag, 1)}`, E("small", { text: `bits 31…${offBits + idxBits}` })]),
          E("span", { class: "f idx" }, [bin(lo >>> offBits, idxBits), E("small", { text: `index = set ${last.idx}` })]),
          E("span", { class: "f off" }, [bin(lo & (line - 1), offBits), E("small", { text: `offset ${lo & (line - 1)} in the line` })]));
      } else addrEl.append(E("span", { class: "cc-desc", text: `An address splits into tag | index (${idxBits} bits) | offset (${offBits} bits).` }));

      table.innerHTML = "";
      table.appendChild(E("tr", {}, [E("th"), ...cache[0].map((_, w) => E("th", { text: `way ${w}` }))]));
      cache.forEach((set, i) => {
        const tr = E("tr", { class: last && last.idx === i ? "cur" : "" }, [E("th", { text: `set ${i}` })]);
        set.forEach((l, w) => {
          const cls = last && last.idx === i && last.w === w ? (last.hit ? "hit" : "miss") : l.valid ? "" : "empty";
          const td = E("td", { class: cls });
          if (l.valid) {
            const start = ((l.tag << idxBits) | i) << offBits;
            td.append(`tag ${hex(l.tag, 1)}`, E("small", { text: `${hex(start)}…${(start + line - 1 & 0xFFF).toString(16).toUpperCase()}` }));
          } else td.textContent = "empty";
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });

      const n = results.length, h = results.filter(Boolean).length;
      const avg = n ? (h * hitCost + (n - h) * missCost) / n : 0;
      stats.innerHTML = "";
      [["Accesses", `${n} / ${seq.length}`], ["Hits", h], ["Misses", n - h], ["Hit rate", n ? (100 * h / n).toFixed(1) + " %" : "–"],
       ["Average cost", n ? `${avg.toFixed(2)} cycles (hit ${hitCost}, miss ${missCost})` : "–"]]
        .forEach(([k, v]) => stats.appendChild(E("span", {}, [k + ": ", E("b", { text: String(v) })])));
      bar.firstChild.style.width = n ? (100 * h / n) + "%" : "0";
    }
    reset();
  }

  function init() { injectCss(); document.querySelectorAll(".widget.cachesim").forEach(mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
