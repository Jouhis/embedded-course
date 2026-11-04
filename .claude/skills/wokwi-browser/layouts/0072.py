# Button on PB0 (right edge). Its ground goes under the board to GND.1: a lane up to GND.3
# would cross the PB0 wire.
POS = {'bluepill': (0, 0), 'btn1': (110, 65.16)}
ROUTES = {
    ('bluepill:B0', 'btn1:1.l'): [],
    ('btn1:2.l', 'bluepill:GND.1'): ['x95', 'y215', 'x-5', 'y183.76'],
}
