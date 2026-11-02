/* Bench lab 0: the first program on a real Raspberry Pi Pico 2.
 *
 * The same source runs in Wokwi (board-pi-pico-2) and on the board. It prints which chip it
 * runs on, then blinks a heartbeat: a short flash once a second, so "alive" is visible at a
 * glance without staring at the LED. printf goes to UART0 (Wokwi's serial monitor) and to USB
 * (the board's serial port on the PC); see CMakeLists.txt.
 */
// EXPECT: BENCH0 OK
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/structs/sysinfo.h"

#define LED_PIN        25u    // Pico 2 user LED (Pico 2 datasheet, section 3.1: GPIO25)
#define FLASH_ON_MS    100u   // heartbeat: 100 ms on ...
#define FLASH_OFF_MS   900u   // ... and 900 ms off, one beat per second

/* SYSINFO CHIP_ID (RP2350 datasheet, section 12.15.1): bits 31:28 revision, 27:12 part,
 * 11:1 manufacturer (JEDEC JEP-106), bit 0 always 1. Read the register directly and print it raw, so the program shows what
 * the hardware says instead of trusting a library's assumptions. */
static void print_chip(void) {
    uint32_t id = sysinfo_hw->chip_id;
    unsigned revision = (unsigned)(id >> 28);
    unsigned part = (unsigned)((id >> 12) & 0xFFFFu);
    unsigned manufacturer = (unsigned)((id >> 1) & 0x7FFu);
    printf("BENCH0 CHIP_ID=0x%08lx part=0x%04x manufacturer=0x%03x revision=%u\n",
           (unsigned long)id, part, manufacturer, revision);
}

int main(void) {
    stdio_init_all();               // UART0 and USB; USB waits up to 3 s for a terminal
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    print_chip();
    printf("BENCH0 OK\n");

    uint32_t beats = 0;
    while (true) {
        gpio_put(LED_PIN, 1);
        sleep_ms(FLASH_ON_MS);
        gpio_put(LED_PIN, 0);
        sleep_ms(FLASH_OFF_MS);
        printf("beat %lu\n", (unsigned long)++beats);
    }
}
