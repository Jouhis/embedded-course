---
name: look-inside-demo
description: Build or restyle a "Look inside" device demo (inside/<device>.html), the interactive, animated pages that open up an everyday device and show its pins, signals and firmware. Use when asked to make a new Look inside page or example, add a device to the inside/ gallery, or clean up or restyle an existing one. Covers the design rules, the shared kit assets/inside.js, the page template and a headless screenshot/test script.
---

# Look inside demos

Read this whole file before starting each device, even if you built one earlier in the session.

A Look inside page is an **interactive demo, not a lesson**. It has the course's look (colours, fonts,
buttons) but none of the lesson structure: no goal box, no long explainer, no quizzes. A learner who
has not started Part 1 should be able to play with it and see what happens inside the device.
The reference implementation is `inside/elevator.html` with `assets/inside-elevator.js`.
Open both before writing a new one.

## 1. What a page contains

Only these, in this order:

1. The nav (`← Course index`, `Look inside`), `p.lesson-meta` "Look inside · N", `h1` "Inside a/an
   <device>", a `.subtitle` of a few words, and **one or two sentences** saying what the scene shows.
2. One `<div class="widget <device>">`: the demo.
3. `h2` "Things to try" and a `ul.try` of 3 or 4 cards: `<li><b>Short title</b>One or two sentences.</li>`.
   Each card is something to click, and what to watch while doing it.

`<body class="demo">` makes `main` wide (72rem) and styles `.try` (course.css, end of file).
No `.source`, no `.ask`, no quiz, no "where the course teaches it" table: the lesson links live in
the callouts and the firmware card.

## 2. What the demo contains

One widget card built with the kit, in this layout. The viewBox is 1200 wide; height as needed (about 600 to 660).

- **Toolbar** (`I.frame` `bar`): the device's own inputs on the left (round `I.pill` buttons, which
  light up with `.lit`), actions in the middle (`I.btn`; destructive or safety actions get `"stop"`;
  disable a button when it can do nothing), and on the right `Speed` and `Labels` segmented
  controls (`I.seg`). Labels is always `Auto | All | Off`, default Auto.
- **Scene, left about two thirds**: the physical device drawn simply (rects, lines, a few
  symbols), every sensor and actuator wired to **one chip** with labelled pin stubs (`I.chip`). Pins
  are named in capitals as in firmware: `FLOOR[3:0]`, `PWM`, `ESTOP`. Inputs come in on the left or
  bottom edge, outputs leave from the top or right, and wires never cross where you can route around.
  A 4-bit group is one `w bus` wire.
- **Firmware card, right third** (`I.card` with `from: CHIP`, dashed zoom lines): sections separated
  by rules (`I.section`), each with its lesson link at the right:
  1. the logic: a state machine (`I.stateMachine`) or the running lines of a short C loop (`I.code`)
  2. `RAM`: 5 to 8 variables with C types, values in accent, bit fields as `I.bits(...)` (lesson 20)
  3. `UART LOG` (lesson 53): the newest 6 events, `[  12.34] IDLE → MOVING  target 3`, `irq: ...`
- **Callouts** (`I.callouts`): cards with a mono title, 2 to 4 short lines, the lesson links on the
  last line, and a leader line with a dot at the exact wire, pin or part they explain. Auto mode shows
  one when its signal changes (`co.show(id)`) or the pointer is over the part (`co.hot(el, id)` on the
  part or on an `I.hotspot`). Place them in free space: a left lane (x 8 to 165) for the device side,
  gaps between the device and the chip, the strip under the scene. Check them in **All** mode: no
  card may cover another or hide a moving part that matters.
- **Logic analyzer** (`I.analyzer`) under the scene: 4 to 6 lanes named like pins, with a kind
  (`in · active low`, `PWM out`, `ADC`, `in · IRQ`). Types: `dig`, `pwm` (drawn with a slowed period,
  and the note says so), `ana` (a line, `max` sets the scale). The window is a few seconds of sim time.

Wire and part states: idle wires are dim (`w`); a wire whose signal is active gets `on` (accent,
moving dash); a part that is on gets `box on` or its own class. Use `I.cls(el, c)`, which only writes
when the class changes, so the dash animation does not restart every frame.

Colours, only the course tokens: accent for active signals and the current state, `--warn` for
PWM and heat, `--bad` for faults, alarms and safety stops, `--good` for OK states. Never hard-code hex.

## 3. Firmware model and honesty

- Write the device as firmware: a `firmware()` pass every tick (10 ms is typical), reading inputs
  and setting outputs, plus a separate `physics(dt)` for the world. The scene, RAM, log and analyzer
  show only what that model computes, so they always agree.
- Use course terms exactly (GLOSSARY.md): active low, pull-up, debounce, interrupt, duty cycle,
  state machine, ISR, endpoint. Pin and variable names look like real firmware.
- Numbers that are made up for the picture (speeds, times, sizes) are fine, but say in the script's
  header comment that they are illustrative, and never present them as a product's real values.
  Any hardware or protocol fact stated as fact must come from a lesson that already cites it, or
  from a primary source you have read (a datasheet or a specification, with its section). Prefer
  linking the lesson to stating the fact.
- Never name, imitate or brand a real product or company. The device is generic.
- Every callout and section links the lessons that teach that part. Find lesson numbers with
  `grep -n '"number"\|"title"' assets/manifest.js`; the kit turns numbers into links from the manifest.

## 4. The kit (assets/inside.js), in brief

