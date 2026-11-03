# Two half adders and an OR, flowing left to right into GP10 (SUM) and GP11 (COUT).
POS = {'pico': (0, 0), 'x1': (-490, 30), 'a1': (-490, 100), 'x2': (-330, 39.6), 'a2': (-330, 100), 'o1': (-160, 127.95)}
ROUTES = {
    ('pico:GP2', 'x1:A'): ['x-10', 'y0', 'x-520'],
    ('pico:GP2', 'a1:A'): ['x-10', 'y0', 'x-520'],
    ('pico:GP3', 'x1:B'): ['x-20', 'y8', 'x-510'],
    ('pico:GP3', 'a1:B'): ['x-20', 'y8', 'x-510'],
    ('x1:OUT', 'x2:A'): [],
    ('x1:OUT', 'a2:A'): ['x-360'],
    ('pico:GP4', 'x2:B'): ['x-30', 'y16', 'x-345'],
    ('pico:GP4', 'a2:B'): ['x-30', 'y16', 'x-345'],
    ('x2:OUT', 'pico:GP10'): ['x-40', 'y137.55'],
    ('a2:OUT', 'o1:A'): ['x-195'],
    ('a1:OUT', 'o1:B'): ['x-380', 'y175', 'x-180'],
    ('o1:OUT', 'pico:GP11'): [],
}
