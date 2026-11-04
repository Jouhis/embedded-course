# Button on GP14 (btn_gp14_gnd4) and an LED on GP16, right of the Pico. The resistor runs
# straight out of GP16; the LED (rotate 180, pins on top) sits past its end, and the cathode
# goes up into GND.5, the ground pin above GP16, so the loop closes without a crossing.
exec(open(LAYOUT_DIR + '/btn_gp14_gnd4.py', encoding='utf-8').read())
POS = {'pico': (0, 0), 'r1': (100, 189.5), 'led1': (160, 200, 180)}
ROUTES = {
    ('pico:GP16', 'r1:1'): [],
    ('r1:2', 'led1:A'): ['x175'],
    ('led1:C', 'pico:GND.5'): ['y175.95'],
}
btn_gp14_gnd4(POS, ROUTES, 'btn')
