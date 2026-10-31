#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "hardware/sync.h"
#include "pico/stdlib.h"

#define BUTTON_PIN  14     // GP14: pushbutton to GND, pull-up on (same wiring as lesson 16)
#define LOOP_MS     100    // main loop period

// Shared between the ISR and main.
static uint32_t press_count = 0;
static bool press_pending = false;

// ISR: must be short, must not block, and must not call printf.
static void on_button(uint gpio, uint32_t events) {
    (void)gpio;
    (void)events;
    // TODO(learner): this printf is an ISR-rule violation (it can block and is not
    // reentrant with main's printf). Delete it: the main loop reports the presses.
    printf("pressed\n");
    press_count++;
    press_pending = true;
}

int main(void) {
    stdio_init_all();
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);

    // TODO(learner): register on_button for the falling edge of BUTTON_PIN with
    // gpio_set_irq_enabled_with_callback(BUTTON_PIN, GPIO_IRQ_EDGE_FALL, true, &on_button);
    printf("interrupts ready\n");

    while (true) {
        // TODO(learner): read press_pending and press_count, and clear press_pending,
        // inside save_and_disable_interrupts() / restore_interrupts(). Then print
        // "presses=<count>" when a press was pending.
        //
        // Hint: the flags are shared with the ISR, so they must be volatile (lesson 46).
        // Without that, the compiler may keep press_pending in a register.
        sleep_ms(LOOP_MS);
    }
}
