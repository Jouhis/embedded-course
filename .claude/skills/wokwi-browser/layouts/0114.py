# Dryer on the Blue Pill (0113, 0115, 0116, 0117 share the diagram).
# Right edge: fan on PB0, heater on PA6, NTC on PA0. Left edge: buttons on PB12/PB13
# (bp_buttons_top), OLED on PB6/PB7, power at the bottom (GND.1, 3V3.1).
# - Fan and heater: resistors straight out of PB0/PA6, LEDs (rotate 180, pins on top) past
#   them, the fan's further out. Each cathode drops to a GND line under the board.
# - NTC (rotate 180) with OUT level with PA0. GND.1 and 3V3.1 go down the left, under the
#   board and up between board and NTC into GND and VCC; the cathodes join that GND line.
# - OLED below-left, pins on top: PB6 and PB7 drop straight into SCL and SDA. Its power
#   comes round the far left from the same GND.1/3V3.1 lanes; 3V3 crosses the GND drop once
#   (VCC is right of GND on the OLED, the reverse of the lane order).
# - Pull-ups hang above the I2C wires from a 3V3 line that comes from 3V3.2 over the top;
#   rSda's wire crosses the PB6 wire once.
exec(open(LAYOUT_DIR + '/bp_buttons_top.py', encoding='utf-8').read())
POS = {'bluepill': (0, 0),
       'rFan': (110, 72.51), 'fan': (315, 85, 180),
       'rHeat': (110, 91.71), 'heater': (265, 104, 180),
       'ntc1': (110, 128.46, 180), 'oled': (-140, 193.54),
       'rScl': (-59.35, 94, 90), 'rSda': (-74.35, 94, 90)}
ROUTES = {
    ('bluepill:B0', 'rFan:1'): [],
    ('rFan:2', 'fan:A'): ['x330'],
    ('fan:C', 'bluepill:GND.1'): ['y87', 'x350', 'y260', 'x-20'],
    ('bluepill:A6', 'rHeat:1'): [],
    ('rHeat:2', 'heater:A'): ['x280'],
    ('heater:C', 'bluepill:GND.1'): ['y106', 'x300', 'y260', 'x-20'],
    ('bluepill:A0', 'ntc1:OUT'): [],
    ('bluepill:3V3.1', 'ntc1:VCC'): ['x-12', 'y250', 'x92', 'y164.66'],
    ('bluepill:GND.1', 'ntc1:GND'): ['x-20', 'y260', 'x100', 'y174.26'],
    ('bluepill:B6', 'oled:SCL'): ['x-82.93'],
    ('bluepill:B7', 'oled:SDA'): ['x-73.1'],
    ('bluepill:3V3.1', 'oled:VCC'): ['x-12', 'y290', 'x-220', 'y190', 'x-92.38'],
    ('bluepill:GND.1', 'oled:GND'): ['x-20', 'y300', 'x-230', 'y182', 'x-101.83'],
    ('bluepill:3V3.2', 'rScl:1'): ['x105', 'y-115', 'x-240', 'y70', 'x-30'],
    ('rScl:2', 'bluepill:B6'): ['y135.76'],
    ('bluepill:3V3.2', 'rSda:1'): ['x105', 'y-115', 'x-240', 'y70', 'x-45'],
    ('rSda:2', 'bluepill:B7'): ['y145.36'],
}
bp_buttons_top(POS, ROUTES, 'btnStart', 'btnMaterial')
