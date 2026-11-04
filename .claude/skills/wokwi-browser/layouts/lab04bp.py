# Lab 3 ported to the Blue Pill (lab04/bluepill, lab05): mystery chip and OLED on I2C1
# (PB6 SCL, PB7 SDA), pull-ups, buttons on PB12/PB13 (bp_buttons_top).
# - The chip (rotate 180, SCL/SDA facing the board) sits level with PB6/PB7: both run
#   straight. Its label reads upside down; no rotation puts SCL/SDA facing the board upright.
# - The OLED sits below, pins on top. PB7 drops into SDA; PB6 drops into SCL and crosses the
#   PB7 wire once (forced: both parts list SCL above/left of SDA).
# - GND.1 and 3V3.1 (bottom of the left edge) go down, under the OLED and up the far left
#   into the OLED from above. 3V3 takes the outer lane so both land without crossing; the
#   price is one crossing where the two leave the board.
# - The pull-ups and the chip's VCC hang off a 3V3 line from 3V3.2 over the top and down the
#   far left. The chip's GND comes from GND.2 in a lane outside it. rSda's wire crosses the
#   PB6 wire once.
exec(open(LAYOUT_DIR + '/bp_buttons_top.py', encoding='utf-8').read())
POS = {'bluepill': (0, 0), 'sensor': (-208.2, 126.94, 180), 'oled': (-140, 193.54),
       'rScl': (-59.35, 94, 90), 'rSda': (-74.35, 94, 90)}
ROUTES = {
    ('bluepill:B6', 'sensor:SCL'): [],
    ('bluepill:B7', 'sensor:SDA'): [],
    ('bluepill:B6', 'oled:SCL'): ['x-82.93'],
    ('bluepill:B7', 'oled:SDA'): ['x-73.1'],
    ('bluepill:3V3.2', 'sensor:VCC'): ['x100', 'y-115', 'x-240', 'y135.76'],
    ('bluepill:GND.2', 'sensor:GND'): ['x110', 'y-125', 'x-250', 'y145.36'],
    ('bluepill:3V3.1', 'oled:VCC'): ['x-20', 'y300', 'x-230', 'y170', 'x-92.38'],
    ('bluepill:GND.1', 'oled:GND'): ['x-12', 'y290', 'x-220', 'y180', 'x-101.83'],
    ('bluepill:3V3.2', 'rScl:1'): ['x100', 'y-115', 'x-240', 'y70', 'x-30'],
    ('rScl:2', 'bluepill:B6'): ['y135.76'],
    ('bluepill:3V3.2', 'rSda:1'): ['x100', 'y-115', 'x-240', 'y70', 'x-45'],
    ('rSda:2', 'bluepill:B7'): ['y145.36'],
}
bp_buttons_top(POS, ROUTES, 'btnA', 'btnB')
