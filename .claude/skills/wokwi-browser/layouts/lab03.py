# Lab 3 on the Pico (also lab04/pico and lab06): OLED and mystery chip on one I2C bus
# (GP4 SDA, GP5 SCL), pull-ups, buttons on GP14 and GP15.
# Both I2C parts stand left of the Pico, pins facing it: the OLED (rotate 90) level with GP4,
# the chip (rotate 180) under it. SCL runs down a lane at x-20, SDA at x-30.
# Three crossings are forced by pin order:
# - GP4 is above GP5 on the Pico, but each part has SCL above SDA: the GP4 wire crosses the
#   SCL lane, and the chip's SCL wire crosses the SDA lane.
# - The OLED's GND comes over the top from GND.7 and crosses the 3V3 lane once (3V3 has to
#   reach both the OLED, the pull-ups and the chip's far side).
# The pull-ups hang from the 3V3 lane at y-45 onto the I2C wires. The chip's power pins face
# away (its label reads upside down: no rotation gives SCL/SDA facing the Pico upright):
# 3V3 comes down its left side, GND from GND.4 (shared with button A) up its left side.
# Buttons (rotate 90, pins on top) below-left as in 0061.
POS = {'pico': (0, 0), 'oled': (-148.54, 3.78, 90), 'sensor': (-168.2, 110, 180),
       'rSda': (-37.35, -11, 90), 'rScl': (-49.35, -11, 90),
       'btnA': (-150, 249.5, 90), 'btnB': (-60, 249.5, 90)}
ROUTES = {
    ('pico:GP4', 'sensor:SDA'): ['x-30', 'y128.42'],
    ('pico:GP5', 'sensor:SCL'): ['x-20', 'y118.82'],
    ('pico:3V3', 'sensor:VCC'): ['x85', 'y-45', 'x-180', 'y118.82'],
    ('pico:GND.4', 'sensor:GND'): ['x-190', 'y128.42'],
    ('pico:GP4', 'oled:SDA'): [],
    ('pico:GP5', 'oled:SCL'): ['x-20', 'y50.85'],
    ('pico:3V3', 'oled:VCC'): ['x85', 'y-45', 'x-35', 'y41.4'],
    ('pico:GND.7', 'oled:GND'): ['x95', 'y-55', 'x-50', 'y31.95'],
    ('pico:3V3', 'rSda:1'): ['x85', 'y-45', 'x-8'],
    ('rSda:2', 'pico:GP4'): ['y60.75'],
    ('pico:3V3', 'rScl:1'): ['x85', 'y-45', 'x-20'],
    ('rScl:2', 'pico:GP5'): ['y70.35'],
    ('pico:GP14', 'btnA:1.l'): ['x-105.5'],
    ('btnA:2.l', 'pico:GND.4'): ['y175.95'],
    ('pico:GP15', 'btnB:2.l'): ['x-34.5'],
    ('btnB:1.l', 'pico:GND.5'): ['y220', 'x90', 'y175.95'],
}
