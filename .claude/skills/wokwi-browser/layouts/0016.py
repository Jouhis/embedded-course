# Button left of the Pico. GND.4 (same ground as GND.1) sits next to GP14, so the two wires nest without crossing.
POS = {'pico': (0, 0), 'btn1': (-150, 60)}
ROUTES = {
    ('pico:GP14', 'btn1:1.l'): ['x-175'],
    ('pico:GND.4', 'btn1:2.l'): ['x-165'],
}
