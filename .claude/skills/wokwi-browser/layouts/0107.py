# A pot on GP26, right of the Pico and rotated 90 so its pins face it. The signal wire is
# straight; 3V3 crosses it once (3V3 sits above the ADC pins, the pot's VCC pin is lowest).
POS = {'pico': (0, 0), 'pot1': (165, 60.15, 90)}
ROUTES = {
    ('pico:GND.8', 'pot1:GND'): ['x140'],
    ('pico:GP26', 'pot1:SIG'): [],
    ('pico:3V3', 'pot1:VCC'): ['x115'],
}
