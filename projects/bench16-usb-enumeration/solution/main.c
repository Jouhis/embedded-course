/* Bench lab 16: real USB enumeration.
 *
 * The Pico SDK's stdio_usb makes the board a USB CDC device: a virtual serial port. When you plug
 * it in, the PC asks for its descriptors (who are you, what can you do) before any program can
 * open the port. This program reports what the device side sees: when the host opened the port
 * (the terminal sets DTR) and how long that took. CMakeLists.txt sets the product and
 * manufacturer strings, so you can find them again in the PC's own tools.
 *
 * Vendor ID 0x2E8A (Raspberry Pi) and product ID 0x0009 ("Raspberry Pi Pico SDK CDC") are the
 * SDK defaults for the RP2350 (pico_stdio_usb/stdio_usb_descriptors.c).
 */
// EXPECT: BENCH16 running
#include <stdio.h>
#include "pico/stdlib.h"
#include "pico/stdio_usb.h"

#define LED_PIN 25u

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    printf("BENCH16 running\n");      // goes out on UART0 at once; on USB only once a host listens
    bool was_connected = false;
    uint32_t start = to_ms_since_boot(get_absolute_time());
    while (true) {
        bool connected = stdio_usb_connected();   // true once the host has opened the port (DTR)
        gpio_put(LED_PIN, connected);             // LED on = a terminal has the port open
        if (connected && !was_connected) {
            uint32_t ms = to_ms_since_boot(get_absolute_time()) - start;
            printf("BENCH16 host opened the port %lu ms after boot\n", (unsigned long)ms);
        } else if (!connected && was_connected) {
            printf("BENCH16 host closed the port\n");   // seen on UART0 only
        }
        was_connected = connected;
        sleep_ms(50);
    }
}
