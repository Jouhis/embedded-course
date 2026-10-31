/* led_gpio.c: the LED backend that drives a real pin. The Pico's on-board LED is GP25
 * (PICO_DEFAULT_LED_PIN), and it is active high: a 1 on the pin lights it. */
#include <stdbool.h>
#include "hardware/gpio.h"
#include "pico/stdlib.h"
#include "led.h"

#define LED_PIN PICO_DEFAULT_LED_PIN

void led_init(void) {
    /* TODO(learner): gpio_init(LED_PIN), gpio_set_dir(LED_PIN, GPIO_OUT), and start with
     * the pin low so the LED is off before the first led_set(). */
}

void led_set(bool on) {
    /* TODO(learner): drive the pin with gpio_put(LED_PIN, on ? 1 : 0). */
    (void)on;
}

bool led_get(void) {
    /* TODO(learner): return the level on the output with gpio_get_out_level(LED_PIN) != 0.
     * Reading the output back checks the hardware, not a copy kept in a variable. */
    return false;
}
