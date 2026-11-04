# The 0063 chip layout (i2c_chip_left) plus the button on GP14 (btn_gp14_gnd4).
exec(open(LAYOUT_DIR + '/i2c_chip_left.py', encoding='utf-8').read())
exec(open(LAYOUT_DIR + '/btn_gp14_gnd4.py', encoding='utf-8').read())
POS = {'pico': (0, 0)}
ROUTES = {}
i2c_chip_left(POS, ROUTES)
btn_gp14_gnd4(POS, ROUTES, 'btn')
