/* Bench lab 4: measure the bounce.
 *
 * A pushbutton connects GP14 to GND, with the internal pull-up. The GPIO interrupt fires on
 * both edges and stores a timestamp for every edge (it does nothing else: lesson 57). The main
 * loop waits until the pin has been quiet for QUIET_MS, then reports the burst: how many edges
 * it had and how long it lasted from the first edge to the last. Each burst is one press or
 * one release. The debounced press count uses a lockout of DEBOUNCE_MS after an accepted press.
 *
 * Wokwi bounces its pushbutton for about 1 ms (docs.wokwi.com/parts/wokwi-pushbutton). A real
 * switch can bounce much longer, so the lockout must come from measurements of real buttons.
 * Mirror GP14 on the logic analyzer (D0) to compare its capture with these numbers.
 */
// EXPECT: BENCH4 ready
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/sync.h"

#define BUTTON_PIN   14u
#define MAX_EDGES    256u      // per burst; more than any switch we have seen bounce
#define QUIET_MS     50u       // no edge for this long: the burst is over
/* Lockout after an accepted press. Measured worst bounce on the bench button, doubled for
 * margin, then rounded up (see the lab's table). Too short counts bounce as presses; too long
 * drops real fast double presses. */
#define DEBOUNCE_MS  20u

static volatile uint32_t edge_us[MAX_EDGES];
static volatile uint32_t edge_count;
static volatile uint32_t presses;
static volatile uint32_t last_accept_us;

static void on_edge(uint gpio, uint32_t events) {
    (void)gpio;
    uint32_t now = time_us_32();
    if (edge_count < MAX_EDGES) {
        edge_us[edge_count++] = now;
    }
    // Falling edge = press (active low). Count it only outside the lockout window.
    if ((events & GPIO_IRQ_EDGE_FALL) && (now - last_accept_us) >= DEBOUNCE_MS * 1000u) {
        last_accept_us = now;
        presses++;
    }
}

int main(void) {
    stdio_init_all();
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);
    last_accept_us = time_us_32() - DEBOUNCE_MS * 1000u;
    gpio_set_irq_enabled_with_callback(BUTTON_PIN, GPIO_IRQ_EDGE_FALL | GPIO_IRQ_EDGE_RISE, true, on_edge);
    printf("BENCH4 ready: lockout %u ms. Press and release the button.\n", DEBOUNCE_MS);

    uint32_t worst_us = 0, reported_presses = 0;
    while (true) {
        sleep_ms(5);
        uint32_t saved = save_and_disable_interrupts();
        uint32_t n = edge_count;
        uint32_t first = n ? edge_us[0] : 0, last = n ? edge_us[n - 1] : 0;
        bool quiet = n && (time_us_32() - last) >= QUIET_MS * 1000u;
        if (quiet) {
            edge_count = 0;          // start the next burst
        }
        uint32_t p = presses;
        restore_interrupts(saved);

        if (quiet) {
            uint32_t span = last - first;
            if (span > worst_us) {
                worst_us = span;
            }
            printf("BENCH4 burst: %lu edges over %lu us (worst so far %lu us), pin now %s, presses %lu\n",
                   (unsigned long)n, (unsigned long)span, (unsigned long)worst_us,
                   gpio_get(BUTTON_PIN) ? "up" : "down", (unsigned long)p);
            if (p - reported_presses > 1) {
                printf("BENCH4 warning: one burst counted %lu presses: the lockout is too short\n",
                       (unsigned long)(p - reported_presses));
            }
            reported_presses = p;
        }
    }
}
