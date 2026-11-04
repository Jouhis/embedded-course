# Button on PB12 (left edge, top), left of the board. Its right-hand contacts face the board,
# so 1.r takes PB12 straight across and 2.r drops down a lane to GND.1 (left edge, bottom).
POS = {'bluepill': (0, 0), 'btn': (-100, -2.04)}
ROUTES = {
    ('bluepill:B12', 'btn:1.r'): [],
    ('btn:2.r', 'bluepill:GND.1'): ['x-15', 'y183.76'],
}
