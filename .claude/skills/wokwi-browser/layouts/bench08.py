# bench08: lab 3 on a Pico 2 with an NTC in place of the mystery chip.
# OLED and pull-ups as in bench06 (two forced crossings), buttons below-left as in 0061.
# The NTC (rotate 180, pins facing the Pico) sits right of it with OUT level with GP26. Its
# VCC is below OUT while 3V3 is above GP26, so the 3V3 lane crosses the GP26 wire once;
# GND comes up from GND.6.
exec(open(LAYOUT_DIR + '/bench06.py', encoding='utf-8').read())
POS = {'pico': (0, 0), 'oled': POS['oled1'], 'rSda': POS['rsda'], 'rScl': POS['rscl'],
       'btnA': (-150, 249.5, 90), 'btnB': (-60, 249.5, 90), 'ntc1': (130, 72.75, 180)}
ROUTES = {(a.replace('oled1', 'oled').replace('rsda', 'rSda').replace('rscl', 'rScl'),
           b.replace('oled1', 'oled').replace('rsda', 'rSda').replace('rscl', 'rScl')): r
          for (a, b), r in ROUTES.items()}
ROUTES.update({
    ('pico:GP14', 'btnA:1.l'): ['x-105.5'],
    ('btnA:2.l', 'pico:GND.4'): ['y176.01'],
    ('pico:GP15', 'btnB:2.l'): ['x-34.5'],
    ('btnB:1.l', 'pico:GND.5'): ['y220', 'x90', 'y176.01'],
    ('pico:GP26', 'ntc1:OUT'): [],
    ('pico:3V3', 'ntc1:VCC'): ['x110', 'y108.95'],
    ('pico:GND.6', 'ntc1:GND'): ['x100', 'y118.55'],
})
