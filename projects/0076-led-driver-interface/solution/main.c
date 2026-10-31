#include <stdbool.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "led.h"

// EXPECT: LED DRIVER OK

// main.c does not know whether the LED is a pin or a log line. It only checks that the
// driver reports back the level it was given, so a broken backend prints LED DRIVER FAIL.
#define BLINK_COUNT    3u
#define HALF_PERIOD_MS 300u

int main(void) {
    stdio_init_all();
    led_init();

    bool ok = true;
    for (unsigned i = 0; i < BLINK_COUNT; i++) {
        led_set(true);
        ok = ok && led_get();
        sleep_ms(HALF_PERIOD_MS);

        led_set(false);
        ok = ok && !led_get();
        sleep_ms(HALF_PERIOD_MS);
    }

    if (ok) {
        puts("LED DRIVER OK");
    } else {
        puts("LED DRIVER FAIL");
    }
    while (true) {
        tight_loop_contents();
    }
}
