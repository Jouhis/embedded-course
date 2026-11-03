"""Lay out a Wokwi diagram: set part positions and compute explicit wire routes.

  python -I .claude/skills/wokwi-browser/scripts/route.py <layout.py> <diagram.json>           print the result
  python -I .claude/skills/wokwi-browser/scripts/route.py <layout.py> <diagram.json> --write   overwrite the file

layout.py (see ../layouts/ for worked examples) defines:
  POS    = {part_id: (left, top)} or (left, top, rotate)
  ROUTES = {("from:PIN", "to:PIN"): [tokens]}   keys match the connection as written in diagram.json
Tokens: 'x<val>' = go horizontally to absolute x, 'y<val>' = go vertically to absolute y.
After the tokens the tool finishes to the target pin: vertical then horizontal if the last
token was horizontal, otherwise horizontal then vertical. [] gives a straight or one-corner wire.
Connections without a route get [] (Wokwi then draws them straight across) and are reported.

Only positions, rotation and the routing hints change; parts, pins, colours and attrs stay.
A part type missing from PINS raises KeyError: measure it with __pinPos (browser-helpers.js)
and add it. Rotated parts get their own entry, named "<type>@<degrees>".
"""
import json, os, sys, re

PINS = {
 'wokwi-pi-pico': {**{f'GP{i}': (6, y) for i, y in zip(range(16), [12.75,22.35,41.55,51.15,60.75,70.35,89.55,99.15,108.75,118.35,137.55,147.15,156.75,166.35,185.55,195.15])},
   'GP16': (72,195.15),'GP17': (72,185.55),'GP18': (72,166.35),'GP19': (72,156.75),'GP20': (72,147.15),'GP21': (72,137.55),'GP22': (72,118.35),
   'GP26': (72,99.15),'GP27': (72,89.55),'GP28': (72,70.35),'GND.1': (6,31.95),'GND.2': (6,79.95),'GND.3': (6,127.95),'GND.4': (6,175.95),
   'GND.5': (72,175.95),'GND.6': (72,127.95),'GND.7': (72,79.95),'GND.8': (72,31.95),'3V3': (72,51.15),'VSYS': (72,22.35),'VBUS': (72,12.75),
   '3V3_EN': (72,41.55),'RUN': (72,108.75),'ADC_VREF': (72,60.75)},
 'wokwi-led': {'A': (25,42), 'C': (15,42)},
 'wokwi-resistor': {'1': (0,5.65), '2': (58.8,5.65)},
 'wokwi-resistor@90': {'1': (29.35,-24), '2': (29.35,34.8)},
 'wokwi-gate-and-2': {'A': (0,9.6), 'B': (0,28.8), 'OUT': (96,19.2)},
 'wokwi-gate-or-2': {'A': (0,9.6), 'B': (0,28.8), 'OUT': (96,19.2)},
 'wokwi-gate-xor-2': {'A': (0,9.6), 'B': (0,28.8), 'OUT': (96,19.2)},
 'wokwi-gate-not': {'IN': (0,19.2), 'OUT': (96,19.2)},
 'wokwi-flip-flop-d': {'D': (0,9.6), 'CLK': (0,28.8), 'Q': (96,9.6), 'NOTQ': (96,28.8)},
 'wokwi-pushbutton': {'1.l': (0,13), '2.l': (0,32), '1.r': (67,13), '2.r': (67,32)},
 'wokwi-74hc595': {'VCC': (4.16,0),'Q0': (13.76,0),'DS': (23.36,0),'OE': (32.96,0),'STCP': (42.56,0),'SHCP': (52.16,0),'MR': (61.76,0),'Q7S': (71.36,0),
   'Q1': (4.16,30),'Q2': (13.76,30),'Q3': (23.36,30),'Q4': (32.96,30),'Q5': (42.56,30),'Q6': (52.16,30),'Q7': (61.76,30),'GND': (71.36,30)},
 'wokwi-led@90': {'A': (3,30), 'C': (3,20)},
 'wokwi-resistor@180': {'1': (59,5.35), '2': (0.2,5.35)},
 'wokwi-potentiometer': {'GND': (29,68.5), 'SIG': (39,68.5), 'VCC': (49,68.5)},
 'wokwi-potentiometer@90': {'GND': (7.5,29), 'SIG': (7.5,39), 'VCC': (7.5,49)},
 'wokwi-potentiometer@270': {'VCC': (68.5,27), 'SIG': (68.5,37), 'GND': (68.5,47)},
 'wokwi-ntc-temperature-sensor': {'GND': (135,26.2), 'VCC': (135,35.8), 'OUT': (135,45.5)},
 'wokwi-ntc-temperature-sensor@180': {'OUT': (0,26.5), 'VCC': (0,36.2), 'GND': (0,45.8)},
 'wokwi-servo': {'GND': (0,50), 'V+': (0,59.5), 'PWM': (0,69)},
 'wokwi-buzzer': {'1': (27,84), '2': (37,84)},
 'wokwi-mpu6050': {'SDA': (45.6,5.78), 'SCL': (55.2,5.78), 'GND': (64.8,5.78), 'VCC': (74.4,5.78)},
 'wokwi-mpu6050@180': {'VCC': (7.6,55.22), 'GND': (17.2,55.22), 'SCL': (26.8,55.22), 'SDA': (36.4,55.22)},
 'wokwi-logic-analyzer@180': {'D0': (156,84.75), 'D1': (156,75.15), 'GND': (156,7.95)},
 'wokwi-servo@180': {'PWM': (170,51), 'V+': (170,60.5), 'GND': (170,70)},
 'wokwi-buzzer@90': {'1': (-4.5,31.5), '2': (-4.5,41.5)},
 'wokwi-buzzer@270': {'1': (79.5,52.5), '2': (79.5,42.5)},
 'wokwi-logic-analyzer': {'D0': (0,9.25), 'D1': (0,18.85), 'D2': (0,28.45), 'GND': (0,86.05)},
}

