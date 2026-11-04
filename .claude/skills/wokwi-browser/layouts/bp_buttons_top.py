# Shared by the Blue Pill lab 3 port (lab04, lab05) and the dryer (0113-0117): two buttons
# on PB12 and PB13, the top two pins of the left edge. Both stand above-left of the board
# (rotate 90). The signal enters each button's bottom-left pin (2.r) straight up from its
# pin, PB13's further out because it is the lower pin. Ground comes over the top from GND.2
# into each button's top-right pin (1.l), so nothing crosses.
def bp_buttons_top(pos, routes, upper, lower):
    pos[upper] = (-45.5, -82.5, 90)       # 2.r (-20, -25), 1.l (-1, -92)
    pos[lower] = (-120, -82.5, 90)        # 2.r (-94.5, -25), 1.l (-75.5, -92)
    routes[('bluepill:B12', f'{upper}:2.r')] = ['x-20']
    routes[('bluepill:B13', f'{lower}:2.r')] = ['x-94.5']
    routes[(f'{upper}:1.l', 'bluepill:GND.2')] = ['y-105', 'x90', 'y10.96']
    routes[(f'{lower}:1.l', 'bluepill:GND.2')] = ['y-105', 'x90', 'y10.96']
