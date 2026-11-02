/* Bench lab 3: see the clock.
 *
 * 1. clk_sys is routed to GP21 through the clock generator's GPOUT0 output, divided by 150, so
 *    a logic analyzer at 24 MS/s can measure it (RP2350 datasheet, section 8.1: clk_gpout0;
 *    GPIO21 function table in section 1.2.3).
 * 2. After 5 s the program changes clk_sys from 150 MHz to 100 MHz with set_sys_clock_khz().
 *    The SDK then moves clk_peri, the UART's clock, to the 48 MHz USB PLL (hardware_clocks,
 *    PICO_CLOCK_ADJUST_PERI_CLOCK_WITH_SYS_CLOCK defaults to 0). The UART's baud divider was
 *    computed for 150 MHz, so on a real board UART0 now sends at the wrong speed. Wokwi's
 *    serial monitor does not check bit timing, so the simulation still looks fine.
 * 3. Your fix goes where the TODO(learner) is.
 *
 * Watch the log over USB (unaffected: clk_usb is a separate clock), and decode GP0 (UART0 TX)
 * with the logic analyzer at 115200 baud.
 */
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/clocks.h"
#include "hardware/uart.h"

#define GPOUT_PIN     21u          // GP21 can carry CLOCK GPOUT0
#define GPOUT_DIV     150u         // 150 MHz / 150 = 1 MHz on the pin
#define NEW_SYS_KHZ   100000u      // the clock we switch to
#define BAUD          115200u
#define TEST_LINES    10u

static void report(const char *when) {
    printf("BENCH3 %s: clk_sys=%lu Hz clk_peri=%lu Hz\n", when,
           (unsigned long)clock_get_hz(clk_sys), (unsigned long)clock_get_hz(clk_peri));
}

static void send_test_lines(void) {
    for (unsigned i = 0; i < TEST_LINES; i++) {
        uart_puts(uart0, "BENCH3 UART test 0123456789\r\n");   // decode this on GP0
        sleep_ms(500);
    }
}

int main(void) {
    stdio_init_all();
    clock_gpio_init(GPOUT_PIN, CLOCKS_CLK_GPOUT0_CTRL_AUXSRC_VALUE_CLK_SYS, GPOUT_DIV);
    report("start");
    send_test_lines();

    set_sys_clock_khz(NEW_SYS_KHZ, true);
    report("after the PLL change");

    /* TODO(learner): on the board, the test lines below no longer decode at 115200 baud.
     * Find out which clock the UART's divider depends on, and recompute the divider. */
    (void)BAUD;

    send_test_lines();
    printf("BENCH3 UART ok at 100 MHz\n");
    while (true) {
        sleep_ms(1000);
    }
}
