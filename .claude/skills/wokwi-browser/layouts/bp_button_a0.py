# Blue Pill: push button on PA0 (right edge, low down), to the right of the board. Its other
# contact goes under the board to GND.1 (left edge, bottom): the right edge has no GND
# below the top.
POS = {'btn1': (110, 141.96)}
ROUTES = {
    ('bluepill:A0', 'btn1:1.l'): [],
    ('btn1:2.l', 'bluepill:GND.1'): ['x95', 'y215', 'x-5', 'y183.76'],
}
