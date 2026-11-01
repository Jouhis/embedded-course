// EXPECT: LED on
#include <stdio.h>
#include "pico/stdlib.h"

#define LED_PIN 25  // On-board LED of the Raspberry Pi Pico

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    while (true) {
        gpio_put(LED_PIN, 1);
        printf("LED on\n");
        sleep_ms(500);
        gpio_put(LED_PIN, 0);
        printf("LED off\n");
        sleep_ms(500);
    }
}