def fmt(v):
    v = round(v, 2)
    return str(int(v)) if v == int(v) else str(v)

def main():
    sys.stdout.reconfigure(encoding="utf-8", newline="\n")
    layout, dpath = sys.argv[1], sys.argv[2]
    ns = {'LAYOUT_DIR': os.path.dirname(os.path.abspath(layout))}  # layouts may exec a shared helper from here
    exec(open(layout, encoding='utf-8').read(), ns)
    d = json.load(open(dpath, encoding='utf-8'))
    parts = {p['id']: p for p in d['parts']}
    for pid, v in ns['POS'].items():
        if pid not in parts:   # a starter may leave parts out on purpose
            print(f'note: part {pid} not in this diagram', file=sys.stderr)
            continue
        parts[pid]['left'], parts[pid]['top'] = v[0], v[1]
        if len(v) > 2: parts[pid]['rotate'] = v[2]
        else: parts[pid].pop('rotate', None)   # a 2-tuple means unrotated
    def pin(ref):
        pid, name = ref.split(':', 1)
        p = parts[pid]
        ox, oy = PINS[p['type'] + ('@' + str(p['rotate']) if p.get('rotate') else '')][name]
        return p['left'] + ox, p['top'] + oy
    routes = ns.get('ROUTES', {})
    used = set()
    for c in d['connections']:
        key = (c[0], c[1])
        if c[0].startswith('$') or c[1].startswith('$'):
            continue
        if key not in routes:
            c[3] = []
            print('no route for', key, file=sys.stderr)
            continue
        used.add(key)
        (x, y), (tx, ty) = pin(c[0]), pin(c[1])
        hints, last = [], None
        for t in routes[key]:
            axis, val = t[0], float(t[1:])
            if axis == 'x':
                if val != x: hints.append('h' + fmt(val - x)); x = val; last = 'x'
            else:
                if val != y: hints.append('v' + fmt(val - y)); y = val; last = 'y'
        legs = ['y', 'x'] if last == 'x' else ['x', 'y']
        for a in legs:
            if a == 'x' and abs(tx - x) > 1e-6: hints.append('h' + fmt(tx - x)); x = tx
            if a == 'y' and abs(ty - y) > 1e-6: hints.append('v' + fmt(ty - y)); y = ty
        c[3] = hints
    for k in routes:
        if k not in used: print('unused route', k, file=sys.stderr)
    # course style: one part and one connection per line
    lines = ['{', '  "version": 1,', f'  "author": {json.dumps(d.get("author", "Embedded Course"))},', '  "editor": "wokwi",', '  "parts": [']
    lines += ['    ' + json.dumps(p, separators=(', ', ': ')) + (',' if i < len(d['parts']) - 1 else '') for i, p in enumerate(d['parts'])]
    lines += ['  ],', '  "connections": [']
    lines += ['    ' + json.dumps(c, separators=(', ', ': ')) + (',' if i < len(d['connections']) - 1 else '') for i, c in enumerate(d['connections'])]
    lines += ['  ],', '  "dependencies": ' + json.dumps(d.get('dependencies', {})) + '', '}', '']
    text = '\n'.join(lines)
    json.loads(text)
    if '--write' in sys.argv:
        open(dpath, 'w', encoding='utf-8', newline='\n').write(text)
    else:
        print(text, end="")

main()
