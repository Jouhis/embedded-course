# Small Pico 2 bench diagrams. Each benchNN.py sets BENCH and runs this file.
POS = {'pico': (0, 0)}
ROUTES = {}
if BENCH == 'bench01':
    # LED on GP15 (left edge): its wire drops down a lane to the resistor and LED under the
    # Pico; the cathode returns under the Pico into GND.5 (as in 0110).
    POS.update({'r1': (-49.35, 254, 90), 'led1': (-35, 292, 180)})
    ROUTES.update({
        ('pico:GP15', 'r1:1'): ['x-20'],
        ('r1:2', 'led1:A'): [],
        ('led1:C', 'pico:GND.5'): ['y286', 'x90', 'y176.01'],
    })
elif BENCH == 'bench02':
    # Button right of the Pico: 2.l straight to GP16, 1.l to GND.5 just above.
    POS['btn1'] = (100, 163.21)
    ROUTES.update({('pico:GP16', 'btn1:2.l'): [], ('btn1:1.l', 'pico:GND.5'): []})
elif BENCH == 'bench03':
    # Logic analyzer right of the Pico: GP21 straight into D1. GP0 (top of the left edge)
    # comes over the top into D0; GND from GND.5 below GP21 into GND.
    POS['logic1'] = (120, 118.4)
    ROUTES.update({
        ('pico:GP0', 'logic1:D0'): ['x-10', 'y-15', 'x110', 'y127.65'],
        ('pico:GP21', 'logic1:D1'): [],
        ('pico:GND.5', 'logic1:GND'): ['x100', 'y204.45'],
    })
elif BENCH == 'bench04':
    # Button on GP14 left of the Pico (2.r straight, 1.r into GND.4). The logic analyzer sits
    # below it: D0 taps GP14 down a lane at x-20 and comes in from the left; its GND comes
    # under the Pico from GND.5.
    POS.update({'btn1': (-100, 153.61), 'logic1': (-150, 270)})
    ROUTES.update({
        ('pico:GP14', 'btn1:2.r'): [],
        ('btn1:1.r', 'pico:GND.4'): ['x-15'],
        ('pico:GP14', 'logic1:D0'): ['x-20', 'y255', 'x-165', 'y279.25'],
        ('pico:GND.5', 'logic1:GND'): ['x90', 'y390', 'x-175', 'y356.05'],
    })
elif BENCH in ('bench05', 'bench17'):
    # Pot above-right, pins down. GND.8, the ADC pin and 3V3 rise into GND, SIG and VCC; 3V3
    # sits above the ADC pins, so it crosses the SIG wire once. bench05 ties GP28 to GND.7
    # with a short loop.
    sig_y = 89.65 if BENCH == 'bench05' else 99.25
    sig = 'GP27' if BENCH == 'bench05' else 'GP26'
    POS['pot1'] = (90, -68.5)
    ROUTES.update({
        ('pot1:VCC', 'pico:3V3'): ['y51.25'],
        ('pot1:GND', 'pico:GND.8'): ['y32.05'],
        ('pot1:SIG', f'pico:{sig}'): [f'y{sig_y}'],
    })
    if BENCH == 'bench05':
        ROUTES[('pico:GP28', 'pico:GND.7')] = ['x82']
elif BENCH == 'bench07':
    # LED ring above-left, pins down: GP2 and GND.2 rise into DIN and GND. VBUS comes over the
    # top just under the ring into VCC and crosses the DIN wire once (VCC sits between).
    POS['ring1'] = (-81.54, -124.83)
    ROUTES.update({
        ('pico:GP2', 'ring1:DIN'): ['x-30'],
        ('pico:VBUS', 'ring1:VCC'): ['x85', 'y-5', 'x-39.6'],
        ('pico:GND.2', 'ring1:GND'): ['x-49.2'],
    })
