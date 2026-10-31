/* blinker_ao.c: the blinker active object. It owns the LED. Each SIG_PRESS toggles the blink
 * mode, and while blinking it flips the LED every HALF_PERIOD_TICKS ticks. It never reads
 * the button pin: it only reacts to events. */
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "ao.h"
#include "blinker_ao.h"

#define LED_PIN           PICO_DEFAULT_LED_PIN   /* GP25, active high */
#define HALF_PERIOD_TICKS 50u                    /* 50 ticks x 10 ms = 500 ms per half cycle */

typedef struct {
    ao_t base;              /* first member, as in button_t */
    bool blinking;          /* blink mode, toggled by each press */
    bool lit;               /* the level last written to the LED */
    uint16_t ticks;         /* ticks since the last flip */
} blinker_t;

static blinker_t s_blinker;

static void set_led(blinker_t *b, bool on) {
    b->lit = on;
    gpio_put(LED_PIN, on ? 1 : 0);
}

static void blinker_handler(ao_t *me, const event_t *e) {
    blinker_t *b = (blinker_t *)me;
    switch (e->sig) {
    case SIG_PRESS:
        b->blinking = !b->blinking;
        b->ticks = 0;
        if (!b->blinking) {
            set_led(b, false);                   /* blink off: leave the LED dark */
        }
        printf("blink %s\n", b->blinking ? "on" : "off");
        break;
    case SIG_TICK:
        if (b->blinking && ++b->ticks >= HALF_PERIOD_TICKS) {
            b->ticks = 0;
            set_led(b, !b->lit);
        }
        break;
    default:
        break;                                   /* a signal this AO does not handle is ignored */
    }
}

void blinker_ao_init(void) {
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    set_led(&s_blinker, false);
    s_blinker.blinking = false;
    s_blinker.ticks = 0;
    ao_start(&s_blinker.base, blinker_handler, AO_SUB(SIG_TICK) | AO_SUB(SIG_PRESS));
}
