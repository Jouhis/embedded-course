# wokwi-browser reference

Read the section you need; SKILL.md says when.

## Custom chips (0063, 0098, lab03–lab06, bench08)

Add the chip files once per page load. Click the dropdown next to the file tabs (about
(160, 29)), click "Upload file(s)..." (about (200, 95)), then `file_upload` `mystery.chip.c`
and `mystery.chip.json` to the input labelled "project file stand-in" (added by
firmware-helpers.js). They show up as file tabs; the chip compiles in the cloud and answers
uploaded firmware. Its first reading can take a second (`T=none`).

## Firmware details

- `__fwWait` returns `{started, passed, secs, tail}`, plus `error` when the diagram couldn't
  load (open the diagram.json tab once). A starter that prints the same text as the run before
  shows `started: false`.
- `tail` holds only the last 300 characters. A lab that prints its pass line and then floods
  the monitor (bench03) can report `passed: false` while the line is there: check
  `__serial().includes('...')`.
- Wokwi picks the firmware type from the file extension. A Rust ELF (0110,
  `target/thumbv6m-none-eabi/release/blink`) has none: copy it to
  `.wokwi-tmp/blink-solution.elf` in the repo root first, and delete that folder afterwards.
- Never `await` Wokwi's `uploadFirmware` editor action: it only resolves once a file is
  chosen, and the tool call hangs.

## What the simulator can't do

STM32 (Blue Pill) core:
- No fault exceptions: unaligned loads with UNALIGN_TRP, `udf`, divide by zero with DIV_0_TRP
  and loads from unmapped addresses all just run on; a call to an even address resets the
  chip. `svc` does reach SVC_Handler. Fault-handler labs (0084) are `SIM: skip`.
- RCC_APB2ENR reads back as 0 (0037).
- No input capture or encoder mode (0071).
- FreeRTOS: see CHANGELOG 0.0.3 known issues (no interrupt masking, PendSV loops). The
  FreeRTOS labs (0087–0093, lab05, 0116, 0117) can be laid out, but their runs say nothing.
  Don't run them.

RP2040/RP2350:
- Zephyr's RP2040 I2C driver gets no answer from a custom chip (timeout -116), while the Pico
  SDK driver works with the same chip and wiring (0098 and lab06 are `SIM: skip`).
- The RP2350 doesn't reset on the watchdog (bench14 is `SIM: skip`).
- USB CDC isn't simulated (0102).

## Pin positions and pin order

`route.py`'s `PINS` table has the Pico, Pico 2, Blue Pill, LED (and `@90`, `@180`), resistor
(`@90`, `@180`, `@270`), AND/OR/XOR/NOT gates, D flip-flop, pushbutton (and `@90`), 74HC595,
potentiometer (`@90`, `@270`), NTC (`@90`, `@180`), servo (`@90`, `@180`, `@270`), buzzer
(`@90`, `@270`), MPU6050 (`@180`), SSD1306 (`@90`, `@180`), KY-040 encoder (`@90`, `@270`),
LED ring, mystery chip (`@180`, `@270`) and logic analyzer (`@180`).

For any other part, measure it:
```js
JSON.stringify(await __pinPos([{type: 'wokwi-flip-flop-d', id: 'p', top: 0, left: 0, attrs: {}}], ['p:D', 'p:Q']))
```
Offsets come out relative to the part's top-left. Add them to `PINS`. A rotated part gets
its own entry, `"<type>@<degrees>"`, measured with the rotation set.

- Keep labelled parts upright where you can: at 180 the logic analyzer's and the mystery
  chip's labels read upside down. The chip at 180 is still used in lab03/lab04bp, because no
  other rotation turns SCL/SDA towards the board.
- The Pico has GP4 (SDA) above GP5 (SCL), but the SSD1306 and the mystery chip list SCL first
  in every rotation, so each I2C part left of a Pico costs one crossing. The Blue Pill has PB6
  (SCL) above PB7 (SDA), so its I2C wires run straight.
- 3V3 sits above the Pico's ADC pins (0058, 0106); the 74HC595's DS lies left of its clocks
  (0062).
- Pushbutton pins 1.l/1.r are one contact and 2.l/2.r the other: pick whichever side avoids a
  crossing.

## Script pitfalls

- Write layout files with the file tool, not one big bash command with several heredocs: that
  failed to parse ("unexpected EOF") and nothing ran. Heredocs also turn a doubled backslash
  into a single one.
- A script that does string replacements in several diagram.json files and then runs route.py
  sometimes reported a replacement as missing on its first run. Grep the files afterwards
  rather than trusting the report.
