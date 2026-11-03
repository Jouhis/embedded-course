# Four LEDs on GP10..GP13, each through a series resistor, in a row left of the Pico.
# LED0 (GP10, bit 0) is leftmost. The LEDs sit below the GP wires so those pass over them;
# each GP wire drops in the gap right of its LED and comes up into the resistor hanging
# under the anode. The cathodes share a ground bus to GND.4 on the same edge.
# The resistor is symmetric, so its pins are wired 2 = GP side, 1 = LED side.
POS = {'pico': (0, 0)}
ROUTES = {}
for n in range(4):
    lx = -300 + 60 * n
    ax = lx + 25
    POS[f'led{n}'] = (lx, 180)
    POS[f'r{n}'] = (ax - 29.35, 269, 90)
    ROUTES[(f'pico:GP{10 + n}', f'r{n}:2')] = [f'x{lx + 48}', 'y318']
    ROUTES[(f'r{n}:1', f'led{n}:A')] = []
    ROUTES[(f'led{n}:C', 'pico:GND.4')] = ['y335', 'x-10']
