# Shared by 0051, 0055 and 0056: N LEDs in a row left of the Pico, driven from GP2.., each
# resistor hanging under its cathode, one ground bus under the Pico to GND.5 on the right edge.
# Each GP wire runs left at its own pin height, drops in the gap right of its LED and comes
# up to the anode from below, so no wire crosses an LED.
def leds_row(n_leds, pos, routes, first_gp=2, x0=-300, step=60, bus_y=245):
    gp_y = {2: 41.55, 3: 51.15, 4: 60.75, 5: 70.35}
    pos['pico'] = (0, 0)
    for n in range(n_leds):
        lx = x0 + step * n
        cx = lx + 15
        pos[f'led{n+1}'] = (lx, 100)
        pos[f'r{n+1}'] = (cx - 29.35, 189, 90)
        routes[(f'pico:GP{first_gp+n}', f'led{n+1}:A')] = [f'x{lx+48}', 'y160']
        routes[(f'led{n+1}:C', f'r{n+1}:1')] = []
        routes[(f'r{n+1}:2', 'pico:GND.5')] = [f'y{bus_y}', 'x90']
