// SIM: skip no UART output; printf goes over USB CDC, which Wokwi does not simulate
/* USB CDC serial demo (lesson 102). The Pico enumerates as a USB device with a virtual
 * serial port (the CDC class). printf() goes out over that port instead of over UART0.
 *
 * Wokwi has only partial USB support (NOTES.md), so this program is built but not simulated.
 * To see it enumerate, you need a real Pico, a USB data cable, and a terminal on the new port. */
#include <stdio.h>
#include "pico/stdlib.h"

#define LED_PIN          25u        /* on-board LED of the Raspberry Pi Pico */
#define HOST_WAIT_MS     3000u      /* how long to wait for a terminal before printing anyway */
#define BLINK_PERIOD_MS  500u

int main(void) {
    stdio_init_all();               /* starts TinyUSB and the CDC stdio driver (pico_stdio_usb) */

    /* A USB device does not know whether a host is listening. Waiting a little lets a terminal
     * open first; printing into an unopened port is not an error, but the early lines are lost. */
    uint32_t waited_ms = 0;
    while (!stdio_usb_connected() && waited_ms < HOST_WAIT_MS) {
        sleep_ms(10);
        waited_ms += 10;
    }

    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    printf("CDC demo: connected=%d after %lu ms\n",
           stdio_usb_connected() ? 1 : 0, (unsigned long)waited_ms);

    uint32_t tick = 0;
    while (true) {
        gpio_put(LED_PIN, 1);
        printf("tick %lu: LED on\n", (unsigned long)tick);
        sleep_ms(BLINK_PERIOD_MS);
        gpio_put(LED_PIN, 0);
        printf("tick %lu: LED off\n", (unsigned long)tick);
        sleep_ms(BLINK_PERIOD_MS);
        tick++;
    }
}
