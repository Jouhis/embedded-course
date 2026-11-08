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
- Already programs (doesn't need loops, functions, variables or basic C syntax explained), but is **new to electronics and new to embedded**. Assume nothing else: no prior knowledge of registers, buses, interrupts, RTOSes, datasheets, voltages or toolchains beyond what earlier lessons in this course taught. A lesson must work for someone meeting the topic for the first time, not only as a refresher. See section 17.
- Studied computer architecture at university and found it very helpful. Connect explanations to what the CPU, the bus and memory actually do.
- Practice-focused: wants industry practice (plain C, vendor SDKs, testing), not Arduino. No career, portfolio or interview material.
- Number everything with **digits only** (1, 2, 2.1). Never use letters (A, B) or Roman numerals.

## 3. What a lesson is
- **One skill, taught from the ground up**, in about **25–40 minutes** including the hands-on task. The explainer is typically **2,500–3,500 words** of prose (not counting code, quizzes and diagrams). If a topic needs much more than that to be explained properly, it is too big for one lesson: say so in your report (the lead splits lessons; never renumber or create lessons yourself).
- **Knowledge first, then skill.** A short explainer, then a hands-on task with a feedback loop (a Wokwi exercise and/or a quiz).
- **One tangible win**, stated in the `.win` box.
- Beautiful and printable: Tufte style, short paragraphs (3–5 sentences), clear `<h2>`/`<h3>` headings every few paragraphs, inline SVG diagrams. Long is fine; walls of text are not: break it up with headings, lists, tables, diagrams and worked examples.
- Code blocks name their language: `<pre><code class="language-c">`. Allowed: `c`, `armasm`, `bash`, `powershell`, `cmake`, `dts`, `ini` (also prj.conf and TOML), `rust`, `markdown`, `yaml`, `ld` (linker script), `kconfig`, and `plaintext` for logs, tool output and worked arithmetic. Write the code as plain escaped text with no `<span>` markup; `course.js` highlights it. Inside quiz JSON, escape the quotes: `<pre><code class=\"language-c\">`. The checker enforces this.

## 4. Required structure (enforced by `tools/maintainer/check_course.py`)
File: `lessons/<file>` where `<file>` is the **exact** file name from `assets/manifest.js`, and `<body data-lesson="<id>">` uses the exact id (`0007`, `lab03`, `cp02`).

| Section | Lessons | Labs | Checkpoints |
|---|---|---|---|
| `.goal` (one checkable skill) | required | required | required |
| Explainer with citations | required | short brief | none |
| Hands-on Wokwi task | required unless concept-only | required (bigger) | optional |
| `.win` | required | required | none |
| Quiz "Check your understanding" | ≥ 4 questions | ≥ 3 | ≥ 15, mixed across the whole part |
| Quiz "Spaced review" (2–3 questions from **earlier** lessons) | required from lesson 5 on | optional | none |
| `.source` (one best primary source, with sections or timestamps) | required | required | optional |
| `.ask` (remind the learner to ask the agent, with a suggested question) | required | required | required |

Leave `<p class="lesson-meta"></p>` empty, and don't write a pager or "mark complete" button: `course.js` adds those.

## 5. Quizzes: questions that teach
A quiz is part of the teaching, not a memory test. A good question makes the learner **use** the idea in a situation they could meet at work, and its feedback leaves them knowing something they didn't before. The engine and its JSON format are documented at the top of `assets/course.js`.

### What a question looks like
- **Put the learner in a situation.** For example: a bug report, a serial-monitor log, a short code snippet (`<pre><code>` is allowed in prompts), a datasheet line, a scope reading, a design choice with a budget, or a real product. Then ask them to predict, diagnose, fix, calculate, estimate or choose.
- **Mix the kinds of question:**
  - *Predict*: what does this code print, and what does the LED do?
  - *Diagnose*: symptom to cause.
  - *Fix*: which one-line change works?
  - *Calculate in context*: then interpret the result ("is a 0.25 W resistor enough?").
  - *Sanity-check*: an estimate or a claimed result.
  - *Choose*: a design, and its trade-off.
  - *Spot the mistake*: in a snippet or a wiring description.
- **Avoid:**
  - Pure vocabulary ("what is the name of…").
  - "Which of these is true".
  - "In lesson N, what is…".
  - Questions answered by finding a keyword in the paragraph above.
  - Trick questions.
  - Free text for anything with many valid phrasings.

### Feedback that teaches
- `why` explains the reasoning **and** adds one useful insight beyond the answer: a rule of thumb, what happens on real hardware, the common mistake, or how it connects to a later topic.
- Every `mc` option gets a `feedback` line (same order as `options`). For a wrong option, it names the misconception behind it and why it fails. For the right option, it confirms the key step. Distractors must be real beginner mistakes, never filler.
- `hint` (optional, any type) nudges toward the method ("start from P = V × I and replace V"), never the answer. It shows on request and after a wrong attempt.
- `reflect` (unscored): an "explain it to a colleague" or design-reasoning prompt with a strong model `answer`. Use 0–2 per lesson, where the reasoning matters more than a single value.

### Answer formats: accept every correct way of writing it
- **Formulas** use `"type": "formula"`. Give `vars` (the variable names exactly as the lesson writes them, e.g. `["Vin", "R1", "R2"]`), `answer` in plain ASCII (`Vin*R2/(R1+R2)`), and `display` (the pretty form shown on "Show answer").
  - `examples`: at least 2 other ways a learner might write it, such as reordered, implicit multiplication, `²` or `×` (`R2*Vin/(R2+R1)`, `Vout = Vin × R₂/(R₁+R₂)`).
  - `wrong`: the tempting mistakes, each with feedback that explains it: `{"answer": "Vin*R1/(R1+R2)", "feedback": "That is the voltage across R1, the top resistor."}`. When a learner types one, they see that explanation instead of a bare "Not quite". `number` and `text` questions take the same `wrong` list (for a number, `answer` is a number, matched within the tolerance).
  - The checker verifies all of these with the same engine the page uses. The engine accepts any algebraically equivalent input, with or without a `P =` left side. If the variables can be zero or negative, set `range`.
- **Numbers** use `"type": "number"`, with `unit` and a sensible `tolerance` (0.05 when E-series rounding or reading a graph is involved). SI prefixes (`4k7`, `10m`), `330R`, hex and binary are accepted automatically.
- **Text** is only for short, canonical tokens: a register or field name, a keyword, a pin name. List the variants in `accept`. Case, spaces, hyphens, quotes and a leading "the" are ignored. Use `contains` when any answer containing a key word is right. If an answer can be phrased many ways, use `mc` or `reflect` instead.
- **Multiple choice**: 3–5 options, no duplicates, and lengths within 50 % of each other (the checker enforces it, so the right answer is never the obvious longest). Vary which authored position is correct. Options are shuffled at runtime.

### How many
- **Check your understanding**: as many as the lesson's ideas deserve, usually 4–8. A short concept lesson may have 3; a dense one up to 10. No fixed count. The checker requires at least 3 scored questions per lesson or lab, and 10 per checkpoint.
- **Spaced review**: 2–3 questions that **apply** an idea from at least 2 lessons back to this lesson's context. For example, in the I²C lesson: "the bus has 4.7 kΩ pull-ups from lesson 16; how long does SDA take to rise…".
- **Checkpoints**: 10–15 mixed, scenario-heavy questions across the part, plus one or two `reflect` design questions.

### Correctness
Every question must be answerable from this lesson and earlier ones. Work out every number yourself before writing it down. Options and feedback must not introduce unchecked facts (section 6).

## 6. Facts and citations: never trust your memory
- Every hardware or protocol fact needs a citation link, preferably to a vendor primary source in `RESOURCES.md` (with the section or page).
- Each `<h2>`/`<h3>` gets an anchor from its text (`assets/search.js`), and search results link to it. Give a heading an explicit `id` if another page links to it, so renaming the heading doesn't break the link.
- Every external link opens in a new tab: `<a href="https://..." target="_blank" rel="noopener">`. `check_course.py` rejects one without it.
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
- **Every solution needs a pass line**, a comment in `main.c` (or `src/main.rs`) at the top or on the
  line that prints it, or `verify_projects.py` and CI report it:
  ```
  // EXPECT: <the serial text that means the run worked>
  // SIM-SCENARIO: press-button.yaml    (optional: a Wokwi scenario that presses buttons or sets inputs)
  // SIM: skip <reason>                 (instead of EXPECT, when the run can't be checked by its output)
  ```
  Print the pass line only once the result is right (for example `QUEUE OK` after the third item),
  not at start-up. FreeRTOS projects on the STM32 are build-only without a `SIM` line, because
  Wokwi's STM32 core cannot run FreeRTOS (CHANGELOG, 0.0.3 known issues).
- In the lesson, tell the learner: open the `starter` folder in VS Code, press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> to build, then <kbd>F1</kbd> → "Wokwi: Start Simulator". For debugging: start the simulator, then press <kbd>F5</kbd>.
- Code style: C11, `stdint.h` types, `static` for file-local functions, named constants (no magic numbers), and comments that explain **why**. No Arduino APIs.

## 7.1 Electronics hands-on: Falstad CircuitJS, not Wokwi
Wokwi is a **digital** simulator. It can't simulate currents, voltage dividers, transistor bias, capacitor charging and so on, and its resistors can't be combined with analog parts ([docs](https://docs.wokwi.com/parts/wokwi-resistor)). For analog electronics (Part 1, and the analog parts of later lessons) use **Falstad CircuitJS** (free, GPL, in the browser, with built-in voltmeter, ammeter and scope):
- **Built-in examples:** link `https://www.falstad.com/circuit/circuitjs.html?startCircuit=<file>`. Pick file names **only** from `tools/maintainer/circuitjs/setuplist.txt`, e.g. `ohms.txt`, `voltdivide.txt`, `res-series.txt`, `res-par.txt`, `npn.txt`, `nmosfet.txt`, `cap.txt`, `induct.txt`, `inductkick.txt`, `inductkick-snub.txt`, `diodecurve.txt`, `ledflasher.txt`.
- **Run it in the page:** put `<div class="circuitjs-live" data-start="<file>" data-title="..."></div>` next to the steps that use a built-in example, and keep the link in the steps as the full-size fallback. The simulator loads when it scrolls into view.
- **Custom circuits:** embed a netlist in `<pre class="circuitjs" data-live data-title="...">…</pre>`; `data-live` runs it in the page, and without it course.js adds only an "Open in CircuitJS" button. A solution netlist goes inside `<details>`, so its simulator loads only when opened. Only write netlists by **editing values in a verified example** from `tools/maintainer/circuitjs/` (`ohms.txt`, `voltdivide.txt`, `npn.txt`, `nmosfet.txt`); never invent element lines. Fetch other examples from `https://raw.githubusercontent.com/sharpie7/circuitjs1/master/src/com/lushprojects/circuitjs1/public/circuits/<file>` if needed.
- **Best practice:** have the learner *build* a small circuit themselves, following numbered steps (drawing schematics is a core skill). Then they measure, and type the measured value into a `number` quiz question, which gives them feedback.
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
- When your lessons introduce reusable facts (formulas, register fields, API calls), add them to the relevant sheet in `reference/`. File names are in `tools/maintainer/build_reference.py`. Create the sheet from the same HTML shell as `reference/glossary.html` if it doesn't exist yet. Sheets are dense, scannable and printable: tables and short code, no prose paragraphs.
- **Several authors work in parallel, so do NOT edit `GLOSSARY.md` or `RESOURCES.md` directly.** Instead write your proposed additions to `tools/maintainer/proposals/<your-first-lesson-id>.md`, using the exact formats of those files. The lead merges them. You may link to glossary anchors you propose: anchor = term lowercased, non-alphanumerics → `-` (e.g. `#pull-up-resistor`). The checker won't flag anchors.
- Link lessons to reference sheets and glossary anchors (`../reference/glossary.html#interrupt`), and to earlier lessons by file name.

## 11. Shared components
- Interactive widgets in `assets/` (each file's header comment gives the markup):
  - `cpusim.js`: the CPU simulator. `data-show` picks panels; `datapath` draws the CPU as blocks and lights up the wires each phase uses; `bus` adds a one-shared-bus and a Harvard (I-bus + D-bus) transfer timeline side by side (`data-bus="shared"` or `"harvard"` shows one). Flags and instruction kinds have fixed colours.
  - `logicsim.js`: clickable gates, latches and flip-flops, with a truth table (combinational) or a timing diagram (sequential). `history` fixes the timing diagram's length, and `auto` adds a Run button that toggles one input.
  - `anim.js`: a step-by-step animated diagram. An inline SVG plus an `<ol>` with one caption per step; `data-s`, `data-on`, `data-text` and `data-at` on SVG elements say what each step shows. Use it for worked examples that happen in order.
  - `bits.js`: `bitreg`, `bitdrill`, and `floatbits` (the fields of an IEEE 754 float, with Q15 beside it).
  - `cachesim.js`: a set-associative cache, stepped one access at a time.
  - `memmap.js`: decodes an address into region, block, base and offset (STM32F103 and RP2040), with a drill.
  - `faults.js`: `faultdecode` (CFSR and HFSR, Cortex-M3) and `mpusim` (the RP2040 MPU and its HardFault).
  - `clocktree.js`: the STM32F103 and RP2040 clock trees, with the limits checked.
  - `circuit-calc.js`: Ohm's law, power, divider and LED calculators.
  - `memlayout.js`: which section each declaration goes in, the lesson 41 build's memory map, and the startup code step by step (`data-parts` picks quiz, map, startup).
  - `ctypes.js`: `cpromote` (integer promotion and conversion, with undefined behaviour flagged) and `structlayout` (padding, packing, byte order).
  - `signals.js`: `debounce` (the lesson 52 integrator), `adcchain` (NTC to ADC code and back, noise and averaging) and `filterlab` (moving average, fixed-point EMA, median, aliasing).
  - `buswave.js`: I²C, UART and SPI waveforms (`data-bus`), with a receiver clock error and an SPI mode mismatch.
  - `timing.js`: `pwmcalc` (STM32 timer or RP2040 PWM slice, the plus-one rule) and `irqtimeline` (STM32F103 NVIC preemption, grouping, PRIMASK).
  - `rtossim.js`: a fixed-priority scheduler timeline with semaphore and mutex (priority inheritance) and the rate-monotonic bound (`data-preset`, optionally `data-presets`).
  - `crcframe.js`: Modbus RTU frames with CRC-16/MODBUS, a shift-by-shift trace and bit flips on the wire.
  - `fsm.js`: the lesson 56 traffic light, table-driven, with an editable table.
  - `pidsim.js`: the lesson 108 heater and PID controller; it reproduces the lesson's tuning table.
  - `levels.js`: `logiclevel` (input thresholds, hysteresis on a noisy edge, an open-drain line with its pull-up current and rise time).
  - `race.js`: `racestep`, two contexts sharing memory, stepped in the reader's order (`data-preset` cores, isr-flag, odr, volatile), with the lesson's fix as an option.
  - `wrap.js`: `wraptime`, a timeout across the counter wrap, checked three ways (`data-preset` systick, blink, small; `data-unit`).
  - `bytes.js`: `cobs` (encoder trace, decoder, CRC-16/CCITT-FALSE) and `glyph` (5 by 7 column bytes, SSD1306 page addressing).
  - `canbus.js`: `canbus`, arbitration bit by bit and bit stuffing with flips on the wire.
  - `budget.js`: `powerbudget` (duty-cycled current and battery life) and `dmaring` (circular DMA with HT and TC deadlines).
  - `macro.js`: `macroexp`, a macro pasted as tokens and then grouped by precedence.
  - `kernel.js`: `queuesim` (a queue, a binary and a counting semaphore fed by an ISR) and `stackmark` (a painted stack and its high-water mark).
  - `boot.js`: `bootcheck`, the lesson 104 bootloader's slot checks, in order.
  A widget with `data-chip`, `data-bus` or a preset group shows only that lesson's options; keep widgets to what the lesson needs.
  - `plot.js`: the shared line-plot helper; load it before `pidsim.js`, `signals.js`, `timing.js` and `levels.js`.
  A widget's numbers come from the lesson's sources: when a lesson's value changes, change the widget's table too.
- A widget must keep the same size while it plays, steps or fills: reserve room for logs, results and captions instead of letting the page jump.
- Before writing any interactive widget, check `assets/` for an existing one. If you need something reusable, make it a new file in `assets/` with a header comment explaining its usage. Don't inline code a future lesson would duplicate. Keep component code dependency-free (vanilla JS) so it works offline from `file://`.

## 12. Finish checklist (do all of these before reporting)
1. `python -I tools/maintainer/build_manifest.py` (marks your lessons as published)
2. `python -I tools/maintainer/build_reference.py` (if you touched the glossary or sheets)
3. `python -I tools/maintainer/check_course.py lessons/<your files>`: **zero errors**. Fix warnings unless there's a reason not to.
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

## 16. Embedded Rust projects (lesson 111)
- Template `rust-pico`: rp2040-hal 0.11, cortex-m-rt 0.7, embedded-hal 1.0, rp2040-boot2 0.3, built with the GNU host toolchain pinned in rust-toolchain.toml (stable-x86_64-pc-windows-gnu + thumbv6m-none-eabi, already installed). Create with `python -I tools/new_project.py <id> <slug> rust-pico`.
- `python -I tools/build.py <dir>` runs `cargo build --release` (release has debug info). The ELF is target/thumbv6m-none-eabi/release/blink, which wokwi.toml points at. If you rename the package in Cargo.toml, update wokwi.toml too.
- Do not install extra cargo tools (probe-rs, flip-link, elf2uf2-rs): Wokwi runs the ELF directly.

## 17. Depth standard: explain from the ground up
A learner who has never seen the topic must be able to follow the lesson without looking anything up. Every lesson's explainer covers, in this order (use these as `<h2>` sections, with your own wording for the headings):

1. **Where we are and why it matters.** One or two paragraphs linking to the earlier lessons this builds on (with links), and the concrete problem this lesson solves. Name a real product or project situation where it comes up.
2. **The concepts, one at a time.** Introduce each idea separately before combining them. **Define every term on first use**, in plain words, before using its abbreviation (for example "the Nested Vectored Interrupt Controller (NVIC), the part of the CPU that ..."). Link the term to `../reference/glossary.html#<anchor>` the first time. Explain *why* the hardware or software works this way, not only *what* to do: connect it to what the CPU, the bus and memory physically do.
3. **A worked example, step by step.** Walk through one concrete case with real numbers: a calculation, a register value built bit by bit, a timeline, or a trace of what happens cycle by cycle or event by event. Show intermediate steps; never jump to the answer.
4. **The code, explained line by line.** Every code snippet is followed (or preceded) by an explanation of each line or small group of lines: what it does, which register or API it touches, and why it is written that way. For register writes, name each field and the value written to it, with the reference-manual or datasheet section.
5. **Common mistakes and how to spot them.** At least three realistic mistakes beginners make with this topic, each with its symptom (what you see in Wokwi or on the serial monitor) and the fix.
6. **In real projects.** How professionals use this: typical industry practice, and what code review or a senior engineer would expect.
7. **Summary.** 5–8 bullet points with the key facts to remember.

Then the hands-on task, `.win`, quizzes, `.source` and `.ask` as in section 4. Hands-on instructions are numbered steps that say exactly what to open, what to change and what output to expect.

Rules:
- Keep everything already correct in the lesson: facts, citations, links, project references, quizzes and diagrams. You are expanding and improving, not replacing. Fix anything wrong you find, and verify every new fact (section 6).
- Quizzes follow section 5: questions that make the learner use the new material, with feedback that teaches.
- Every new fact, number, register name, bit position or API signature must come from a source you checked (section 6), not from memory. If you cannot verify something, leave it out.
- Diagrams: add one when it explains something better than words (timing, memory layout, signal flow). Follow the style of the existing diagrams: `currentColor` strokes and text, `font-family="JetBrains Mono, monospace"`, `role="img"` and an `aria-label`. Check them by rendering (see the diagram notes in NOTES.md if any); never add a diagram you have not looked at.
- Don't change the Wokwi projects unless the lesson text and project disagree; if they do, fix the lesson text to match the working project and mention it in your report.
- Concept-only lessons (section 8) and labs follow the same depth standard; labs explain the design choices, not only the steps. Checkpoints keep their quiz format.