```js
const I = window.Inside, S = I.S, cls = I.cls;
I.chip(svg, { x, y, w, h, name, sub, labelAt: [x, y], left: [[y, "PIN"]], top: [[x, "PIN"]], right, bottom });
I.card(svg, { x, y, w, h, from: CHIP });
I.section(svg, { x, x2, y, title: "RAM", lessons: [20], sep: true });
const sm = I.stateMachine(svg, { w, h, states: { A: [x, y] }, paths: { "A>B": "M.. H.." }, labels: [[t, x, y, "mid"]], stop: ["FAULT"] });
sm.set(state, "A>B");                     // light the state and the last transition
const code = I.code(svg, { x, y, w, lines: [...] }); code.set([1, 2]);
const ram = I.ram(svg, x, y); ram.set([`${I.k("uint8_t ")}calls = ${I.bits(v, 4)}`, `... = ${I.v(42)}`]);
const uart = I.uart(svg, { x, y, n: 6, empty: "waiting…", fmt: t => ... }); uart.log(t, "text"); uart.render();
const co = I.callouts(svg, [[id, x, y, w, "Title", ["line", "line"], [52, 57], [tx, ty] or () => [tx, ty]]]);
co.hot(element, id); co.show(id, ms); co.update(now, labels); co.raise();
const la = I.analyzer({ secs, note, label: ago => "..", lanes: [{ name, kind, key, type, period, max, cls }] });
la.push(t, sig); la.draw(t);
I.frame(box, { bar: [[...], [...], [...]], scene: svg, analyzer: la });
I.loop({ tick, speed: () => speed, every: 2, step(dt) {...}, sample() {...}, render(now) {...} });
I.register("device", mount, CSS);           // CSS: only device parts, scoped as .device .part
box._demo = { m, ...actions, setLabels: v => { labels = v; } };   // for tests
```

Sim time can be in any unit (seconds, or milliseconds for fast devices); `tick`, `speed` and the
analyzer's `secs` and `label` all use that unit. For very fast things (a key matrix scan, a bus
frame), offer slow-motion speeds like `1/1000×` and say on the toolbar which one is real time.

## 5. Workflow

1. Read this file and the elevator files. Pick the device's 4 to 8 parts and the lessons for each.
2. Lay out the coordinates on paper first (zones above). Route every wire; list the free spaces for callouts.
3. Write `assets/inside-<device>.js` (copy the elevator's skeleton) and `inside/<device>.html` (template
   below). Scripts in order: manifest.js, course.js, inside.js, inside-<device>.js.
4. In `inside/index.html`, make the device's entry a link and give it a tag listing its parts.
5. Screenshot with all labels and a scripted scenario, look at it, fix, repeat:
   ```bash
   python -I .claude/skills/look-inside-demo/scripts/shoot.py inside/<device>.html --out <scratchpad>/shots \
     --ms 12000 --do "D.press(1); await W(3000); log('state', D.m.state);"
   ```
   Read the PNG. Check: no text overlaps text, no callout hides the moving part, wires do not run
   through labels, the analyzer shows the scenario, no JS errors. Then `--labels auto` for the default
   look. Use `--do` with `log()` to assert the firmware behaves (states, values) in 2 or 3 scenarios.
6. `python -I tools/maintainer/check_course.py` must pass (it does not scan inside/, but the index is shared).
7. Commit on the feature branch, one device per commit.

## 6. Page template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Inside a kettle · Embedded Systems Course</title>
  <link rel="stylesheet" href="../assets/course.css">
  <script src="../assets/theme.js"></script>
</head>
<body class="demo">
<nav class="course-nav"><a href="../index.html">← Course index</a><a href="index.html">Look inside</a></nav>
<main>
  <p class="lesson-meta">Look inside · 2</p>
  <h1>Inside a kettle</h1>
  <p class="subtitle">A thermistor, the ADC and a PWM heater</p>
  <p>One or two sentences on what the scene shows.</p>

  <div class="widget kettle"></div>

  <h2>Things to try</h2>
  <ul class="try">
    <li><b>Title</b>What to click, and what to watch.</li>
  </ul>
</main>
<script src="../assets/manifest.js"></script>
<script src="../assets/course.js"></script>
<script src="../assets/inside.js"></script>
<script src="../assets/inside-kettle.js"></script>
</body>
</html>
```

## 7. Pitfalls already hit

- Headless Edge never fires requestAnimationFrame; shoot.py replaces it. Real browsers are fine.
- A hotspot drawn after a clickable part swallows its clicks: append clickable parts after the hotspots,
  and call `co.raise()` last so cards sit above everything.
- Text widths for layout: mono 11 px is about 6.6 px a character, sans 10.5 px about 5.4. A callout
  150 wide fits about 26 characters a line. SVG text does not wrap: break lines yourself.
- Aligned columns in RAM lines need `xml:space="preserve"` (the kit sets it) and padded names.
- Keep labels off wires: put a pin or part label beside the wire, not on its path; check the screenshot.
- Moving parts (a car, a print head) need callout targets as functions, and hotspots inside the moving group.
- Analyzer lanes read a `sig` object pushed in `sample()`; push every 2 to 5 ticks, not every frame.
- Clicking an input while a safety stop is active should log why nothing happens, not fail silently.
- Device CSS must not reuse the kit's class names (`hot`, `cap`, `co`, `w`, `t`, `box`, `card`, `chip`, `pin`,
  `st`, `arr`, `var`, `log`, `lan`, `grid`, `code`): a part classed `hot` turned every hotspot opaque.
- A demo that compares two firmware strategies (encoder or time, poll or FIFO) teaches best: show both code
  listings with `I.code(...)` and toggle their `.g` display, and make the scene show the cost of the worse one.
