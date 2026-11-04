---
name: wokwi-browser
description: Simulate course projects in the Wokwi browser editor (no CI minutes needed) and lay out their diagram.json so the wiring is readable. Use when asked to validate, simulate or test a lab or project in Wokwi, check that a starter is not already solved, or fix messy, overlapping or hard-to-read Wokwi wiring.
---

# Wokwi in the browser: simulate labs and lay out diagrams

The Wokwi CLI (`tools/sim.py`, `tools/verify_projects.py --sim`) uses CI minutes, and the
free plan's monthly quota runs out. The browser editor compiles Pico SDK code in the cloud
for free and needs no sign-in, so drive it with Claude in Chrome instead.

Files in this skill:

| File | What it does |
|---|---|
| `scripts/browser-helpers.js` | Paste into the page once per load. Defines `__run`, `__setDiagram`, `__wires`, `__pinPos`. |
| `scripts/firmware-helpers.js` | Paste after browser-helpers.js. Runs firmware built on this machine (STM32, Zephyr, Rust, Pico 2, multi-file labs): see section 2b. |
| `scripts/payload.py` | Prints a ready `__run(...)` call for a project folder (main.c, diagram.json, EXPECT line). |
| `scripts/route.py` | Applies a layout file to a diagram.json: part positions plus explicit wire routes. Holds the pin table. |
| `layouts/*.py` | The layouts of 0002–0025, 0051–0072, 0090, 0096–0098, 0106, 0110, 0113 (also 0115–0117), lab03 (also lab04/pico, lab06), lab04bp (lab04/bluepill, lab05) and the Pico 2 bench labs. Shared pieces that layouts `exec` from `LAYOUT_DIR`: `leds_row.py` (an LED row left of the Pico), `button_gp14.py` and `btn_gp14_gnd4.py` (a button on GP14), `i2c_chip_left.py` (mystery chip left of the Pico), `bp_led_b0.py`, `bp_button_a0.py`, `bp_buttons_top.py` (Blue Pill LED, button, two buttons), `bench_small.py`. Copy the closest one as a start. |

Paths below are relative to the repo root. Run Python with `-I`.

## 1. Open the editor

1. Load the Chrome tools in one ToolSearch call (tabs_context_mcp, tabs_create_mcp, navigate,
   computer, find, javascript_tool), then make a new tab.
2. Go to `https://wokwi.com/projects/new/pi-pico-sdk`. It has two files: `main.c` and
   `diagram.json`. Projects with more files (headers, CMake) need them inlined into main.c.
3. Click the `diagram.json` editor tab once, so its Monaco model exists.
4. Paste the whole of `scripts/browser-helpers.js` into `javascript_tool`. It returns
   `'wokwi helpers installed'`. Reloading the page drops the helpers; paste them again.

## 2. Run a project

```bash
python -I .claude/skills/wokwi-browser/scripts/payload.py projects/0022-logic-gates/solution
python -I .claude/skills/wokwi-browser/scripts/payload.py projects/0022-logic-gates/starter --secs 8
```

Paste the printed line into `javascript_tool`. A starter is checked against its solution's
`// EXPECT:` line. The result is `{started, passed, secs, tail, missing}`:

- `started: false`: the run never began (compile error or stuck page). That is unknown, not
  a fail. Take a screenshot, read the compile output, fix, retry.
- `passed`: the expected text appeared. `tail` is the last 500 characters of serial output.
- The first run of a page takes 10–20 s (cloud compile). Use `--secs 8` for starters: they
  should never pass, so there's no point waiting long.

Keep payloads small: `javascript_tool` takes the code inline. For a quick experiment write
a cut-down main.c in the call rather than pasting a long file twice. Comments can go: they
don't change what runs.

Runs longer than about 30 s can time out the tool call. Use the queue helper instead:
`__q([[label, files, secs, expect], ...])` starts the runs one after another and returns at
once; `await __wait(60)` then returns `{done, r: [{lbl, st, ok, secs, tail}]}`. If the tool
reports `[BLOCKED: Cookie/query string data]`, it didn't like the serial text: return only
`lbl`, `ok` and `secs`, or strip punctuation from `tail`.

The page can't `fetch` from a local server (blocked), so files always go inline.

Projects with more files: inline the local headers and append the other `.c` files into one
main.c (`src/` too). Generated headers such as `pattern.pio.h` are in the project's `build/`.
A lab that needs a button press (0057): start the run, screenshot, then `left_click` the
button on the canvas.

## 2b. Run locally built firmware (STM32, FreeRTOS, Zephyr, Rust, Pico 2, multi-file labs)

The editor can't compile these, but it runs any firmware file: build it here
(`python -I tools/build.py <project>`) and hand Wokwi the `.hex`/`.elf` named in the
project's `wokwi.toml`. Any editor page works (the Pico SDK one is fine): the board comes from
the diagram you load, so a Blue Pill diagram runs STM32 firmware.

1. Open the editor and paste `browser-helpers.js` as in section 1, then paste
   `scripts/firmware-helpers.js`. It adds a file input labelled "firmware stand-in".
