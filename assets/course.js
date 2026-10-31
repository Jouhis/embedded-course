/* Embedded Systems course: shared behaviour.
 *
 * 1. Quizzes. Declare a quiz in a lesson like this:
 *
 *    <div class="widget quiz" data-title="Check your understanding">
 *      <script type="application/json">
 *      { "questions": [
 *        { "type": "mc", "prompt": "HTML allowed", "options": ["A", "B", "C"], "answer": 1, "why": "..." },
 *        { "type": "number", "prompt": "...", "answer": 330, "tolerance": 0.05, "unit": "Ω", "why": "..." },
 *        { "type": "text", "prompt": "...", "accept": ["0x1F", "31"], "why": "..." }
 *      ] }
 *      </script>
 *    </div>
 *
 *    - "mc": options are shuffled on every load, so the position never gives the answer away.
 *      "answer" is the index of the correct option in the authored list.
 *    - "number": "tolerance" is relative (0.05 = ±5 %). Accepts SI prefixes: 4k7, 4.7k, 10m, 2u.
 *      Also accepts hex (0x..) and binary (0b..).
 *    - "text": compared case-insensitively with whitespace removed.
 *
 * 2. Progress. Each lesson's <body> has data-lesson="0007". A "Mark complete" bar is
 *    added automatically; progress lives in localStorage and the course index reads it.
 *    The index adds an overall bar plus Export / Import / Reset (a JSON file), and refreshes
 *    when shown again from the back/forward cache. Serve over http (tools/serve.py) so every
 *    page shares one storage origin; some browsers isolate each file:// page.
 */
