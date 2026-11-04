exec(open(LAYOUT_DIR + '/i2c_chip_left.py', encoding='utf-8').read())
POS = {'pico': (0, 0)}
ROUTES = {}
i2c_chip_left(POS, ROUTES)
