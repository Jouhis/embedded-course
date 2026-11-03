# One button on GP14 (see button_gp14.py).
exec(open(LAYOUT_DIR + '/button_gp14.py', encoding='utf-8').read())
POS, ROUTES = {'pico': (0, 0)}, {}
button_gp14(POS, ROUTES)
