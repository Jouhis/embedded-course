/* Bench lab 0: the first program on a real Raspberry Pi Pico 2.
 *
 * The same source runs in Wokwi (board-pi-pico-2) and on the board. printf goes to UART0
 * (Wokwi's serial monitor) and to USB (the board's serial port on the PC); see CMakeLists.txt.
 * First build and flash it unchanged (steps 1 to 5 in the lab), then do the two tasks.
 */
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/structs/sysinfo.h"

#define LED_PIN 25u   // Pico 2 user LED (Pico 2 datasheet, section 3.1: GPIO25)

/* TODO(learner) task 1: read sysinfo_hw->chip_id and print it in hex, plus its three fields:
 * revision (bits 31:28), part (27:12) and manufacturer (11:1). RP2350 datasheet, section 12.15.1. */
static void print_chip(void) {
    printf("BENCH0 chip id not read yet\n");
}

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    print_chip();

    /* TODO(learner) task 2: turn the even 500/500 ms blink into a heartbeat, a 100 ms flash
     * once a second, and print "beat N" after each one. */
    while (true) {
        gpio_put(LED_PIN, 1);
        printf("LED on\n");
        sleep_ms(500);
        gpio_put(LED_PIN, 0);
        printf("LED off\n");
        sleep_ms(500);
    }
}
