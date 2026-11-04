/* Bench lab 2: the floating input.
 *
 * GP16 has a pushbutton to GND. Every second the program samples the pin 1000 times, 1 ms
 * apart, and prints how many samples read high and how many times the value changed. A pin
 * that nothing drives (button up, no pull resistor) floats: in Wokwi it reads a steady value,
 * on a real board it picks up noise and changes when your hand comes near the wire.
 *
 * INPUT_PULL chooses the pad's pull resistor (RP2350 datasheet, section 9.6). The solution uses
 * the pull-up, which works on every RP2350. The pull-down is the trap: on RP2350 A2 chips it
 * cannot hold an input low (erratum RP2350-E9, datasheet appendix D.5.1).
 */
// EXPECT: BENCH2 stable high pull=up
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/structs/sysinfo.h"

#define BUTTON_PIN     16u
#define SAMPLES        1000u
#define SAMPLE_GAP_US  1000u

enum pull { PULL_NONE, PULL_UP, PULL_DOWN };
#define INPUT_PULL PULL_UP   // the fix: a defined level when the button is up

static void configure_input(void) {
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    switch (INPUT_PULL) {
    case PULL_UP:   gpio_pull_up(BUTTON_PIN);      break;
    case PULL_DOWN: gpio_pull_down(BUTTON_PIN);    break;
    default:        gpio_disable_pulls(BUTTON_PIN); break;
    }
}

int main(void) {
    stdio_init_all();
    configure_input();
    // Erratum E9 affects revision A2 only (datasheet appendix D.5.1), so print the revision.
    printf("BENCH2 chip revision field=%lu pull=%s\n", (unsigned long)(sysinfo_hw->chip_id >> 28),
           INPUT_PULL == PULL_UP ? "up" : INPUT_PULL == PULL_DOWN ? "down" : "none");

    while (true) {
        unsigned highs = 0, changes = 0;
        bool last = gpio_get(BUTTON_PIN);
        for (unsigned i = 0; i < SAMPLES; i++) {
            bool now = gpio_get(BUTTON_PIN);
            highs += now;
            changes += (now != last);
            last = now;
            sleep_us(SAMPLE_GAP_US);
        }
        printf("BENCH2 highs=%u/%u changes=%u\n", highs, SAMPLES, changes);
        if (changes == 0 && highs == SAMPLES) {
            // Button up and pulled up: the defined idle level. The pull is in the line because
            // the simulator reads a floating pin as a steady high, which a real pin is not.
            printf("BENCH2 stable high pull=%s\n",
                   INPUT_PULL == PULL_UP ? "up" : INPUT_PULL == PULL_DOWN ? "down" : "none");
        } else if (changes == 0 && highs == 0) {
            printf("BENCH2 stable low\n");      // button held, or pulled down
        }
    }
}
