/* led_fake.c: a fake LED backend. It has no pin and no SDK call: it keeps the state in a
 * variable and prints each change, so the logic can be seen on the serial monitor. */
#include <stdbool.h>
#include <stdio.h>
#include "led.h"

static bool s_on = false;

void led_init(void) {
    /* TODO(learner): print "LED fake: init" and set s_on = false. */
}

void led_set(bool on) {
    /* TODO(learner): store on in s_on, then print "LED fake: on" or "LED fake: off". */
    (void)on;
}

bool led_get(void) {
    /* TODO(learner): return s_on. */
    return s_on;
}
