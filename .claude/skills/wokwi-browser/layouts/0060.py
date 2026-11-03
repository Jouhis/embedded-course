# I2C: MPU6050 on GP4 (SDA) and GP5 (SCL), on the Pico's left edge. The MPU is rotated 180
# so its pins face down: SDA, SCL and GND then rise straight from the Pico pins without
# crossing (the lower Pico pin goes further left). 3V3 comes over the top of the Pico in one
# lane at y-50 to both pull-ups and round the left of the MPU into VCC from below.
# The SCL pull-up has to cross the SDA wire once: GP4 sits above GP5.
# The logic analyzer stays upright (rotated, its label reads upside down) below-left. Its
# pins face left, so the probes loop round under it, D0 outermost, and rise into the MPU
# wires; D0 and D1 cross the wires below theirs once each.
MX = -200   # MPU left edge; pins: VCC MX+7.6, GND MX+17.2, SCL MX+26.8, SDA MX+36.4
POS = {'pico': (0, 0), 'imu': (MX, -35.2, 180), 'rsda': (-59.35, -16, 90), 'rscl': (-79.35, -16, 90),
       'la1': (-390, 110)}
ROUTES = {
    ('pico:3V3', 'imu:VCC'): ['x85', 'y-50', f'x{MX - 15}', 'y35'],
    ('pico:GND.2', 'imu:GND'): [f'x{MX + 17.2}'],
    ('pico:GP4', 'imu:SDA'): [f'x{MX + 36.4}'],
    ('pico:GP5', 'imu:SCL'): [f'x{MX + 26.8}'],
    ('pico:3V3', 'rsda:1'): ['x85', 'y-50', 'x-30'],
    ('rsda:2', 'pico:GP4'): ['y60.75'],
    ('pico:3V3', 'rscl:1'): ['x85', 'y-50', 'x-50'],
    ('rscl:2', 'pico:GP5'): ['y70.35'],
    ('la1:D0', 'pico:GP4'): ['x-410', 'y230', f'x{MX + 36.4}', 'y60.75'],
    ('la1:D1', 'pico:GP5'): ['x-402', 'y222', f'x{MX + 26.8}', 'y70.35'],
    ('la1:GND', 'pico:GND.2'): ['x-396', 'y214', f'x{MX + 17.2}', 'y79.95'],
}
