# OLED (rotate 90, pins facing the Pico) left of the Pico, two buttons below-left.
# GND.1 and GP4 run straight to GND and SDA. Two crossings are forced by the pin order:
# SCL sits above SDA on the OLED but GP5 is below GP4, and VCC sits under GND on the OLED
# while 3V3 comes from the right edge (it comes over the top and crosses the GND wire).
# The pull-ups stand under the I2C wires (rotate 270, pin 1 at the bottom). 3V3 reaches them
# round the far left of the OLED and under them, so it crosses nothing else.
# The buttons are rotated 90 (pins on top) below-left. GND.4 and GP14 go to the left button,
# GP15 to the right one; its ground comes under the Pico from GND.5.
POS = {'pico': (0, 0), 'oled1': (-148.54, 3.78, 90),
       'rsda': (-69.65, 108.8, 270), 'rscl': (-37.65, 108.8, 270),
       'btn_down': (-150, 249.5, 90), 'btn_sel': (-60, 249.5, 90)}
ROUTES = {
    ('pico:GND.1', 'oled1:GND'): [],
    ('pico:GP4', 'oled1:SDA'): [],
    ('pico:GP5', 'oled1:SCL'): ['x-20', 'y50.85'],
    ('pico:3V3', 'oled1:VCC'): ['x85', 'y-45', 'x-35', 'y41.4'],
    ('pico:3V3', 'rsda:1'): ['x85', 'y-45', 'x-170', 'y155', 'x-40'],
    ('rsda:2', 'pico:GP4'): ['y60.75'],
    ('pico:3V3', 'rscl:1'): ['x85', 'y-45', 'x-170', 'y155', 'x-8'],
    ('rscl:2', 'pico:GP5'): ['y70.35'],
    ('pico:GND.4', 'btn_down:2.l'): ['x-124.5'],
    ('pico:GP14', 'btn_down:1.l'): ['x-105.5'],
    ('pico:GP15', 'btn_sel:2.l'): ['x-34.5'],
    ('pico:GND.5', 'btn_sel:1.l'): ['x90', 'y220', 'x-15.5'],
}