2. `find` "file input labelled 'firmware stand-in'" once; its ref stays valid until the page
   reloads.
3. Custom-chip labs (0063, 0098, lab03–lab06, bench08): add the chip files once per page
   load. Click the dropdown next to the file tabs (about (160, 29)), click "Upload file(s)..."
   (about (200, 95)), then `file_upload` `mystery.chip.c` and `mystery.chip.json` to the input
   labelled "project file stand-in". They show up as file tabs; the chip compiles in the
   cloud and answers uploaded firmware. Its first reading can take a second (`T=none`).
4. One `browser_batch` per run (or two or three runs; keep a batch under ~40 s of waiting, a
   longer one times out and can hang Chrome):
   ```
   file_upload      ref=<stand-in>, paths=[<abs dir>/diagram.json, <abs dir>/build/blink.hex]
   javascript_tool  await __fwWait('EXPECT TEXT', 10)
   ```
   The stand-in stops the run, loads the diagram, then triggers Wokwi's "Upload Firmware and
   Start Simulation" with the file. `__fwWait` returns `{started, passed, secs, tail}`, plus
   `error` when the diagram couldn't load (open the diagram.json tab once). A starter that
   prints the same text as the run before shows `started: false`.
5. A lab that waits for a button (0072, 0096, 0097): press it from the same call, before the
   wait:
   ```js
   setTimeout(() => { const b = document.querySelector('wokwi-pushbutton');
     b.dispatchEvent(new Event('button-press'));
     setTimeout(() => b.dispatchEvent(new Event('button-release')), 200); }, 3000);
   await __fwWait('EXPECT TEXT', 12)
   ```
6. `tail` holds only the last 300 characters. A lab that prints its pass line and then floods
   the monitor (bench03) can report `passed: false` while the line is there: check
   `__serial().includes('...')`.

file_upload accepts repo paths. Wokwi picks the firmware type from the file extension, and a
Rust ELF (0110, `target/thumbv6m-none-eabi/release/blink`) has none: copy it to
`.wokwi-tmp/blink-solution.elf` in the repo root first, and delete that folder afterwards.

Never `await` Wokwi's `uploadFirmware` editor action: it only resolves once a file is chosen,
and the tool call hangs.

What Wokwi's STM32 (Blue Pill) core can't do, measured this way:
- No fault exceptions: unaligned loads with UNALIGN_TRP, `udf`, divide by zero with DIV_0_TRP
  and loads from unmapped addresses all just run on; a call to an even address resets the
  chip. `svc` does reach SVC_Handler. Fault-handler labs (0084) are `SIM: skip`.
- RCC_APB2ENR reads back as 0 (0037).
- FreeRTOS: see CHANGELOG 0.0.3 known issues (no interrupt masking, PendSV loops). The FreeRTOS
  labs (0087–0093, lab05, 0116, 0117) can be laid out, but their runs say nothing.

And on the RP2040/RP2350:
- Zephyr's RP2040 I2C driver gets no answer from a custom chip (timeout -116), while the Pico
  SDK driver works with the same chip and wiring (0098 and lab06 are `SIM: skip`).
- The RP2350 doesn't reset on the watchdog (bench14 is `SIM: skip`).
- USB CDC isn't simulated (0102).

## 3. What to check for each lab

A lab is right when **all** of these hold:

1. **Solution passes**: its EXPECT line appears.
2. **Untouched starter fails**: no EXPECT line. Look out for two gaps that cancel out. 0022
   once passed untouched: the missing wire left the output at 0 and the stub `return false`
   expected 0 on every row.
3. **Each half of the fix alone still fails**, when the task has two parts (a wire and code):
   solution diagram + starter code, and starter diagram + solution code.
4. **The circuit really does what the serial says.** Some pass lines print no matter what
   (0025 prints `SHIFT OK` unconditionally). For outputs like LEDs, run a small program that
   holds one known pattern (e.g. 0xA5), zoom a screenshot and check which LEDs light.

Then run the repo checks: `python -I tools/verify_projects.py <id>` (build and diagram
lint) and `python -I tools/check_course.py`.

## 4. Lay out a diagram

The goal is wiring a learner can follow: no wire across a part, no wire on top of another
net's wire, signals flowing one way.

**Conventions** (used in 0002–0025 and 0051–0065):
- The Pico stays at left 0, top 0. GP0–GP15 are on its **left** edge, so circuits that use them
  sit left of the Pico. A part using right-edge pins (3V3, GND.5–8) can sit right of it, like
  the 74HC595 in 0025.
- Gate circuits flow left to right into the Pico input. Signals from left-edge GP pins to a
  far-left first column go over the top of the Pico in separate lanes (y −10, −20, −30…).
- LEDs Q0..Qn left to right. Resistors `rotate: 90` hang under the LED cathode.
- Wires of the same net may share a segment (fan-out). A few clean right-angle crossings
  are fine where the pin order forces them.
- Same-net pin swaps are allowed and often remove crossings: any GND.x for any other, the two
  inputs of a symmetric gate. Before swapping, check that the lesson doesn't name the pin
  (`grep -n "GND\.1" lessons/<id>*.html`).
