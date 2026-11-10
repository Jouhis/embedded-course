/* Embedded Systems course: shared behaviour.
 *
 * 1. Quizzes. Declare a quiz in a lesson like this:
 *
 *    <div class="widget quiz" data-title="Check your understanding">
 *      <script type="application/json">
 *      { "questions": [
 *        { "type": "mc", "prompt": "HTML allowed", "options": ["A", "B", "C"], "answer": 1, "why": "..." },
 *        { "type": "number", "prompt": "...", "answer": 330, "tolerance": 0.05, "unit": "Ω", "why": "..." },
 *        { "type": "text", "prompt": "...", "accept": ["0x1F", "31"], "why": "..." },
 *        { "type": "formula", "prompt": "...", "vars": ["I", "R"], "answer": "I^2*R", "why": "..." }
 *      ] }
 *      </script>
 *    </div>
 *
 *    - "mc": options are shuffled on every load, so the position never gives the answer away.
 *      "answer" is the index of the correct option in the authored list.
 *    - "number": "tolerance" is relative (0.05 = ±5 %). Accepts SI prefixes: 4k7, 4.7k, 10m, 2u.
 *      Also accepts hex (0x..) and binary (0b..).
 *    - "text": "accept" lists exact answers; case, articles, spaces, hyphens and quotes are ignored.
 *      Optional "contains": the answer passes if it contains any of these (also normalised).
 *    - "formula": { "vars": ["I", "R"], "answer": "I^2*R", "display": "P = I² × R" }. Any algebraically
 *      equivalent input passes (RI^2, I²R, I*I*R, "P = I^2 R"). Optional "range": [lo, hi] for samples.
 *    - "reflect": think-then-reveal, not scored. "answer" is the model answer (HTML).
 *    - A quiz with two or more questions is shown as cards, one question at a time, with dots
 *      that turn green or red as they are answered. Printing shows every question.
 *    - Any type: optional "hint" (shown on request, and after a wrong attempt). "mc" also takes
 *      "feedback": one string per option, shown when that option is picked.
 *    - "formula", "number" and "text" take "wrong": [{ "answer": "V*I", "feedback": "That is a power." }].
 *      When the learner's answer matches a listed mistake, its feedback explains what went wrong.
 *
 * 1.1 Lesson boxes and folds (styles in course.css):
 *    <div class="analogy"><p>...</p></div>   "Picture it": an everyday comparison, and where it breaks
 *    <div class="example"><p>...</p></div>   "In a real device": the idea inside a concrete product
 *    <details class="fold depth"><summary><h2>Heading</h2></summary> ... </details>
 *      a "Go deeper" section, folded on the first read. Links into it open it; printing opens all.
 *
 * 2. Progress. Each lesson's <body> has data-lesson="0007". A "Mark complete" bar is
 *    added automatically; progress lives in localStorage and the course index reads it.
 *    The index adds an overall bar plus Export / Import / Reset (a JSON file), and refreshes
 *    when shown again from the back/forward cache.
 *
 * 3. Search. The search box is assets/search.js, loaded by loadSearch() below.
 *
 * 4. Code. Tag every block with its language: <pre><code class="language-c">. Languages: c,
 *    armasm, bash, powershell, cmake, dts, ini, rust, markdown, yaml, ld (linker script), kconfig,
 *    and plaintext for logs, tool output and worked arithmetic (not coloured). Write the code as
 *    plain escaped text; highlight.js adds the colours when the page loads. Every code block
 *    also gets a Copy button.
 */
