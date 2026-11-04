# 0071 timers on the Blue Pill: LED on PA0, servo on PA6 (wired back to PB0), encoder on PB6/PB7.
# The servo needs 5V.1 (left edge) but its PWM comes from PA6 (right edge), and the encoder
# sits on the left edge above 5V.1. To keep every wire clear:
# - The encoder stands upright (rotate 270, pins on top) left of the board. CLK and DT go up,
#   round its left side and in to PB6/PB7. Its power goes up and over the board to 3V3.2 and
#   GND.2 on the right edge, so the left edge below PB7 stays free.
# - 5V.1 and GND.1 drop down the left and run under the board to the servo (rotate 270, pins
#   at the bottom) right of the LED. The LED's cathode joins that GND line.
# - PA6 runs right over the LED to the servo's PWM pin; a short loop links PA6 to PB0.
POS = {'bluepill': (0, 0), 'enc1': (-125.5, 20, 270), 'r1': (100, 149.31),
       'led1': (160, 157, 180), 'servo1': (200, 145, 270)}
ROUTES = {
    ('bluepill:A0', 'r1:1'): [],
    ('r1:2', 'led1:A'): ['x175'],
    ('led1:C', 'bluepill:GND.1'): ['y158', 'x205', 'y305', 'x-8'],
    ('bluepill:A6', 'servo1:PWM'): ['x360', 'y298', 'x294'],
    ('bluepill:A6', 'bluepill:B0'): ['x84'],
    ('bluepill:5V.1', 'servo1:V+'): ['x-20', 'y315', 'x284.5'],
    ('bluepill:GND.1', 'servo1:GND'): ['x-8', 'y305', 'x275'],
    ('bluepill:B6', 'enc1:CLK'): ['x-110', 'y-12', 'x-94.6'],
    ('bluepill:B7', 'enc1:DT'): ['x-120', 'y-22', 'x-85.1'],
    ('bluepill:3V3.2', 'enc1:VCC'): ['x102', 'y-27', 'x-66.2'],
    ('bluepill:GND.2', 'enc1:GND'): ['x92', 'y-17', 'x-57'],
}