(function () {
  "use strict";

  const STORE_KEY = "embedded-course-progress";

  // ---------- Carrying progress along links (for pages opened as files) ----------
  // Firefox gives every file:// page its own localStorage, so a lesson's "done" is invisible to
  // index.html. When the course is opened as files, every click on a course link appends
  // "#progress=<state>" and every page merges that state into its own store on load. Each record
  // has an updatedAt time, so the newest decision (done or not done) wins.

  const HASH_KEY = "progress=";

  function encodeProgress(p) {
    return Object.entries(p)
      .filter(([, r]) => r && (r.done || r.updatedAt))
      .map(([id, r]) => `${id}.${r.done ? 1 : 0}.${Math.floor((r.updatedAt || 0) / 1000).toString(36)}`)
      .join(",");
  }
  function decodeProgress(text) {
    const out = {};
    decodeURIComponent(text).split(",").forEach(part => {
      const [id, done, t] = part.split(".");
      if (!id || !/^[\w-]+$/.test(id)) return;
      out[id] = { done: done === "1", updatedAt: (parseInt(t || "0", 36) || 0) * 1000 };
    });
    return out;
  }
  /* Newest record wins; on a tie, done wins. Keeps other fields (completedAt, quiz scores). */
  function mergeByTime(local, incoming) {
    const out = Object.assign({}, local);
    Object.entries(incoming).forEach(([id, rec]) => {
      const cur = out[id] || {};
      const curT = cur.updatedAt || (cur.done ? 1 : 0);
      const newT = rec.updatedAt || (rec.done ? 1 : 0);
      if (newT > curT || (newT === curT && rec.done && !cur.done)) {
        out[id] = Object.assign({}, cur, { done: rec.done, updatedAt: rec.updatedAt,
          completedAt: rec.done ? (cur.completedAt || new Date(rec.updatedAt || Date.now()).toISOString()) : null });
      }
    });
    return out;
  }
  function absorbProgressFromUrl() {
    const h = location.hash || "";
    const i = h.indexOf(HASH_KEY);
    if (i < 0) return;
    try { saveProgress(mergeByTime(loadProgress(), decodeProgress(h.slice(i + HASH_KEY.length)))); }
    catch (e) { /* malformed: ignore */ }
    // Tidy the address bar (keep any real anchor that came before the progress part).
    const rest = h.slice(0, i).replace(/[#&]$/, "");
    history.replaceState(null, "", location.pathname + location.search + rest);
  }
  function carryProgressOnLinks() {
    if (location.protocol !== "file:") return;     // over http all pages already share storage
    document.addEventListener("click", e => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!/^[^:?#]+\.html(#.*)?$/.test(href)) return;   // only relative links to course pages
      const state = encodeProgress(loadProgress());
      if (!state) return;
      const [base, anchor] = href.split("#");
      a.href = base + "#" + (anchor ? anchor + "&" : "") + HASH_KEY + encodeURIComponent(state);
    }, true);
  }
  absorbProgressFromUrl();
  carryProgressOnLinks();

  // ---------- Progress storage ----------

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) { /* storage disabled */ }
  }
  function updateLesson(id, patch) {
    const p = loadProgress();
    p[id] = Object.assign({}, p[id], patch, "done" in patch ? { updatedAt: Date.now() } : {});
    saveProgress(p);
    return p[id];
  }

  // ---------- Helpers ----------

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "text") node.textContent = v;
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v);
      }
    }
    (children || []).forEach(c => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const SI = { p: 1e-12, n: 1e-9, u: 1e-6, "µ": 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

  /* Parse "330", "4.7k", "4k7", "10 mA", "0x1F", "0b1010" into a number (NaN if invalid). */
  function parseNumber(raw) {
    let s = String(raw).trim().replace(/,/g, ".").replace(/\s+/g, "");
    if (/^-?0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
    if (/^-?0b[01]+$/i.test(s)) return parseInt(s.replace(/0b/i, ""), 2) * (s.startsWith("-") ? -1 : 1);
    s = s.replace(/(Ω|ohm|ohms|V|A|W|F|H|Hz|s)$/i, "");          // strip a trailing unit
    let m = s.match(/^(-?\d+)([pnuµmkKMG])(\d+)$/);               // 4k7 style
    if (m) return parseFloat(m[1] + "." + m[3]) * SI[m[2]];
    m = s.match(/^(-?\d*\.?\d+(?:e-?\d+)?)([pnuµmkKMG])?$/);
    if (!m) return NaN;
    return parseFloat(m[1]) * (m[2] ? SI[m[2]] : 1);
  }

  // ---------- Quiz rendering ----------

  function renderQuiz(container, index) {
    const script = container.querySelector('script[type="application/json"]');
    if (!script) return;
    let spec;
    try { spec = JSON.parse(script.textContent); }
    catch (e) {
      container.appendChild(el("p", { class: "q-feedback show bad", text: "Quiz data is invalid JSON: " + e.message }));
      return;
    }

    const title = container.dataset.title || "Check your understanding";
    container.appendChild(el("h3", { text: title }));

    const results = new Array(spec.questions.length).fill(null);
    const scoreLine = el("div", { class: "quiz-score" });

    function record(qi, ok) {
      if (results[qi] !== null) return;          // only the first attempt counts
      results[qi] = ok;
      const answered = results.filter(r => r !== null).length;
      const right = results.filter(r => r === true).length;
      scoreLine.textContent = `Score: ${right} / ${answered} answered (${spec.questions.length} total)`;
      if (answered === spec.questions.length) {
        const lessonId = document.body.dataset.lesson;
        if (lessonId) {
          const key = "quiz" + index;
          const prev = (loadProgress()[lessonId] || {}).quizzes || {};
          prev[key] = { right, total: spec.questions.length };
          updateLesson(lessonId, { quizzes: prev });
        }
      }
    }

    spec.questions.forEach((q, qi) => {
      const block = el("div", { class: "q" });
      block.appendChild(el("div", { class: "q-prompt", html: `${qi + 1}. ${q.prompt}` }));
      const feedback = el("div", { class: "q-feedback" });

      function showFeedback(ok, extra) {
        feedback.className = "q-feedback show " + (ok ? "good" : "bad");
        feedback.innerHTML = (ok ? "Correct." : "Not quite.") + (extra ? " " + extra : "") +
          (q.why ? `<span class="why">${q.why}</span>` : "");
      }

      if (q.type === "mc") {
        const opts = el("div", { class: "q-options" });
        const order = shuffle(q.options.map((text, i) => ({ text, i })));
        order.forEach(o => {
          const b = el("button", { class: "q-option", type: "button", html: o.text });
          b.addEventListener("click", () => {
            const ok = o.i === q.answer;
            opts.querySelectorAll("button").forEach(x => { x.disabled = true; });
            b.classList.add(ok ? "correct" : "wrong");
            if (!ok) {
              const correctBtn = [...opts.children][order.findIndex(x => x.i === q.answer)];
              correctBtn.classList.add("correct");
            }
            showFeedback(ok);
            record(qi, ok);
          });
          opts.appendChild(b);
        });
        block.appendChild(opts);
      } else {
        const input = el("input", { type: "text", autocomplete: "off", spellcheck: "false",
          placeholder: q.type === "number" ? "e.g. 4.7k or 0x1F" : "your answer" });
        const check = el("button", { class: "btn", type: "button", text: "Check" });
        const reveal = el("button", { class: "btn secondary", type: "button", text: "Show answer" });
        const row = el("div", { class: "q-input-row" }, [input]);
        if (q.unit) row.appendChild(el("span", { text: q.unit }));
        row.appendChild(check);
        row.appendChild(reveal);

        const evaluate = () => {
          if (input.value.trim() === "") return;
          let ok;
          if (q.type === "number") {
            const v = parseNumber(input.value);
            const tol = q.tolerance === undefined ? 0.02 : q.tolerance;
            ok = !isNaN(v) && Math.abs(v - q.answer) <= Math.abs(q.answer) * tol + 1e-12;
          } else {
            const norm = s => String(s).toLowerCase().replace(/\s+/g, "");
            ok = q.accept.map(norm).includes(norm(input.value));
          }
          showFeedback(ok, ok ? "" : "Try again, or reveal the answer.");
          record(qi, ok);
        };
        check.addEventListener("click", evaluate);
        input.addEventListener("keydown", e => { if (e.key === "Enter") evaluate(); });
        reveal.addEventListener("click", () => {
          const ans = q.type === "number" ? `${q.answer}${q.unit ? " " + q.unit : ""}` : q.accept[0];
          record(qi, false);
          feedback.className = "q-feedback show bad";
          feedback.innerHTML = `Answer: <code>${ans}</code>` + (q.why ? `<span class="why">${q.why}</span>` : "");
        });
        block.appendChild(row);
      }
      block.appendChild(feedback);
      container.appendChild(block);
    });
    container.appendChild(scoreLine);
  }

  // ---------- "Mark complete" bar ----------

  function renderCompleteBar() {
    const id = document.body.dataset.lesson;
    if (!id) return;
    const main = document.querySelector("main");
    if (!main) return;
    const bar = el("div", { class: "complete-bar" });
    const status = el("span");
    const btn = el("button", { class: "btn", type: "button" });

    function refresh() {
      const done = !!(loadProgress()[id] || {}).done;
      status.className = done ? "done" : "";
      status.textContent = done ? "Lesson complete ✓" : "Finished the lesson and its quiz?";
      btn.textContent = done ? "Mark as not complete" : "Mark lesson complete";
      btn.className = done ? "btn secondary" : "btn";
    }
    btn.addEventListener("click", () => {
      const done = !!(loadProgress()[id] || {}).done;
      updateLesson(id, { done: !done, completedAt: done ? null : new Date().toISOString() });
      refresh();
    });
    refresh();
    bar._refresh = refresh;
    bar.appendChild(status);
    bar.appendChild(btn);
    const pager = main.querySelector(".pager");
    main.insertBefore(bar, pager || null);
  }

  // ---------- Course index: show which lessons are done ----------

  function renderIndexProgress() {
    const p = loadProgress();
    document.querySelectorAll("[data-lesson-link]").forEach(li => {
      li.classList.toggle("done", !!(p[li.dataset.lessonLink] || {}).done);
    });
    document.querySelectorAll(".part").forEach(part => {
      const items = part.querySelectorAll("[data-lesson-link]");
      const done = part.querySelectorAll("[data-lesson-link].done").length;
      const label = part.querySelector(".progress");
      if (label && items.length) label.textContent = `${done} / ${items.length} done`;
    });
    const overall = document.getElementById("overall-progress");
    if (overall) {
      const all = document.querySelectorAll("[data-lesson-link]").length;
      const done = document.querySelectorAll("[data-lesson-link].done").length;
      overall.querySelector(".count").textContent = `${done} / ${all} complete`;
      overall.querySelector(".bar-fill").style.width = all ? `${(100 * done / all).toFixed(1)}%` : "0";
    }
  }

  // ---------- Saving progress: export / import / reset on the course index ----------

  function downloadJson(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  /* Merge two progress maps: a lesson is done if either says so; keep the earliest completion date. */
  function mergeProgress(a, b) {
    const out = Object.assign({}, a);
    Object.entries(b || {}).forEach(([id, rec]) => {
      const cur = out[id] || {};
      const done = !!(cur.done || (rec && rec.done));
      const dates = [cur.completedAt, rec && rec.completedAt].filter(Boolean).sort();
      out[id] = Object.assign({}, cur, rec, { done, completedAt: done ? (dates[0] || null) : null });
    });
    return out;
  }

  function renderProgressTools() {
    const root = document.getElementById("course-index");
    if (!root) return;
    const box = el("div", { class: "progress-tools" });
    const overall = el("div", { id: "overall-progress" }, [
      el("span", { class: "count" }),
      el("div", { class: "bar" }, [el("div", { class: "bar-fill" })]),
    ]);
    const exportBtn = el("button", { class: "btn secondary", type: "button", text: "Export progress" });
    const importBtn = el("button", { class: "btn secondary", type: "button", text: "Import progress" });
    const resetBtn = el("button", { class: "btn secondary", type: "button", text: "Reset" });
    const file = el("input", { type: "file", accept: "application/json,.json", hidden: "" });
    const msg = el("span", { class: "tools-msg" });

    exportBtn.addEventListener("click", () => {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`embedded-course-progress-${stamp}.json`,
                   { format: "embedded-course-progress", version: 1, exportedAt: new Date().toISOString(), progress: loadProgress() });
      msg.textContent = "Saved a progress file to your downloads.";
    });
    importBtn.addEventListener("click", () => file.click());
    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      if (!f) return;
      f.text().then(text => {
        const data = JSON.parse(text);
        const incoming = data && data.format === "embedded-course-progress" ? data.progress : data;
        if (!incoming || typeof incoming !== "object") throw new Error("not a progress file");
        saveProgress(mergeProgress(loadProgress(), incoming));
        renderIndexProgress();
        msg.textContent = `Imported ${f.name}.`;
      }).catch(e => { msg.textContent = `Could not import: ${e.message}`; })
        .finally(() => { file.value = ""; });
    });
    resetBtn.addEventListener("click", () => {
      if (!window.confirm("Clear all saved progress in this browser? Export first if you want a backup.")) return;
      saveProgress({});
      renderIndexProgress();
      msg.textContent = "Progress cleared.";
    });

    box.appendChild(overall);
    box.appendChild(el("div", { class: "tools-row" }, [exportBtn, importBtn, resetBtn, file, msg]));
    if (location.protocol === "file:") {
      box.appendChild(el("p", { class: "storage-warning" }, [
        "You opened the course as a file. Firefox keeps a separate store for every file, so progress travels " +
        "between pages through the course's own links (← Course index, next, previous). The browser's Back button " +
        "cannot carry it. For fully reliable progress, double-click ",
        el("code", { text: "Open course.cmd" }),
        " in the course folder (or run ",
        el("code", { text: "python tools/serve.py" }),
        "). Export and Import work either way.",
      ]));
    }
    root.parentNode.insertBefore(box, root);
  }

  /* Pages restored from the back/forward cache do not re-run DOMContentLoaded: refresh the
   * progress whenever the page is shown again or regains focus, or another tab changes it. */
  function refreshProgressViews() {
    renderIndexProgress();
    const bar = document.querySelector(".complete-bar");
    if (bar && bar._refresh) bar._refresh();
  }
  window.addEventListener("pageshow", e => { if (e.persisted) refreshProgressViews(); });
  window.addEventListener("storage", e => { if (e.key === STORE_KEY) refreshProgressViews(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshProgressViews(); });

  // ---------- Navigation from the manifest (assets/manifest.js) ----------

  function flatItems() {
    const m = window.COURSE_MANIFEST;
    if (!m) return [];
    return m.parts.flatMap(p => p.items.map(i => Object.assign({ part: p }, i)));
  }

  /* Top bar and prev/next pager for a lesson page (body[data-lesson]). */
  function renderLessonNav() {
    const id = document.body.dataset.lesson;
    const main = document.querySelector("main");
    if (!id || !main) return;
    const items = flatItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const item = items[idx];

    const nav = el("nav", { class: "course-nav" }, [
      el("a", { href: "../index.html", text: "← Course index" }),
      el("span", { text: `Part ${item.part.number}: ${item.part.title}` }),
    ]);
    document.body.insertBefore(nav, document.body.firstChild);

    const meta = main.querySelector(".lesson-meta");
    if (meta && !meta.textContent.trim()) {
      const label = item.kind === "lesson" ? `Lesson ${item.number}` : item.kind === "lab" ? "Lab" : "Checkpoint";
      meta.textContent = [label, item.section, item.conceptOnly ? "concept lesson" : "", item.optional ? "optional" : ""]
        .filter(Boolean).join(" · ");
    }

    // Prev/next skip lessons that are not written yet.
    const prev = items.slice(0, idx).reverse().find(i => i.published);
    const next = items.slice(idx + 1).find(i => i.published);
    if (!main.querySelector(".pager")) {
      const pager = el("div", { class: "pager" }, [
        prev ? el("a", { href: prev.file, text: `← ${prev.title}` }) : el("span"),
        next ? el("a", { href: next.file, text: `${next.title} →` }) : el("span"),
      ]);
      main.appendChild(pager);
    }
  }

  /* Course index (element #course-index): one list per part, built from the manifest. */
  function renderCourseIndex() {
    const root = document.getElementById("course-index");
    const m = window.COURSE_MANIFEST;
    if (!root || !m) return;
    m.parts.forEach(p => {
      const section = el("section", { class: "part" });
      section.appendChild(el("h2", {}, [
        el("span", { text: `Part ${p.number}: ${p.title}` }),
        el("span", { class: "progress" }),
      ]));
      const list = el("ul", { class: "lesson-list" });
      let lastSection = null;
      p.items.forEach(i => {
        if (i.section && i.section !== lastSection) {
          list.appendChild(el("li", { class: "pending" }, [el("strong", { text: i.section })]));
          lastSection = i.section;
        }
        const num = i.kind === "lesson" ? String(i.number) : i.kind === "lab" ? "🔧" : "📝";
        const tags = [i.conceptOnly ? "concept" : "", i.optional ? "optional" : "", i.published ? "" : "coming"]
          .filter(Boolean).join(" · ");
        const li = el("li", { "data-lesson-link": i.id, class: i.published ? "" : "pending" }, [
          el("span", { class: "num", text: num }),
          i.published ? el("a", { href: "lessons/" + i.file, text: i.title }) : el("span", { text: i.title }),
          el("span", { class: "tag", text: tags }),
        ]);
        list.appendChild(li);
      });
      section.appendChild(list);
      root.appendChild(section);
    });
  }

  // ---------- Falstad CircuitJS links ----------
  /* <pre class="circuitjs" data-title="Voltage divider">$ 1 5.0E-6 ...netlist...</pre>
     gets an "Open in CircuitJS" button that loads the netlist via ?cct=. Built-in examples
     need no helper: link to https://www.falstad.com/circuit/circuitjs.html?startCircuit=ohms.txt */
  const CIRCUITJS = "https://www.falstad.com/circuit/circuitjs.html";
  function renderCircuitLinks() {
    document.querySelectorAll("pre.circuitjs").forEach(pre => {
      const netlist = pre.textContent.trim() + "\n";
      const url = CIRCUITJS + "?cct=" + encodeURIComponent(netlist);
      const title = pre.dataset.title || "circuit";
      const box = el("div", { class: "widget" }, [
        el("h3", { text: `Circuit: ${title}` }),
        el("a", { class: "btn", href: url, target: "_blank", rel: "noopener", text: "Open in CircuitJS ↗" }),
        el("details", {}, [el("summary", { text: "Netlist (File → Import From Text in CircuitJS)" })]),
      ]);
      pre.parentNode.insertBefore(box, pre);
      box.querySelector("details").appendChild(pre);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderCircuitLinks();
    renderCourseIndex();
    renderProgressTools();
    renderLessonNav();
    document.querySelectorAll(".quiz").forEach(renderQuiz);
    renderCompleteBar();
    renderIndexProgress();
  });

  // Exposed for other components (calculators, drills).
  window.Course = { parseNumber, el, shuffle, loadProgress, updateLesson };
})();
