// EXPECT: presses=1
// SIM-SCENARIO: press-button.yaml
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "hardware/sync.h"
#include "pico/stdlib.h"

#define BUTTON_PIN  14     // GP14: pushbutton to GND, pull-up on (same wiring as lesson 16)
#define LOOP_MS     100    // main loop period: slow enough to read, fast enough to feel responsive

// Shared with the ISR. volatile stops the compiler caching them in main (lesson 46).
// volatile does NOT make count++ or the read-and-clear atomic: see main() below.
static volatile uint32_t press_count = 0;
static volatile bool press_pending = false;

// ISR: short, no printf, no blocking. It only records that something happened.
static void on_button(uint gpio, uint32_t events) {
    (void)gpio;
    (void)events;
    press_count++;          // written only here, so the ISR never races with itself
    press_pending = true;   // main clears this after reporting
}

int main(void) {
    stdio_init_all();
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);   // released = 1, pressed = 0, so the falling edge is a press

    // Installs the shared GPIO callback on this core and enables the falling-edge event.
    gpio_set_irq_enabled_with_callback(BUTTON_PIN, GPIO_IRQ_EDGE_FALL, true, &on_button);
    printf("interrupts ready\n");

    while (true) {
        // Read-and-clear is three memory operations. Disable interrupts so the ISR
        // cannot run between them and set a new press that we then clear unreported.
        uint32_t saved = save_and_disable_interrupts();
        bool pending = press_pending;
        uint32_t total = press_count;
        press_pending = false;
        restore_interrupts(saved);

        if (pending) {
            printf("presses=%lu\n", (unsigned long)total);
        }
        sleep_ms(LOOP_MS);
    }
}
