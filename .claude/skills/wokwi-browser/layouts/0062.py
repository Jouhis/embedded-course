# SPI into a 74HC595: SCK GP18, MOSI GP19, latch GP17, all on the Pico's right edge. The chip
# sits below-right, its inputs on the top row; LEDs Q0..Q7 hang below it as in 0025.
# The 595's top row is DS, OE, STCP, SHCP left to right while the Pico gives GP19 (DS) first,
# so the DS wire must cross the two clock lanes: every orientation of the chip forces that.
# 3V3 reaches VCC round the left of the Pico (VCC is the leftmost top pin, so any route from
# the right crosses all three signal lanes), and MR from the right. The logic analyzer taps
# the three signal lanes from the right.
POS = {'pico': (0, 0), 'sr1': (200, 240), 'la1': (360, 110)}
ROUTES = {
    ('pico:GP19', 'sr1:DS'): ['x120', 'y206'],
    ('pico:GP18', 'sr1:SHCP'): ['x110', 'y214'],
    ('pico:GP17', 'sr1:STCP'): ['x100', 'y222'],
    ('pico:3V3', 'sr1:VCC'): ['x85', 'y-25', 'x-25', 'y232'],
    ('pico:3V3', 'sr1:MR'): ['x300', 'y232'],
    ('pico:GND.1', 'sr1:OE'): ['x-15', 'y228'],
    ('pico:GND.1', 'sr1:GND'): ['x-40', 'y490', 'x600', 'y274'],
    ('la1:D0', 'pico:GP18'): ['x340', 'y214', 'x110'],
    ('la1:D1', 'pico:GP19'): ['x330', 'y206', 'x120'],
    ('la1:D2', 'pico:GP17'): ['x320', 'y222', 'x100'],
    ('la1:GND', 'pico:GND.1'): ['x350', 'y262', 'x600', 'y490', 'x-40'],
}
for n in range(8):
    POS[f'led{n}'] = (160 + 50 * n, 345)
    POS[f'r{n}'] = (145.65 + 50 * n, 434, 90)
    target = 199 + 50 * n
    if n == 0:
        ROUTES[('sr1:Q0', 'led0:A')] = ['y236', 'x150', 'y322', f'x{target}', 'y402']
    else:
        ROUTES[(f'sr1:Q{n}', f'led{n}:A')] = [f'y{322 - 6 * n}', f'x{target}', 'y402']
    ROUTES[(f'led{n}:C', f'r{n}:1')] = []
    ROUTES[(f'r{n}:2', 'pico:GND.1')] = ['y490', 'x-40']
