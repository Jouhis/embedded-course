# Three LEDs on GP2..GP4 and a button on GP14, all left of the Pico. Both ground returns
# share one bus under the Pico to GND.5.
exec(open(LAYOUT_DIR + '/leds_row.py', encoding='utf-8').read())
exec(open(LAYOUT_DIR + '/button_gp14.py', encoding='utf-8').read())
POS, ROUTES = {}, {}
leds_row(3, POS, ROUTES)
button_gp14(POS, ROUTES)
