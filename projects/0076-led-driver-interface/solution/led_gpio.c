/* led_gpio.c: the LED backend that drives a real pin. The Pico's on-board LED is GP25
 * (PICO_DEFAULT_LED_PIN), and it is active high: a 1 on the pin lights it. */
#include <stdbool.h>
#include "hardware/gpio.h"
#include "pico/stdlib.h"
#include "led.h"

#define LED_PIN PICO_DEFAULT_LED_PIN

void led_init(void) {
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_put(LED_PIN, 0);            /* start with the LED off */
}

void led_set(bool on) {
    gpio_put(LED_PIN, on ? 1 : 0);
}

bool led_get(void) {
    /* Reading the output back checks the hardware, not a copy kept in a variable. */
    return gpio_get_out_level(LED_PIN) != 0;
}
