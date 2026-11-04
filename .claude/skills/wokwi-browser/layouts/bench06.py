# bench06: the 0061 OLED and pull-ups on a Pico 2 (pin rows sit 0.1 lower than the Pico's).
# GND.1 and GP4 run straight to GND and SDA. Forced crossings, as in 0061: SCL is above SDA
# on the OLED while GP5 is below GP4, and 3V3 comes over the top across the GND wire.
# The pull-ups stand under the I2C wires (pin 1 at the bottom), fed by 3V3 round the far left.
POS = {'pico': (0, 0), 'oled1': (-148.54, 3.88, 90),
       'rsda': (-69.65, 108.8, 270), 'rscl': (-37.65, 108.8, 270)}
ROUTES = {
    ('pico:GND.1', 'oled1:GND'): [],
    ('pico:GP4', 'oled1:SDA'): [],
    ('pico:GP5', 'oled1:SCL'): ['x-20', 'y50.95'],
    ('pico:3V3', 'oled1:VCC'): ['x85', 'y-45', 'x-35', 'y41.5'],
    ('pico:3V3', 'rsda:1'): ['x85', 'y-45', 'x-170', 'y155', 'x-40'],
    ('rsda:2', 'pico:GP4'): ['y60.85'],
    ('pico:3V3', 'rscl:1'): ['x85', 'y-45', 'x-170', 'y155', 'x-8'],
    ('rscl:2', 'pico:GP5'): ['y70.45'],
}
