/* RTOS scheduler timeline. Load after course.js.
 *
 *   <div class="widget rtossim" data-preset="pi-sem"></div>     presets: tasks, pi-sem, pi-mutex, rm-ok, rm-wrong, rm-over
 *   The preset buttons show only the preset's group (tasks; pi-*; rm-*), or the list in data-presets="a,b".
 *
 * A fixed-priority preemptive scheduler, stepped in 1 ms ticks, as FreeRTOS runs it: the highest-priority
 * ready task runs (a larger number is a higher priority). A task's job is a list of segments: "run d" or
 * "lock d" (take the shared lock, run d, give it back). With a binary semaphore a blocked waiter changes
 * nothing; with a mutex the owner inherits the highest waiter's priority (lesson 91).
 * Work is counted in one of two ways: "elapsed" is a busy-wait on the tick count, which is what the
 * lesson 91 project does (the segment ends once d ms have passed since it began and the task runs again);
 * "cpu" counts only the ticks the task actually runs, the usual model for timing analysis (lesson 93).
 */
(function () {
  "use strict";
  const COLORS = ["#1c7ed6", "#d9480f", "#7048e8", "#2f9e44", "#c2255c"];
  const PRESETS = {
    "tasks": { title: "Three tasks, three priorities", lock: "none", mode: "cpu", T: 200, tasks: [
      { name: "sensor", prio: 3, period: 20, segs: [["run", 3]] }, { name: "control", prio: 2, period: 50, segs: [["run", 10]] }, { name: "report", prio: 1, period: 100, segs: [["run", 25]] }] },
    "pi-sem": { title: "Lesson 91, phase 1: a binary semaphore", lock: "semaphore", mode: "elapsed", T: 400, tasks: [
      { name: "low", prio: 1, at: 0, segs: [["lock", 200]] }, { name: "medium", prio: 2, at: 20, segs: [["run", 300]] }, { name: "high", prio: 3, at: 50, segs: [["lock", 10]] }] },
    "pi-mutex": { title: "Lesson 91, phase 2: a mutex", lock: "mutex", mode: "elapsed", T: 400, tasks: [
      { name: "low", prio: 1, at: 0, segs: [["lock", 200]] }, { name: "medium", prio: 2, at: 20, segs: [["run", 300]] }, { name: "high", prio: 3, at: 50, segs: [["lock", 10]] }] },
    "rm-ok": { title: "Rate-monotonic priorities, under the bound", lock: "none", mode: "cpu", T: 200, tasks: [
      { name: "fast", prio: 3, period: 10, segs: [["run", 3]] }, { name: "slow", prio: 2, period: 25, segs: [["run", 8]] }, { name: "report", prio: 1, period: 100, segs: [["run", 10]] }] },
    "rm-wrong": { title: "The same tasks, priorities by importance", lock: "none", mode: "cpu", T: 200, tasks: [
      { name: "fast", prio: 1, period: 10, segs: [["run", 3]] }, { name: "slow", prio: 2, period: 25, segs: [["run", 8]] }, { name: "report", prio: 3, period: 100, segs: [["run", 10]] }] },
    "rm-over": { title: "Too much work: U above 1", lock: "none", mode: "cpu", T: 200, tasks: [
      { name: "fast", prio: 3, period: 10, segs: [["run", 4]] }, { name: "slow", prio: 2, period: 25, segs: [["run", 10]] }, { name: "report", prio: 1, period: 100, segs: [["run", 25]] }] },
  };
  const PRESET_LABELS = [["tasks", "Three tasks"], ["pi-sem", "Inversion: semaphore"], ["pi-mutex", "Inversion: mutex"], ["rm-ok", "Rate-monotonic"], ["rm-wrong", "Wrong priorities"], ["rm-over", "Overloaded"]];

  const CSS = `
  .rtossim .rt-presets{display:flex;flex-wrap:wrap;gap:.3rem;margin:.4rem 0}
  .rtossim .rt-presets .btn,.rtossim .rt-play .btn{font-size:.75rem;padding:.15rem .5rem}
  .rtossim table{font-size:.82rem;border-collapse:collapse;margin:.4rem 0}
  .rtossim th,.rtossim td{padding:.2rem .4rem;border-bottom:1px solid var(--rule);text-align:left;white-space:nowrap}
  .rtossim input[type=number]{width:4.2rem;font-family:var(--mono);font-size:.82rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.1rem .25rem}
  .rtossim select{font-family:var(--sans);font-size:.85rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.15rem .3rem}
  .rtossim .chip{display:inline-block;width:.8rem;height:.8rem;border-radius:2px;vertical-align:-1px;margin-right:.35rem}
  .rtossim .rt-scroll{overflow-x:auto}
  .rtossim svg{width:100%;min-width:560px;height:auto;display:block;font-family:var(--sans);font-size:11px}
  .rtossim svg text{fill:var(--fg)} .rtossim svg .mut{fill:var(--muted)}
  .rtossim svg .grid{stroke:var(--rule);stroke-width:.6}
  .rtossim svg .ready{fill:none;stroke:var(--muted);stroke-dasharray:3 3}
  .rtossim svg .blk{fill:var(--bad);opacity:.28}
  .rtossim svg .inh{fill:none;stroke:var(--fg);stroke-width:1.5;stroke-dasharray:4 2}
  .rtossim svg .hold{fill:var(--fg)}
  .rtossim svg .cur{stroke:var(--fg);stroke-width:1.5}
  .rtossim svg .miss{fill:var(--bad);font-weight:700;font-size:13px}
  .rtossim .rt-legend{display:flex;flex-wrap:wrap;gap:.2rem 1rem;font-family:var(--sans);font-size:.75rem;color:var(--muted);margin:.2rem 0 .5rem}
  .rtossim .rt-legend i{display:inline-block;width:1.4rem;height:.7rem;vertical-align:-1px;margin-right:.3rem;border-radius:2px}
  .rtossim .rt-play{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;margin:.4rem 0}
  .rtossim .rt-play input[type=range]{flex:1;min-width:10rem}
  .rtossim .rt-now{font-family:var(--sans);font-size:.9rem;background:var(--code-bg);border-radius:4px;padding:.45rem .7rem;margin:.3rem 0;min-height:4rem;box-sizing:border-box}
  .rtossim .rt-log{font-family:var(--mono);font-size:.78rem;max-height:12rem;overflow-y:auto;background:var(--code-bg);border-radius:4px;padding:.4rem .7rem;margin:.3rem 0;white-space:pre}
  .rtossim .rt-log .future{opacity:.3}
  .rtossim .rt-sum{font-family:var(--sans);font-size:.9rem;padding:.5rem .8rem;border-radius:4px;margin:.4rem 0;background:var(--accent-soft);border-left:4px solid var(--accent)}
  .rtossim .rt-sum.bad{background:var(--bad-soft);border-left-color:var(--bad)}`;

  function simulate(sc) {
    const T = sc.T, tasks = sc.tasks.map((t, i) => ({ ...t, i, job: null, pending: 0, blocked: false, holds: false, waitFrom: null, responses: [], misses: 0, waited: [] }));
    const lock = { owner: null, waiters: [] };
    const tl = tasks.map(() => new Array(T).fill(null)), hold = tasks.map(() => new Array(T).fill(false));
    const events = [], releases = [], missAt = [];
    const ev = (t, task, text) => events.push({ t, task: task ? task.i : -1, text });
    const start = (task, t) => { task.job = { release: t, idx: 0, segs: task.segs.map(([k, d]) => ({ k, d, start: null, rem: d })) }; };
    const eff = task => {
      let p = task.prio;
      if (sc.lock === "mutex" && lock.owner === task) lock.waiters.forEach(w => { p = Math.max(p, w.prio); });
      return p;
    };
    for (let t = 0; t < T; t++) {
      tasks.forEach(task => {
        const due = task.period ? t % task.period === 0 : t === task.at;
        if (!due) return;
        releases.push([task.i, t]);
        if (task.job) { task.misses++; task.pending++; missAt.push([task.i, t]); ev(t, task, `is released again but has not finished: deadline missed`); }
        else { start(task, t); if (!task.period || t === 0 || sc.T <= 400) ev(t, task, task.period ? "released" : "starts"); }
      });
      let run = null;
      for (let guard = 0; guard < 60; guard++) {
        const ready = tasks.filter(x => x.job && !x.blocked);
        if (!ready.length) break;
        const pick = ready.reduce((a, b) => (eff(b) > eff(a) ? b : a));
        const seg = pick.job.segs[pick.job.idx];
        const locking = seg.k === "lock" && sc.lock !== "none";
        if (locking && !pick.holds) {
          if (!lock.owner) {
            lock.owner = pick; pick.holds = true;
            if (pick.waitFrom !== null) { pick.waited.push(t - pick.waitFrom); ev(t, pick, `takes the lock, after waiting ${t - pick.waitFrom} ms`); pick.waitFrom = null; }
            else ev(t, pick, "takes the lock");
            continue;
          }
          pick.blocked = true; lock.waiters.push(pick); pick.waitFrom = t;
          ev(t, pick, `wants the lock, held by ${lock.owner.name}: blocks` + (sc.lock === "mutex" && pick.prio > lock.owner.prio ? `. ${lock.owner.name} inherits priority ${pick.prio}` : sc.lock === "semaphore" ? ". A semaphore has no owner, so no task is raised" : ""));
          continue;
        }
        if (seg.start === null) seg.start = t;
        const done = sc.mode === "elapsed" ? t - seg.start >= seg.d : seg.rem <= 0;
        if (done) {
          if (locking && pick.holds) {
            pick.holds = false; lock.owner = null;
            ev(t, pick, "gives the lock back" + (sc.lock === "mutex" && eff(pick) !== pick.prio ? "" : ""));
            if (lock.waiters.length) {
              const w = lock.waiters.reduce((a, b) => (b.prio > a.prio ? b : a));
              lock.waiters.splice(lock.waiters.indexOf(w), 1); w.blocked = false;
            }
          }
          pick.job.idx++;
          if (pick.job.idx === pick.job.segs.length) {
            const r = t - pick.job.release; pick.responses.push(r);
            if (!pick.period || sc.T <= 400) ev(t, pick, `finishes, ${r} ms after its release`);
            pick.job = null;
            if (pick.pending) { pick.pending--; start(pick, t); }
          }
          continue;
        }
        run = pick; break;
      }
      tasks.forEach((task, k) => {
        hold[k][t] = task.holds;
        if (task === run) tl[k][t] = eff(task) > task.prio ? "inh" : "run";
        else if (task.job) tl[k][t] = task.blocked ? "blk" : "ready";
      });
      if (run && sc.mode === "cpu") run.job.segs[run.job.idx].rem--;
    }
    return { tasks, tl, hold, events, releases, missAt };
  }

  function mount(box) {
    const E = window.Course.el;
    let sc = JSON.parse(JSON.stringify(PRESETS[box.dataset.preset] || PRESETS["pi-sem"]));
    let cursor = sc.T, timer = null;
    box.appendChild(E("h3", { text: box.dataset.title || "The scheduler, tick by tick" }));
    const presets = E("div", { class: "rt-presets" });
    // Each lesson shows only its own presets: data-presets lists them, or the preset's own group.
    const start = box.dataset.preset in PRESETS ? box.dataset.preset : "pi-sem";
    const group = box.dataset.presets ? box.dataset.presets.split(",").map(x => x.trim()) : start === "tasks" ? ["tasks"] : start.startsWith("pi") ? ["pi-sem", "pi-mutex"] : ["rm-ok", "rm-wrong", "rm-over"];
    PRESET_LABELS.filter(([k]) => group.includes(k)).forEach(([k, t]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { stop(); sc = JSON.parse(JSON.stringify(PRESETS[k])); cursor = sc.T; build(); } })));
    const head = E("h4"), mode = E("p", { class: "widget-hint" }), table = E("div", { class: "rt-scroll" });
    const range = E("input", { type: "range", min: 0, max: 400, value: 400, "aria-label": "Time" });
    range.addEventListener("input", () => { stop(); cursor = +range.value; draw(); });
    const btn = (t, f) => E("button", { class: "btn secondary", type: "button", text: t, onclick: f });
    const playBtn = btn("▶ Play", () => { if (timer) { stop(); return; } if (cursor >= sc.T) cursor = 0; playBtn.textContent = "❚❚ Pause"; timer = setInterval(() => { cursor = Math.min(sc.T, cursor + Math.max(1, Math.round(sc.T / 200))); draw(); if (cursor >= sc.T) stop(); }, 40); });
    const play = E("div", { class: "rt-play" }, [btn("⏮", () => { stop(); cursor = 0; draw(); }), btn("◀ 10 ms", () => { stop(); cursor = Math.max(0, cursor - 10); draw(); }), playBtn,
      btn("10 ms ▶", () => { stop(); cursor = Math.min(sc.T, cursor + 10); draw(); }), btn("⏭", () => { stop(); cursor = sc.T; draw(); }), range]);
    const gantt = E("div", { class: "rt-scroll" }), now = E("div", { class: "rt-now" }), log = E("div", { class: "rt-log" }), sum = E("div", { class: "rt-sum" });
    const legend = E("div", { class: "rt-legend" });
    if (group.length < 2) presets.style.display = "none";
    box.append(presets, head, mode, table, legend,
      gantt, play, now, sum, E("details", {}, [E("summary", { text: "What the kernel did, event by event", style: "font-family:var(--sans);font-size:.85rem;cursor:pointer;margin:.4rem 0" }), log]));
    function stop() { if (timer) clearInterval(timer); timer = null; playBtn.textContent = "▶ Play"; }

    let res;
    function build() {
      head.textContent = sc.title;
      const locks = sc.lock !== "none";
      legend.innerHTML = '<span><i style="background:#1c7ed6"></i>running</span>' + (locks ? '<span><i style="border:1.5px dashed var(--fg)"></i>running at an inherited priority</span>' : "") + '<span><i style="border:1px dashed var(--muted)"></i>ready, waiting for the CPU</span>' + (locks ? '<span><i style="background:var(--bad);opacity:.35"></i>blocked on the lock</span><span><i style="background:var(--fg);height:.25rem"></i>holds the lock</span>' : "") + '<span>▲ released' + (sc.tasks[0].period ? ' · <b style="color:var(--bad)">✗</b> deadline missed' : "") + "</span>";
      mode.textContent = sc.mode === "elapsed" ? "Work is a busy-wait on the tick count, as in the lesson 91 project: a segment ends once its time has passed and the task gets the CPU again."
        : "Work is CPU time: a task's job needs that many ticks of running. Each task is released at the start of its period, and its deadline is the next release.";
      table.innerHTML = "";
      const t = E("table");
      t.appendChild(E("tr", {}, ["task", "priority", sc.tasks[0].period ? "period (ms)" : "starts at (ms)", "work (ms)"].map(h => E("th", { text: h }))));
      sc.tasks.forEach((task, i) => {
        const n = (v, set, min) => { const x = E("input", { type: "number", min: min, value: v }); x.addEventListener("change", () => { set(Math.max(min, Math.round(+x.value || 0))); cursor = sc.T; build(); }); return x; };
        const work = E("span", {}, task.segs.map(([k, d], j) => E("span", {}, [k === "lock" && sc.lock !== "none" ? " holds the lock " : " runs ", n(d, v => { task.segs[j][1] = v; }, 1)])));
        t.appendChild(E("tr", {}, [E("td", { html: `<span class="chip" style="background:${COLORS[i]}"></span>${task.name}` }), E("td", {}, [n(task.prio, v => { task.prio = v; }, 1)]),
          E("td", {}, [task.period ? n(task.period, v => { task.period = v; }, 1) : n(task.at, v => { task.at = v; }, 0)]), E("td", {}, [work])]));
      });
      table.appendChild(t);
      if (sc.lock !== "none") {
        const sel = E("select", { "aria-label": "Lock" }, [["semaphore", "a binary semaphore (no owner, no inheritance)"], ["mutex", "a mutex (owner inherits the waiter's priority)"]].map(([v, x]) => E("option", { value: v, text: x })));
        sel.value = sc.lock; sel.addEventListener("change", () => { sc.lock = sel.value; sc.title = sc.lock === "mutex" ? PRESETS["pi-mutex"].title : PRESETS["pi-sem"].title; cursor = sc.T; build(); });
        table.appendChild(E("label", { style: "font-family:var(--sans);font-size:.85rem" }, ["The lock is ", sel]));
      }
      res = simulate(sc);
      range.max = sc.T;
      summary();
      draw();
    }

    function summary() {
      const ts = res.tasks;
      if (sc.lock !== "none") {
        const parts = ts.filter(t => t.waited.length).map(t => `<b>${t.name}</b> waited <b>${t.waited.join(", ")} ms</b> for the lock`);
        const bad = sc.lock === "semaphore";
        sum.className = "rt-sum" + (bad ? " bad" : "");
        sum.innerHTML = (parts.join("; ") || "No task waited for the lock") + ". " + (bad ? "That wait includes the whole of medium's run, a task that never touches the lock: priority inversion." : "The wait is bounded by low's own hold time: medium cannot run while low holds the lock at the inherited priority.");
      } else {
        const U = ts.reduce((s, t) => s + t.segs.reduce((a, g) => a + g[1], 0) / t.period, 0), n = ts.length, bound = n * (Math.pow(2, 1 / n) - 1);
        const misses = ts.reduce((s, t) => s + t.misses, 0);
        const rm = ts.every(a => ts.every(b => a.period >= b.period || a.prio > b.prio));
        sum.className = "rt-sum" + (misses ? " bad" : "");
        sum.innerHTML = `Utilisation U = ${ts.map(t => `${t.segs[0][1]}/${t.period}`).join(" + ")} = <b>${U.toFixed(3)}</b>; the bound for ${n} tasks is ${bound.toFixed(3)}. ` +
          (U <= bound && rm ? "U is under the bound and the priorities are rate-monotonic, so every deadline is met. " : U > 1 ? "U is above 1: the CPU has more work than time, so no priority order can save it. " : !rm ? "The priorities are not rate-monotonic: a long, rare task now delays a short, frequent one. " : "") +
          `Worst response: ${ts.map(t => `${t.name} ${t.responses.length ? Math.max(...t.responses) : "–"} ms (deadline ${t.period})`).join(", ")}. ` + (misses ? `<b>${misses} deadline${misses > 1 ? "s" : ""} missed.</b>` : "No deadline missed.");
      }
    }

    function draw() {
      range.value = cursor;
      const W = 760, L = 70, R = 10, rowH = 30, top = 14, n = res.tasks.length, H = top + n * rowH + 22;
      const X = t => L + t / sc.T * (W - L - R);
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const add = (tag, a, txt) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt !== undefined) e.textContent = txt; svg.appendChild(e); return e; };
      const step = sc.T <= 200 ? 10 : sc.T <= 400 ? 50 : 100;
      for (let t = 0; t <= sc.T; t += step) { add("line", { class: "grid", x1: X(t), x2: X(t), y1: top - 4, y2: top + n * rowH }); add("text", { class: "mut", x: X(t), y: H - 6, "text-anchor": "middle" }, String(t)); }
      res.tasks.forEach((task, k) => {
        const y = top + k * rowH;
        add("text", { x: 4, y: y + 19 }, task.name).setAttribute("font-weight", "600");
        let s = 0;
        const row = res.tl[k];
        for (let t = 1; t <= Math.min(cursor, sc.T); t++) {
          if (t < Math.min(cursor, sc.T) && row[t] === row[s]) continue;
          const st = row[s], x = X(s), w = X(t) - X(s);
          if (st === "run" || st === "inh") add("rect", { x, y: y + 5, width: w, height: rowH - 10, fill: COLORS[k], rx: 1 });
          if (st === "inh") add("rect", { class: "inh", x: x + 1, y: y + 6, width: Math.max(0, w - 2), height: rowH - 12 });
          if (st === "ready") add("rect", { class: "ready", x, y: y + 8, width: w, height: rowH - 16 });
          if (st === "blk") add("rect", { class: "blk", x, y: y + 8, width: w, height: rowH - 16 });
          s = t;
        }
        let h0 = null;
        for (let t = 0; t <= Math.min(cursor, sc.T); t++) {
          const on = t < Math.min(cursor, sc.T) && res.hold[k][t];
          if (on && h0 === null) h0 = t;
          if (!on && h0 !== null) { add("rect", { class: "hold", x: X(h0), y: y + rowH - 6, width: X(t) - X(h0), height: 3 }); h0 = null; }
        }
      });
      res.releases.forEach(([k, t]) => { if (t <= cursor) add("text", { x: X(t), y: top + k * rowH + 5, "text-anchor": "middle", fill: COLORS[k], "font-size": "9" }, "▲"); });
      res.missAt.forEach(([k, t]) => { if (t <= cursor) add("text", { class: "miss", x: X(t), y: top + k * rowH + 19, "text-anchor": "middle" }, "✗"); });
      if (cursor < sc.T) add("line", { class: "cur", x1: X(cursor), x2: X(cursor), y1: top - 6, y2: top + n * rowH + 2 });
      gantt.innerHTML = ""; gantt.appendChild(svg);

      const c = Math.min(cursor, sc.T - 1);
      const who = res.tasks.findIndex((_, k) => res.tl[k][c] === "run" || res.tl[k][c] === "inh");
      const desc = res.tasks.map((t, k) => ({ k, s: res.tl[k][c] })).filter(o => o.s && o.k !== who).map(o => `${res.tasks[o.k].name} is ${o.s === "blk" ? "blocked on the lock" : "ready but outranked"}`);
      now.innerHTML = `<b>t = ${cursor} ms.</b> ` + (who < 0 ? "No task is ready: the idle task runs." : `<b>${res.tasks[who].name}</b> runs` + (res.tl[who][c] === "inh" ? ` at an inherited priority, above its own ${res.tasks[who].prio}` : ` (priority ${res.tasks[who].prio})`) + ".") + (desc.length ? " " + desc.join("; ") + "." : "");
      log.innerHTML = res.events.map(e => `<div class="${e.t > cursor ? "future" : ""}">t=${String(e.t).padEnd(4)} ${(e.task >= 0 ? res.tasks[e.task].name : "").padEnd(7)} ${e.text}</div>`).join("");
    }
    build();
  }
  window.RtosSim = { simulate, PRESETS };
  function init() {
    if (!document.getElementById("rtossim-css")) { const s = document.createElement("style"); s.id = "rtossim-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.rtossim").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
