# Shared by 0052, 0056 and 0057: a pushbutton left of the Pico, level with GP14, so the
# signal wire is straight into 1.r. Its other contact (2.l) goes under the Pico to GND.5,
# because a ground pin on the left edge would have to cross the GP14 wire.
def button_gp14(pos, routes, gnd_y=245):
    pos['btn1'] = (-100, 172.55)
    routes[('pico:GP14', 'btn1:1.r')] = []
    routes[('pico:GND.5', 'btn1:2.l')] = ['x90', f'y{gnd_y}', 'x-115']
