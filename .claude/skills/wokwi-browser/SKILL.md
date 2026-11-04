---
name: wokwi-browser
model: haiku
description: Simulate course projects in the Wokwi browser editor (no CI minutes needed) and lay out their diagram.json so the wiring is readable. Use when asked to validate, simulate or test a lab or project in Wokwi, check that a starter is not already solved, or fix messy, overlapping or hard-to-read Wokwi wiring.
---

# Wokwi in the browser: simulate labs and lay out diagrams

The Wokwi CLI (`tools/sim.py`, `verify_projects.py --sim`) uses metered minutes. The browser
editor is free and needs no sign-in, so drive it with Claude in Chrome instead.

Files: `scripts/browser-helpers.js` (`__run`, `__setDiagram`, `__pinPos`),
`scripts/firmware-helpers.js` (`__fwWait`, `__serial`, firmware and project-file stand-ins),
`scripts/payload.py` (prints a `__run(...)` call for a folder), `scripts/route.py` (applies a
layout; holds the `PINS` table), `layouts/*.py` (one per lab or shared piece: copy the
closest), `reference.md` (details: read only the section a step points to).

Paths are relative to the repo root. Run Python with `-I`. Keep tool calls few: every
screenshot and every round trip costs.

## 1. Open the editor (once per page load)

1. Load the Chrome tools in one ToolSearch call (tabs_context_mcp, tabs_create_mcp, navigate,
   computer, find, javascript_tool, file_upload, browser_batch), then make a new tab at
   `https://wokwi.com/projects/new/pi-pico-sdk`.
2. Click the `diagram.json` editor tab once, so its model exists.
3. Paste `scripts/browser-helpers.js` into `javascript_tool` (returns
   `'wokwi helpers installed'`). For firmware runs, paste `scripts/firmware-helpers.js` too and
   `find` "file input labelled 'firmware stand-in'" once: its ref stays valid until reload.
4. Custom-chip labs: add the chip files once (reference.md, "Custom chips").

## 2. Run Pico SDK labs (compiled in the cloud)

```bash
python -I .claude/skills/wokwi-browser/scripts/payload.py projects/0022-logic-gates/solution
python -I .claude/skills/wokwi-browser/scripts/payload.py projects/0022-logic-gates/starter --secs 8
```
Paste the printed line into `javascript_tool`. Result: `{started, passed, secs, tail, missing}`.
`started: false` means unknown (compile error or stuck page), not a fail: only then take a
screenshot. The first run takes 10–20 s; starters get `--secs 8`.

For several labs, queue them in one call: `__q([[label, files, secs, expect], ...])`, then
`await __wait(60)` returns `{done, r: [{lbl, st, ok, secs, tail}]}`. Return only `lbl`, `ok`,
`secs` unless a run failed (serial text can trip `[BLOCKED: ...]`).

Multi-file projects: inline the local headers and other `.c` files into one main.c.

## 3. Run locally built firmware (STM32, Zephyr, Rust, Pico 2, multi-file labs)

Build here (`python -I tools/build.py <project>`) and upload the file named in `wokwi.toml`.
The board comes from the diagram, so the Pico SDK page runs Blue Pill firmware too.

Put 3–4 runs in one `browser_batch` (keep total waiting under ~40 s) and return only the
verdict:
```
file_upload      ref=<stand-in>, paths=[<abs dir>/diagram.json, <abs dir>/build/blink.hex]
javascript_tool  const r = await __fwWait('EXPECT TEXT', 10); JSON.stringify({s: r.started, p: r.passed})
```
Ask for `r.tail` only when a run fails. A lab that waits for a button (0072, 0096, 0097):
before the wait, in the same call:
```js
setTimeout(() => { const b = document.querySelector('wokwi-pushbutton');
  b.dispatchEvent(new Event('button-press'));
  setTimeout(() => b.dispatchEvent(new Event('button-release')), 200); }, 3000);
```
Before running, check reference.md "What the simulator can't do": skip FreeRTOS labs and the
`SIM: skip` ones. Odd results (false fail after a flood of output, a Rust ELF): reference.md
"Firmware details".

## 4. What to check for each lab

1. The solution prints its EXPECT line.
2. The untouched starter doesn't. Watch for two gaps that cancel out (0022 once passed
   untouched: a missing wire left 0 and the stub expected 0).
3. If the fix has two parts (wire and code), each half alone still fails.
4. The circuit does what the serial says: some pass lines print unconditionally (0025). For
   LED outputs, hold a known pattern (0xA5) and check one zoomed screenshot.

Then: `python -I tools/verify_projects.py <id>` and `python -I tools/check_course.py`.

## 5. Lay out a diagram

Goal: no wire across a part, no wire on another net's wire, signals flowing one way.

Conventions:
- The board stays at (0, 0). Parts sit on the side of the pins they use (Pico GP0–GP15 are on
  its left edge). Wires to a far column go over the top in separate lanes (y −10, −20, …).
- Same-net swaps are allowed (any GND.x or 3V3.x, a button's other contact, symmetric gate
  inputs) unless the lesson names the pin: `grep -n "GND\.1" lessons/<id>*.html`.
- A crossing that pin order forces is fine as one right angle; say why in the layout comment.
  Pin-order facts and pin tables: reference.md "Pin positions and pin order".
- Colours: green/blue/gray driven inputs, orange internal and LED wires, purple back to the
  board, red 3V3, black ground.

Steps:
1. Copy the closest `layouts/*.py`; set `POS = {id: (left, top[, rotate])}` and
   `ROUTES = {('a:PIN', 'b:PIN'): ['x-10', 'y20', ...]}` (absolute waypoints; keys in the
   connection's order in diagram.json; the tool finishes to the target pin). Shared pieces
   are `exec`'d from `LAYOUT_DIR`. Write the file with the file tool.
2. Dry-run, then write solution and starter:
   ```bash
   R=.claude/skills/wokwi-browser
   python -I $R/scripts/route.py $R/layouts/0024.py projects/0024-d-flip-flop/solution/diagram.json
   python -I $R/scripts/route.py $R/layouts/0024.py projects/0024-d-flip-flop/solution/diagram.json --write
   python -I $R/scripts/route.py $R/layouts/0024.py projects/0024-d-flip-flop/starter/diagram.json --write
   ```
   Fix every `no route for` before looking at anything (`unused route` on a starter is fine
   when it leaves that wire out). Check on paper that each lane clears the parts' boxes.
3. Preview once: `file_upload` the diagram.json alone to the firmware stand-in (or
   `__setDiagram`), then one zoom on the circuit. Zoom again only to check a fix. Labs that
   share a layout (0113 for 0115–0117) need one preview.
4. Re-run the solution (section 2 or 3): a layout change must not change results.

## Rules

- Stale serial output gives false passes: the helpers stop the sim and wait for new text;
  keep that if you change them.
- Never write to the serial `<pre>`: it crashes the page. Reload and paste the helpers again.
- The repo files are the source of truth; the page has no reliable undo.
- If Chrome stops responding, ask the user to check the browser. Don't keep retrying.
- Don't commit unless the user asks.
