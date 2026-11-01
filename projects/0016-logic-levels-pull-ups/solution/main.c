// EXPECT: [pull-up]   GP14 = 1
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

#define BUTTON_PIN   14     // GP14: one pushbutton, its other side wired to GND
#define SAMPLE_MS    250    // one reading every 250 ms, slow enough to read on the serial monitor
#define PHASE_SAMPLES 20    // 20 samples = 5 s per phase, so each phase can be observed

// Pull-up: the internal resistor (about 50 to 80 kOhm, RP2040 datasheet Table 625) holds
// the pin at 3V3 when the button is open. Without it the pin is floating: it has no
// defined level and can read either 0 or 1.
static void configure_pulls(bool pull_up) {
    if (pull_up) {
        gpio_pull_up(BUTTON_PIN);
    } else {
        gpio_disable_pulls(BUTTON_PIN);
    }
}

static const char *phase_label(bool pull_up) {
    return pull_up ? "[pull-up]  " : "[no pulls]";
}

int main(void) {
    stdio_init_all();
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);

    bool pull_up = true;
    uint32_t sample = 0;
    configure_pulls(pull_up);

    while (true) {
        if (sample == PHASE_SAMPLES) {          // switch phase every 5 s
            pull_up = !pull_up;
            configure_pulls(pull_up);
            sample = 0;
        }
        bool level = gpio_get(BUTTON_PIN);      // true for a logic 1 (high)
        printf("%s GP14 = %d\n", phase_label(pull_up), level ? 1 : 0);
        sleep_ms(SAMPLE_MS);
        sample++;
    }
}
