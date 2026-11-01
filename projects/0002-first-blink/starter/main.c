#include <stdio.h>
#include "pico/stdlib.h"

#define LED_PIN 25  // On-board LED of the Raspberry Pi Pico

// TODO(learner) Task 1: this blink runs at 1 Hz (500 ms on, 500 ms off).
// Change the timing so the LED runs at 5 Hz: 100 ms on and 100 ms off.
// Hint: the period is 200 ms, so each half-period is 100 ms.
//
// TODO(learner) Task 2: add an external LED on GP15, in series with a 220 ohm
// resistor to GND, in diagram.json. Then make it blink in alternation with the
// on-board LED: when one is on, the other is off. Declare its pin here.

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    while (true) {
        gpio_put(LED_PIN, 1);
        printf("LED on\n");
        sleep_ms(1000);
        gpio_put(LED_PIN, 0);
        printf("LED off\n");
        sleep_ms(1000);
    }
}
