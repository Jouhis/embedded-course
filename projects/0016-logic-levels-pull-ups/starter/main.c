#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

#define BUTTON_PIN    14    // GP14: one pushbutton, its other side wired to GND
#define SAMPLE_MS     250   // one reading every 250 ms

int main(void) {
    stdio_init_all();
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);

    // TODO(learner): before the loop, enable the internal pull-up with gpio_pull_up().
    // Run the simulator and note the value when the button is released and when it is pressed.

    // TODO(learner): switch between the pull-up and no-pull state every 5 s
    // (use gpio_disable_pulls() for the no-pull phase), and print which phase is active
    // with each reading, so the two phases can be compared on the serial monitor.

    while (true) {
        bool level = gpio_get(BUTTON_PIN);      // true for a logic 1 (high)
        printf("GP14 = %d\n", level ? 1 : 0);
        sleep_ms(SAMPLE_MS);
    }
}
