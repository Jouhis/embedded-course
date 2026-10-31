#include <stdbool.h>
#include <stdio.h>
#include "pico/stdlib.h"

#define LED_PIN 25      /* On-board LED of the Raspberry Pi Pico */
#define TICK_MS 100     /* The timer interrupt fires every 100 ms */

/* Set by the timer callback. The callback runs in interrupt context,
 * while main() runs in thread context, so main() must see every write. */
static bool tick_seen = false;   /* TODO(learner): this flag needs one qualifier. Which one, and why? */

/* Runs in interrupt context, once per TICK_MS. Returning true keeps the timer repeating. */
static bool on_tick(repeating_timer_t *rt) {
    (void)rt;
    tick_seen = true;
    return true;
}

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    repeating_timer_t timer;
    add_repeating_timer_ms(TICK_MS, on_tick, NULL, &timer);

    printf("waiting for the first tick\n");
    while (!tick_seen) {
        /* Empty on purpose: spin until the ISR sets the flag. */
    }
    printf("VOLATILE FLAG OK\n");

    while (true) {
        while (!tick_seen) { }
        tick_seen = false;
        gpio_xor_mask(1u << LED_PIN);   /* toggle the LED once per tick */
        printf("tick\n");
    }
}
