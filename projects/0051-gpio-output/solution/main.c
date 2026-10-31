#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"

// EXPECT: BINARY COUNTER OK

// Four LEDs on GP2..GP5. Bit 0 of the counter drives GP2, bit 3 drives GP5.
#define LED_FIRST_PIN  2u
#define LED_COUNT      4u
#define LED_MASK       (((1u << LED_COUNT) - 1u) << LED_FIRST_PIN)   // 0x3C: GP2..GP5
#define COUNT_MAX      ((1u << LED_COUNT) - 1u)                      // 15
#define STEP_MS        500u

int main(void) {
    stdio_init_all();

    // gpio_init_mask() selects the SIO function, makes the pins inputs and drives them low.
    // gpio_set_dir_out_masked() then turns the same pins into outputs: one store to the
    // SIO register GPIO_OE_SET, which sets only the bits in LED_MASK.
    gpio_init_mask(LED_MASK);
    gpio_set_dir_out_masked(LED_MASK);

    printf("BINARY COUNTER OK\n");

    uint32_t count = 0;
    while (true) {
        // gpio_put_masked() reads GPIO_OUT, then makes one atomic XOR store (GPIO_OUT_XOR) that
        // flips only the pins that differ inside LED_MASK. Bit n of count goes to GP(2 + n).
        // Pins outside LED_MASK are never changed.
        gpio_put_masked(LED_MASK, (count << LED_FIRST_PIN) & LED_MASK);

        printf("count = %lu\n", (unsigned long)count);
        count = (count + 1u) & COUNT_MAX;   // 15 wraps to 0: a 4-bit counter
        sleep_ms(STEP_MS);
    }
}
