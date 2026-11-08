/* Animated diagrams: an inline SVG that plays through numbered steps, with a caption per step.
 * Load after course.js.
 *
 *   <div class="widget anim" data-title="Charging a capacitor" data-ms="2200">
 *     <svg viewBox="0 0 480 200" role="img" aria-label="...">
 *       <rect class="box" x="20" y="20" width="80" height="40" data-on="2-3"/>
 *       <path class="wire arr" d="M100 40 H200" data-on="2"/>
 *       <circle class="tok" r="6" data-at="1:110,40 3:190,40"/>
 *       <text class="lbl" x="20" y="90" data-text="1:0 V|2:3.2 V|4:5 V">0 V</text>
 *       <g data-s="3-">... shown from step 3 on ...</g>
 *     </svg>
 *     <ol>
 *       <li>Caption of step 1 (HTML allowed).</li>
 *       <li>Caption of step 2.</li>
 *     </ol>
 *   </div>
 *
 * The number of steps is the number of <li>. Step lists use 1-based numbers: "3", "2-4", "3-" (3 to the
 * end), "-2" (1 to 2), and commas: "1,3-4".
 *   data-s="…"     the element is shown only in these steps (it fades in and out).
 *   data-on="…"    the element gets class "on" in these steps: boxes light up, wires carry a moving dash.
 *   data-bad="…", data-good="…", data-warn="…"   the same, with class "bad", "good" or "warn".
 *   data-at="1:x,y 3:x,y"   the element is translated to x,y from that step on; it glides between steps.
 *   data-text="1:a|3:b"     the element's text from that step on (spaces are kept).
 * SVG classes: box (a part), wire (a line), arr (a wire with an arrowhead), tok (a moving token), lbl
 * (mono text), sm (small muted text), ttl (bold sans text), acc/good/bad/warn (fixed colour), dim (faded),
 * soft (a box with a tinted fill). The SVG keeps its size; captions share one fixed-height area, so the
 * widget never changes size as it plays. Play loops; the Left and Right keys step when it has focus.
 * Reduced motion turns off the glides and the moving dashes. Print shows the last step and every caption.
 */
