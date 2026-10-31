#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// One pushbutton on GP14, wired between GP14 and GND. The button is active low:
// pressed reads 0, released reads 1 (with the pull-up enabled).
#define BUTTON_PIN   14u
#define SAMPLE_MS    1u     // sample the pin every 1 ms

static bool prev_raw = false;   // the raw reading on the last sample
static uint32_t raw_edges = 0;  // every press-or-bounce edge, before any debounce
static uint32_t presses = 0;    // what the user should see

// TODO(learner): replace the naive edge detector below with an integrator debounce.
// Keep a counter that goes up while the button reads pressed and down while it reads
// released, clamp it to 0..DEBOUNCE_SAMPLES, and count a press only when it reaches the top.
static bool debounce_press(bool raw_pressed) {
    return raw_pressed && !prev_raw;   // naive: fires on every bounce edge
}

int main(void) {
    stdio_init_all();

    // TODO(learner): configure GP14 as an input with the internal pull-up enabled.
    // gpio_init(), gpio_set_dir() with GPIO_IN, then gpio_pull_up().

    printf("press the button; watch the raw count and the debounced count\n");

    while (true) {
        bool raw_pressed = !gpio_get(BUTTON_PIN);   // active low: 0 means pressed
        if (raw_pressed && !prev_raw) {
            raw_edges++;
        }
        if (debounce_press(raw_pressed)) {
            presses++;
            printf("press %lu (raw edges so far: %lu)\n", (unsigned long)presses,
                   (unsigned long)raw_edges);
        }
        prev_raw = raw_pressed;
        sleep_ms(SAMPLE_MS);
    }
}
