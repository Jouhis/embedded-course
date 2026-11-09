/* Checkpoint: a fast multiple-choice test that estimates how well each lesson of a part has stuck.
 *
 *   <div class="widget checkpoint">
 *     <script type="application/json">
 *     { "questions": [
 *       { "prompt": "HTML allowed",
 *         "options": ["A", "B", "C", "D"],      exactly four, shuffled on every run
 *         "answer": 2,                          index of the correct option in the authored list
 *         "lessons": ["0045", "0047"],          1 to 3 lessons of this part the question draws on
 *         "why": "Shown in the review after the test." }
 *     ] }
 *     </script>
 *   </div>
 *   <script src="../assets/checkpoint.js"></script>   after course.js
 *
 * The part is the one in assets/manifest.js that holds this page's <body data-lesson> id. The learner
 * sees one question at a time, with an "I don't know" button and no feedback until the end. Each
 * answer counts towards every lesson it is tagged with, a share of 1 / (number of tags). The
 * estimate for a lesson is (right - wrong / 3) / answered, floored at 0: with four options a blind
 * guess is right one time in four, so three wrong guesses cancel one lucky one, and "I don't know"
 * costs nothing beyond not counting as right. Bands: Solid at 75 % or more, Shaky at 45 %, below
 * that "Go over again". The result is saved with the course progress (progress[cpId].checkpoint),
 * and the course index marks each lesson with its band.
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
      const i = part.items.findIndex(x => x.id === id);
      if (i >= 0) {
        const next = m.parts[m.parts.indexOf(part) + 1];
        return { part, next, lessons: part.items.filter(x => x.kind === "lesson") };
      }
    }
    return null;
  }

  function estimate(questions, answers, lessons) {
    const acc = {};
    lessons.forEach(l => { acc[l.id] = { right: 0, wrong: 0, idk: 0, n: 0 }; });
    questions.forEach((q, i) => {
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
      out[id] = { est: total ? Math.max(0, (a.right - a.wrong / 3) / total) : null, n: a.n };
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
    const questions = spec.questions;
    const stage = el("div", { class: "cp-stage" });
    box.appendChild(stage);

    function saved() { return (loadProgress()[cpId] || {}).checkpoint || null; }

    function start() {
      stage.innerHTML = "";
      const last = saved();
      const minutes = Math.round(questions.length * 0.5);
      stage.appendChild(el("p", { class: "cp-intro", html:
        `<strong>${questions.length} questions</strong>, about ${minutes} minutes. One at a time, no going back, ` +
        `and no answers until the end. If you do not know, press <em>I don't know</em>: a guess only blurs your result.` }));
      const go = el("button", { class: "btn", type: "button", text: last ? "Take it again" : "Start" });
      go.addEventListener("click", run);
      const row = el("div", { class: "cp-row" }, [go]);
      if (last) {
        const show = el("button", { class: "btn secondary", type: "button", text: "Show my last result" });
        show.addEventListener("click", () => results(last, null));
        row.appendChild(show);
      }
      stage.appendChild(row);
    }

    function run() {
      const order = shuffle(questions.map((_, i) => i));
      const answers = new Array(questions.length).fill(null);
      let k = 0;
      function show() {
        stage.innerHTML = "";
        const i = order[k], q = questions[i];
        const bar = el("div", { class: "cp-progress" }, [el("div", { class: "cp-progress-fill" })]);
        bar.firstChild.style.width = `${(100 * k / questions.length).toFixed(1)}%`;
        stage.appendChild(el("div", { class: "cp-count", text: `Question ${k + 1} of ${questions.length}` }));
        stage.appendChild(bar);
        stage.appendChild(el("div", { class: "q-prompt", html: q.prompt }));
        const opts = el("div", { class: "q-options" });
        const pick = r => () => {
          answers[i] = r;
          k += 1;
          if (k < questions.length) show();
          else finish(answers);
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
        const top = box.getBoundingClientRect().top;
        if (top < 0) box.scrollIntoView({ block: "start" });
      }
      show();
    }

    function finish(answers) {
      const est = estimate(questions, answers, info.lessons);
      const right = answers.filter((a, i) => a === questions[i].answer).length;
      const idk = answers.filter(a => a === "idk").length;
      const prev = saved();
      const rec = { at: new Date().toISOString(), right, idk, total: questions.length, lessons: {} };
      for (const [id, e] of Object.entries(est)) if (e.est !== null) rec.lessons[id] = Math.round(e.est * 100) / 100;
      // Taking the checkpoint completes it.
      updateLesson(cpId, { checkpoint: rec, checkpointPrev: prev || undefined, done: true, completedAt: rec.at });
      const bar = document.querySelector(".complete-bar");
      if (bar && bar._refresh) bar._refresh();
      results(rec, { answers, prev });
    }

    function results(rec, run) {
      stage.innerHTML = "";
      const prev = run ? run.prev : (loadProgress()[cpId] || {}).checkpointPrev || null;
      const pct = Math.round(100 * rec.right / rec.total);
      stage.appendChild(el("div", { class: "cp-total" }, [
        el("span", { class: "cp-total-num", text: `${rec.right} / ${rec.total}` }),
        el("div", { class: "cp-progress" }, [el("div", { class: "cp-progress-fill" })]),
        el("span", { class: "cp-total-note", text: `${pct} % right` + (rec.idk ? ` · ${rec.idk} × I don't know` : "") }),
      ]));
      stage.querySelector(".cp-total .cp-progress-fill").style.width = `${pct}%`;

      // One row per lesson of the part, in course order.
      const counts = {};
      questions.forEach(q => q.lessons.forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
      const list = el("div", { class: "cp-lessons" });
      info.lessons.forEach(l => {
        const e = rec.lessons[l.id];
        if (e === undefined) return;
        const b = band(e);
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
          el("span", { class: "cp-n", text: `${counts[l.id] || 0} q` }),
        ]));
      });
      stage.appendChild(list);

      // What to go over before the next part: the weakest lessons, at most five.
      const ranked = info.lessons.filter(l => rec.lessons[l.id] !== undefined)
        .sort((a, b) => rec.lessons[a.id] - rec.lessons[b.id]);
      const weak = ranked.filter(l => band(rec.lessons[l.id]) === "review");
      const shaky = ranked.filter(l => band(rec.lessons[l.id]) === "shaky");
      const pickList = (weak.length ? weak : shaky).slice(0, 5);
      const nextName = info.next ? `Part ${info.next.number}` : "the next part";
      const advice = el("div", { class: "cp-advice" });
      if (!pickList.length) {
        advice.appendChild(el("p", { html: `<strong>Every lesson looks solid.</strong> Go on to ${nextName}.` }));
      } else {
        advice.appendChild(el("p", { html: `<strong>Before ${nextName}, go over ${pickList.length === 1 ? "this lesson" : "these lessons"} again:</strong>` }));
        const ol = el("ol");
        pickList.forEach(l => ol.appendChild(el("li", {}, [el("a", { href: l.file, text: `Lesson ${l.number}: ${l.title}` })])));
        advice.appendChild(ol);
        if (!weak.length) advice.appendChild(el("p", { class: "cp-small", text: "None is weak; these are the shakiest." }));
      }
      stage.appendChild(advice);

      // Review: the questions missed or skipped, grouped by their first lesson.
      if (run) {
        const missed = questions.map((q, i) => ({ q, a: run.answers[i] })).filter(x => x.a !== x.q.answer);
        if (missed.length) {
          const det = el("details", { class: "cp-review" }, [el("summary", { text: `Review the ${missed.length} question${missed.length === 1 ? "" : "s"} you missed or skipped` })]);
          info.lessons.forEach(l => {
            const mine = missed.filter(x => x.q.lessons[0] === l.id);
            if (!mine.length) return;
            det.appendChild(el("h4", {}, [el("a", { href: l.file, text: `Lesson ${l.number}: ${l.title}` })]));
            mine.forEach(({ q, a }) => {
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
      const again = el("button", { class: "btn secondary", type: "button", text: "Take it again" });
      again.addEventListener("click", runAgain);
      stage.appendChild(el("div", { class: "cp-row" }, [again]));
      const when = new Date(rec.at);
      stage.appendChild(el("p", { class: "cp-small", text: `Result from ${when.toLocaleDateString()}. It is saved in this browser with your course progress.` }));
    }
    function runAgain() { start(); stage.querySelector(".btn").click(); }

    start();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".widget.checkpoint").forEach(render);
  });
})();
