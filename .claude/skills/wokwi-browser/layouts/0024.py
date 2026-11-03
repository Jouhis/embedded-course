# Flip-flop left of the Pico. D and CLK come over the top; Q returns to GP10.
POS = {'pico': (0, 0), 'ff1': (-200, 100)}
ROUTES = {
    ('pico:GP2', 'ff1:D'): ['x-10', 'y20', 'x-230'],
    ('pico:GP3', 'ff1:CLK'): ['x-20', 'y30', 'x-220'],
    ('pico:GP10', 'ff1:Q'): ['x-60'],
}