- Pin order sometimes forces crossings. Wires that leave one Pico edge and turn toward a row
  of pins cross unless the pin orders match (for wires turning down, the higher Pico pin
  must reach the pin further out). Check the order before routing: 3V3 sits above the ADC
  pins (0058, 0106), and the 74HC595's DS lies left of its clocks (0062). Keep a forced
  crossing to one clean right angle, and say why in the layout's comment.
- A layout tuple without a rotation now clears any `rotate` already in the diagram.
- Colours: green/blue/gray for driven inputs, orange for internal signals and LED wires,
  purple back to the Pico, red 3V3, black ground.

**Steps:**
1. Copy the closest file from `layouts/` and set `POS` and `ROUTES`. A layout is Python:
   ```python
   POS = {'pico': (0, 0), 'ff1': (-200, 100), 'r0': (145.65, 254, 90)}   # (left, top[, rotate])
   ROUTES = {
       ('pico:GP2', 'ff1:D'): ['x-10', 'y20', 'x-230'],   # absolute waypoints
       ('pico:GP10', 'ff1:Q'): [],                         # straight or one corner
   }
   ```
   `x<val>` moves horizontally to absolute x, `y<val>` vertically to absolute y. The tool then
   finishes to the target pin: vertical then horizontal if the last move was horizontal,
   otherwise the reverse. Keys must match the connection's order in diagram.json. Loops
   (like 0025's eight LEDs) are fine; it's plain Python.
2. Preview, then write both folders:
   ```bash
   R=.claude/skills/wokwi-browser
   python -I $R/scripts/route.py $R/layouts/0024.py projects/0024-d-flip-flop/solution/diagram.json
   python -I $R/scripts/route.py $R/layouts/0024.py projects/0024-d-flip-flop/solution/diagram.json --write
   python -I $R/scripts/route.py $R/layouts/0024.py projects/0024-d-flip-flop/starter/diagram.json --write
   ```
   `no route for` on stderr means a wire was left for Wokwi to auto-route: add it. `unused
   route` on a starter is expected when the starter leaves that wire out on purpose. Starters
   that are just a bare Pico (0002) need no layout. Only positions, rotation and routing hints
   change; wires, colours and attrs stay as they are.
3. Load it with `await __setDiagram(<diagram.json text>)`. Take a screenshot, then zoom on the
   circuit. Fix overlaps by moving parts or lanes; repeat.
4. Run the solution and starter again (section 2). A layout change must not change results.

**Pin positions.** `route.py`'s `PINS` table has the Pico, Pico 2, Blue Pill, LED (and `@90`,
`@180`), resistor (`@90`, `@180`, `@270`), AND/OR/XOR/NOT gates, D flip-flop, pushbutton (and
`@90`), 74HC595, potentiometer (`@90`, `@270`), NTC (`@90`, `@180`), servo (`@90`, `@180`,
`@270`), buzzer (`@90`, `@270`), MPU6050 (`@180`), SSD1306 (`@90`, `@180`), KY-040 encoder
(`@90`, `@270`), LED ring, mystery chip (`@180`, `@270`) and logic analyzer (`@180`). Keep
labelled parts upright where you can: at 180 the logic analyzer's and the mystery chip's
labels read upside down. The chip at 180 is still used in lab03/lab04bp, because no other
rotation turns SCL/SDA towards the board.

Pin order on the boards: the Pico has GP4 (SDA) above GP5 (SCL), but the SSD1306 and the
mystery chip list SCL first in every rotation, so each I2C part left of a Pico costs one
crossing. The Blue Pill has PB6 (SCL) above PB7 (SDA), so its I2C wires run straight.
Pushbutton pins 1.l/1.r are one contact and 2.l/2.r the other: pick whichever side avoids a
crossing. For any other part, measure it:
```js
JSON.stringify(await __pinPos([{type: 'wokwi-flip-flop-d', id: 'p', top: 0, left: 0, attrs: {}}], ['p:D', 'p:Q']))
```
Offsets come out relative to the part's top-left. Add them to `PINS`. A rotated part gets
its own entry, `"<type>@<degrees>"`, measured with the rotation set.

## Pitfalls

- Write layout files with the file tool, not one big bash command with several heredocs: that
  failed to parse ("unexpected EOF") and nothing ran. Heredocs also turn a doubled backslash into a single one.
- A script that does string replacements in several diagram.json files and then runs
  route.py sometimes reported a replacement as missing on its first run. Grep the files
  afterwards rather than trusting the report.

- **Stale serial output gives false passes.** The monitor keeps the old text until the new run
  starts after the compile. `__run` stops the sim first and waits for the text to change. Keep
  that if you change the helper.
- **Never write to the serial `<pre>`** (e.g. to clear it). That crashed the page ("This page
  couldn't load"). Reload, open the diagram tab, paste the helpers again.
- The page has no undo for `setValue` worth relying on. The repo files are the source of truth.
- If Chrome stops responding, ask the user to check the browser. Don't keep retrying.
- Don't commit unless the user asks.
