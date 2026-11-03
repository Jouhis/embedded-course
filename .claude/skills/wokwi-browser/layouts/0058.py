# NTC on GP26 and pot on GP27, both right of the Pico (the ADC pins are on its right edge).
# The pot is rotated 90 so its pins face the Pico; GND.8 feeds its top pin. 3V3 drops in
# one lane at x115 to both VCC pins and crosses the GP27 and GP26 wires once each: with
# 3V3 above the ADC pins, that crossing is forced by the pin order.
POS = {'pico': (0, 0), 'pot1': (165, 50.55, 90), 'ntc1': (165, 150, 180)}
ROUTES = {
    ('pico:GND.8', 'pot1:GND'): ['x140'],
    ('pico:GP27', 'pot1:SIG'): [],
    ('pico:3V3', 'pot1:VCC'): ['x115'],
    ('pico:GP26', 'ntc1:OUT'): ['x100'],
    ('pico:3V3', 'ntc1:VCC'): ['x115'],
    ('pico:GND.6', 'ntc1:GND'): ['x85'],
}
