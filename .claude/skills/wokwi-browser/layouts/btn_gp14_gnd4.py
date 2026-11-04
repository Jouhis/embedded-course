# Shared by 0096, 0097, 0098, 0110: a button left of the Pico, level with GP14. 2.r takes GP14
# straight across; 1.r (the other contact) is just above and drops into GND.4, the ground pin
# right above GP14, so nothing crosses.
def btn_gp14_gnd4(pos, routes, btn):
    pos[btn] = (-100, 153.55)
    routes[('pico:GP14', f'{btn}:2.r')] = []
    routes[(f'{btn}:1.r', 'pico:GND.4')] = ['x-15']
