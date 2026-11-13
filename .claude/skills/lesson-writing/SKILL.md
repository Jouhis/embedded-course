---
name: lesson-writing
description: Write, expand or rewrite a course lesson in the course format and in the author's own writing style. Use when asked to write a new lesson, redraft or rewrite a lesson, write "in my style" or "my voice", or continue the text-style branch work. Short checklist version of tools/maintainer/LESSON-SPEC.md plus the voice rules, numbered formulas, and a script that keeps code, figures, widgets and quizzes byte-identical.
---

# Lesson writing

Short version of `tools/maintainer/LESSON-SPEC.md`. This file wins on style, the spec on tooling.

## Before writing

- Read `MISSION.md`, `NOTES.md`, `GLOSSARY.md`, `RESOURCES.md` and the neighbouring lessons.
- Check `design.html` and `assets/` before making any new element.
- Rewrites: list every fact, number, citation, link, step and mistake first. All must survive.
- Learner: can program, new to electronics and embedded, likes the link to CPU, bus and memory.
  Industry practice, no Arduino, no career material, digits-only numbering.

## Format

- One skill, 25–40 minutes, 2,500–3,500 words of prose. Order:
  1. `h1` is only the topic, the same as the lesson's title in `assets/manifest.js`, with
     no subtitle after a colon. Then the `.subtitle`: a short phrase of a few words saying
     what the topic is, like a dictionary gloss. No full sentence, no full stop. Then the `.goal`.
  2. Opening: 1–2 short paragraphs, links back, one real situation. No motivation chapter.
     Give it a descriptive heading for this lesson's topic, or no heading at all; do not
     reuse the old shared opening heading.
  3. Concepts one at a time, terms defined on first use
  4. Worked example with real numbers, every step shown
  5. Code, explained line by line
  6. Hands-on `ol.steps`, then `.win`
  7. `fold mistakes`: 3+ mistakes, each symptom → cause → fix
  8. `fold depth`: In real projects, alternatives, history
  9. Summary: 5–8 bullets
  10. Quizzes (Check your understanding, Spaced review), `.source`, `.ask`
- Headings name the topic of the section in plain, descriptive words, like a textbook
  contents page. Prefer descriptive over very short. No slogans, claims, contrasts, teasers
  or "what/why" phrasings, no questions, no colons with a subtitle.
- Paragraphs 3–5 sentences.
- Boxes: `.analogy` (max 2, says where it breaks), `.example`, `.note`, `.warning`, `.sidenote`.
  Never two in a row or next to a figure.
- Plain tables, no "Table 1" captions. Figures: inline SVG, `currentColor`, numbered caption,
  rendered and checked. Code: `language-c`, C11, `stdint.h`, comments say why.
- Units: always SI units and SI prefixes, with a space between number and unit. No imperial
  or other non-SI units; convert any value a source gives in them.
- Formulas on their own numbered line, introduced before and explained after with "where…":
  `<p class="eq"><span>formula</span><span class="eq-n">(n)</span></p>`

## Voice

The author's reasoning, in polished English, told the way an experienced engineer explains
something to a colleague at the bench.

- **Reasoning:** each paragraph goes what happens → why → what follows. Join ideas with
  causal and consequence clauses; the next sentence picks up the last one.
- **Tone:** conversational but exact. Use *we* when walking through something together,
  *you* for the learner's own tasks.
- **Investigate:** show something real first (a tool output, a reading, a symptom), then
  explain it, then confirm it. Let the reader see the reasoning, not only the conclusion.
- **Build it up:** start from the smallest thing that works and add one piece at a time,
  saying why each piece is needed.
- **Signpost:** one framing sentence per section on what it does and why now; short
  transitions between steps.
- **Terms:** a plain-words gloss the first time, the exact term after.
- **Honest:** say what a number does not guarantee, what the simulator hides, what is left
  out and where it is covered. Name the detail that typically trips people up.
- **Precise:** strong, specific verbs instead of verb plus filler, varied transitions, hedges
  only where uncertainty is real, active voice except for procedures and results.
- **Rhythm:** sentences mostly 15–25 words. A short sentence may land a point now and then;
  a dry aside or an exclamation at most once or twice per lesson.
- **Teach:** in worked examples say why each step is taken; ask for a prediction before the
  result; put explanations next to the figure or code they explain.

Clean over clever: say the thing directly. No rhythmic three-part sentences built for effect,
no personified parts, no wordplay. The subtitle is a short, plain phrase.

Avoid: dashes, hype words, rhetorical-question openers, one-line paragraphs, bold labels in
prose, "not X but Y" contrasts, academic padding and stock filler phrases.

All examples, phrasings and analogies are original to this course. Never reuse wording,
examples or structure from other tutorials, books or blogs.

## Quizzes

- A situation (bug, log, snippet, datasheet line, design choice) where the learner predicts,
  diagnoses, fixes, calculates or chooses. No vocabulary or "which is true" questions.
- Every `mc` option gets feedback naming the misconception; `why` adds one insight.
- 4–8 questions, plus 2–3 spaced review from 2+ lessons back. MC: 3–5 options of similar
  length. Formulas: `vars`, `display`, 2+ `examples`, tempting `wrong`. Work out every number.
- Rewrites keep existing quizzes unless asked.

## Facts and hands-on

- Every hardware fact cites a primary source with section or page. Never from memory; if it
  cannot be verified, leave it out. External links: `target="_blank" rel="noopener"`.
- Check every cross-reference to other lessons and sections.
- Wokwi projects only via `tools/new_project.py` (spec section 7); analog work in CircuitJS
  built-in examples with a `circuitjs-live` div (spec section 7.1).
- Steps say what to open, what to change and what output to expect.

## Rewriting and finishing

1. `python -I .claude/skills/lesson-writing/scripts/assemble.py list <lesson>`: blocks kept
   byte-identical (figures, animations, CircuitJS, code, tables, quizzes), read from git HEAD.
2. Write the prose from `<h1>` to the summary in a scratchpad file with `{{FIGURE1}}`,
   `{{CODE1}}`, …, `{{REST}}` placeholders.
3. `python -I .claude/skills/lesson-writing/scripts/assemble.py build <lesson> <body.html>`.
4. `python -I tools/maintainer/check_course.py` with zero errors, check the word count, render
   the page (headless Edge `--screenshot`) and look at it.
5. Report changes, unverified facts and fixed references. Leave it uncommitted unless asked.
