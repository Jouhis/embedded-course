# Four LEDs on GP2..GP5 in a row left of the Pico (see leds_row.py).
exec(open(LAYOUT_DIR + '/leds_row.py', encoding='utf-8').read())
POS, ROUTES = {}, {}
leds_row(4, POS, ROUTES)
