#include "debounce.h"

void debounce_init(debounce_t *d) {
    d->count = 0;
    d->stable = 0;
}

uint8_t debounce_update(debounce_t *d, uint8_t raw_pressed) {
    if (raw_pressed) {
        if (d->count < DEBOUNCE_MAX) {     /* saturate: a long press does not build up extra credit */
            d->count++;
        }
    } else {
        if (d->count > 0) {
            d->count--;
        }
    }

    if (d->count == DEBOUNCE_MAX) {
        d->stable = 1;                     /* confirmed press: the integrator reached the top */
    } else if (d->count == 0) {
        d->stable = 0;                     /* confirmed release: the integrator reached the bottom */
    }                                      /* in between, the output holds its last value */
    return d->stable;
}
