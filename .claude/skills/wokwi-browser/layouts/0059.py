# PWM: pot on GP26, buzzer on GP22, LED on GP18, servo on GP16, all on the right edge.
# - Pot above-right, pins down: GND.8, GP26 and 3V3 rise into GND, SIG and VCC. 3V3 sits above
#   GP26 on the Pico but VCC is right of SIG on the pot, so 3V3 crosses the SIG wire once.
# - Buzzer (rotate 90, pins facing the Pico): GP22 straight into pin 2; pin 1 drops to GND.6
#   and crosses the GP22 wire once (pin 1 is above pin 2, GND.6 is below GP22).
# - LED: resistor straight out of GP18, LED (rotate 180) under its end; the cathode rises to
#   the GND.6 wire and shares it.
# - Servo (rotate 270, pins at the bottom) under the Pico. GND.4 and VBUS come round from the
#   left and the far right, PWM from GP16 down a lane at x100; all enter from below.
POS = {'pico': (0, 0), 'pot1': (90, -68.5), 'bz1': (174.5, 76.85, 90), 'r1': (80, 160.7),
       'led1': (130, 167, 180), 'servo1': (-55, 245, 270)}
ROUTES = {
    ('pico:3V3', 'pot1:VCC'): ['x139'],
    ('pico:GND.8', 'pot1:GND'): ['x119'],
    ('pico:GP26', 'pot1:SIG'): ['x129'],
    ('pico:GP18', 'r1:1'): [],
    ('r1:2', 'led1:A'): ['x145'],
    ('led1:C', 'pico:GND.6'): ['y127.95'],
    ('pico:GP16', 'servo1:PWM'): ['x100', 'y400', 'x39'],
    ('pico:VBUS', 'servo1:V+'): ['x82', 'y-80', 'x300', 'y415', 'x29.5'],
    ('pico:GND.4', 'servo1:GND'): ['x-40', 'y405', 'x20'],
    ('pico:GP22', 'bz1:2'): [],
    ('pico:GND.6', 'bz1:1'): ['x160'],
}
