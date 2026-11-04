# Shared by 0063 and 0098: the mystery chip stands upright (rotate 270, label reads up the
# page; at 180 it would read upside down) above-left of the Pico. SDA/SCL are at its bottom,
# so GP4 and GP5 rise into them. SDA is the left pin but GP4 is the upper Pico pin, so the
# SDA wire crosses SCL once: forced by the pin order.
# Its power pins are on top: 3V3 comes over the Pico at y-80 into VCC, GND comes from GND.2
# under the I2C wires, up the far left and over at y-90 into GND.
# The pull-ups hang from the 3V3 lane: rSda next to the Pico drops onto the GP4 wire, rScl
# drops onto the SCL wire.
CL, CT = -121.18, -25.2         # chip pins: SDA (-69.6, 40), SCL (-60, 40), GND/VCC at y-63.79
def i2c_chip_left(pos, routes):
    pos.update({'sensor': (CL, CT, 270), 'rSda': (-44.35, -46, 90), 'rScl': (-64.35, -46, 90)})
    routes.update({
        ('pico:GP4', 'sensor:SDA'): ['x-69.6'],
        ('pico:GP5', 'sensor:SCL'): ['x-60'],
        ('pico:3V3', 'sensor:VCC'): ['x85', 'y-80', 'x-60'],
        ('pico:GND.2', 'sensor:GND'): ['x-140', 'y-90', 'x-69.6'],
        ('pico:3V3', 'rSda:1'): ['x85', 'y-80', 'x-15'],
        ('rSda:2', 'pico:GP4'): ['y60.75'],
        ('pico:3V3', 'rScl:1'): ['x85', 'y-80', 'x-35'],
        ('rScl:2', 'pico:GP5'): ['y50', 'x-60', 'y70.35'],
    })
