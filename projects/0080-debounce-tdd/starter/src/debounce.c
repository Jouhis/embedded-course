#include "debounce.h"

void debounce_init(debounce_t *d) {
    d->count = 0;
    d->stable = 0;
}

uint8_t debounce_update(debounce_t *d, uint8_t raw_pressed) {
    /* TODO(learner): implement the integrator, then run the tests and watch them go green.
     *   1. If raw_pressed, count up to DEBOUNCE_MAX and stop there (saturate).
     *   2. Otherwise count down to 0 and stop there.
     *   3. Set stable = 1 when count reaches DEBOUNCE_MAX, and stable = 0 when it reaches 0.
     *      Between those two values, keep the old stable value.
     *   4. Return stable. */
    (void)d;
    (void)raw_pressed;
    return 0;
}
