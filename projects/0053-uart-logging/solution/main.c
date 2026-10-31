#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/clocks.h"
#include "hardware/uart.h"

// EXPECT: UART LOG OK

#define LOG_LEVEL_ERROR  0
#define LOG_LEVEL_WARN   1
#define LOG_LEVEL_INFO   2
#define LOG_LEVEL_DEBUG  3
#define LOG_LEVEL        LOG_LEVEL_INFO   // messages above this level are dropped

#define BAUD_RATE        115200u

static char log_tag(int level) {
    static const char tags[] = {'E', 'W', 'I', 'D'};
    return tags[level];
}

// The check comes first. A dropped message costs one comparison, and its arguments are never
// evaluated. Each printf() that runs still blocks until its bytes are in the UART FIFO.
#define LOG(level, ...)                                  \
    do {                                                 \
        if ((level) <= LOG_LEVEL) {                      \
            printf("[%c] ", log_tag(level));             \
            printf(__VA_ARGS__);                         \
            printf("\n");                                \
        }                                                \
    } while (0)

// Datasheet 4.2.3.2.1: Baud Rate Divisor = UARTCLK / (16 * baud), with a 16-bit integer part
// (UARTIBRD) and a 6-bit fraction (UARTFBRD). Multiplying by 64 gives one integer, total64,
// which is the divisor in 64ths. Adding baud/2 before the division rounds to nearest.
static void print_baud_divisor(uint32_t clk_hz, uint32_t baud) {
    uint32_t total64 = (4u * clk_hz + baud / 2u) / baud;
    uint32_t ibrd = total64 / 64u;
    uint32_t fbrd = total64 % 64u;

    LOG(LOG_LEVEL_INFO, "clk_peri %lu Hz, baud %lu: IBRD %lu, FBRD %lu",
        (unsigned long)clk_hz, (unsigned long)baud,
        (unsigned long)ibrd, (unsigned long)fbrd);

    // Cross-check against the register the SDK wrote in uart_set_baudrate().
    uint32_t hw_ibrd = uart_get_hw(uart0)->ibrd;
    uint32_t hw_fbrd = uart_get_hw(uart0)->fbrd;
    LOG(LOG_LEVEL_DEBUG, "UARTIBRD %lu, UARTFBRD %lu read from hardware",
        (unsigned long)hw_ibrd, (unsigned long)hw_fbrd);
    if (hw_ibrd != ibrd || hw_fbrd != fbrd) {
        LOG(LOG_LEVEL_WARN, "divisor differs from the register: check clk_peri");
    }
}

int main(void) {
    stdio_init_all();   // sets up UART0 on GP0 (TX) and GP1 (RX) at 115200 baud

    printf("UART LOG OK\n");
    print_baud_divisor(clock_get_hz(clk_peri), BAUD_RATE);

    uint32_t tick = 0;
    while (true) {
        tick++;
        LOG(LOG_LEVEL_INFO, "tick %lu", (unsigned long)tick);
        LOG(LOG_LEVEL_DEBUG, "this line is filtered out at INFO");
        if (tick % 5u == 0u) {
            LOG(LOG_LEVEL_WARN, "every fifth tick is a warning");
        }
        sleep_ms(1000);
    }
}
