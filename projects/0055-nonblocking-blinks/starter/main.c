#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// Three LEDs on GP2, GP3 and GP4. They should blink at 1 Hz, 2 Hz and 4 Hz, all at once.
#define LED_A_PIN   2u
#define LED_B_PIN   3u
#define LED_C_PIN   4u
#define LED_MASK    ((1u << LED_A_PIN) | (1u << LED_B_PIN) | (1u << LED_C_PIN))

int main(void) {
    stdio_init_all();

    gpio_init_mask(LED_MASK);
    gpio_set_dir_out_masked(LED_MASK);

    printf("NONBLOCKING starter\n");

    // This loop is blocking. sleep_ms() holds the CPU for 500 ms, so the other two LEDs
    // cannot be serviced while it waits, and this LED only blinks at 1 Hz.
    while (true) {
        gpio_xor_mask(1u << LED_A_PIN);     // toggle LED A
        sleep_ms(500);
    }
}
