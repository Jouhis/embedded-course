/* Lesson 63 solution: read the MYS-1 through the driver in mystery.c. */
// EXPECT: MYSTERY OK
#include <stdio.h>

#include "pico/stdlib.h"
#include "mystery.h"

#define EXPECTED_WHOAMI  0xA7u
#define LOOP_PERIOD_MS   1000u

int main(void) {
    stdio_init_all();

    if (!mystery_init()) {
        printf("MYSTERY init failed (bus error)\n");
        while (true) {
            sleep_ms(1000);
        }
    }

    uint8_t id = 0;
    if (!mystery_whoami(&id) || id != EXPECTED_WHOAMI) {
        printf("MYSTERY wrong id 0x%02X, expected 0xA7\n", id);
        while (true) {
            sleep_ms(1000);
        }
    }

    while (true) {
        float celsius = 0.0f;
        if (mystery_read_celsius(&celsius)) {
            printf("MYSTERY OK id=0x%02X temp=%.2f C\n", id, celsius);
        } else {
            printf("MYSTERY read timed out\n");
        }
        sleep_ms(LOOP_PERIOD_MS);
    }
}
