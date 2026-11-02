/* Bench lab 1: measure what you calculated.
 *
 * GP15 drives an LED through a 330 ohm resistor to ground. The pin stays high so the circuit is
 * steady for the multimeter, and every 10 s the program changes the pad's drive strength
 * (2, 4, 8, 12 mA) so you can see how much the pin's own output voltage sags under load.
 * RP2350 datasheet, section 14.9.4 (VOH) and section 9.6 (pad drive strength).
 */
// EXPECT: BENCH1 drive=12mA
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"

#define LED_PIN       15u
#define STEP_MS       10000u   // long enough to read the meter at each setting

static const enum gpio_drive_strength DRIVES[] = {
    GPIO_DRIVE_STRENGTH_2MA, GPIO_DRIVE_STRENGTH_4MA, GPIO_DRIVE_STRENGTH_8MA, GPIO_DRIVE_STRENGTH_12MA,
};
static const unsigned DRIVE_MA[] = { 2u, 4u, 8u, 12u };
#define DRIVE_COUNT (sizeof DRIVES / sizeof DRIVES[0])

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_put(LED_PIN, 1);           // steady high: the meter needs a steady circuit

    printf("BENCH1 LED on GP15 through 330R. Measure V(pin), V(LED), V(resistor).\n");
    for (unsigned i = 0;; i = (i + 1u) % DRIVE_COUNT) {
        gpio_set_drive_strength(LED_PIN, DRIVES[i]);
        printf("BENCH1 drive=%umA\n", DRIVE_MA[i]);
        sleep_ms(STEP_MS);
    }
}
