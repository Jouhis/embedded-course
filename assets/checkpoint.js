/* Checkpoint: a fast multiple-choice test that estimates how well each lesson of a part has stuck.
 *
 *   <div class="widget checkpoint">
 *     <script type="application/json">
 *     { "questions": [
 *       { "prompt": "HTML allowed",
 *         "options": ["A", "B", "C", "D"],      exactly four, shuffled on every run
 *         "answer": 2,                          index of the correct option in the authored list
 *         "lessons": ["0045", "0047"],          1 to 3 lessons of this part; the first is the main one
 *         "set": true,                          part of the premade checkpoint (else bank only)
 *         "why": "Shown in the review after the test." }
 *     ] }
 *     </script>
 *   </div>
 *   <script src="../assets/checkpoint.js"></script>   after course.js
 *
 * The part is the one in assets/manifest.js that holds this page's <body data-lesson> id. Two ways
 * in: the premade checkpoint (the "set" questions, the same every time, in a new order), or a test
 * the learner builds from the whole bank by choosing lessons and a length. Either way the learner
 * sees one question at a time, with an "I don't know" button and no feedback until the end.
 *
 * Each answer counts towards every lesson it is tagged with, a share of 1 / (number of tags). The
 * estimate for a lesson is (right - wrong / 3) / answered, floored at 0: with four options a blind
 * guess is right one time in four, so three wrong guesses cancel one lucky one, and "I don't know"
 * costs nothing beyond not counting as right. Bands: Solid at 75 % or more, Shaky at 45 %, below
 * that "Go over again".
 *
 * Saved with the course progress, under the checkpoint's id:
 *   checkpoint, checkpointPrev   the last two premade results
 *   custom                       the last built test's result
 *   estimates {lessonId: {e, at}} the newest estimate per lesson from either kind of test; the course
 *                                index marks each lesson with its band from here.
 */
