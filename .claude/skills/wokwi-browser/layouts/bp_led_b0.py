# Blue Pill: LED on PB0 through a resistor, right of the board (shared by 0067, 0069).
# B0 is on the board's right edge; the resistor runs straight out of it, the LED stands
# above the resistor's far end, and the cathode returns to GND.3 (right edge, near the top)
# in a lane left of the LED, above the resistor wire.
POS = {'bluepill': (0, 0), 'r1': (100, 72.51), 'led1': (150, 10)}
ROUTES = {
    ('bluepill:B0', 'r1:1'): [],
    ('r1:2', 'led1:A'): ['x175'],
    ('led1:C', 'bluepill:GND.3'): ['y62', 'x120', 'y20.56'],
}
