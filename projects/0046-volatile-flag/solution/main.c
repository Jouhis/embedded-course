#include <stdbool.h>
#include <stdio.h>
#include "pico/stdlib.h"

#define LED_PIN 25      /* On-board LED of the Raspberry Pi Pico */
#define TICK_MS 100     /* The timer interrupt fires every 100 ms */

/* Shared between the timer callback (interrupt context) and main() (thread context).
 * volatile stops the compiler from keeping the value in a register across the loop,
 * so each pass of the loop reloads it from memory. It is NOT a lock: the read and the
 * clear below are two separate accesses, and a tick arriving between them is lost.
 * Lesson 57 covers critical sections, which is the fix when that matters. */
static volatile bool tick_seen = false;

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
