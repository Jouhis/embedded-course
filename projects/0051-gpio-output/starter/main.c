#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// Four LEDs on GP2..GP5. Bit 0 of the counter drives GP2, bit 3 drives GP5.
#define LED_FIRST_PIN  2u
#define LED_COUNT      4u
#define LED_MASK       (((1u << LED_COUNT) - 1u) << LED_FIRST_PIN)   // 0x3C: GP2..GP5
#define COUNT_MAX      ((1u << LED_COUNT) - 1u)                      // 15
#define STEP_MS        500u

int main(void) {
    stdio_init_all();

    // TODO(learner): make the four LED pins outputs. Call gpio_init_mask(LED_MASK) to give
    // the pins the SIO function, then gpio_set_dir_out_masked(LED_MASK) to set them as outputs.

    uint32_t count = 0;
    while (true) {
        // TODO(learner): show the counter on the four LEDs with ONE call to gpio_put_masked().
        // Shift count left by LED_FIRST_PIN so bit 0 lands on GP2, and mask it with LED_MASK.

        printf("count = %lu\n", (unsigned long)count);
        count = (count + 1u) & COUNT_MAX;   // 15 wraps to 0: a 4-bit counter
        sleep_ms(STEP_MS);
    }
}
