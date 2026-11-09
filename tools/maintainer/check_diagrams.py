"""Check that every project's Wokwi diagram is readable: no parts on top of each other, no wire
drawn across a part, every wire routed, and each starter laid out like its solution.

  python tools/maintainer/check_diagrams.py              every projects/**/diagram.json
  python tools/maintainer/check_diagrams.py <files...>   only these

Part sizes were measured in the Wokwi editor (Nov 2026). Pin positions come from the router's
table (.claude/skills/wokwi-browser/scripts/route.py), so a part type or pin missing there is
reported and its wires are not checked; measure it with __pinPos and add it to PINS.
Fix a failure by laying the diagram out with that router (see the wokwi-browser skill).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".claude" / "skills" / "wokwi-browser" / "scripts"))
from route import PINS  # noqa: E402

# Unrotated (width, height) in diagram units, as the editor draws them.
SIZE = {
    "wokwi-pi-pico": (79.4, 200.3), "board-pi-pico-2": (79, 199.4), "board-stm32-bluepill": (86.4, 204.8),
    "wokwi-led": (40, 50), "wokwi-resistor": (59.1, 11.3), "wokwi-pushbutton": (67.3, 48.3),
    "board-ssd1306": (104.7, 85.4), "wokwi-ntc-temperature-sensor": (135.4, 71.8),
    "wokwi-potentiometer": (75.6, 75.6), "wokwi-logic-analyzer": (156, 94),
    "wokwi-gate-and-2": (96, 37.8), "wokwi-gate-or-2": (96, 37.8), "wokwi-gate-xor-2": (96, 37.8),
    "wokwi-gate-not": (96, 37.8), "wokwi-flip-flop-d": (96, 37.8), "wokwi-74hc595": (74.9, 31.7),
    "wokwi-servo": (170.1, 119.5), "wokwi-buzzer": (75, 83.6), "wokwi-mpu6050": (81.6, 61.2),
    "wokwi-ky-040": (116.5, 70.4),
    "chip-mystery": (113, 27),   # custom chip: estimated from its pin positions
}
# Parts whose size depends on an attribute.
RING = {8: (93.5, 104.8), 16: (141.6, 152.9)}   # wokwi-led-ring by "pixels"

EDGE = 2.5      # a wire may run this far inside a part's box (pins sit on the edge)
OVERLAP = 10    # parts may share this much of their boxes: SVG boxes have empty corners


def size(p):
    if p["type"] == "wokwi-led-ring":
        n = int(p.get("attrs", {}).get("pixels", 16))
        return RING.get(n)
    return SIZE.get(p["type"])


def box(p):
    """The part's box in diagram units; Wokwi rotates a part about its centre."""
    w, h = size(p)
    cx, cy = p.get("left", 0) + w / 2, p.get("top", 0) + h / 2
    if (p.get("rotate") or 0) % 180 == 90:
        w, h = h, w
    return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2


def pin(parts, ref):
    pid, name = ref.split(":", 1)
    p = parts.get(pid)
    if p is None:
        return None
    table = PINS.get(p["type"] + (f"@{p['rotate']}" if p.get("rotate") else ""), {})
    if name not in table:
        return None
    return p.get("left", 0) + table[name][0], p.get("top", 0) + table[name][1]


def wire_points(start, end, hints):
    """The corners Wokwi draws: the hints (relative h/v moves), then on to the end pin."""
    x, y = start
    pts = [start]
    for t in hints:
        if t[:1] in ("h", "v"):
            if t[0] == "h":
                x += float(t[1:])
            else:
                y += float(t[1:])
            pts.append((x, y))
    if abs(x - end[0]) > 0.5 and abs(y - end[1]) > 0.5:
        pts.append((end[0], y))
    pts.append(end)
    return pts


def crosses(a, b, bx):
    x0, y0, x1, y1 = bx[0] + EDGE, bx[1] + EDGE, bx[2] - EDGE, bx[3] - EDGE
    return (max(a[0], b[0]) > x0 and min(a[0], b[0]) < x1
            and max(a[1], b[1]) > y0 and min(a[1], b[1]) < y1)


def check(path):
    errors, warnings = [], []
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        return [f"cannot read: {e}"], []
    parts = {p["id"]: p for p in d.get("parts", [])}
    boxes = {}
    for pid, p in parts.items():
        if size(p) is None:
            warnings.append(f"no size for part type {p['type']} ({pid}): not checked")
        else:
            boxes[pid] = box(p)

    ids = list(boxes)
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            A, B = boxes[a], boxes[b]
            ox = min(A[2], B[2]) - max(A[0], B[0])
            oy = min(A[3], B[3]) - max(A[1], B[1])
            if ox > OVERLAP and oy > OVERLAP:
                errors.append(f"parts {a} and {b} overlap ({ox:.0f} x {oy:.0f})")

    for c in d.get("connections", []):
        a, b = c[0], c[1]
        if a.startswith("$") or b.startswith("$"):
            continue
        hints = c[3] if len(c) > 3 else []
        s, t = pin(parts, a), pin(parts, b)
        if s is None or t is None:
            warnings.append(f"no pin position for {a if s is None else b}: wire not checked")
            continue
        if not hints and abs(s[0] - t[0]) > 0.5 and abs(s[1] - t[1]) > 0.5:
            errors.append(f"wire {a} -> {b} has no route (Wokwi draws it diagonally)")
            continue
        pts = wire_points(s, t, hints)
        ends = {a.split(":")[0], b.split(":")[0]}
        for pid, bx in boxes.items():
            if pid not in ends and any(crosses(p, q, bx) for p, q in zip(pts, pts[1:])):
                errors.append(f"wire {a} -> {b} runs across {pid}")

    if path.parent.name == "starter":
        sol = path.parent.parent / "solution" / "diagram.json"
        if sol.exists():
            try:
                sp = {p["id"]: p for p in json.loads(sol.read_text(encoding="utf-8"))["parts"]}
            except (OSError, ValueError, KeyError):
                sp = {}
            for pid, p in parts.items():
                q = sp.get(pid)
                if q and (p.get("left", 0), p.get("top", 0), p.get("rotate", 0)) != \
                         (q.get("left", 0), q.get("top", 0), q.get("rotate", 0)):
                    errors.append(f"part {pid} is placed differently from the solution")
    return errors, warnings


def main(argv):
    files = [Path(a) for a in argv] if argv else sorted(
        f for f in (ROOT / "projects").rglob("diagram.json") if "build" not in f.parts)
    bad = 0
    for f in files:
        f = f.resolve()
        errors, warnings = check(f)
        if errors or warnings:
            name = f.relative_to(ROOT) if f.is_relative_to(ROOT) else f
            print(f"{'FAIL' if errors else 'ok  '} {name.as_posix()}")
            for e in errors:
                print(f"     error: {e}")
            for w in warnings:
                print(f"     warn:  {w}")
        bad += bool(errors)
    print(f"{len(files) - bad}/{len(files)} diagrams pass")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
