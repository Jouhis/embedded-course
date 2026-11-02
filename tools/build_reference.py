"""Build reference/glossary.html (from GLOSSARY.md) and reference/index.html.

Usage:  python tools/build_reference.py   (re-run after editing GLOSSARY.md or adding a sheet)
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "reference"

# (file, title, description): the reference sheets planned in COURSE-PLAN.md
SHEETS = [
    ("glossary.html", "Glossary", "The course's canonical vocabulary. Every lesson uses these terms."),
    ("electronics-formulas.html", "Electronics formulas", "Ohm's law, power, dividers, RC, LED resistors, MOSFET checks."),
    ("bitwise.html", "Bitwise operations", "Set, clear, toggle, test, masks, shifts, hex and binary tables."),
    ("cortex-m.html", "Cortex-M programmer's model", "Core registers, exception stack frame, AAPCS, modes and stacks."),
    ("thumb2.html", "ARM Thumb-2 quick reference", "The instructions you'll actually meet in disassembly."),
    ("pico-sdk.html", "Pico SDK cheat sheet", "GPIO, UART, I2C, SPI, ADC, PWM, timers and IRQ APIs."),
    ("stm32-registers.html", "STM32F1 register cheat sheet", "RCC, GPIO CRL/CRH, USART, TIM, EXTI and NVIC essentials."),
    ("protocols.html", "Protocol comparison", "UART, I2C, SPI, CAN and USB side by side."),
    ("gdb.html", "GDB commands", "Breakpoints, stepping, memory, registers, Wokwi debugging."),
    ("freertos.html", "FreeRTOS API", "Tasks, queues, semaphores, mutexes, timers and configuration."),
    ("zephyr.html", "Zephyr cheat sheet", "west, devicetree, Kconfig, kernel and driver APIs."),
    ("misra.html", "MISRA C quick list", "The rules that matter most day to day, with examples."),
]

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} · Embedded Systems Course</title>
  <link rel="stylesheet" href="../assets/course.css">
</head>
<body>
<nav class="course-nav"><a href="../index.html">← Course index</a><a href="index.html">Reference sheets</a></nav>
<main>
{body}
</main>
</body>
</html>
"""


def inline_md(s: str) -> str:
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"_([^_]+)_", r"<em>\1</em>", s)
    return s


def build_glossary() -> None:
    lines = (ROOT / "GLOSSARY.md").read_text(encoding="utf-8").splitlines()
    out, i, in_dl = [], 0, False
    intro_done = False
    while i < len(lines):
        line = lines[i].rstrip()
        if line.startswith("# "):
            out.append('<p class="lesson-meta">Reference</p>')
            out.append(f"<h1>{inline_md(line[2:])}</h1>")
        elif line.startswith("## "):
            if in_dl:
                out.append("</dl>")
            out.append(f'<h2 id="{re.sub(r"[^a-z0-9]+", "-", line[3:].lower()).strip("-")}">{inline_md(line[3:])}</h2>')
            out.append('<dl class="glossary">')
            in_dl = True
        elif line.startswith(">"):
            pass  # author notes are not shown to the learner
        elif re.match(r"^\*\*(.+)\*\*:$", line):
            term = re.match(r"^\*\*(.+)\*\*:$", line).group(1)
            anchor = re.sub(r"[^a-z0-9]+", "-", term.lower()).strip("-")
            definition, avoid = [], ""
            i += 1
            while i < len(lines) and lines[i].strip():
                if lines[i].startswith("_Avoid_:"):
                    avoid = lines[i][len("_Avoid_:"):].strip()
                else:
                    definition.append(lines[i].strip())
                i += 1
            out.append(f'<dt id="{anchor}"><strong>{inline_md(term)}</strong></dt>')
            dd = inline_md(" ".join(definition))
            if avoid:
                dd += f'<br><small class="avoid">Avoid: {inline_md(avoid)}</small>'
            out.append(f"<dd>{dd}</dd>")
            continue
        elif line and not intro_done and not line.startswith("#"):
            out.append(f'<p class="subtitle">{inline_md(line)}</p>')
            intro_done = True
        i += 1
    if in_dl:
        out.append("</dl>")
    style = ("<style>dl.glossary dt{margin-top:1rem}dl.glossary dd{margin-left:0}"
             ".avoid{color:var(--muted);font-family:var(--sans)}</style>")
    (REF / "glossary.html").write_text(PAGE.format(title="Glossary", body=style + "\n".join(out)), encoding="utf-8")


def build_index() -> None:
    items = []
    for file, title, desc in SHEETS:
        if (REF / file).exists():
            items.append(f'<li><span class="num">●</span><a href="{file}">{title}</a>'
                         f'<span class="tag">{html.escape(desc)}</span></li>')
        else:
            items.append(f'<li class="pending"><span class="num">○</span><span>{title}</span>'
                         f'<span class="tag">coming</span></li>')
    body = ('<p class="lesson-meta">Reference</p><h1>Reference sheets</h1>'
            '<p class="subtitle">The compressed essence of the lessons, for quick lookup. They print well too.</p>'
            '<ul class="lesson-list">' + "\n".join(items) + "</ul>")
    (REF / "index.html").write_text(PAGE.format(title="Reference sheets", body=body), encoding="utf-8")


if __name__ == "__main__":
    REF.mkdir(exist_ok=True)
    build_glossary()
    build_index()
    print("Built reference/glossary.html and reference/index.html")
