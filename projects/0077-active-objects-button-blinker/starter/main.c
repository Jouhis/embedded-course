#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// The starter is a working SUPER LOOP: one loop samples the button, debounces it, toggles the
// blink on each press, and flips the LED every 500 ms while blinking. It works, but every
// part of the program waits for every other part.
//
// TODO(learner): split this into two active objects. Move the button code into button_ao.c and
// the LED code into blinker_ao.c, with the framework in ao.c and ao.h. Then main.c only makes
// the 10 ms tick, publishes it, and calls ao_dispatch_all(). See the solution folder for the
// finished version. The printed lines must stay the same: "blink on" and "blink off".

#define LED_PIN           PICO_DEFAULT_LED_PIN
#define BUTTON_PIN        14u
#define TICK_MS           10u
#define DEBOUNCE_TICKS    3u
#define HALF_PERIOD_TICKS 50u

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_put(LED_PIN, 0);
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);
    puts("SUPER LOOP START");

    uint8_t count = 0;
    bool stable = false;
    bool blinking = false;
    bool lit = false;
    uint16_t ticks = 0;
    uint32_t next = to_ms_since_boot(get_absolute_time()) + TICK_MS;

    while (true) {
        uint32_t now = to_ms_since_boot(get_absolute_time());
        if ((int32_t)(now - next) < 0) {
            continue;
        }
        next += TICK_MS;

        bool raw_pressed = !gpio_get(BUTTON_PIN);
        if (raw_pressed) {
            if (count < DEBOUNCE_TICKS) count++;
        } else {
            if (count > 0) count--;
        }
        if (!stable && count == DEBOUNCE_TICKS) {
            stable = true;
            blinking = !blinking;
            ticks = 0;
            if (!blinking) {
                lit = false;
                gpio_put(LED_PIN, 0);
            }
            printf("blink %s\n", blinking ? "on" : "off");
        } else if (stable && count == 0) {
            stable = false;
        }

        if (blinking && ++ticks >= HALF_PERIOD_TICKS) {
            ticks = 0;
            lit = !lit;
            gpio_put(LED_PIN, lit ? 1 : 0);
        }
    }
}
