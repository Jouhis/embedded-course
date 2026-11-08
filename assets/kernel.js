/* RTOS kernel objects, by hand. Load after course.js.
 *
 *   <div class="widget queuesim"></div>    a queue, a binary and a counting semaphore fed by a button ISR (lesson 90)
 *   <div class="widget stackmark"></div>   a painted task stack and its high-water mark (lesson 92)
 *
 * queuesim: the ISR sends without waiting (xQueueSendFromISR / xSemaphoreGiveFromISR). A full queue
 *   drops the press; a give to a binary semaphore that is already 1 changes nothing.
 * stackmark: the lesson's worked example: depth 128 words, the measured paths peak at 88 words, so the
 *   high-water mark reads 40 free words; a rare branch needs 50 more, 138 words, and overflows by 10.
 */
(function () {
  "use strict";
  const CSS = `
  .queuesim .qs-row,.stackmark .sm-row{display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;margin:.45rem 0;font-family:var(--sans);font-size:.85rem}
  .queuesim label,.stackmark label{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;max-width:100%}
  .queuesim select,.stackmark select{font-family:var(--mono);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem;max-width:100%}
  .queuesim .btn,.stackmark .btn{font-size:.8rem;padding:.25rem .7rem}
  .queuesim .qs-flow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.6rem;align-items:center;margin:.6rem 0}
  .queuesim .qs-end{border:1px solid var(--rule);border-radius:6px;padding:.4rem .6rem;background:var(--code-bg);font-family:var(--sans);font-size:.8rem;text-align:center;min-width:6.5rem}
  .queuesim .qs-end b{display:block;font-size:.85rem}
  .queuesim .qs-end.blk{border-color:var(--muted);color:var(--muted)} .queuesim .qs-end.run{border-color:var(--good);background:var(--good-soft)}
  .queuesim .qs-slots{display:flex;flex-wrap:wrap;gap:.3rem;justify-content:center;padding:.4rem;border:2px dashed var(--rule);border-radius:6px;min-height:2.6rem}
  .queuesim .qs-slots span{width:2.6rem;height:2.1rem;display:flex;align-items:center;justify-content:center;border:1px solid var(--rule);border-radius:4px;font-family:var(--mono);font-size:.8rem;color:var(--muted)}
  .queuesim .qs-slots span.f{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}
  .queuesim .qs-stats{display:flex;gap:1.2rem;flex-wrap:wrap;font-family:var(--sans);font-size:.85rem}
  .queuesim .qs-stats b{font-size:1.05rem} .queuesim .qs-stats .lost b{color:var(--bad)}
  .queuesim .qs-log{font-family:var(--mono);font-size:.74rem;height:7.5rem;box-sizing:border-box;overflow:auto;border:1px solid var(--rule);border-radius:4px;padding:.3rem .5rem;margin:.4rem 0}
  .queuesim .qs-log .bad{color:var(--bad)}
  .queuesim .qs-res,.stackmark .sm-res{font-family:var(--sans);font-size:.88rem;min-height:3.9rem;box-sizing:border-box;padding:.45rem .8rem;border-radius:4px;margin:.4rem 0;border-left:4px solid var(--rule);background:var(--code-bg)}
  .queuesim .qs-res.ok,.stackmark .sm-res.ok{background:var(--good-soft);border-left-color:var(--good)} .queuesim .qs-res.bad,.stackmark .sm-res.bad{background:var(--bad-soft);border-left-color:var(--bad)}
  .stackmark .sm-main{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-start}
  .stackmark svg{width:13rem;height:auto;font-family:var(--sans);font-size:10px;flex:none}
  .stackmark svg text{fill:var(--fg)} .stackmark svg .mut{fill:var(--muted)}
  .stackmark .paint{fill:var(--code-bg);stroke:var(--rule)} .stackmark .used{fill:var(--accent);opacity:.8} .stackmark .peak{fill:var(--accent);opacity:.3}
  .stackmark .ovf{fill:var(--bad)} .stackmark .nb{fill:var(--rule);opacity:.5} .stackmark .mg{fill:var(--warn-soft);stroke:var(--warn);stroke-dasharray:3 2}
  .stackmark .sm-calc{font-family:var(--mono);font-size:.8rem;white-space:pre;overflow-x:auto;background:var(--code-bg);border-radius:4px;padding:.4rem .6rem;flex:1 1 16rem;min-width:0}`;

  // ---------------- queue and semaphores ----------------
  function mountQueue(box) {
    const E = window.Course.el;
    const st = { kind: "queue", n: 4 };
    let q, presses, handled, lost, log, last;
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "A button ISR feeds a task: queue or semaphore?" }));
    box.appendChild(E("p", { class: "widget-hint", text: "The ISR cannot wait, so it sends and returns at once. The task handles one press at a time. Press several times before the task runs, then let the task take: how many presses does it see?" }));
    const kindSel = E("select", { "aria-label": "kernel object" }, [E("option", { value: "queue", text: "a queue of presses" }), E("option", { value: "bin", text: "a binary semaphore" }), E("option", { value: "count", text: "a counting semaphore" })]);
    const nSel = E("select", { "aria-label": "length" }, [1, 2, 3, 4, 6, 8].map(v => E("option", { value: v, text: String(v) })));
    nSel.value = "4";
    kindSel.addEventListener("change", () => { st.kind = kindSel.value; reset(); });
    nSel.addEventListener("change", () => { st.n = +nSel.value; reset(); });
    const nLab = E("label", {}, ["length", nSel]);
    box.appendChild(E("div", { class: "qs-row" }, [E("label", {}, ["use", kindSel]), nLab]));
    const isrBox = E("div", { class: "qs-end" }), slots = E("div", { class: "qs-slots" }), task = E("div", { class: "qs-end" });
    box.appendChild(E("div", { class: "qs-flow" }, [isrBox, slots, task]));
    box.appendChild(E("div", { class: "qs-row" }, [
      E("button", { class: "btn", type: "button", text: "Press the button", onclick: () => { press(); render(); } }),
      E("button", { class: "btn secondary", type: "button", text: "Press 5 times fast", onclick: () => { for (let i = 0; i < 5; i++) press(); render(); } }),
      E("button", { class: "btn", type: "button", text: "Let the task take one", onclick: () => { take(); render(); } }),
      E("button", { class: "btn secondary", type: "button", text: "Reset", onclick: reset })]));
    const stats = E("div", { class: "qs-stats" }), res = E("div", { class: "qs-res" }), logEl = E("div", { class: "qs-log" });
    box.append(stats, res, logEl);
    const cap = () => (st.kind === "bin" ? 1 : st.n);
    function reset() { q = []; presses = 0; handled = 0; lost = 0; log = []; last = null; render(); }
    function press() {
      presses++;
      const call = st.kind === "queue" ? "xQueueSendFromISR" : "xSemaphoreGiveFromISR";
      if (q.length < cap()) { q.push(presses); log.push([`press ${presses}: ${call}() → pdPASS`]); }
      else { lost++; log.push([`press ${presses}: ${call}() → ${st.kind === "queue" ? "errQUEUE_FULL, the press is dropped" : st.kind === "bin" ? "pdFAIL, the semaphore is already 1" : "pdFAIL, the count is at its limit"}`, "bad"]); }
    }
    function take() {
      const call = st.kind === "queue" ? "xQueueReceive" : "xSemaphoreTake";
      if (!q.length) { last = null; log.push([`task: ${call}() finds nothing and blocks; it uses no CPU until the ISR sends`]); return; }
      const v = q.shift(); handled++; last = v;
      log.push([st.kind === "queue" ? `task: ${call}() copies out press ${v}` : `task: ${call}() succeeds; it learns that something happened, not which press`]);
    }
    function render() {
      nLab.style.display = st.kind === "bin" ? "none" : "";
      isrBox.innerHTML = `<b>button ISR</b>${presses} press${presses === 1 ? "" : "es"}`;
      slots.innerHTML = "";
      for (let i = 0; i < cap(); i++) slots.appendChild(E("span", { class: i < q.length ? "f" : "", text: i < q.length ? (st.kind === "queue" ? "#" + q[i] : "1") : "" }));
      slots.title = st.kind === "queue" ? "the queue: each slot holds a copy of one item" : st.kind === "bin" ? "a binary semaphore: 0 or 1" : `a counting semaphore: count ${q.length} of ${cap()}`;
      task.className = "qs-end " + (q.length ? "run" : "blk");
      task.innerHTML = `<b>handler task</b>${q.length ? "ready to run" : "blocked, waiting"}`;
      stats.innerHTML = `<span>pressed <b>${presses}</b></span><span>handled <b>${handled}</b></span><span>waiting <b>${q.length}</b></span><span class="lost">lost <b>${lost}</b></span>`;
      logEl.innerHTML = log.length ? log.map(([t, c]) => `<div class="${c || ""}">${t}</div>`).join("") : "<div>Nothing has happened yet.</div>";
      logEl.scrollTop = logEl.scrollHeight;
      if (!lost) { res.className = "qs-res" + (presses ? " ok" : ""); res.textContent = presses ? `Nothing lost so far. ${st.kind === "queue" ? "Each item is a copy, so the task also knows which press it is handling." : st.kind === "count" ? "The count remembers how many events happened, but carries no data." : "Try pressing twice before the task takes."}` : "Press the button a few times first."; }
      else { res.className = "qs-res bad"; res.textContent = st.kind === "bin" ? `${lost} of ${presses} presses were lost. A binary semaphore holds only 0 or 1, so presses before the take collapse into one. Use it for "it happened", and a queue or a counting semaphore to count.` : `${lost} press${lost === 1 ? " was" : "es were"} lost: the ${st.kind === "queue" ? "queue" : "count"} was full when the ISR sent. Make it longer, or make the task faster than the presses.`; }
    }
    reset();
  }

  // ---------------- stack high-water mark ----------------
  function mountStack(box) {
    const E = window.Course.el;
    const st = { depth: 128, margin: 16 };
    let peak, now;
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "Painting the stack: what the high-water mark sees" }));
    box.appendChild(E("p", { class: "widget-hint", text: "At creation the kernel fills the task's stack with 0xA5 bytes. Running code overwrites them, and the high-water mark is the number of words that still hold the paint. Run the paths the test covers, then the rare one it does not." }));
    const dSel = E("select", { "aria-label": "stack depth" }, [96, 128, 160, 192, 256].map(v => E("option", { value: v, text: `${v} words (${v * 4} bytes)` })));
    dSel.value = "128";
    dSel.addEventListener("change", () => { st.depth = +dSel.value; render(); });
    box.appendChild(E("div", { class: "sm-row" }, [E("label", {}, ["xTaskCreate depth", dSel])]));
    box.appendChild(E("div", { class: "sm-row" }, [
      E("button", { class: "btn", type: "button", text: "Run the tested paths (88 words)", onclick: () => { run(88); } }),
      E("button", { class: "btn", type: "button", text: "Take the rare branch (88 + 50 words)", onclick: () => { run(138); } }),
      E("button", { class: "btn secondary", type: "button", text: "Create the task again", onclick: () => { peak = 0; now = 0; render(); } })]));
    const svgBox = E("div"), calc = E("div", { class: "sm-calc" }), res = E("div", { class: "sm-res" });
    box.append(E("div", { class: "sm-main" }, [svgBox, calc]), res);
    function run(w) { now = w; peak = Math.max(peak, w); render(); }
    function render() {
      const D = st.depth, top = 16, wpx = 260 / Math.max(D, 140), y = w => top + w * wpx; // word 0 at the top = the stack's start (highest address)
      const over = Math.max(0, peak - D);
      let s = `<svg viewBox="0 0 200 ${top + 280 + 30}" role="img" aria-label="task stack">`;
      s += `<text class="mut" x="4" y="11">high address: the stack starts here</text>`;
      s += `<rect class="paint" x="30" y="${y(0)}" width="90" height="${D * wpx}"/>`;
      if (peak) s += `<rect class="peak" x="30" y="${y(0)}" width="90" height="${Math.min(peak, D) * wpx}"/>`;
      if (now) s += `<rect class="used" x="30" y="${y(0)}" width="90" height="${Math.min(now, D) * wpx}"/>`;
      s += `<rect class="mg" x="30" y="${y(D - st.margin)}" width="90" height="${st.margin * wpx}"/>`;
      if (over) s += `<rect class="ovf" x="30" y="${y(D)}" width="90" height="${over * wpx}"/>`;
      s += `<rect class="nb" x="30" y="${y(D) + over * wpx}" width="90" height="${Math.max(0, 280 - (D + over) * wpx)}"/>`;
      s += `<text x="124" y="${y(D) - 3}">end of stack</text><text class="mut" x="124" y="${y(D - st.margin) + 10}">margin ${st.margin}</text>`;
      if (peak) s += `<text x="124" y="${y(Math.min(peak, D)) + (over ? -12 : 4)}">peak ${peak}</text>`;
      if (over) s += `<text x="124" y="${y(D) + over * wpx + 2}" style="fill:var(--bad);font-weight:700">${over} words over</text>`;
      s += `<text class="mut" x="34" y="${top + 280 + 14}">below: other RAM</text></svg>`;
      svgBox.innerHTML = s;
      const free = Math.max(0, D - peak);
      calc.textContent = !peak ? `The stack is painted: all ${D} words hold 0xA5A5A5A5.\nuxTaskGetStackHighWaterMark() would return ${D}.` :
        `uxTaskGetStackHighWaterMark() = ${free} words\n\n1. free:  ${free} words × 4 = ${free * 4} bytes\n2. peak:  ${D} − ${free} = ${D - free} words = ${(D - free) * 4} bytes\n   check: ${(D - free) * 4} + ${free * 4} = ${D * 4} bytes, the whole stack\n3. margin: ${free} ${free >= st.margin ? "≥" : "<"} ${st.margin} words → ${free >= st.margin ? "passes, " + (free - st.margin) + " to spare" : "fails"}` + (over ? `\n\nThe real peak was ${peak} words: ${over} words were written\nbelow the stack, into whatever RAM is there.` : "");
      if (!peak) { res.className = "sm-res"; res.textContent = "Run the tested paths first."; }
      else if (over) { res.className = "sm-res bad"; res.textContent = `Overflow. The rare branch needed ${peak} words and the stack has ${D}, so it wrote ${over} words over the neighbouring RAM. The mark reads 0, but only after the damage, and only if that branch ran during the test. With a depth of 192 words both paths fit: 104 and 54 words free.`; }
      else if (peak === 88) { res.className = "sm-res ok"; res.textContent = `The test passes with ${free} words free. But the mark only saw the paths that ran. Now take the rare branch.`; }
      else { res.className = "sm-res ok"; res.textContent = `Both paths fit: ${D - 88} words free on the tested paths and ${free} on the rare one. The cost is ${(D - 128) * 4} bytes more RAM than 128 words.`; }
    }
    peak = 0; now = 0; render();
  }

  function init() {
    if (!document.getElementById("kernel-css")) { const s = document.createElement("style"); s.id = "kernel-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.queuesim").forEach(mountQueue);
    document.querySelectorAll(".widget.stackmark").forEach(mountStack);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
