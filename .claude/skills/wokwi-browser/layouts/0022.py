# Gates left of the Pico, signal flowing left to right into GP10. GP2 and GP3 run over the top
# and down the left side to the first column of gates.
POS = {'pico': (0, 0), 'or1': (-370, 40), 'and1': (-370, 110), 'not1': (-250, 110), 'and2': (-120, 118.35)}
ROUTES = {
    ('pico:GP2', 'or1:A'): ['x-10', 'y10', 'x-400'],
    ('pico:GP2', 'and1:A'): ['x-10', 'y10', 'x-400'],
    ('pico:GP3', 'or1:B'): ['x-20', 'y20', 'x-390'],
    ('pico:GP3', 'and1:B'): ['x-20', 'y20', 'x-390'],
    ('or1:OUT', 'and2:A'): ['x-130'],
    ('and1:OUT', 'not1:IN'): [],
    ('not1:OUT', 'and2:B'): ['x-140'],
    ('and2:OUT', 'pico:GP10'): [],
}
