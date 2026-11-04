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
 'board-stm32-bluepill': {'A0': (72.76, 154.96), 'A1': (72.76, 145.36), 'A2': (72.76, 135.76), 'A3': (72.76, 126.16), 'A4': (72.76, 116.56), 'A5': (72.76, 106.96), 'A6': (72.76, 97.36), 'A7': (72.76, 87.76), 'A8': (13.23, 49.36), 'A9': (13.23, 58.96), 'A10': (13.23, 68.56), 'A11': (13.23, 78.16), 'A12': (13.23, 87.76), 'A15': (13.23, 97.36), 'B0': (72.76, 78.16), 'B1': (72.76, 68.56), 'B3': (13.23, 106.96), 'B4': (13.23, 116.56), 'B5': (13.23, 126.16), 'B6': (13.23, 135.76), 'B7': (13.23, 145.36), 'B8': (13.23, 154.96), 'B9': (13.23, 164.56), 'B10': (72.76, 58.96), 'B11': (72.76, 49.36), 'B12': (13.23, 10.96), 'B13': (13.23, 20.56), 'B14': (13.23, 30.16), 'B15': (13.23, 39.76), 'C13': (72.76, 183.76), 'C14': (72.76, 174.16), 'C15': (72.76, 164.56), 'GND.1': (13.23, 183.76), 'GND.2': (72.76, 10.96), 'GND.3': (72.76, 20.56), '3V3.1': (13.23, 193.36), '3V3.2': (72.76, 30.16), '5V.1': (13.23, 174.16), 'VBAT': (72.76, 193.36), 'R': (72.76, 39.76)},
 'board-pi-pico-2': {'GP0': (6.05, 12.85), 'GP1': (6.05, 22.45), 'GP2': (6.05, 41.65), 'GP3': (6.05, 51.25), 'GP4': (6.05, 60.85), 'GP5': (6.05, 70.45), 'GP6': (6.05, 89.65), 'GP7': (6.05, 99.25), 'GP8': (6.05, 108.85), 'GP9': (6.05, 118.45), 'GP10': (6.05, 137.65), 'GP11': (6.05, 147.25), 'GP12': (6.05, 156.81), 'GP13': (6.05, 166.41), 'GP14': (6.05, 185.61), 'GP15': (6.05, 195.21), 'GP16': (72.94, 195.21), 'GP17': (72.94, 185.61), 'GP18': (72.94, 166.41), 'GP19': (72.94, 156.81), 'GP20': (72.94, 147.25), 'GP21': (72.94, 137.65), 'GP22': (72.94, 118.45), 'GP26': (72.94, 99.25), 'GP27': (72.94, 89.65), 'GP28': (72.94, 70.45), 'GND.1': (6.05, 32.05), 'GND.2': (6.05, 80.05), 'GND.3': (6.05, 128.05), 'GND.4': (6.05, 176.01), 'GND.5': (72.94, 176.01), 'GND.6': (72.94, 128.05), 'GND.7': (72.94, 80.05), 'GND.8': (72.94, 32.05), '3V3': (72.94, 51.25), 'VBUS': (72.94, 12.85), 'VSYS': (72.94, 22.45), '3V3_EN': (72.94, 41.65), 'RUN': (72.94, 108.85), 'ADC_VREF': (72.94, 60.85)},
 'board-ssd1306': {'GND': (38.17, 6.46), 'VCC': (47.62, 6.46), 'SCL': (57.07, 6.46), 'SDA': (66.9, 6.46)},
 'wokwi-ky-040': {'CLK': (116, 7.9), 'DT': (116, 17.4), 'SW': (116, 27), 'VCC': (116, 36.3), 'GND': (116, 45.5)},
 'wokwi-led-ring': {'GND': (32.34, 104.83), 'VCC': (41.94, 104.83), 'DIN': (51.54, 104.83), 'DOUT': (61.15, 104.83)},
 'chip-mystery': {'SDA': (4.8, 8.58), 'SCL': (4.8, 18.18), 'GND': (108.59, 8.58), 'VCC': (108.59, 18.18)},
 'wokwi-ntc-temperature-sensor@90': {'OUT': (58, 103.5), 'VCC': (67.7, 103.5), 'GND': (77.3, 103.5)},
 'wokwi-pushbutton@90': {'2.l': (25.5, -9.5), '1.l': (44.5, -9.5), '2.r': (25.5, 57.5), '1.r': (44.5, 57.5)},
 'wokwi-led@180': {'A': (15, 8), 'C': (25, 8)},
 'wokwi-servo@270': {'GND': (75, 145), 'V+': (84.5, 145), 'PWM': (94, 145)},
 'wokwi-servo@90': {'PWM': (76, -25), 'V+': (85.5, -25), 'GND': (95, -25)},
 'wokwi-ky-040@270': {'CLK': (30.9, -23), 'DT': (40.4, -23), 'SW': (50, -23), 'VCC': (59.3, -23), 'GND': (68.5, -23)},
 'wokwi-ky-040@90': {'GND': (47.5, 93), 'VCC': (56.7, 93), 'SW': (66, 93), 'DT': (75.6, 93), 'CLK': (85.1, 93)},
 'wokwi-resistor@270': {'1': (29.65, 35), '2': (29.65, -23.8)},
 'board-ssd1306@90': {'GND': (88.54, 28.17), 'VCC': (88.54, 37.62), 'SCL': (88.54, 47.07), 'SDA': (88.54, 56.9)},
 'board-ssd1306@180': {'SDA': (38.1, 78.54), 'SCL': (47.93, 78.54), 'VCC': (57.38, 78.54), 'GND': (66.83, 78.54)},
 'chip-mystery@180': {'VCC': (4.41, 8.82), 'GND': (4.41, 18.42), 'SCL': (108.2, 8.82), 'SDA': (108.2, 18.42)},
 'chip-mystery@270': {'GND': (51.58, -38.59), 'VCC': (61.18, -38.59), 'SDA': (51.58, 65.2), 'SCL': (61.18, 65.2)},
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
