/* button_ao.c: the button active object. It owns the pin and the debounce. It does not blink
 * anything: when a press is confirmed it publishes SIG_PRESS, and whoever subscribed (the
 * blinker) decides what the press means. The button never names the LED. */
#include <stdbool.h>
#include <stdint.h>
#include "pico/stdlib.h"
#include "ao.h"
#include "button_ao.h"

#define BUTTON_PIN     14u   /* button between GP14 and GND, internal pull-up: pressed reads 0 */
#define DEBOUNCE_TICKS 3u    /* 3 agreeing samples, 10 ms apart, make a change (lesson 52) */

typedef struct {
    ao_t base;               /* must be the first member, so an ao_t pointer casts to button_t */
    uint8_t count;           /* the integrator, from 0 to DEBOUNCE_TICKS */
    bool stable;             /* the debounced level: true = pressed */
} button_t;

static button_t s_button;

static void button_handler(ao_t *me, const event_t *e) {
    button_t *b = (button_t *)me;
    if (e->sig != SIG_TICK) {
        return;              /* only the tick matters here; other signals are not for this AO */
    }
    bool raw_pressed = !gpio_get(BUTTON_PIN);
    if (raw_pressed) {
        if (b->count < DEBOUNCE_TICKS) b->count++;
    } else {
        if (b->count > 0) b->count--;
    }
    if (!b->stable && b->count == DEBOUNCE_TICKS) {
        b->stable = true;
        ao_publish((event_t){ .sig = SIG_PRESS });   /* one event per confirmed press */
    } else if (b->stable && b->count == 0) {
        b->stable = false;
    }
}

void button_ao_init(void) {
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);
    s_button.count = 0;
    s_button.stable = false;
    ao_start(&s_button.base, button_handler, AO_SUB(SIG_TICK));
}