(function () {
  "use strict";

  const CSS = `
  .anim svg.anim-svg{width:100%;height:auto;display:block;margin:.4rem auto .2rem;font-family:var(--mono);overflow:visible}
  .anim svg *{transition:opacity .45s ease,transform .7s cubic-bezier(.45,.05,.3,1),fill .35s,stroke .35s}
  .anim svg .box{fill:var(--code-bg);stroke:var(--fg);stroke-width:1.6}
  .anim svg .box.soft{fill:var(--accent-soft)}
  .anim svg .box.on,.anim svg .box.acc{stroke:var(--accent);fill:var(--accent-soft);stroke-width:2.4}
  .anim svg .box.good{stroke:var(--good);fill:var(--good-soft);stroke-width:2.4}
  .anim svg .box.bad{stroke:var(--bad);fill:var(--bad-soft);stroke-width:2.4}
  .anim svg .box.warn{stroke:var(--warn);fill:var(--warn-soft);stroke-width:2.4}
  .anim svg .box.dim{opacity:.45}
  .anim svg .wire{fill:none;stroke:var(--muted);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
  .anim svg .wire.thin{stroke-width:1.2}
  .anim svg .wire.dash{stroke-dasharray:4 4}
  .anim svg .wire.acc{stroke:var(--accent)}
  .anim svg .wire.on{stroke:var(--accent);stroke-width:3;stroke-dasharray:7 5;animation:anim-flow .7s linear infinite}
  .anim svg .wire.good{stroke:var(--good);stroke-width:3}
  .anim svg .wire.bad{stroke:var(--bad);stroke-width:3}
  .anim svg .wire.warn{stroke:var(--warn);stroke-width:3}
  .anim svg .wire.fg{stroke:var(--fg)}
  .anim svg .fill{fill:var(--muted);stroke:none} .anim svg .fill.on,.anim svg .fill.acc{fill:var(--accent)}
  .anim svg .fill.good{fill:var(--good)} .anim svg .fill.bad{fill:var(--bad)} .anim svg .fill.warn{fill:var(--warn)}
  .anim svg .fill.soft{fill:var(--accent-soft)} .anim svg .fill.goodsoft{fill:var(--good-soft)}
  .anim svg .fill.badsoft{fill:var(--bad-soft)} .anim svg .fill.warnsoft{fill:var(--warn-soft)} .anim svg .fill.code{fill:var(--code-bg)}
  .anim svg .tok{fill:var(--accent);stroke:var(--bg);stroke-width:1.5}
  .anim svg .tok.good{fill:var(--good)} .anim svg .tok.bad{fill:var(--bad)} .anim svg .tok.warn{fill:var(--warn)}
  .anim svg text{fill:var(--fg);font-size:12px;white-space:pre}
  .anim svg .lbl{font-family:var(--mono);font-size:12px}
  .anim svg .sm{font-family:var(--sans);font-size:10.5px;fill:var(--muted)}
  .anim svg .ttl{font-family:var(--sans);font-weight:700;font-size:13px}
  .anim svg text.acc,.anim svg text.on{fill:var(--accent);font-weight:700}
  .anim svg text.good{fill:var(--good);font-weight:700} .anim svg text.bad{fill:var(--bad);font-weight:700}
  .anim svg text.warn{fill:var(--warn);font-weight:700}
  .anim svg .mid{text-anchor:middle} .anim svg .end{text-anchor:end}
  .anim svg .hide{opacity:0;pointer-events:none}
  .anim svg .anim-ah{fill:var(--muted)} .anim svg .anim-ah.on{fill:var(--accent)}
  .anim svg .anim-ah.good{fill:var(--good)} .anim svg .anim-ah.bad{fill:var(--bad)} .anim svg .anim-ah.warn{fill:var(--warn)}
  .anim svg .anim-ah.fg{fill:var(--fg)}
  @keyframes anim-flow{to{stroke-dashoffset:-12}}
  .anim .anim-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .5rem;margin:.5rem 0 .3rem}
  .anim .anim-bar .btn{font-size:.8rem;padding:.25rem .65rem;min-width:2.4rem}
  .anim .anim-bar .btn.play{min-width:5.6rem}
  .anim .anim-dots{display:flex;gap:.3rem;margin-left:.3rem;flex-wrap:wrap}
  .anim .anim-dots button{width:.8rem;height:.8rem;border-radius:50%;border:1.5px solid var(--accent);background:transparent;padding:0;cursor:pointer}
  .anim .anim-dots button.cur{background:var(--accent)}
  .anim .anim-dots button.past{background:var(--accent-soft)}
  .anim .anim-n{font-family:var(--mono);font-size:.78rem;color:var(--muted);margin-left:auto}
  .anim .anim-cap{display:grid;margin:.2rem 0 0;padding:.55rem .8rem;border-left:4px solid var(--accent);background:var(--code-bg);border-radius:0 4px 4px 0;font-size:.9rem;line-height:1.5}
  .anim .anim-cap > div{grid-area:1/1;visibility:hidden;opacity:0;transition:opacity .35s}
  .anim .anim-cap > div.cur{visibility:visible;opacity:1}
  .anim .anim-cap b.n{font-family:var(--mono);color:var(--accent);margin-right:.45rem}
  .anim:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
  .anim > ol.anim-src{display:none}
  @media (prefers-reduced-motion:reduce){
    .anim svg *{transition:none!important}
    .anim svg .wire.on{animation:none;stroke-dasharray:none}
    .anim .anim-cap > div{transition:none}
  }
  @media print{
    .anim .anim-bar{display:none}
    .anim .anim-cap{display:block;background:none;border:0;padding:0}
    .anim .anim-cap > div{visibility:visible;opacity:1;margin:.15rem 0}
    .anim svg .wire.on{animation:none}
  }`;

  function injectCss() {
    if (document.getElementById("anim-css")) return;
    const s = document.createElement("style");
    s.id = "anim-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // "1,3-5", "3-", "-2" -> Set of step numbers within 1..n
  function parseSteps(str, n) {
    const out = new Set();
    String(str).split(",").forEach(part => {
      part = part.trim();
      if (!part) return;
      const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
      if (m) {
        const a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : n;
        for (let i = a; i <= b; i++) out.add(i);
      } else out.add(+part);
    });
    return out;
  }
  // "1:x,y 3:x,y" or "1:a|3:b" -> sorted [[step, value], ...]
  function parseKeyed(str, sep) {
    return String(str).split(sep).map(s => s.trim()).filter(Boolean).map(s => {
      const i = s.indexOf(":");
      return [+s.slice(0, i), s.slice(i + 1)];
    }).sort((a, b) => a[0] - b[0]);
  }
  const atStep = (list, k) => { let v = null; list.forEach(([s, x]) => { if (s <= k) v = x; }); return v; };

  let uid = 0;
  const NS = "http://www.w3.org/2000/svg";

  function mount(box) {
    const E = window.Course.el;
    const svg = box.querySelector("svg");
    const ol = box.querySelector("ol");
    if (!svg || !ol) { box.appendChild(E("p", { text: "anim: needs an <svg> and an <ol> of captions" })); return; }
    const caps = [...ol.children].map(li => li.innerHTML);
    const n = caps.length;
    const id = "anim" + (++uid);
    svg.classList.add("anim-svg");
    const vb = svg.viewBox.baseVal;
    if (vb && vb.width && !svg.style.maxWidth) svg.style.maxWidth = Math.round(vb.width * 1.45) + "px";

    // arrowheads, one marker per colour
    const defs = document.createElementNS(NS, "defs");
    ["", "on", "good", "bad", "warn", "fg"].forEach(c => {
      const m = document.createElementNS(NS, "marker");
      m.setAttribute("id", `${id}-ah${c ? "-" + c : ""}`);
      ["viewBox:0 0 10 10", "refX:8", "refY:5", "markerWidth:6", "markerHeight:6", "orient:auto-start-reverse", "markerUnits:strokeWidth"]
        .forEach(kv => { const [k, v] = kv.split(":"); m.setAttribute(k, v); });
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", "M0 0 L10 5 L0 10 z");
      p.setAttribute("class", "anim-ah" + (c ? " " + c : ""));
      m.appendChild(p); defs.appendChild(m);
    });
    svg.insertBefore(defs, svg.firstChild);

    const items = [];
    svg.querySelectorAll("[data-s],[data-on],[data-bad],[data-good],[data-warn],[data-at],[data-text],.arr").forEach(node => {
      const it = { node, base: node.getAttribute("class") || "" };
      if (node.dataset.s) it.s = parseSteps(node.dataset.s, n);
      ["on", "bad", "good", "warn"].forEach(k => { if (node.dataset[k]) it[k] = parseSteps(node.dataset[k], n); });
      if (node.dataset.at) {
        it.at = parseKeyed(node.dataset.at, /\s+/).map(([s, v]) => [s, v.split(",").map(Number)]);
        node.style.transformBox = "view-box";
      }
      if (node.dataset.text) it.text = parseKeyed(node.dataset.text, "|");
      it.arr = node.classList.contains("arr");
      items.push(it);
    });

    // controls
    box.setAttribute("tabindex", "0");
    const title = box.dataset.title;
    if (title) box.insertBefore(E("h3", { text: title }), box.firstChild);
    ol.classList.add("anim-src");
    const bar = E("div", { class: "anim-bar" });
    const bFirst = E("button", { class: "btn secondary", type: "button", text: "⏮", title: "First step", "aria-label": "First step" });
    const bPrev = E("button", { class: "btn secondary", type: "button", text: "◀", title: "Previous step", "aria-label": "Previous step" });
    const bPlay = E("button", { class: "btn play", type: "button", text: "▶ Play" });
    const bNext = E("button", { class: "btn secondary", type: "button", text: "▶", title: "Next step", "aria-label": "Next step" });
    const dots = E("div", { class: "anim-dots" });
    const dotBtns = caps.map((_, i) => { const d = E("button", { type: "button", "aria-label": `Step ${i + 1}` }); d.addEventListener("click", () => { stop(); go(i + 1); }); dots.appendChild(d); return d; });
    bar.append(bFirst, bPrev, bPlay, bNext, dots);
    const cap = E("div", { class: "anim-cap", "aria-live": "polite" });
    const capDivs = caps.map((h, i) => { const d = E("div", { html: `<b class="n">${i + 1}/${n}</b>` + h }); cap.appendChild(d); return d; });
    svg.after(bar, cap);

    let k = 1, timer = null;
    const ms = +box.dataset.ms || 2600;

    function apply() {
      items.forEach(it => {
        const cls = [it.base];
        if (it.s && !it.s.has(k)) cls.push("hide");
        let colour = "";
        ["on", "bad", "good", "warn"].forEach(c => { if (it[c] && it[c].has(k)) { cls.push(c); colour = c; } });
        it.node.setAttribute("class", cls.join(" ").trim());
        if (it.arr) {
          const c = colour || ["acc", "good", "bad", "warn", "fg"].find(x => it.base.split(/\s+/).includes(x)) || "";
          it.node.setAttribute("marker-end", `url(#${id}-ah${c ? "-" + (c === "acc" ? "on" : c) : ""})`);
        }
        if (it.at) {
          const p = atStep(it.at, k) || it.at[0][1];
          it.node.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
        }
        if (it.text) {
          const t = atStep(it.text, k);
          if (t !== null) it.node.textContent = t;
        }
      });
      capDivs.forEach((d, i) => d.classList.toggle("cur", i === k - 1));
      dotBtns.forEach((d, i) => { d.classList.toggle("cur", i === k - 1); d.classList.toggle("past", i < k - 1); });
      bPrev.disabled = k === 1; bFirst.disabled = k === 1;
      bNext.disabled = k === n && !timer;
    }
    function go(j) { k = Math.max(1, Math.min(n, j)); apply(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } bPlay.textContent = "▶ Play"; apply(); }
    function play() {
      if (k === n) go(1);
      timer = setInterval(() => {
        if (!box.isConnected) return stop();
        if (k === n) go(1); else go(k + 1);
      }, ms);
      bPlay.textContent = "⏸ Pause"; apply();
    }
    bPlay.addEventListener("click", () => (timer ? stop() : play()));
    bNext.addEventListener("click", () => { stop(); go(k + 1); });
    bPrev.addEventListener("click", () => { stop(); go(k - 1); });
    bFirst.addEventListener("click", () => { stop(); go(1); });
    box.addEventListener("keydown", e => {
      if (e.target.closest && e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(k + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(k - 1); }
    });
    window.matchMedia && window.matchMedia("print").addEventListener && window.matchMedia("print").addEventListener("change", e => { if (e.matches) { stop(); go(n); } });
    box._anim = { go, n: () => n };
    apply();
  }

  function init() {
    injectCss();
    document.querySelectorAll(".widget.anim").forEach(box => {
      try { mount(box); } catch (e) { box.appendChild(document.createTextNode("anim: " + e.message)); }
    });
  }
  // for tests and screenshots: CourseAnim.setAll(3) moves every animation on the page to step 3
  window.CourseAnim = { setAll: k => document.querySelectorAll(".widget.anim").forEach(b => b._anim && b._anim.go(k)) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