(function () {
  "use strict";
  const C = window.Course;
  if (!C) return;
  const { el, shuffle, loadProgress, updateLesson } = C;

  const SOLID = 0.75, SHAKY = 0.45;
  const band = e => (e >= SOLID ? "solid" : e >= SHAKY ? "shaky" : "review");
  const BAND_TEXT = { solid: "Solid", shaky: "Shaky", review: "Go over again" };

  function partOf(id) {
    const m = window.COURSE_MANIFEST;
    if (!m) return null;
    for (const part of m.parts) {
      if (part.items.some(x => x.id === id)) {
        const next = m.parts[m.parts.indexOf(part) + 1];
        return { part, next, lessons: part.items.filter(x => x.kind === "lesson") };
      }
    }
    return null;
  }

  function estimate(qs, answers, lessonIds) {
    const acc = {};
    lessonIds.forEach(id => { acc[id] = { right: 0, wrong: 0, idk: 0, n: 0 }; });
    qs.forEach((q, i) => {
      const w = 1 / q.lessons.length;
      q.lessons.forEach(id => {
        const a = acc[id];
        if (!a) return;
        a.n += 1;
        const r = answers[i];
        if (r === "idk") a.idk += w;
        else if (r === q.answer) a.right += w;
        else a.wrong += w;
      });
    });
    const out = {};
    for (const [id, a] of Object.entries(acc)) {
      const total = a.right + a.wrong + a.idk;
      if (total) out[id] = { est: Math.max(0, (a.right - a.wrong / 3) / total), n: a.n };
    }
    return out;
  }

  // Draw `count` questions about the chosen lessons, spread evenly: deal round-robin from one
  // shuffled pile per lesson, by each question's first chosen tag, so no lesson is left out.
  function draw(bank, chosen, count) {
    const piles = {};
    chosen.forEach(id => { piles[id] = []; });
    shuffle(bank.slice()).forEach(q => {
      const id = q.lessons.find(t => t in piles);
      if (id) piles[id].push(q);
    });
    const out = [];
    while (out.length < count && Object.values(piles).some(p => p.length)) {
      for (const id of shuffle(chosen.slice())) {
        if (out.length >= count) break;
        if (piles[id].length) out.push(piles[id].pop());
      }
    }
    return out;
  }

  function render(box) {
    const script = box.querySelector('script[type="application/json"]');
    const cpId = document.body.dataset.lesson;
    const info = partOf(cpId);
    let spec;
    try { spec = JSON.parse(script.textContent); }
    catch (e) { box.appendChild(el("p", { text: "Checkpoint data is invalid JSON: " + e.message })); return; }
    if (!info) { box.appendChild(el("p", { text: "This page is not in the course manifest." })); return; }
    const bank = spec.questions;
    const premade = bank.some(q => q.set) ? bank.filter(q => q.set) : bank;
    const stage = el("div", { class: "cp-stage" });
    box.appendChild(stage);

    const mine = () => loadProgress()[cpId] || {};
    const minutes = n => Math.max(1, Math.round(n * 0.5));

    function start() {
      stage.innerHTML = "";
      const rec = mine();
      stage.appendChild(el("p", { class: "cp-intro", html:
        `<strong>The checkpoint: ${premade.length} questions</strong>, about ${minutes(premade.length)} minutes, ` +
        `across every lesson of this part. One at a time, no going back, and no answers until the end. ` +
        `If you do not know, press <em>I don't know</em>: a guess only blurs your result.` }));
      const go = el("button", { class: "btn", type: "button", text: rec.checkpoint ? "Take it again" : "Start the checkpoint" });
      go.addEventListener("click", () => run(shuffle(premade.slice()), "premade", info.lessons.map(l => l.id)));
      const row = el("div", { class: "cp-row" }, [go]);
      if (rec.checkpoint) {
        const show = el("button", { class: "btn secondary", type: "button", text: "Show my last result" });
        show.addEventListener("click", () => results(rec.checkpoint, null, "premade"));
        row.appendChild(show);
      }
      if (rec.custom) {
        const show = el("button", { class: "btn secondary", type: "button", text: "Show my last own test" });
        show.addEventListener("click", () => results(rec.custom, null, "custom"));
        row.appendChild(show);
      }
      stage.appendChild(row);
      stage.appendChild(builder(rec));
    }

    // "Build your own test": pick lessons and a length, drawn from the whole bank.
    function builder(rec) {
      const est = rec.estimates || {};
      const det = el("details", { class: "cp-builder" }, [
        el("summary", { text: `Or build your own test from the ${bank.length}-question bank` }),
        el("p", { class: "cp-small", text: "Choose the lessons to be tested on. Your latest result for each lesson is shown beside it." }),
      ]);
      const boxes = [];
      const list = el("div", { class: "cp-pick" });
      info.lessons.forEach(l => {
        const cb = el("input", { type: "checkbox", value: l.id });
        boxes.push(cb);
        const e = est[l.id];
        const tag = e ? el("span", { class: `cp-band ${band(e.e)}`, text: BAND_TEXT[band(e.e)] }) : el("span", { class: "cp-band" });
        list.appendChild(el("label", { class: "cp-pick-row" }, [cb,
          el("span", { class: "cp-num", text: String(l.number) }), el("span", { class: "cp-title", text: l.title }), tag]));
      });
      const quick = (text, test) => {
        const b = el("button", { class: "btn secondary cp-quick", type: "button", text });
        b.addEventListener("click", () => { boxes.forEach(cb => { cb.checked = test(cb.value); }); update(); });
        return b;
      };
      const weak = id => est[id] && band(est[id].e) !== "solid";
      const quickRow = el("div", { class: "cp-row" }, [
        quick("All", () => true), quick("None", () => false),
        quick("Not yet solid", weak), quick("Not tested yet", id => !est[id]),
      ]);
      const sizeSel = el("select", { class: "cp-size" });
      [10, 20, 30, 50].forEach(n => sizeSel.appendChild(el("option", { value: String(n), text: `${n} questions` })));
      sizeSel.appendChild(el("option", { value: "all", text: "Every question on them" }));
      const go = el("button", { class: "btn", type: "button", text: "Start my test" });
      const note = el("span", { class: "cp-small" });
      function update() {
        const chosen = boxes.filter(cb => cb.checked).map(cb => cb.value);
        const pool = bank.filter(q => q.lessons.some(t => chosen.includes(t))).length;
        const want = sizeSel.value === "all" ? pool : Math.min(pool, +sizeSel.value);
        go.disabled = !want;
        note.textContent = chosen.length ? `${want} questions, about ${minutes(want)} minutes` : "Choose at least one lesson.";
      }
      boxes.forEach(cb => cb.addEventListener("change", update));
      sizeSel.addEventListener("change", update);
      go.addEventListener("click", () => {
        const chosen = boxes.filter(cb => cb.checked).map(cb => cb.value);
        const pool = bank.filter(q => q.lessons.some(t => chosen.includes(t)));
        const n = sizeSel.value === "all" ? pool.length : +sizeSel.value;
        run(draw(pool, chosen, n), "custom", chosen);
      });
      det.appendChild(quickRow);
      det.appendChild(list);
      det.appendChild(el("div", { class: "cp-row" }, [sizeSel, go, note]));
      update();
      return det;
    }

    function run(qs, mode, lessonIds) {
      const answers = new Array(qs.length).fill(null);
      let k = 0;
      function show() {
        stage.innerHTML = "";
        const q = qs[k];
        const bar = el("div", { class: "cp-progress" }, [el("div", { class: "cp-progress-fill" })]);
        bar.firstChild.style.width = `${(100 * k / qs.length).toFixed(1)}%`;
        stage.appendChild(el("div", { class: "cp-count", text: `Question ${k + 1} of ${qs.length}` }));
        stage.appendChild(bar);
        stage.appendChild(el("div", { class: "q-prompt", html: q.prompt }));
        const opts = el("div", { class: "q-options" });
        // Ignore a click in the first moment after a new card appears, so a double-click
        // on one answer does not also answer the next question.
        const shownAt = Date.now();
        const pick = r => () => {
          if (Date.now() - shownAt < 300) return;
          answers[k] = r;
          k += 1;
          if (k < qs.length) show();
          else finish(qs, answers, mode, lessonIds);
        };
        shuffle(q.options.map((text, j) => ({ text, j }))).forEach(o => {
          const b = el("button", { class: "q-option", type: "button", html: o.text });
          b.addEventListener("click", pick(o.j));
          opts.appendChild(b);
        });
        stage.appendChild(opts);
        const idk = el("button", { class: "btn secondary cp-idk", type: "button", text: "I don't know" });
        idk.addEventListener("click", pick("idk"));
        stage.appendChild(el("div", { class: "cp-row" }, [idk]));
        if (box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "start" });
      }
      show();
    }

    function finish(qs, answers, mode, lessonIds) {
      const est = estimate(qs, answers, lessonIds);
      const at = new Date().toISOString();
      const rec = {
        at, total: qs.length, lessons: {}, n: {},
        right: answers.filter((a, i) => a === qs[i].answer).length,
        idk: answers.filter(a => a === "idk").length,
      };
      for (const [id, e] of Object.entries(est)) { rec.lessons[id] = Math.round(e.est * 100) / 100; rec.n[id] = e.n; }
      const old = mine();
      const estimates = Object.assign({}, old.estimates);
      for (const [id, e] of Object.entries(rec.lessons)) estimates[id] = { e, at };
      let prev = null;
      if (mode === "premade") {
        prev = old.checkpoint || null;
        // Taking the checkpoint completes it.
        updateLesson(cpId, { checkpoint: rec, checkpointPrev: prev || undefined, estimates, done: true, completedAt: at });
        const bar = document.querySelector(".complete-bar");
        if (bar && bar._refresh) bar._refresh();
      } else {
        prev = old.custom || null;
        updateLesson(cpId, { custom: rec, estimates });
      }
      results(rec, { qs, answers, prev }, mode);
    }

    function results(rec, run, mode) {
      stage.innerHTML = "";
      const prev = run ? run.prev : (mode === "premade" ? mine().checkpointPrev : null) || null;
      const pct = Math.round(100 * rec.right / rec.total);
      stage.appendChild(el("div", { class: "cp-total" }, [
        el("span", { class: "cp-total-num", text: `${rec.right} / ${rec.total}` }),
        el("div", { class: "cp-progress" }, [el("div", { class: "cp-progress-fill" })]),
        el("span", { class: "cp-total-note", text: (mode === "custom" ? "Your own test · " : "") +
          `${pct} % right` + (rec.idk ? ` · ${rec.idk} × I don't know` : "") }),
      ]));
      stage.querySelector(".cp-total .cp-progress-fill").style.width = `${pct}%`;

      // One row per lesson tested, in course order.
      const tested = info.lessons.filter(l => rec.lessons[l.id] !== undefined);
      const list = el("div", { class: "cp-lessons" });
      tested.forEach(l => {
        const e = rec.lessons[l.id], b = band(e);
        const fill = el("div", { class: `cp-bar-fill ${b}` });
        fill.style.width = `${Math.max(3, Math.round(100 * e))}%`;
        let delta = "";
        if (prev && prev.lessons && prev.lessons[l.id] !== undefined && band(prev.lessons[l.id]) !== b) {
          delta = ` (was ${BAND_TEXT[band(prev.lessons[l.id])]})`;
        }
        list.appendChild(el("a", { class: "cp-lesson", href: l.file }, [
          el("span", { class: "cp-num", text: String(l.number) }),
          el("span", { class: "cp-title", text: l.title }),
          el("span", { class: "cp-bar" }, [fill]),
          el("span", { class: `cp-band ${b}`, text: BAND_TEXT[b] + delta }),
          el("span", { class: "cp-n", text: `${(rec.n || {})[l.id] || 0} q` }),
        ]));
      });
      stage.appendChild(list);

      // What to go over: the weakest lessons, at most five.
      const ranked = tested.slice().sort((a, b) => rec.lessons[a.id] - rec.lessons[b.id]);
      const weak = ranked.filter(l => band(rec.lessons[l.id]) === "review");
      const shaky = ranked.filter(l => band(rec.lessons[l.id]) === "shaky");
      const pickList = (weak.length ? weak : shaky).slice(0, 5);
      const before = mode === "premade" ? `Before ${info.next ? `Part ${info.next.number}` : "the next part"}, go over` : "Go over";
      const advice = el("div", { class: "cp-advice" });
      if (!pickList.length) {
        advice.appendChild(el("p", { html: `<strong>Every lesson tested looks solid.</strong>` +
          (mode === "premade" && info.next ? ` Go on to Part ${info.next.number}.` : "") }));
      } else {
        advice.appendChild(el("p", { html: `<strong>${before} ${pickList.length === 1 ? "this lesson" : "these lessons"} again:</strong>` }));
        const ol = el("ol");
        pickList.forEach(l => ol.appendChild(el("li", {}, [el("a", { href: l.file, text: `Lesson ${l.number}: ${l.title}` })])));
        advice.appendChild(ol);
        if (!weak.length) advice.appendChild(el("p", { class: "cp-small", text: "None is weak; these are the shakiest." }));
      }
      stage.appendChild(advice);

      // Review: the questions missed or skipped, grouped by their main lesson.
      if (run) {
        const missed = run.qs.map((q, i) => ({ q, a: run.answers[i] })).filter(x => x.a !== x.q.answer);
        if (missed.length) {
          const det = el("details", { class: "cp-review" }, [el("summary", { text: `Review the ${missed.length} question${missed.length === 1 ? "" : "s"} you missed or skipped` })]);
          info.lessons.forEach(l => {
            const these = missed.filter(x => x.q.lessons[0] === l.id);
            if (!these.length) return;
            det.appendChild(el("h4", {}, [el("a", { href: l.file, text: `Lesson ${l.number}: ${l.title}` })]));
            these.forEach(({ q, a }) => {
              det.appendChild(el("div", { class: "cp-missed" }, [
                el("div", { class: "q-prompt", html: q.prompt }),
                el("div", { class: "cp-yours", html: "Your answer: " + (a === "idk" ? "<em>I don't know</em>" : q.options[a]) }),
                el("div", { class: "cp-right", html: "Right answer: " + q.options[q.answer] }),
                el("div", { class: "cp-why", html: q.why || "" }),
              ]));
            });
          });
          stage.appendChild(det);
        }
      }
      const back = el("button", { class: "btn secondary", type: "button", text: "Back to the start" });
      back.addEventListener("click", start);
      stage.appendChild(el("div", { class: "cp-row" }, [back]));
      stage.appendChild(el("p", { class: "cp-small", text: `Result from ${new Date(rec.at).toLocaleDateString()}. It is saved in this browser with your course progress.` }));
    }

    start();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".widget.checkpoint").forEach(render);
  });
})();
