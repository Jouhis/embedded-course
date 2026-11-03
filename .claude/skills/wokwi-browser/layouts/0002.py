# Pico on the right; the LED and its resistor sit left of the GP pins they use.
POS = {'pico': (0, 0), 'led1': (-130, 100), 'r1': (-80, 26.3)}
ROUTES = {
    ('pico:GP15', 'led1:A'): ['x-105'],
    ('led1:C', 'r1:1'): ['y170', 'x-140'],
    ('r1:2', 'pico:GND.1'): [],
}
