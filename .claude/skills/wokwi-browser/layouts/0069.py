# LED on PB0 (bp_led_b0) and button on PA0 (bp_button_a0), both right of the board.
exec(open(LAYOUT_DIR + '/bp_led_b0.py', encoding='utf-8').read())
_p, _r = POS, ROUTES
exec(open(LAYOUT_DIR + '/bp_button_a0.py', encoding='utf-8').read())
POS = {**_p, **POS}
ROUTES = {**_r, **ROUTES}
