# Rust blinky: LED on GP15, button on GP14, both on the Pico's left edge.
# The button sits level with GP14 (btn_gp14_gnd4). GP15 is just below, so its wire drops
# down a lane at x-20 to the resistor and LED under the button; the LED (rotate 180, pins on
# top) returns its cathode under the Pico and up into GND.5 on the right edge.
exec(open(LAYOUT_DIR + '/btn_gp14_gnd4.py', encoding='utf-8').read())
POS = {'pico': (0, 0), 'r1': (-49.35, 254, 90), 'led2': (-35, 292, 180)}
ROUTES = {
    ('pico:GP15', 'r1:1'): ['x-20'],
    ('r1:2', 'led2:A'): [],
    ('led2:C', 'pico:GND.5'): ['y286', 'x90', 'y175.95'],
}
btn_gp14_gnd4(POS, ROUTES, 'btn1')
