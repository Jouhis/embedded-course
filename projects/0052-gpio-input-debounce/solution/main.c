#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// EXPECT: DEBOUNCE OK

// One pushbutton on GP14, wired between GP14 and GND. The button is active low:
// pressed reads 0, released reads 1 (with the pull-up enabled).
#define BUTTON_PIN       14u
#define SAMPLE_MS        1u     // sample the pin every 1 ms
#define DEBOUNCE_SAMPLES 10u    // the input must agree for 10 samples (10 ms) before we believe it

static bool prev_raw = false;      // the raw reading on the last sample
static uint32_t raw_edges = 0;     // every edge the pin shows, including bounce
static uint32_t presses = 0;       // debounced presses

// Integrator debounce. The counter climbs while the raw input reads pressed and falls while it
// reads released. The stable state changes only when the counter reaches an end of its range,
// so a bounce that is shorter than DEBOUNCE_SAMPLES never gets there.
static bool debounce_press(bool raw_pressed) {
    static uint8_t integrator = 0;
    static bool stable_pressed = false;

    if (raw_pressed) {
        if (integrator < DEBOUNCE_SAMPLES) integrator++;
    } else {
        if (integrator > 0) integrator--;
    }

    if (!stable_pressed && integrator == DEBOUNCE_SAMPLES) {
        stable_pressed = true;      // confirmed press: fire once here
        return true;
    }
    if (stable_pressed && integrator == 0) {
        stable_pressed = false;     // confirmed release: re-arm for the next press
    }
    return false;
}

int main(void) {
    stdio_init_all();

    // gpio_init() makes GP14 a SIO input; gpio_pull_up() turns on the RP2040's internal pull-up
    // (50 to 80 kOhm), so the pin reads high when nothing drives it.
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);

    printf("DEBOUNCE OK\n");
    printf("press the button; watch the raw count and the debounced count\n");

    while (true) {
        bool raw_pressed = !gpio_get(BUTTON_PIN);   // gpio_get() reads SIO GPIO_IN
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
