/* Lesson 63 starter: read the MYS-1 through the driver in mystery.c.
 * The driver functions are TODO(learner). Until they work, this prints failures. */
#include <stdio.h>

#include "pico/stdlib.h"
#include "mystery.h"

#define LOOP_PERIOD_MS   1000u

int main(void) {
    stdio_init_all();

    if (!mystery_init()) {
        printf("MYSTERY init failed\n");
    }

    while (true) {
        uint8_t id = 0;
        float celsius = 0.0f;
        if (!mystery_whoami(&id)) {
            printf("MYSTERY whoami failed\n");
        } else if (!mystery_read_celsius(&celsius)) {
            printf("MYSTERY read failed, id=0x%02X\n", id);
        } else {
            printf("MYSTERY id=0x%02X temp=%.2f C\n", id, celsius);
        }
        sleep_ms(LOOP_PERIOD_MS);
    }
}
