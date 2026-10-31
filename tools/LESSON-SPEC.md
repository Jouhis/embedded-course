# Lesson Authoring Spec

You are writing lessons for a self-paced embedded-systems course. The course is a teaching workspace for the `teach` skill. Read this whole file before writing anything.

Workspace root: `C:\Users\juhos\embedded-course` (Git Bash: `/c/Users/juhos/embedded-course`).

## 1. Read first (every time)
1. `MISSION.md`: who the learner is and why they're here. Every lesson must serve this mission.
2. `NOTES.md`: learner preferences and verified simulator and toolchain facts. **These override your own assumptions.**
3. `COURSE-PLAN.md`: where your lessons sit in the whole course.
4. `GLOSSARY.md`: canonical terms. Use them exactly and avoid the listed aliases.
5. `RESOURCES.md`: trusted sources. Cite from here.
6. `templates/lesson-template.html`: the lesson skeleton. Copy it; don't invent a new structure.
7. `assets/course.css` and `assets/course.js`: available styles and widgets (read the header comment of course.js).
8. The lessons immediately before yours in `lessons/`, so tone, terminology and difficulty connect.

## 2. The learner
- Already programs (doesn't need loops, functions or variables explained), but is **new to electronics**.
- Studied computer architecture at university and found it very helpful. Connect explanations to what the CPU, the bus and memory actually do.
- Career-focused: wants industry practice (plain C, vendor SDKs, testing), not Arduino.
- Number everything with **digits only** (1, 2, 2.1). Never use letters (A, B) or Roman numerals.

## 3. What a lesson is
- **One tightly scoped skill**, completable in **10–20 minutes**. Working memory is small: if you have more than about 3 new ideas, the lesson is too big. Put extra material in a sidenote or a reference sheet instead.
- **Knowledge first, then skill.** A short explainer, then a hands-on task with a feedback loop (a Wokwi exercise and/or a quiz).
- **One tangible win**, stated in the `.win` box.
- Beautiful and printable: Tufte style, short paragraphs, inline SVG diagrams, no walls of text.

## 4. Required structure (enforced by `tools/check_course.py`)
File: `lessons/<file>` where `<file>` is the **exact** file name from `assets/manifest.js`, and `<body data-lesson="<id>">` uses the exact id (`0007`, `lab03`, `cp02`).

| Section | Lessons | Labs | Checkpoints |
|---|---|---|---|
| `.goal` (one checkable skill) | required | required | required |
| Explainer with citations | required | short brief | none |
| Hands-on Wokwi task | required unless concept-only | required (bigger) | optional |
| `.win` | required | required | none |
| Quiz "Check your understanding" | ≥ 4 questions | ≥ 3 | ≥ 15, mixed across the whole part |
| Quiz "Spaced review" (2–3 questions from **earlier** lessons) | required from lesson 5 on | optional | none |
| `.interview` drill with a `<details>` model answer | required | optional | optional |
| `.source` (one best primary source, with sections or timestamps) | required | required | optional |
| `.ask` (remind the learner to ask the agent, with a suggested question) | required | required | required |

Leave `<p class="lesson-meta"></p>` empty, and don't write a pager or "mark complete" button: `course.js` adds those.

## 5. Quiz rules (the checker enforces the first four)
1. Multiple-choice options must have **exactly the same number of words** (count them before saving; run the checker early, not only at the end), and character lengths within 30% of each other (options within 3 characters of each other, like `R0`/`R12`, always pass). Write them so length gives no clue.
2. At least 3 options, no duplicates, and `answer` is a valid index. Options are shuffled at runtime, but still vary which authored position is correct.
3. Every question has a `why` that explains the right answer **and** why the most tempting wrong answer is wrong.
4. `number` questions accept SI prefixes (`4k7`, `10m`) and hex or binary. Set a sensible `tolerance` (e.g. 0.05 when E12 resistor rounding is involved).
5. Test **retrieval and application**, not recognition: "which value…", "what happens if…", "what's wrong with this code…". Avoid "which of these is true".
6. Spaced-review questions must come from lessons at least 2 lessons back, with interleaved topics.

## 6. Facts and citations: never trust your memory
- Every hardware or protocol fact needs a citation link, preferably to a vendor primary source in `RESOURCES.md` (with the section or page).
- If you need a fact that isn't covered there, look it up with WebFetch or WebSearch on a high-trust source, and propose the source for `RESOURCES.md` (see section 10).
- Wokwi part names, pins and attributes: check them at `https://docs.wokwi.com/parts/<part>` before using them. Simulator limits are listed in `NOTES.md`. Never write an exercise that depends on an unsimulated feature.
- If you are unsure of something and cannot verify it, leave it out and mention it in your report.

## 7. Hands-on Wokwi projects
- Create projects **only** with the generator, so builds, VS Code tasks and debugging work:
  ```
  python -I tools/new_project.py <id> <slug> <template>
  ```
  Templates: `pico-sdk` (default for Parts 0–4), `stm32-cmsis`, `stm32-hal`, `stm32-freertos`, `zephyr-pico`, `zephyr-bluepill`.
  The generator makes `projects/<id>-<slug>/starter` and `/solution`. Use `--single` for a demo with no exercise.
- Edit `main.c` and `diagram.json` in both folders. The starter compiles and runs but leaves the task undone (with `TODO(learner)` comments). The solution is complete and well commented.
- Diagram parts: use real Wokwi part types (e.g. `wokwi-led`, `wokwi-resistor`, `wokwi-pushbutton`, `wokwi-potentiometer`, `wokwi-ssd1306`, `wokwi-logic-analyzer`), and keep the serial monitor connections from the template.
- **Both folders must build:**
  ```
  python -I tools/build.py projects/<id>-<slug>/starter
  python -I tools/build.py projects/<id>-<slug>/solution
  ```
- **Lint every diagram** (checks part types and pin names, no token needed):
  ```
  ~/.wokwi/bin/wokwi-cli.exe lint projects/<id>-<slug>/solution
  ```
  or run `python -I tools/verify_projects.py <id>`, which builds, lints and checks the wokwi.toml paths in one go. Zero `✗` errors are required. `[unsupported-part]` info lines for logic gates are fine. **Lint does not check custom chips** (`chip-*` parts): it accepts any pin name and does not check the `[[chip]]` binary path. Check those by hand against your `.chip.json`.
- If `WOKWI_CLI_TOKEN` is available, also run the solution:
  ```
  python -I tools/sim.py projects/<id>-<slug>/solution --expect "<text the solution prints>"
  ```
  Design solutions to print a recognisable line on the serial monitor so they can be auto-checked.
- In the lesson, tell the learner: open the `starter` folder in VS Code, press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> to build, then <kbd>F1</kbd> → "Wokwi: Start Simulator". For debugging: start the simulator, then press <kbd>F5</kbd>.
- Code style: C11, `stdint.h` types, `static` for file-local functions, named constants (no magic numbers), and comments that explain **why**. No Arduino APIs.

## 7.1 Electronics hands-on: Falstad CircuitJS, not Wokwi
Wokwi is a **digital** simulator. It can't simulate currents, voltage dividers, transistor bias, capacitor charging and so on, and its resistors can't be combined with analog parts ([docs](https://docs.wokwi.com/parts/wokwi-resistor)). For analog electronics (Part 1, and the analog parts of later lessons) use **Falstad CircuitJS** (free, GPL, in the browser, with built-in voltmeter, ammeter and scope):
- **Built-in examples:** link `https://www.falstad.com/circuit/circuitjs.html?startCircuit=<file>`. Pick file names **only** from `tools/circuitjs/setuplist.txt`, e.g. `ohms.txt`, `voltdivide.txt`, `res-series.txt`, `res-par.txt`, `npn.txt`, `nmosfet.txt`, `cap.txt`, `induct.txt`, `inductkick.txt`, `inductkick-snub.txt`, `diodecurve.txt`, `ledflasher.txt`.
- **Custom circuits:** embed a netlist in `<pre class="circuitjs" data-title="...">…</pre>`; course.js adds an "Open in CircuitJS" button. Only write netlists by **editing values in a verified example** from `tools/circuitjs/` (`ohms.txt`, `voltdivide.txt`, `npn.txt`, `nmosfet.txt`); never invent element lines. Fetch other examples from `https://raw.githubusercontent.com/sharpie7/circuitjs1/master/src/com/lushprojects/circuitjs1/public/circuits/<file>` if needed.
- **Best practice:** have the learner *build* a small circuit themselves, following numbered steps (drawing schematics is a job skill). Then they measure, and type the measured value into a `number` quiz question, which gives them feedback.
- Use Wokwi only where the behaviour is digital: GPIO levels, pull-ups on buttons, logic levels, the ADC reading a potentiometer.

## 8. Concept-only (💡) and optional (⭐) lessons
- A theory lesson without a Wokwi or CircuitJS task (e.g. lesson 45) adds `data-concept` to `<body>` so the checker doesn't warn. It still needs an interactive exercise (quiz, spot-the-bug, widget).
- The checker's placeholder scan only looks for template text; `TODO(learner)` is allowed. To write the word TODO in prose, use `TODO(learner)` or rephrase.
- PDFs: WebFetch can't read them. Download with curl into the scratchpad and extract with `pdftotext` (available in Git Bash).
- Concept-only: replace the Wokwi task with an interactive in-page exercise (calculation, ordering, "spot the bug", a timing diagram to interpret). Say briefly why it isn't simulated, and what real hardware the learner would use.
- Optional: say at the top that the lesson is optional and what it's useful for.

## 9. Labs and checkpoints
- **Lab:** a larger build combining the part's skills. Give a requirements list (numbered), acceptance criteria the learner can check, staged milestones, and hints in `<details>`. A starter and a solution project are required.
- **Checkpoint:** ≥ 15 mixed questions across the whole part, plus 2–3 "explain out loud" prompts. Tell the learner which lessons to revisit for anything they miss.

## 10. Reference sheets and glossary
- When your lessons introduce reusable facts (formulas, register fields, API calls), add them to the relevant sheet in `reference/`. File names are in `tools/build_reference.py`. Create the sheet from the same HTML shell as `reference/glossary.html` if it doesn't exist yet. Sheets are dense, scannable and printable: tables and short code, no prose paragraphs.
- **Several authors work in parallel, so do NOT edit `GLOSSARY.md` or `RESOURCES.md` directly.** Instead write your proposed additions to `tools/proposals/<your-first-lesson-id>.md`, using the exact formats of those files. The lead merges them. You may link to glossary anchors you propose: anchor = term lowercased, non-alphanumerics → `-` (e.g. `#pull-up-resistor`). The checker won't flag anchors.
- Link lessons to reference sheets and glossary anchors (`../reference/glossary.html#interrupt`), and to earlier lessons by file name.

## 11. Shared components
- Before writing any interactive widget, check `assets/` for an existing one. If you need something reusable, make it a new file in `assets/` with a header comment explaining its usage. Don't inline code a future lesson would duplicate. Keep component code dependency-free (vanilla JS) so it works offline from `file://`.

## 12. Finish checklist (do all of these before reporting)
1. `python -I tools/build_manifest.py` (marks your lessons as published)
2. `python -I tools/build_reference.py` (if you touched the glossary or sheets)
3. `python -I tools/check_course.py lessons/<your files>`: **zero errors**. Fix warnings unless there's a reason not to.
4. Every project folder builds (and simulates, if a token is available).
5. Report back, briefly:
   - files created or changed
   - build and simulation results
   - any facts you couldn't verify
   - any deviations from this spec and why

## 13. Don'ts
- Don't change `assets/course.css`, `assets/course.js`, `tools/*.py`, the templates or `COURSE-PLAN.md`. If you think they need changing, say so in your report.
- Don't touch lessons outside your assignment.
- Don't install software.
- Don't use Arduino APIs, copy text from copyrighted sources, or invent citations.


## 14. Shared files: never overwrite blindly
Several authors work in parallel. Before writing any file that might already exist (reference sheets, shared headers), **Read it first and edit it in place**. Never replace a file you did not create. If a reference sheet you want to add to already exists, append your section with Edit.

## 15. Host unit-test projects (lesson 80 onward)
- Template `host-test`: plain C compiled with the PC's MinGW gcc, Unity (third_party/Unity) and FFF (third_party/fff). Create it with `python -I tools/new_project.py <id> <slug> host-test`.
- Build and run the tests: `python -I tools/build.py projects/<id>-<slug>/solution --test` (it runs ctest). The solution must pass all tests; the starter may have failing tests by design (TDD), and the lesson says so.
- These projects have no wokwi.toml, so verify_projects.py skips them. Run `build.py --test` yourself and quote the real summary line in your report.
- cppcheck: `"/c/Program Files/Cppcheck/cppcheck.exe" --enable=warning,style --quiet <files>`. CMock needs Ruby, which is not installed: teach it conceptually and use FFF hands-on.

## 16. Embedded Rust projects (lesson 108)
- Template `rust-pico`: rp2040-hal 0.11, cortex-m-rt 0.7, embedded-hal 1.0, rp2040-boot2 0.3, built with the GNU host toolchain pinned in rust-toolchain.toml (stable-x86_64-pc-windows-gnu + thumbv6m-none-eabi, already installed). Create with `python -I tools/new_project.py <id> <slug> rust-pico`.
- `python -I tools/build.py <dir>` runs `cargo build --release` (release has debug info). The ELF is target/thumbv6m-none-eabi/release/blink, which wokwi.toml points at. If you rename the package in Cargo.toml, update wokwi.toml too.
- Do not install extra cargo tools (probe-rs, flip-link, elf2uf2-rs): Wokwi runs the ELF directly.