(function () {
  "use strict";

  // iPhone and iPad: Safari zooms into a text field when it gets focus. maximum-scale=1 stops that,
  // and on iOS 10 and later pinch zoom still works because Safari ignores the limit for gestures.
  // Other systems would block pinch zoom with it, so it is set on iOS only. (iPadOS reports a Mac
  // with a touch screen.)
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp && !/maximum-scale/.test(vp.content)) vp.content += ", maximum-scale=1";
  }

  const STORE_KEY = "embedded-course-progress";
  const SELF = document.currentScript;   // to find assets/search.js next to this file

  // ---------- External links open in a new tab ----------
  // Links that leave the course site (datasheets, Wokwi, GitHub) open in a new tab, so the
  // lesson stays open. Applied on click, so links that scripts add later are covered too.
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target || !/^https?:$/.test(a.protocol) || a.host === location.host) return;
    a.target = "_blank";
    a.rel = "noopener";
  }, true);

  // ---------- Progress storage ----------

  // Version 0.0.3 split lessons 88, 91, 110, 111 and 113 and renumbered everything after 87.
  // Progress saved under the old numbers moves to the new ones once; a split lesson's "done"
  // carries to every part (its quiz scores stay with the first part).
  // Numbering "2" is that split. Numbering "3" then removed the portfolio and interview lessons
  // (120 and 121 under numbering 2) and moved "Next steps" from 122 to 120.
  // Numbering "4" (version 0.0.10) added lesson 105 (storing data in flash), so 105 to 120 moved up one.
  const NUMBERING_KEY = "embedded-course-numbering";
  const NUMBERING_NOW = "4";
  const RENUMBER_TO_2 = (() => {
    const map = { 88: [88, 89], 89: [90], 90: [91], 91: [92, 93], 110: [112, 113], 111: [114, 115],
                  112: [116], 113: [117, 118, 119], 114: [120], 115: [121], 116: [122] };
    for (let n = 92; n <= 109; n++) map[n] = [n + 2];
    return map;
  })();
  const RENUMBER_TO_3 = { 120: [], 121: [], 122: [120] };   // [] drops the lesson's progress
  const RENUMBER_TO_4 = (() => {
    const map = {};
    for (let n = 120; n >= 105; n--) map[n] = [n + 1];
    return map;
  })();
  // Moves progress saved under numbering `was` (null: before numbering 2) to the current one.
  function migrateFrom(p, was) {
    if (was === NUMBERING_NOW) return p;
    if (was !== "2" && was !== "3") p = migrateNumbering(p, RENUMBER_TO_2);
    if (was !== "3") p = migrateNumbering(p, RENUMBER_TO_3);
    return migrateNumbering(p, RENUMBER_TO_4);
  }
  function migrateNumbering(p, map) {
    const out = {};
    for (const [id, rec] of Object.entries(p)) {
      const n = /^\d{4}$/.test(id) ? parseInt(id, 10) : NaN;
      const targets = map[n];
      if (!targets) { if (!(id in out)) out[id] = rec; continue; }
      targets.forEach((t, i) => {
        const key = String(t).padStart(4, "0");
        out[key] = i === 0 ? rec : { done: rec.done, updatedAt: rec.updatedAt };
      });
    }
    return out;
  }

  function loadProgress() {
    let p;
    try { p = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
    try {
      const was = localStorage.getItem(NUMBERING_KEY);
      if (was !== NUMBERING_NOW) {
        if (Object.keys(p).length) {
          p = migrateFrom(p, was);
          saveProgress(p);
        }
        localStorage.setItem(NUMBERING_KEY, NUMBERING_NOW);
      }
    } catch (e) { /* storage disabled */ }
    return p;
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
    let m = s.match(/^(-?\d+)([pnuµmkKMGR])(\d+)$/);              // 4k7 style (4R7 = 4.7 ohms)
    if (m) return parseFloat(m[1] + "." + m[3]) * (m[2] === "R" ? 1 : SI[m[2]]);
    s = s.replace(/^(-?\d*\.?\d+)R$/, "$1");                         // 330R = 330 ohms
    m = s.match(/^(-?\d*\.?\d+(?:e-?\d+)?)([pnuµmkKMG])?$/);
    if (!m) return NaN;
    return parseFloat(m[1]) * (m[2] ? SI[m[2]] : 1);
  }

  /* Free-text answers: case, surrounding articles, spaces, hyphens, underscores, quotes and a
   * trailing full stop don't matter ("The pull-up" = "pullup"). */
  function normText(s) {
    return String(s).normalize("NFKC").toLowerCase().trim()
      .replace(/^(the|a|an)\s+/, "")
      .replace(/[.!?;:]+$/, "")
      .replace(/[\s\-_`'"“”‘’]/g, "");
  }

  // ---------- Formula answers ----------
  /* A formula answer is accepted when it is algebraically equivalent to the reference: both are
   * evaluated at several sample points. So "I^2*R", "RI^2", "I²R", "I*I*R" and "P = I² × R" all pass.
   * Implicit multiplication works ("2RC", "I(R1+R2)"); variable names come from q.vars, so "R1R2"
   * reads as R1*R2. Functions: sqrt, abs, ln, log (base 10), log2, exp, sin, cos, tan; constant pi. */
  const FUNCS = { sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log10: Math.log10, log2: Math.log2,
                  log: Math.log10, exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan };
  const FUNC_NAMES = Object.keys(FUNCS).sort((a, b) => b.length - a.length);
  const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";

  function normFormula(s) {
    return String(s)
      .replace(/[₀-₉]/g, d => String(SUBSCRIPTS.indexOf(d)))
      .replace(/[×·∙⋅]/g, "*").replace(/÷/g, "/").replace(/[−–—]/g, "-")
      .replace(/\*\*/g, "^").replace(/²/g, "^2").replace(/³/g, "^3")
      .replace(/√/g, "sqrt").replace(/π/g, "pi").replace(/,/g, ".")
      .replace(/[\s_]+/g, "");
  }

  function tokenizeFormula(s, vars) {
    const names = vars.map(v => ({ key: v.replace(/_/g, ""), name: v }))
                      .sort((a, b) => b.key.length - a.key.length);
    const lower = s.toLowerCase();
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      const num = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
      if (num) { out.push({ t: "num", v: parseFloat(num[0]) }); i += num[0].length; continue; }
      if ("+-*/^()".includes(c)) { out.push({ t: c }); i++; continue; }
      let hit = null;
      for (const f of FUNC_NAMES) {
        if (lower.startsWith(f, i) && s[i + f.length] === "(") { hit = { t: "fn", v: f, len: f.length }; break; }
      }
      if (!hit) for (const n of names) if (s.startsWith(n.key, i)) { hit = { t: "var", v: n.name, len: n.key.length }; break; }
      if (!hit && lower.startsWith("pi", i)) hit = { t: "num", v: Math.PI, len: 2 };
      if (!hit) for (const n of names) {
        if (lower.startsWith(n.key.toLowerCase(), i)) { hit = { t: "var", v: n.name, len: n.key.length }; break; }
      }
      if (!hit) return null;
      out.push(hit);
      i += hit.len;
    }
    // Implicit multiplication: "2RC", "I(R1+R2)", "(a+b)(c+d)", "2sqrt(x)".
    const full = [];
    out.forEach((tok, k) => {
      const prev = full[full.length - 1];
      if (k && prev && (prev.t === "num" || prev.t === "var" || prev.t === ")") &&
          (tok.t === "num" || tok.t === "var" || tok.t === "(" || tok.t === "fn")) full.push({ t: "*" });
      full.push(tok);
    });
    return full;
  }

  /* Recursive-descent parser: returns a function env -> number, or null if the text doesn't parse. */
  function compileFormula(text, vars) {
    const toks = tokenizeFormula(normFormula(text), vars || []);
    if (!toks || !toks.length) return null;
    let p = 0;
    const peek = () => toks[p] && toks[p].t;
    function expr() {
      let f = term();
      while (f && (peek() === "+" || peek() === "-")) {
        const op = toks[p++].t, a = f, b = term();
        if (!b) return null;
        f = op === "+" ? e => a(e) + b(e) : e => a(e) - b(e);
      }
      return f;
    }
    function term() {
      let f = unary();
      while (f && (peek() === "*" || peek() === "/")) {
        const op = toks[p++].t, a = f, b = unary();
        if (!b) return null;
        f = op === "*" ? e => a(e) * b(e) : e => a(e) / b(e);
      }
      return f;
    }
    function unary() {
      if (peek() === "-") { p++; const a = unary(); return a && (e => -a(e)); }
      if (peek() === "+") { p++; return unary(); }
      return power();
    }
    function power() {
      const a = primary();
      if (a && peek() === "^") { p++; const b = unary(); return b && (e => Math.pow(a(e), b(e))); }
      return a;
    }
    function primary() {
      const tok = toks[p++];
      if (!tok) return null;
      if (tok.t === "num") return () => tok.v;
      if (tok.t === "var") return e => e[tok.v];
      if (tok.t === "(") { const a = expr(); if (!a || peek() !== ")") return null; p++; return a; }
      if (tok.t === "fn" && peek() === "(") {
        p++;
        const a = expr();
        if (!a || peek() !== ")") return null;
        p++;
        const fn = FUNCS[tok.v];
        return e => fn(a(e));
      }
      return null;
    }
    const f = expr();
    return f && p === toks.length ? f : null;
  }

  /* Same value at 8 sample points (variables drawn from q.range, default 0.5..4)? */
  function sameFormula(f, g, vars, range) {
    const lo = range ? range[0] : 0.5, hi = range ? range[1] : 4;
    let seed = 12345, compared = 0;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let k = 0; k < 8; k++) {
      const env = {};
      vars.forEach(v => { env[v] = lo + (hi - lo) * rand(); });
      const a = f(env), b = g(env);
      if (!isFinite(a) && !isFinite(b)) continue;
      if (!isFinite(a) || !isFinite(b)) return false;
      if (Math.abs(a - b) > 1e-9 + 1e-6 * Math.max(Math.abs(a), Math.abs(b))) return false;
      compared++;
    }
    return compared >= 3;
  }

  /* Accept "P = I^2 R" as well as "I^2 R": any side of an equation that matches counts. */
  function formulaMatches(input, q) {
    const vars = q.vars || [];
    const ref = compileFormula(q.answer, vars);
    if (!ref) return false;
    return normFormula(input).split("=").filter(Boolean)
      .some(side => { const f = compileFormula(side, vars); return f && sameFormula(f, ref, vars, q.range); });
  }

  window.CourseQuizEngine = { parseNumber, normText, compileFormula, formulaMatches };

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

    // "reflect" questions are think-then-reveal prompts: they are not scored.
    const results = spec.questions.map(q => (q.type === "reflect" ? "skip" : null));
    const scored = results.filter(r => r !== "skip").length;
    const scoreLine = el("div", { class: "quiz-score" });

    // Two or more questions are shown as cards, one at a time (printing shows them all).
    const cards = spec.questions.length > 1 ? [] : null;
    let dots = null, showCard = null;

    function record(qi, ok) {
      if (cards) markDot(qi, ok);
      if (results[qi] !== null) return;          // only the first attempt counts
      results[qi] = ok;
      const answered = results.filter(r => r === true || r === false).length;
      const right = results.filter(r => r === true).length;
      scoreLine.textContent = `Score: ${right} / ${answered} answered (${scored} total)`;
      if (answered === scored) {
        const lessonId = document.body.dataset.lesson;
        if (lessonId) {
          const key = "quiz" + index;
          const prev = (loadProgress()[lessonId] || {}).quizzes || {};
          prev[key] = { right, total: scored };
          updateLesson(lessonId, { quizzes: prev });
        }
      }
    }

    spec.questions.forEach((q, qi) => {
      const block = el("div", { class: "q" + (q.type === "reflect" ? " reflect" : "") });
      block.appendChild(el("div", { class: "q-prompt", html: `${qi + 1}. ${q.prompt}` }));
      const feedback = el("div", { class: "q-feedback" });
      const why = () => (q.why ? `<span class="why">${q.why}</span>` : "");

      // Optional hint: a button before answering, and shown automatically after a wrong attempt.
      let hintBox = null;
      const showHint = () => { if (hintBox) hintBox.classList.add("show"); };
      const hintButton = () => {
        const b = el("button", { class: "btn secondary", type: "button", text: "Hint" });
        b.addEventListener("click", () => { showHint(); b.disabled = true; });
        return b;
      };
      if (q.hint) hintBox = el("div", { class: "q-hint", html: "Hint: " + q.hint });

      function showFeedback(ok, extra) {
        feedback.className = "q-feedback show " + (ok ? "good" : "bad");
        feedback.innerHTML = (ok ? "Correct." : "Not quite.") + (extra ? " " + extra : "") + why();
      }

      if (q.type === "reflect") {
        // Think first, then compare with a model answer.
        const reveal = el("button", { class: "btn secondary", type: "button", text: "Show model answer" });
        reveal.addEventListener("click", () => {
          feedback.className = "q-feedback show good";
          feedback.innerHTML = `<strong>Model answer:</strong> ${q.answer}` + why();
          reveal.disabled = true;
          record(qi, "skip");                    // not scored; marks the card as seen
        });
        const row = el("div", { class: "q-input-row" }, [reveal]);
        if (q.hint) row.insertBefore(hintButton(), reveal);
        block.appendChild(row);
      } else if (q.type === "mc") {
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
            // Per-option feedback explains why the chosen option is right or wrong.
            const said = q.feedback && q.feedback[o.i] ? q.feedback[o.i] : "";
            showFeedback(ok, said);
            record(qi, ok);
          });
          opts.appendChild(b);
        });
        block.appendChild(opts);
        if (q.hint) block.appendChild(el("div", { class: "q-input-row" }, [hintButton()]));
      } else {
        const placeholder = q.type === "number" ? "4.7k, 0x1F, 2.2u, 10mA etc."
          : q.type === "formula" ? `a formula using ${(q.vars || []).join(", ")}` : "your answer";
        const input = el("input", { type: "text", autocomplete: "off", spellcheck: "false", placeholder });
        const check = el("button", { class: "btn", type: "button", text: "Check" });
        const reveal = el("button", { class: "btn secondary", type: "button", text: "Show answer" });
        const row = el("div", { class: "q-input-row" }, [input]);
        if (q.unit) row.appendChild(el("span", { text: q.unit }));
        row.appendChild(check);
        if (q.hint) row.appendChild(hintButton());
        row.appendChild(reveal);

        const evaluate = () => {
          if (input.value.trim() === "") return;
          let ok, extra = "";
          if (q.type === "number") {
            const v = parseNumber(input.value);
            const tol = q.tolerance === undefined ? 0.02 : q.tolerance;
            ok = !isNaN(v) && Math.abs(v - q.answer) <= Math.abs(q.answer) * tol + 1e-12;
            if (isNaN(v)) extra = "Type a number (SI prefixes such as 4.7k work).";
          } else if (q.type === "formula") {
            ok = formulaMatches(input.value, q);
            if (!ok && !compileFormula(normFormula(input.value).split("=").pop() || "", q.vars || [])) {
              extra = `Write it with ${(q.vars || []).join(", ")}, numbers, + − × / ^ and brackets.`;
            }
          } else {
            const said = normText(input.value);
            ok = (q.accept || []).map(normText).includes(said) ||
                 (q.contains || []).map(normText).some(c => c && said.includes(c));
          }
          if (ok) {
            showFeedback(true);
          } else {
            showHint();
            // A recognised mistake ("wrong": [{ "answer": ..., "feedback": ... }]) gets its own explanation.
            const known = (q.wrong || []).find(w => typeof w === "object" && w.feedback && (
              q.type === "formula" ? formulaMatches(input.value, Object.assign({}, q, { answer: w.answer }))
              : q.type === "number" ? Math.abs(parseNumber(input.value) - w.answer) <=
                  Math.abs(w.answer) * (q.tolerance === undefined ? 0.02 : q.tolerance) + 1e-12
              : normText(input.value) === normText(w.answer)));
            if (known) extra = known.feedback;
            feedback.className = "q-feedback show bad";
            feedback.innerHTML = "Not quite. " + (extra ? extra + " " : "") + "Try again, or reveal the answer.";
          }
          record(qi, ok);
        };
        check.addEventListener("click", evaluate);
        input.addEventListener("keydown", e => { if (e.key === "Enter") evaluate(); });
        reveal.addEventListener("click", () => {
          const ans = q.type === "number" ? `${q.answer}${q.unit ? " " + q.unit : ""}`
            : q.type === "formula" ? (q.display || q.answer) : (q.accept || q.contains)[0];
          record(qi, false);
          feedback.className = "q-feedback show bad";
          feedback.innerHTML = `Answer: <code>${ans}</code>` + why();
        });
        block.appendChild(row);
      }
      if (hintBox) block.appendChild(hintBox);
      block.appendChild(feedback);
      if (cards) cards.push(block);
      container.appendChild(block);
    });
    if (cards) buildCards();
    container.appendChild(scoreLine);

    function markDot(qi, ok) {
      const d = dots && dots[qi];
      if (!d || d.classList.contains("good") || d.classList.contains("bad")) return;
      d.classList.add(ok === "skip" ? "seen" : ok ? "good" : "bad");
      showCard(null);                           // refresh the Next button
    }

    function buildCards() {
      container.classList.add("cards");
      const count = el("span", { class: "q-count" });
      const dotRow = el("span", { class: "q-dots" });
      dots = cards.map((_, i) => {
        const d = el("button", { class: "q-dot", type: "button", "aria-label": `Question ${i + 1}` });
        d.addEventListener("click", () => showCard(i));
        dotRow.appendChild(d);
        return d;
      });
      const prev = el("button", { class: "btn secondary", type: "button", text: "← Previous" });
      const next = el("button", { class: "btn secondary", type: "button", text: "Next question →" });
      const head = el("div", { class: "q-cardbar" }, [count, dotRow]);
      const foot = el("div", { class: "q-cardbar foot" }, [prev, next]);
      container.insertBefore(head, cards[0]);
      container.appendChild(foot);
      let at = 0;
      showCard = i => {
        if (i !== null) {
          const moved = i !== at;
          at = i;
          if (moved && head.getBoundingClientRect().top < 0) head.scrollIntoView({ block: "start", behavior: "smooth" });
        }
        cards.forEach((c, k) => c.classList.toggle("active", k === at));
        dots.forEach((d, k) => d.classList.toggle("current", k === at));
        count.textContent = `Question ${at + 1} of ${cards.length}`;
        prev.disabled = at === 0;
        next.hidden = at === cards.length - 1;
        // Once this card is answered, Next becomes the main button.
        const answered = /good|bad|seen/.test(dots[at].className);
        next.className = "btn" + (answered ? "" : " secondary");
      };
      prev.addEventListener("click", () => showCard(Math.max(0, at - 1)));
      next.addEventListener("click", () => showCard(Math.min(cards.length - 1, at + 1)));
      showCard(0);
    }
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

  /* A score (0..1) as a colour on red → yellow → green. Between two anchors the colours mix, but
   * never half and half: the mix always leans clearly towards the nearer anchor. */
  function scoreColor(f) {
    const stops = [[0.40, "var(--bad)"], [0.60, "var(--warn)"], [0.80, "var(--good)"]];
    if (f <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      const [x0, c0] = stops[i - 1], [x1, c1] = stops[i];
      if (f > x1) continue;
      const t = (f - x0) / (x1 - x0);
      const lean = t < 0.5 ? 0.7 * t : 1 - 0.7 * (1 - t);   // 0..0.35 or 0.65..1, never 0.5
      return `color-mix(in oklab, ${c1} ${Math.round(100 * lean)}%, ${c0})`;
    }
    return stops[stops.length - 1][1];
  }

  function renderIndexProgress() {
    const p = loadProgress();
    // The latest checkpoint estimate for each lesson (assets/checkpoint.js), shown as a coloured mark.
    const est = {};
    Object.values(p).forEach(r => {
      if (!r) return;
      if (r.estimates) for (const [id, x] of Object.entries(r.estimates)) est[id] = x.e;
      else if (r.checkpoint && r.checkpoint.lessons) Object.assign(est, r.checkpoint.lessons);
    });
    const BAND = e => (e >= 0.75 ? ["solid", "Solid"] : e >= 0.45 ? ["shaky", "Shaky"] : ["review", "Go over again"]);
    document.querySelectorAll("[data-lesson-link]").forEach(li => {
      const r = p[li.dataset.lessonLink] || {};
      li.classList.toggle("done", !!r.done);
      // A checkpoint's line shows its last score as a small bar.
      const old = li.querySelector(".cp-score");
      if (old) old.remove();
      const cp = r.checkpoint;
      if (cp && cp.total) {
        const f = cp.right / cp.total;
        const fill = el("span", { class: "cp-score-fill" });
        fill.style.width = `${Math.max(3, Math.round(100 * f))}%`;
        fill.style.background = scoreColor(f);
        li.appendChild(el("span", { class: "cp-score", title: `Last checkpoint: ${cp.right} / ${cp.total} right` }, [
          el("span", { class: "cp-score-bar" }, [fill]),
          el("span", { class: "cp-score-num", text: `${Math.round(100 * f)} %` }),
        ]));
      }
      const e = est[li.dataset.lessonLink];
      if (e === undefined) { delete li.dataset.cp; li.removeAttribute("title"); return; }
      const [b, text] = BAND(e);
      li.dataset.cp = b;
      li.title = `Checkpoint: ${text} (${Math.round(100 * e)} %)`;
    });
    // Only the core path counts towards course progress. Optional lessons and the bench labs on
    // real hardware are counted on their own.
    const CORE = "[data-lesson-link]:not([data-bench]):not([data-optional])";
    const OPT = "[data-lesson-link][data-optional]";
    const count = (root, sel) => [root.querySelectorAll(sel).length, root.querySelectorAll(sel + ".done").length];
    document.querySelectorAll(".part").forEach(part => {
      const [all, done] = count(part, CORE), [opt, optDone] = count(part, OPT);
      const label = part.querySelector(".progress");
      if (label && all + opt) label.textContent = (all ? `${done} / ${all} done` : "") +
        (opt ? `${all ? " · " : ""}${optDone} / ${opt} optional` : "");
    });
    const overall = document.getElementById("overall-progress");
    if (overall) {
      const [all, done] = count(document, CORE), [opt, optDone] = count(document, OPT);
      const [benches, benchDone] = count(document, "[data-bench]");
      overall.querySelector(".count").textContent = `${done} / ${all} complete` +
        (optDone ? ` · plus ${optDone} / ${opt} optional` : "") +
        (benchDone ? ` · plus ${benchDone} / ${benches} bench labs` : "");
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
                   { format: "embedded-course-progress", version: 1, numbering: NUMBERING_NOW, exportedAt: new Date().toISOString(), progress: loadProgress() });
      msg.textContent = "Saved a progress file to your downloads.";
    });
    importBtn.addEventListener("click", () => file.click());
    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      if (!f) return;
      f.text().then(text => {
        const data = JSON.parse(text);
        const wrapped = data && data.format === "embedded-course-progress";
        let incoming = wrapped ? data.progress : data;
        if (!incoming || typeof incoming !== "object") throw new Error("not a progress file");
        // Files exported before numbering 4 carry no numbering: they are from numbering 3.
        incoming = migrateFrom(incoming, (wrapped && data.numbering) || "3");
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
    const items = m.parts.flatMap(p => p.items.map(i => Object.assign({ part: p }, i)));
    // Bench labs are kept out of the parts (manifest.bench). Each goes right after the lesson or lab
    // that unlocks it, so a bench page's pager leads back to the main path at the right place.
    (m.bench || []).forEach(b => {
      const at = items.findIndex(i => i.id === b.afterId);
      const part = m.parts.find(p => p.number === b.afterPart) || (at >= 0 ? items[at].part : m.parts[0]);
      items.splice(at >= 0 ? at + 1 : items.length, 0, Object.assign({ part }, b));
    });
    return items;
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
      el("span", { text: item.kind === "bench" ? `Bench labs (optional) · ${item.board} · after ${item.after}`
                                               : `Part ${item.part.number}: ${item.part.title}` }),
    ]);
    document.body.insertBefore(nav, document.body.firstChild);

    const meta = main.querySelector(".lesson-meta");
    if (meta && !meta.textContent.trim()) {
      const label = item.kind === "lesson" ? `Lesson ${item.number}` : item.kind === "lab" ? "Lab"
        : item.kind === "bench" ? `Bench lab ${item.number}` : "Checkpoint";
      const tags = item.kind === "bench" ? ["optional, not required", "board: " + item.board, item.stretch ? "stretch" : ""]
        : [item.conceptOnly ? "concept lesson" : "", item.optional ? "optional" : ""];
      meta.textContent = [label].concat(tags).filter(Boolean).join(" · ");
    }

    // Prev/next skip lessons that are not written yet, and the optional bench labs: the main path
    // never sends a learner to a lab that needs hardware.
    const onPath = i => i.published && i.kind !== "bench";
    const prev = items.slice(0, idx).reverse().find(onPath);
    const next = items.slice(idx + 1).find(onPath);

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
    const bench = m.bench || [];
    // A bench lab's name carries its board, so it's clear at a glance what hardware it needs.
    const benchLink = b => el("span", { class: "bench-name" }, [
      b.published ? el("a", { href: "lessons/" + b.file, text: b.title }) : el("span", { text: b.title }),
      " ", el("span", { class: "board-badge", text: b.board }),
    ]);
    m.parts.forEach(p => {
      const section = el("section", { class: "part" });
      section.appendChild(el("h2", {}, [
        el("span", { text: `Part ${p.number}: ${p.title}` }),
        el("span", { class: "progress" }),
      ]));
      const list = el("ul", { class: "lesson-list" });
      p.items.forEach(i => {
        const num = i.kind === "lesson" ? String(i.number) : i.kind === "lab" ? "🔧" : "📝";
        const tags = [i.conceptOnly ? "concept" : "", i.optional ? "optional" : "", i.published ? "" : "coming"]
          .filter(Boolean).join(" · ");
        const li = el("li", Object.assign({ "data-lesson-link": i.id, class: i.published ? "" : "pending" },
                                          i.optional ? { "data-optional": "" } : {}), [
          el("span", { class: "num", text: num }),
          i.published ? el("a", { href: "lessons/" + i.file, text: i.title }) : el("span", { text: i.title }),
          el("span", { class: "tag", text: tags }),
        ]);
        list.appendChild(li);
      });
      section.appendChild(list);
      // A short note after each part: the optional bench labs its lessons unlock.
      const now = bench.filter(b => b.afterPart === p.number);
      if (now.length) {
        const note = el("p", { class: "bench-note" }, [el("span", { text: "🔬 Bench labs you can do now (optional): " })]);
        now.forEach((b, n) => {
          if (n) note.appendChild(document.createTextNode(", "));
          note.appendChild(benchLink(b));
        });
        section.appendChild(note);
      }
      root.appendChild(section);
    });

    // All bench labs in one section of their own, after the course. They never count towards progress.
    if (bench.length) {
      const section = el("section", { class: "part bench-part", id: "bench-labs" });
      section.appendChild(el("h2", {}, [el("span", { text: "Hands-on bench labs (🔬, optional)" })]));
      section.appendChild(el("p", { class: "bench-intro", text:
        "If you have real hardware, the bench labs take the simulated exercises onto a real board, where they " +
        "meet the problems a simulator hides: bouncing buttons, noisy readings, floating pins, real clocks and " +
        "real current draw." }));
      section.appendChild(el("ul", { class: "bench-facts" }, [
        el("li", { text: "Each one takes an hour or less. Longer ones are split into parts." }),
        el("li", { text: "None is required. The course, its labs and its checkpoints are complete without them, " +
                         "and they don't count towards your progress." }),
        el("li", { text: "The note at the end of each part above says which ones you can do by then." }),
        el("li", {}, [document.createTextNode("Start with "),
          el("a", { href: "lessons/bench00-blink-on-a-real-pico.html", text: "Bench lab 0" }),
          document.createTextNode(", which sets up the Pico 2 and the tools.")]),
      ]));

      // The whole kit, so a learner can buy once. Prices are approximate (COURSE-PLAN.md, Bench Track).
      section.appendChild(el("h3", { text: "What you need" }));
      const KIT = [
        ["Boards", [
          ["Raspberry Pi Pico 2 with headers", "about €7", "0 to 8, 14, 16 to 18"],
          ["NUCLEO-U545RE-Q (STM32U5, ST-LINK on board)", "about €30", "9 to 13, 15"],
        ]],
        ["Tools", [
          ["Multimeter with a µA range", "about €15", "1, 5, 7, 12"],
          ["Logic analyzer, 8 channels, 24 MHz (with the free PulseView)", "about €10", "3, 4, 6, 10, 11, 15"],
          ["USB cables: micro-USB (Pico 2) and USB-C (Nucleo), both with data lines", "", "all"],
        ]],
        ["Parts", [
          ["Breadboard and jumper wires", "about €10 for all parts", "most labs"],
          ["Pushbuttons (two)", "", "2, 4, 8, 10, 13, 18"],
          ["Red LEDs and 330 Ω resistors", "", "1, 7, 18"],
          ["Resistors: two 4.7 kΩ, 10 kΩ, 100 Ω, 1 MΩ", "", "2, 6, 8, 13, 17, 18"],
          ["10 kΩ potentiometer", "", "5"],
          ["10 kΩ NTC thermistor", "", "8, 13, 18"],
          ["SSD1306 I2C OLED display", "about €5", "6, 8, 13, 18"],
          ["WS2812B LED strip (8 LEDs), 74HCT125 level shifter, 100 µF capacitor", "about €6", "7"],
          ["Logic-level N-channel MOSFET and a 22 Ω 5 W resistor", "", "18"],
        ]],
      ];
      const kit = el("table", { class: "bench-kit" }, [
        el("thead", {}, [el("tr", {}, ["Item", "Cost", "Bench labs"].map(h => el("th", { text: h })))]),
      ]);
      const body = el("tbody");
      KIT.forEach(([group, rows]) => {
        body.appendChild(el("tr", { class: "bench-kit-group" }, [el("th", { colspan: "3", text: group })]));
        rows.forEach(r => body.appendChild(el("tr", {}, r.map(c => el("td", { text: c })))));
      });
      kit.appendChild(body);
      section.appendChild(kit);
      section.appendChild(el("p", { class: "bench-intro", text:
        "Total about €83: two boards, two tools and a parts kit. One starter kit usually covers the breadboard, wires, buttons, LEDs, " +
        "resistors and potentiometer. Prices are approximate and change with the seller. Each lab below " +
        "lists exactly what it uses." }));
      section.appendChild(el("h3", { text: "The labs" }));
      const list = el("div", { class: "bench-list" });
      bench.forEach(b => {
        const tags = ["after " + b.after, b.stretch ? "stretch" : "", b.published ? "" : "not written yet"]
          .filter(Boolean).join(" · ");
        const need = (label, value) => el("div", { class: "bench-need" }, [
          el("span", { class: "bench-need-label", text: label }), el("span", { text: value }),
        ]);
        list.appendChild(el("div", { "data-lesson-link": b.id, "data-bench": "",
                                     class: "bench-card" + (b.published ? "" : " pending") }, [
          el("div", { class: "bench-card-head" }, [
            el("span", { class: "num", text: "🔬" }),
            benchLink(b),
            el("span", { class: "tag", text: tags }),
          ]),
          need("Board", b.needs.board),
          need("Tools", b.needs.tools),
          need("Parts", b.needs.parts),
        ]));
      });
      section.appendChild(list);
      root.appendChild(section);
    }
  }

  // ---------- Falstad CircuitJS links ----------
  /* <pre class="circuitjs" data-title="Voltage divider">$ 1 5.0E-6 ...netlist...</pre>
     gets an "Open in CircuitJS" button that loads the netlist via ?cct=. Built-in examples
     need no helper: link to https://www.falstad.com/circuit/circuitjs.html?startCircuit=ohms.txt */
  const CIRCUITJS = "https://www.falstad.com/circuit/circuitjs.html";
  /* Live circuits, running inside the page (the iframe loads when it scrolls into view):
       <div class="circuitjs-live" data-start="cap.txt" data-title="RC charging"></div>   built-in example
       <pre class="circuitjs" data-live data-title="Divider">$ 1 5.0E-6 ...netlist...</pre>   own netlist */
  function liveCircuit(title, query) {
    const full = CIRCUITJS + "?" + query;
    const frame = el("iframe", { class: "circuitjs-frame", src: full + "&hideSidebar=true&hideMenu=true&running=true",
      title: `Circuit simulator: ${title}`, loading: "lazy", allow: "fullscreen" });
    return el("div", { class: "widget circuitjs-box" }, [
      el("h3", { text: `Circuit: ${title}` }),
      frame,
      el("p", { class: "circuitjs-hint" }, [
        "Click a switch to flip it, double-click a part to change its value. ",
        el("a", { href: full, target: "_blank", rel: "noopener", text: "Open full size with menus ↗" }),
      ]),
    ]);
  }

  function renderCircuitLinks() {
    document.querySelectorAll(".circuitjs-live").forEach(div => {
      div.replaceWith(liveCircuit(div.dataset.title || div.dataset.start, "startCircuit=" + encodeURIComponent(div.dataset.start)));
    });
    document.querySelectorAll("pre.circuitjs[data-live]").forEach(pre => {
      const box = liveCircuit(pre.dataset.title || "circuit", "cct=" + encodeURIComponent(pre.textContent.trim() + "\n"));
      pre.parentNode.insertBefore(box, pre);
      box.appendChild(el("details", {}, [el("summary", { text: "Netlist (File → Import From Text in CircuitJS)" })]));
      box.querySelector("details").appendChild(pre);
    });
    document.querySelectorAll("pre.circuitjs:not([data-live])").forEach(pre => {
      if (pre.closest(".circuitjs-box")) return;
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

  // ---------- Syntax highlighting ----------
  /* <pre><code class="language-c">...</code></pre>. highlight.js (assets/vendor/highlight, built by
     tools/maintainer/vendor_highlight.py) is loaded only on pages that have code. "language-plaintext" is
     left as written, so logs and worked arithmetic keep their own markup. Colours: course.css. */
  const ASSETS = document.currentScript ? new URL(".", document.currentScript.src).href : "../assets/";

  function registerCourseGrammars(hljs) {
    if (hljs.getLanguage("ld")) return;
    const number = { scope: "number", match: /\b(0x[0-9a-fA-F]+|\d+[KM]?)\b/ };
    hljs.registerLanguage("ld", h => ({
      name: "GNU linker script",
      keywords: {
        $pattern: /[A-Za-z_]\w*/,
        keyword: "MEMORY SECTIONS ENTRY ORIGIN LENGTH KEEP ALIGN LOADADDR ADDR SIZEOF PROVIDE " +
                 "PROVIDE_HIDDEN INCLUDE OUTPUT_FORMAT OUTPUT_ARCH AT NOLOAD ASSERT",
      },
      contains: [
        h.C_BLOCK_COMMENT_MODE,
        number,
        { scope: "section", match: /(?<![\w.])\.[A-Za-z_][\w.]*/ },   // output and input sections
        { scope: "variable", match: /\b_[A-Za-z_]\w*/ },              // _sdata, _estack ...
      ],
    }));
    hljs.registerLanguage("kconfig", h => ({
      name: "Kconfig",
      keywords: {
        keyword: "config menuconfig choice endchoice menu endmenu if endif source comment mainmenu " +
                 "depends on select imply default help prompt range visible",
        type: "bool tristate string hex int",
        literal: "y n m",
      },
      contains: [h.HASH_COMMENT_MODE, h.QUOTE_STRING_MODE, number,
        { scope: "variable", match: /\b[A-Z][A-Z0-9_]{2,}\b/ }],
    }));
    // GNU assembler sources (startup files, compiler output) use C block comments as well.
    const asm = hljs.getLanguage("armasm");
    if (asm) asm.contains.unshift(hljs.C_BLOCK_COMMENT_MODE);
  }

  function highlightCode() {
    const blocks = [...document.querySelectorAll('pre > code[class*="language-"]:not(.language-plaintext)')];
    if (!blocks.length) return;
    const run = () => {
      const hljs = window.hljs;
      if (!hljs) return;
      registerCourseGrammars(hljs);
      blocks.forEach(b => { if (!b.dataset.highlighted) hljs.highlightElement(b); });
    };
    if (window.hljs) return run();
    const script = document.createElement("script");
    script.src = ASSETS + "vendor/highlight/highlight.min.js";
    script.onload = run;
    document.head.appendChild(script);
  }

  // ---------- Copy buttons on code blocks ----------
  /* The Clipboard API needs a secure context (https or localhost); pages opened as file:// in some
     browsers fall back to a hidden textarea and execCommand("copy"). */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const area = el("textarea", { "aria-hidden": "true" });
      area.value = text;
      area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }

  function addCopyButtons() {
    document.querySelectorAll("pre > code").forEach(code => {
      const pre = code.parentElement;
      if (pre.querySelector(".copy-btn")) return;
      const btn = el("button", { class: "copy-btn", type: "button", "aria-label": "Copy code", text: "Copy" });
      btn.addEventListener("click", () => {
        copyText(code.textContent.replace(/\n$/, "")).then(
          () => { btn.textContent = "Copied"; btn.classList.add("done"); },
          () => { btn.textContent = "Select and copy"; });
        setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1500);
      });
      pre.classList.add("has-copy");
      pre.appendChild(btn);
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
    highlightCode();   // after the quizzes, so code in their prompts is in the page
    addCopyButtons();
    loadSearch();      // after the nav exists: the search box goes into it
  });

  /* "Go deeper" folds (<details class="fold depth">): open the one a link points into, and
     print every fold open. */
  function openFoldFor(hash) {
    const t = hash && hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    const f = t && t.closest("details.fold");
    if (f && !f.open) { f.open = true; t.scrollIntoView(); }
  }
  window.addEventListener("hashchange", () => openFoldFor(location.hash));
  let closedForPrint = [];
  window.addEventListener("beforeprint", () => {
    closedForPrint = [...document.querySelectorAll("details.fold:not([open])")];
    closedForPrint.forEach(d => { d.open = true; });
  });
  window.addEventListener("afterprint", () => { closedForPrint.forEach(d => { d.open = false; }); });

  /* The search box (assets/search.js) is loaded after the page is built. */
  function loadSearch() {
    if (!SELF || document.querySelector('script[src$="search.js"]')) return;
    document.body.appendChild(el("script", { src: SELF.src.replace(/course\.js(\?.*)?$/, "search.js") }));
  }

  // Exposed for other components (calculators, drills).
  window.Course = { parseNumber, el, shuffle, loadProgress, updateLesson, openFoldFor, scoreColor };
})();
