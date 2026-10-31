#include <stdio.h>
#include "pico/stdlib.h"

#define LED_PIN 25           // On-board LED of the Raspberry Pi Pico
#define EXT_LED_PIN 15       // External LED on GP15, wired through a 220 ohm resistor to GND

// 100 ms on + 100 ms off = 200 ms period = 5 Hz.
#define HALF_PERIOD_MS 100

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_init(EXT_LED_PIN);
    gpio_set_dir(EXT_LED_PIN, GPIO_OUT);

    while (true) {
        // Phase 1: on-board LED on, external LED off.
        gpio_put(LED_PIN, 1);
        gpio_put(EXT_LED_PIN, 0);
        printf("Blink 5 Hz: on-board on, external off\n");
        sleep_ms(HALF_PERIOD_MS);

        // Phase 2: the opposite levels, so the two LEDs alternate.
        gpio_put(LED_PIN, 0);
        gpio_put(EXT_LED_PIN, 1);
        printf("Blink 5 Hz: on-board off, external on\n");
        sleep_ms(HALF_PERIOD_MS);
    }
}
