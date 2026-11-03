# Pico on the left. The 74HC595 sits right of it; DS, SHCP and STCP come over the top of the Pico.
# LEDs Q0..Q7 run left to right below the chip, each resistor hangs under its LED's cathode,
# and one ground bus along the bottom returns to GND.5.
POS = {'pico': (0, 0), 'sr1': (200, 60)}
ROUTES = {
    ('pico:GP2', 'sr1:DS'): ['x-10', 'y-10'],
    ('pico:GP3', 'sr1:SHCP'): ['x-30', 'y-30'],
    ('pico:GP4', 'sr1:STCP'): ['x-20', 'y-20'],
    ('pico:3V3', 'sr1:VCC'): ['x190', 'y40'],
    ('pico:3V3', 'sr1:MR'): ['x85', 'y-45'],
    ('pico:GND.5', 'sr1:GND'): ['x100', 'y310', 'x590', 'y94'],
    ('pico:GND.8', 'sr1:OE'): [],
}
for n in range(8):
    POS[f'led{n}'] = (160 + 50 * n, 165)
    POS[f'r{n}'] = (145.65 + 50 * n, 254, 90)
    target = 199 + 50 * n
    if n == 0:
        ROUTES[('sr1:Q0', 'led0:A')] = ['y56', 'x150', 'y142', f'x{target}', 'y222']
    else:
        ROUTES[(f'sr1:Q{n}', f'led{n}:A')] = [f'y{142 - 6 * n}', f'x{target}', 'y222']
    ROUTES[(f'led{n}:C', f'r{n}:1')] = []
    ROUTES[(f'r{n}:2', 'pico:GND.5')] = ['y310', 'x100', 'y175.95']
