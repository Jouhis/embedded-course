/* led_fake.c: a fake LED backend. It has no pin and no SDK call: it keeps the state in a
 * variable and prints each change, so the logic can be seen on the serial monitor. */
#include <stdbool.h>
#include <stdio.h>
#include "led.h"

static bool s_on = false;

void led_init(void) {
    s_on = false;
    puts("LED fake: init");
}

void led_set(bool on) {
    s_on = on;
    printf("LED fake: %s\n", on ? "on" : "off");
}

bool led_get(void) {
    return s_on;
}
