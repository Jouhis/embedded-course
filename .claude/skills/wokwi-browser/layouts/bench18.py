# The dryer on a Pico 2 (bench18).
# - OLED and pull-ups left of the Pico as in bench06 (two crossings forced by pin order).
# - NTC right of the Pico as in bench08 (3V3 crosses the GP26 wire once).
# - Fan on GP16: resistor straight out, LED (rotate 180) past it, cathode up into GND.5.
# - GP13, GND.4, GP14 and GP15 drop down the left in that order to the two buttons
#   (rotate 90, pins on top) and the heater. GND.4 feeds one pin of each button.
# - The heater (as in 0110) returns its cathode under the Pico and round the fan LED into
#   the fan's GND.5 wire.
exec(open(LAYOUT_DIR + '/bench06.py', encoding='utf-8').read())
POS = {'pico': (0, 0), 'oled': POS['oled1'], 'rSda': POS['rsda'], 'rScl': POS['rscl'],
       'ntc1': (130, 72.75, 180), 'rFan': (100, 189.56), 'fan': (160, 200, 180),
       'btnMaterial': (-159.5, 249.5, 90), 'btnStart': (-99.5, 249.5, 90),
       'rHeat': (-49.35, 254, 90), 'heater': (-35, 292, 180)}
ROUTES = {(a.replace('oled1', 'oled').replace('rsda', 'rSda').replace('rscl', 'rScl'),
           b.replace('oled1', 'oled').replace('rsda', 'rSda').replace('rscl', 'rScl')): r
          for (a, b), r in ROUTES.items()}
ROUTES.update({
    ('pico:GP26', 'ntc1:OUT'): [],
    ('pico:3V3', 'ntc1:VCC'): ['x110', 'y108.95'],
    ('pico:GND.6', 'ntc1:GND'): ['x100', 'y118.55'],
    ('pico:GP16', 'rFan:1'): [],
    ('rFan:2', 'fan:A'): ['x175'],
    ('fan:C', 'pico:GND.5'): ['y176.01'],
    ('pico:GP13', 'btnMaterial:2.l'): ['x-134'],
    ('btnMaterial:1.l', 'pico:GND.4'): ['y176.01'],
    ('btnStart:2.l', 'pico:GND.4'): ['y228', 'x-115', 'y176.01'],
    ('pico:GP14', 'btnStart:1.l'): ['x-55'],
    ('pico:GP15', 'rHeat:1'): ['x-20'],
    ('rHeat:2', 'heater:A'): [],
    ('heater:C', 'pico:GND.5'): ['y294', 'x210', 'y176.01'],
})
